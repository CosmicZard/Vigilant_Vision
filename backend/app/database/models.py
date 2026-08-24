import json
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    DateTime,
    Text,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Video(Base):
    __tablename__ = "videos"

    video_id = Column(String(64), primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    source = Column(String(64), default="upload")  # upload, dataset, rtsp, synthetic
    duration = Column(Float, default=0.0)  # seconds
    fps = Column(Float, default=30.0)
    total_frames = Column(Integer, default=0)
    status = Column(String(32), default="QUEUED", index=True)  # QUEUED, PROCESSING, COMPLETED, FAILED
    processed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    detections = relationship("Detection", back_populates="video", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="video", cascade="all, delete-orphan")
    metrics = relationship("TrafficMetric", back_populates="video", cascade="all, delete-orphan")


class Camera(Base):
    __tablename__ = "cameras"

    camera_id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    location = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    stream_url = Column(String(512), nullable=True)
    status = Column(String(32), default="ACTIVE")  # ACTIVE, OFFLINE, MAINTENANCE
    zone_type = Column(String(64), default="HIGHWAY")  # HIGHWAY, BORDER_CHECKPOINT, URBAN_INTERSECTION, TOLL_GATE
    created_at = Column(DateTime, default=datetime.utcnow)

    events = relationship("Event", back_populates="camera")


class Detection(Base):
    __tablename__ = "detections"

    detection_id = Column(String(64), primary_key=True, index=True)
    video_id = Column(String(64), ForeignKey("videos.video_id", ondelete="CASCADE"), nullable=False, index=True)
    frame_number = Column(Integer, nullable=False, index=True)
    timestamp = Column(Float, nullable=False)  # offset in seconds
    object_type = Column(String(64), nullable=False, index=True)
    confidence = Column(Float, nullable=False)
    bounding_box = Column(Text, nullable=False)  # JSON string: [x1, y1, x2, y2]
    track_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    video = relationship("Video", back_populates="detections")

    @property
    def bbox_list(self):
        try:
            return json.loads(self.bounding_box)
        except Exception:
            return []


class Event(Base):
    __tablename__ = "events"

    event_id = Column(String(64), primary_key=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    # e.g., VEHICLE_DETECTED, TRAFFIC_CONGESTION, HEAVY_TRAFFIC, POTHOLE_DETECTED,
    # GARBAGE_DETECTED, WATERLOGGING_DETECTED, ROAD_DEFECT_DETECTED,
    # RASH_DRIVING, WRONG_WAY_DRIVING, POSSIBLE_COLLISION, POSSIBLE_HIT_AND_RUN
    
    severity = Column(String(32), nullable=False, default="MEDIUM", index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(32), nullable=False, default="NEW", index=True)  # NEW, IN_REVIEW, CONFIRMED, RESOLVED, FALSE_POSITIVE
    timestamp = Column(String(64), nullable=False)  # "00:02:14.520"
    timestamp_seconds = Column(Float, default=0.0)
    
    video_id = Column(String(64), ForeignKey("videos.video_id", ondelete="SET NULL"), nullable=True, index=True)
    camera_id = Column(String(64), ForeignKey("cameras.camera_id", ondelete="SET NULL"), nullable=True, index=True)
    location = Column(String(255), default="Road Segment")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    frame_number = Column(Integer, default=0)
    object_id = Column(String(64), nullable=True)
    object_type = Column(String(64), nullable=True)
    description = Column(Text, nullable=True)
    evidence_path = Column(String(512), nullable=True)
    meta_info = Column(Text, nullable=True)  # JSON string: extra attributes, speed, lane, etc.
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    video = relationship("Video", back_populates="events")
    camera = relationship("Camera", back_populates="events")
    reviews = relationship("EventReview", back_populates="event", cascade="all, delete-orphan")

    @property
    def metadata_dict(self):
        if not self.meta_info:
            return {}
        try:
            return json.loads(self.meta_info)
        except Exception:
            return {}


class EventReview(Base):
    __tablename__ = "event_reviews"

    review_id = Column(String(64), primary_key=True, index=True)
    event_id = Column(String(64), ForeignKey("events.event_id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(64), nullable=False)  # CONFIRM, REJECT, ESCALATE, RESOLVE
    reviewer = Column(String(128), default="Operator")
    remarks = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    event = relationship("Event", back_populates="reviews")


class TrafficMetric(Base):
    __tablename__ = "traffic_metrics"

    metric_id = Column(String(64), primary_key=True, index=True)
    video_id = Column(String(64), ForeignKey("videos.video_id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(Float, nullable=False)
    vehicle_count = Column(Integer, default=0)
    congestion_level = Column(String(32), default="LOW")  # LOW, MODERATE, HEAVY, SEVERE
    flow_rate = Column(Float, default=0.0)  # vehicles per minute
    breakdown_json = Column(Text, nullable=True)  # JSON: {"car": 12, "truck": 3, "motorcycle": 5}
    created_at = Column(DateTime, default=datetime.utcnow)

    video = relationship("Video", back_populates="metrics")
