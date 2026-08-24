import time
import math
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from app.database.models import Event, Detection
from app.models.schemas import EventCreate
from app.database.repositories import EventRepository
from app.services.tracker import compute_iou
from app.services.evidence_service import EvidenceGenerator
from app.config import settings


class EventEngine:
    """
    Event Processing & Deduplication Engine:
    - Debounces transient noise across multi-frame temporal windows
    - Performs spatial IoU and time-window deduplication
    - Dynamically evaluates severity ratings
    - Generates high-resolution evidence frames
    - Persists structured events to PostgreSQL / Database
    """

    def __init__(self):
        self.active_events_cache: Dict[str, Dict[str, Any]] = {}
        # key: f"{event_type}_{object_id_or_grid}" -> {last_seen, event_id, bbox, count}
        self.event_counter = 1000

    def _format_timestamp(self, seconds: float) -> str:
        mins = int(seconds // 60)
        secs = int(seconds % 60)
        millis = int((seconds - int(seconds)) * 1000)
        return f"{mins:02d}:{secs:02d}.{millis:03d}"

    def _generate_event_id(self) -> str:
        import uuid
        return f"EVT-{uuid.uuid4().hex[:8].upper()}"

    def process_candidate_event(
        self,
        db: Session,
        candidate: Dict[str, Any],
        frame: Any,
        video_id: str,
        camera_id: str,
        location: str,
        frame_num: int,
        timestamp_sec: float,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None
    ) -> Optional[Event]:
        """
        Validates, deduplicates, and creates or updates a structured event.
        """
        event_type = candidate.get("event_type", "ANOMALY_DETECTED")
        object_id = candidate.get("object_id", "OBJ-UNK")
        bbox = candidate.get("bbox", [0, 0, 0, 0])
        severity = candidate.get("severity", "MEDIUM")
        description = candidate.get("description", "")
        object_type = candidate.get("object_type", "unknown")
        meta = candidate.get("metadata", {})

        # Check active events cache for spatial overlap or proximity of same event type
        for key, rec in list(self.active_events_cache.items()):
            if rec.get("event_type") == event_type:
                time_diff = timestamp_sec - rec.get("last_timestamp", -999.0)
                if time_diff <= settings.TEMPORAL_WINDOW_SECONDS:
                    iou = compute_iou(rec["bbox"], bbox)
                    # Check center distance
                    c1 = ((rec["bbox"][0] + rec["bbox"][2]) // 2, (rec["bbox"][1] + rec["bbox"][3]) // 2)
                    c2 = ((bbox[0] + bbox[2]) // 2, (bbox[1] + bbox[3]) // 2)
                    dist = math.dist(c1, c2)
                    if iou > 0.20 or dist < 85 or object_id == rec.get("object_id"):
                        rec["last_timestamp"] = timestamp_sec
                        rec["occurrences"] = rec.get("occurrences", 1) + 1
                        rec["bbox"] = bbox
                        return None

        grid_key = f"{event_type}_{int(bbox[0]//60)}_{int(bbox[1]//60)}"

        # Debounce check: For subtle road defects, confirm multi-frame persistence
        if event_type in ["ROAD_DEFECT_DETECTED", "WATER_LOGGING"]:
            if existing_record is None:
                # First observation, cache for confirmation
                self.active_events_cache[grid_key] = {
                    "last_timestamp": timestamp_sec,
                    "first_timestamp": timestamp_sec,
                    "occurrences": 1,
                    "bbox": bbox,
                    "object_id": object_id,
                    "event_id": None
                }
                return None
            elif existing_record["occurrences"] < settings.MIN_CONSECUTIVE_FRAMES:
                existing_record["occurrences"] += 1
                existing_record["last_timestamp"] = timestamp_sec
                return None

        # Create New Structured Event
        event_id = self._generate_event_id()
        timestamp_str = self._format_timestamp(timestamp_sec)

        # Generate Forensic Evidence Image
        evidence_path = ""
        if frame is not None:
            evidence_path = EvidenceGenerator.generate_and_save(
                frame=frame,
                event_id=event_id,
                event_type=event_type,
                severity=severity,
                timestamp_str=timestamp_str,
                camera_id=camera_id,
                location=location,
                bbox=bbox,
                metadata=meta
            )

        event_create = EventCreate(
            event_id=event_id,
            event_type=event_type,
            severity=severity,
            status="NEW",
            timestamp=timestamp_str,
            timestamp_seconds=timestamp_sec,
            video_id=video_id,
            camera_id=camera_id,
            location=location,
            latitude=latitude,
            longitude=longitude,
            frame_number=frame_num,
            object_id=object_id,
            object_type=object_type,
            description=description,
            evidence_path=evidence_path,
            metadata=meta
        )

        saved_event = EventRepository.create(db, event_create)

        # Update cache
        self.active_events_cache[grid_key] = {
            "event_type": event_type,
            "last_timestamp": timestamp_sec,
            "first_timestamp": timestamp_sec,
            "occurrences": 1,
            "bbox": bbox,
            "object_id": object_id,
            "event_id": event_id
        }

        return saved_event
