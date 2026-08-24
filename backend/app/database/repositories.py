import json
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database.models import Video, Camera, Detection, Event, EventReview, TrafficMetric
from app.models.schemas import CameraCreate, CameraUpdate, EventCreate, EventUpdate, EventReviewCreate


class VideoRepository:
    @staticmethod
    def get(db: Session, video_id: str) -> Optional[Video]:
        return db.query(Video).filter(Video.video_id == video_id).first()

    @staticmethod
    def list(db: Session, skip: int = 0, limit: int = 50) -> List[Video]:
        return db.query(Video).order_by(desc(Video.created_at)).offset(skip).limit(limit).all()

    @staticmethod
    def create(db: Session, video: Video) -> Video:
        db.add(video)
        db.commit()
        db.refresh(video)
        return video

    @staticmethod
    def update_status(db: Session, video_id: str, status: str, duration: float = 0.0, total_frames: int = 0, fps: float = 30.0) -> Optional[Video]:
        video = db.query(Video).filter(Video.video_id == video_id).first()
        if video:
            video.status = status
            if duration > 0:
                video.duration = duration
            if total_frames > 0:
                video.total_frames = total_frames
            if fps > 0:
                video.fps = fps
            if status == "COMPLETED":
                video.processed_at = datetime.utcnow()
            db.commit()
            db.refresh(video)
        return video

    @staticmethod
    def delete(db: Session, video_id: str) -> bool:
        video = db.query(Video).filter(Video.video_id == video_id).first()
        if video:
            db.delete(video)
            db.commit()
            return True
        return False


class CameraRepository:
    @staticmethod
    def get(db: Session, camera_id: str) -> Optional[Camera]:
        return db.query(Camera).filter(Camera.camera_id == camera_id).first()

    @staticmethod
    def list(db: Session) -> List[Camera]:
        return db.query(Camera).all()

    @staticmethod
    def create(db: Session, camera_in: CameraCreate) -> Camera:
        camera = Camera(**camera_in.model_dump())
        db.add(camera)
        db.commit()
        db.refresh(camera)
        return camera

    @staticmethod
    def update(db: Session, camera_id: str, camera_in: CameraUpdate) -> Optional[Camera]:
        camera = db.query(Camera).filter(Camera.camera_id == camera_id).first()
        if camera:
            data = camera_in.model_dump(exclude_unset=True)
            for k, v in data.items():
                setattr(camera, k, v)
            db.commit()
            db.refresh(camera)
        return camera

    @staticmethod
    def delete(db: Session, camera_id: str) -> bool:
        camera = db.query(Camera).filter(Camera.camera_id == camera_id).first()
        if camera:
            db.delete(camera)
            db.commit()
            return True
        return False


