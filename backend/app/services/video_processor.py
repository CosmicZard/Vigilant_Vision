import cv2
import json
import logging
import uuid
from pathlib import Path
from typing import Optional, Callable, Dict, Any
from datetime import datetime

from sqlalchemy.orm import Session
from app.config import settings
from app.database.connection import SessionLocal
from app.database.models import Video, Detection, TrafficMetric, Camera
from app.database.repositories import VideoRepository
from app.services.yolo_detector import get_yolo_detector
from app.services.tracker import CentroidTracker
from app.services.traffic_service import TrafficAnalyzer
from app.services.behavior_service import BehaviorAnalyzer
from app.services.road_defect_service import RoadDefectAnalyzer
from app.services.event_engine import EventEngine

logger = logging.getLogger("ibvap.video_processor")

# Active processing jobs dictionary: video_id -> {progress: float, status: str, current_fps: float, events_found: int}
processing_progress: Dict[str, Dict[str, Any]] = {}


class VideoProcessor:
    def __init__(self, video_id: str, video_path: Path, camera_id: Optional[str] = None):
        self.video_id = video_id
        self.video_path = video_path
        self.camera_id = camera_id or "CAM-01"

    def process(self, progress_callback: Optional[Callable[[float, str], None]] = None):
        """
        Executes full OpenCV + YOLOv8 + Tracker + Analytics pipeline on the target video.
        """
        db: Session = SessionLocal()
        try:
            processing_progress[self.video_id] = {
                "progress": 0.0,
                "status": "PROCESSING",
                "current_frame": 0,
                "total_frames": 0,
                "events_count": 0,
                "error": None
            }

            # Fetch camera metadata for GIS coordinates and location
            camera = db.query(Camera).filter(Camera.camera_id == self.camera_id).first()
            location = camera.location if camera else "Road Corridor Sector"
            latitude = camera.latitude if camera else 28.6139
            longitude = camera.longitude if camera else 77.2090

            cap = cv2.VideoCapture(str(self.video_path))
            if not cap.isOpened():
                raise ValueError(f"Could not open video file: {self.video_path}")

            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
            duration = total_frames / fps
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

            # Update DB Video status
            VideoRepository.update_status(
                db, self.video_id, status="PROCESSING", duration=duration, total_frames=total_frames, fps=fps
            )

            # Initialize AI pipeline components
            detector = get_yolo_detector()
            tracker = CentroidTracker(max_disappeared=12, iou_threshold=0.3)
            traffic_analyzer = TrafficAnalyzer()
            behavior_analyzer = BehaviorAnalyzer(default_flow_direction=90.0)
            defect_analyzer = RoadDefectAnalyzer()
            event_engine = EventEngine()

            frame_skip = max(1, settings.FRAME_SKIP)
            frame_num = 0
            events_generated_count = 0

            logger.info(f"Starting processing for video {self.video_id}: {total_frames} frames @ {fps:.1f} FPS")

            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                frame_num += 1
                timestamp_sec = frame_num / fps

                # Skip frames to maintain high throughput
                if frame_num % frame_skip != 0:
                    continue

                # 1. Object Detection (YOLOv8)
                detections = detector.detect_objects(frame)

                # Persist sample detection records to DB (e.g. key frames)
                if frame_num % (frame_skip * 5) == 0:
                    for det in detections[:6]:
                        det_record = Detection(
                            detection_id=f"DET-{uuid.uuid4().hex[:8]}",
                            video_id=self.video_id,
                            frame_number=frame_num,
                            timestamp=timestamp_sec,
                            object_type=det["class_name"],
                            confidence=det["confidence"],
                            bounding_box=json.dumps(det["bbox"]),
                            track_id=None
                        )
                        db.add(det_record)

                # 2. Multi-Object Tracking
                tracks = tracker.update(detections, frame_num, timestamp_sec)

                # 3. Traffic Analysis & Periodic Metric Logging
                traffic_stats = traffic_analyzer.analyze_traffic(tracks, height, width)
                
                # Check for Traffic Congestion Events
                if traffic_stats["congestion_level"] in ["HEAVY", "SEVERE"]:
                    congestion_candidate = {
                        "event_type": "TRAFFIC_CONGESTION" if traffic_stats["congestion_level"] == "HEAVY" else "HEAVY_TRAFFIC",
                        "severity": "MEDIUM" if traffic_stats["congestion_level"] == "HEAVY" else "HIGH",
                        "object_id": f"CONGESTION-{self.camera_id}",
                        "object_type": "traffic_flow",
                        "bbox": [0, 0, width, height],
                        "description": f"{traffic_stats['congestion_level']} traffic congestion detected ({traffic_stats['vehicle_count']} active vehicles, flow rate {traffic_stats['flow_rate']} veh/min)",
                        "metadata": traffic_stats
                    }
                    evt = event_engine.process_candidate_event(
                        db, congestion_candidate, frame, self.video_id, self.camera_id, location, frame_num, timestamp_sec, latitude, longitude
                    )
                    if evt:
                        events_generated_count += 1

                # Save Traffic Metric entry every 30 frames
                if frame_num % (frame_skip * 10) == 0:
                    metric = TrafficMetric(
                        metric_id=f"MET-{uuid.uuid4().hex[:8]}",
                        video_id=self.video_id,
                        timestamp=timestamp_sec,
                        vehicle_count=traffic_stats["vehicle_count"],
                        congestion_level=traffic_stats["congestion_level"],
                        flow_rate=traffic_stats["flow_rate"],
                        breakdown_json=json.dumps(traffic_stats["class_distribution"])
                    )
                    db.add(metric)
                    db.commit()

                # 4. Behavioral Analysis (Wrong-way, rash driving, collisions)
                behavior_anomalies = behavior_analyzer.analyze(tracks, frame_num, timestamp_sec)
                for anomaly in behavior_anomalies:
                    evt = event_engine.process_candidate_event(
                        db, anomaly, frame, self.video_id, self.camera_id, location, frame_num, timestamp_sec, latitude, longitude
                    )
                    if evt:
                        events_generated_count += 1

                # 5. Road Defect, Garbage & Infrastructure Analysis (every 6th processed frame)
                if frame_num % (frame_skip * 3) == 0:
                    defect_anomalies = defect_analyzer.analyze_surface(frame, detections, frame_num, timestamp_sec)
                    for defect in defect_anomalies:
                        evt = event_engine.process_candidate_event(
                            db, defect, frame, self.video_id, self.camera_id, location, frame_num, timestamp_sec, latitude, longitude
                        )
                        if evt:
                            events_generated_count += 1

                # 6. Progress Tracking
                progress_pct = round(min(99.0, (frame_num / total_frames) * 100.0), 1)
                processing_progress[self.video_id] = {
                    "progress": progress_pct,
                    "status": "PROCESSING",
                    "current_frame": frame_num,
                    "total_frames": total_frames,
                    "events_count": events_generated_count,
                    "error": None
                }
                if progress_callback:
                    progress_callback(progress_pct, "PROCESSING")

            cap.release()
            db.commit()

            # Mark Video as COMPLETED
            VideoRepository.update_status(db, self.video_id, status="COMPLETED")
            processing_progress[self.video_id] = {
                "progress": 100.0,
                "status": "COMPLETED",
                "current_frame": total_frames,
                "total_frames": total_frames,
                "events_count": events_generated_count,
                "error": None
            }
            logger.info(f"Video {self.video_id} processing completed successfully. Generated {events_generated_count} events.")

        except Exception as e:
            logger.error(f"Error processing video {self.video_id}: {e}", exc_info=True)
            db.rollback()
            VideoRepository.update_status(db, self.video_id, status="FAILED")
            processing_progress[self.video_id] = {
                "progress": 0.0,
                "status": "FAILED",
                "current_frame": 0,
                "total_frames": 0,
                "events_count": 0,
                "error": str(e)
            }
        finally:
            db.close()