class EventRepository:
    @staticmethod
    def get(db: Session, event_id: str) -> Optional[Event]:
        return db.query(Event).filter(Event.event_id == event_id).first()

    @staticmethod
    def list(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        severity: Optional[str] = None,
        event_type: Optional[str] = None,
        status: Optional[str] = None,
        camera_id: Optional[str] = None,
        video_id: Optional[str] = None
    ) -> Tuple[List[Event], int]:
        query = db.query(Event)
        if severity:
            query = query.filter(Event.severity == severity.upper())
        if event_type:
            query = query.filter(Event.event_type == event_type.upper())
        if status:
            query = query.filter(Event.status == status.upper())
        if camera_id:
            query = query.filter(Event.camera_id == camera_id)
        if video_id:
            query = query.filter(Event.video_id == video_id)

        total = query.count()
        items = query.order_by(desc(Event.created_at)).offset(skip).limit(limit).all()
        return items, total

    @staticmethod
    def create(db: Session, event_in: EventCreate) -> Event:
        data = event_in.model_dump()
        meta_dict = data.pop("metadata", None)
        event = Event(
            **data,
            meta_info=json.dumps(meta_dict) if meta_dict else None
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def update(db: Session, event_id: str, update_in: EventUpdate) -> Optional[Event]:
        event = db.query(Event).filter(Event.event_id == event_id).first()
        if event:
            data = update_in.model_dump(exclude_unset=True)
            for k, v in data.items():
                setattr(event, k, v)
            event.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(event)
        return event

    @staticmethod
    def add_review(db: Session, event_id: str, review_in: EventReviewCreate) -> EventReview:
        import uuid
        review = EventReview(
            review_id=f"REV-{uuid.uuid4().hex[:8].upper()}",
            event_id=event_id,
            action=review_in.action.upper(),
            reviewer=review_in.reviewer,
            remarks=review_in.remarks,
            timestamp=datetime.utcnow()
        )
        db.add(review)
        
        # Sync event status based on review action
        event = db.query(Event).filter(Event.event_id == event_id).first()
        if event:
            if review_in.action.upper() in ["CONFIRM", "CONFIRMED"]:
                event.status = "CONFIRMED"
            elif review_in.action.upper() in ["REJECT", "FALSE_POSITIVE"]:
                event.status = "FALSE_POSITIVE"
            elif review_in.action.upper() in ["RESOLVE", "RESOLVED"]:
                event.status = "RESOLVED"
            elif review_in.action.upper() in ["ESCALATE", "ESCALATED"]:
                event.status = "IN_REVIEW"
                event.severity = "CRITICAL"
            event.updated_at = datetime.utcnow()
            
        db.commit()
        db.refresh(review)
        return review

    @staticmethod
    def get_recent(db: Session, limit: int = 10) -> List[Event]:
        return db.query(Event).order_by(desc(Event.created_at)).limit(limit).all()


class MetricsRepository:
    @staticmethod
    def get_summary(db: Session) -> Dict[str, Any]:
        total_videos = db.query(Video).count()
        total_events = db.query(Event).count()
        critical_alerts = db.query(Event).filter(Event.severity == "CRITICAL").count()
        high_alerts = db.query(Event).filter(Event.severity == "HIGH").count()
        medium_alerts = db.query(Event).filter(Event.severity == "MEDIUM").count()
        low_alerts = db.query(Event).filter(Event.severity == "LOW").count()
        active_cameras = db.query(Camera).filter(Camera.status == "ACTIVE").count()
        resolved_events = db.query(Event).filter(Event.status.in_(["RESOLVED", "CONFIRMED"])).count()

        # Congestion calculation
        latest_metric = db.query(TrafficMetric).order_by(desc(TrafficMetric.created_at)).first()
        avg_congestion = latest_metric.congestion_level if latest_metric else "MODERATE"

        return {
            "total_videos": total_videos,
            "total_events": total_events,
            "critical_alerts": critical_alerts,
            "high_alerts": high_alerts,
            "medium_alerts": medium_alerts,
            "low_alerts": low_alerts,
            "active_cameras": active_cameras,
            "resolved_events": resolved_events,
            "avg_congestion_level": avg_congestion
        }

    @staticmethod
    def get_events_by_type(db: Session) -> List[Dict[str, Any]]:
        results = db.query(
            Event.event_type,
            func.count(Event.event_id).label("count")
        ).group_by(Event.event_type).all()

        type_severity_map = {
            "POTHOLE_DETECTED": "HIGH",
            "ROAD_DEFECT_DETECTED": "MEDIUM",
            "GARBAGE_DETECTED": "MEDIUM",
            "WATER_LOGGING": "MEDIUM",
            "TRAFFIC_CONGESTION": "MEDIUM",
            "HEAVY_TRAFFIC": "MEDIUM",
            "VEHICLE_DETECTED": "LOW",
            "MISSING_TRAFFIC_LIGHT": "HIGH",
            "MISSING_SIGN_BOARD": "HIGH",
            "MISSING_STREET_LIGHT_NIGHT": "HIGH",
            "WRONG_WAY_DRIVING": "HIGH",
            "RASH_DRIVING": "HIGH",
            "POSSIBLE_COLLISION": "HIGH",
            "POSSIBLE_HIT_AND_RUN": "CRITICAL"
        }

        return [
            {
                "event_type": r.event_type,
                "count": r.count,
                "severity": type_severity_map.get(r.event_type, "MEDIUM")
            }
            for r in results
        ]

    @staticmethod
    def get_events_by_location(db: Session) -> List[Dict[str, Any]]:
        results = db.query(
            Event.location,
            Event.camera_id,
            func.count(Event.event_id).label("count"),
            func.sum(func.case((Event.severity == 'CRITICAL', 1), else_=0)).label("critical_count")
        ).group_by(Event.location, Event.camera_id).all()

        return [
            {
                "location": r.location or "Unknown Location",
                "camera_id": r.camera_id,
                "count": r.count,
                "critical_count": r.critical_count or 0
            }
            for r in results
        ]

    @staticmethod
    def get_timeline(db: Session, hours: int = 24) -> List[Dict[str, Any]]:
        now = datetime.utcnow()
        timeline = []
        for i in range(12, -1, -1):
            start_time = now - timedelta(hours=i * 2)
            end_time = now - timedelta(hours=(i - 1) * 2)
            time_label = start_time.strftime("%H:%M")

            events = db.query(Event).filter(
                Event.created_at >= start_time,
                Event.created_at < end_time
            ).all()

            timeline.append({
                "time_label": time_label,
                "count": len(events),
                "critical": sum(1 for e in events if e.severity == "CRITICAL"),
                "high": sum(1 for e in events if e.severity == "HIGH"),
                "medium": sum(1 for e in events if e.severity == "MEDIUM"),
                "low": sum(1 for e in events if e.severity == "LOW")
            })
        return timeline
