from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


# --- Camera Schemas ---
class CameraBase(BaseModel):
    name: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    stream_url: Optional[str] = None
    status: str = "ACTIVE"
    zone_type: str = "HIGHWAY"


class CameraCreate(CameraBase):
    camera_id: str


class CameraUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    stream_url: Optional[str] = None
    status: Optional[str] = None
    zone_type: Optional[str] = None


class CameraResponse(CameraBase):
    camera_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Video Schemas ---
class VideoBase(BaseModel):
    filename: str
    source: str = "upload"
    duration: float = 0.0
    fps: float = 30.0
    total_frames: int = 0
    status: str = "QUEUED"


class VideoCreate(VideoBase):
    video_id: str


class VideoResponse(VideoBase):
    video_id: str
    processed_at: Optional[datetime] = None
    created_at: datetime
    events_count: Optional[int] = 0

    class Config:
        from_attributes = True


# --- Detection Schemas ---
class DetectionResponse(BaseModel):
    detection_id: str
    video_id: str
    frame_number: int
    timestamp: float
    object_type: str
    confidence: float
    bounding_box: List[float]
    track_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Event Review Schemas ---
class EventReviewCreate(BaseModel):
    action: str = Field(..., description="CONFIRM, REJECT, ESCALATE, RESOLVE")
    reviewer: str = "Operator"
    remarks: Optional[str] = None


class EventReviewResponse(BaseModel):
    review_id: str
    event_id: str
    action: str
    reviewer: str
    remarks: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


# --- Event Schemas (Matches Section 9 Specification) ---
class EventBase(BaseModel):
    event_type: str
    severity: str = "MEDIUM"
    status: str = "NEW"
    timestamp: str  # "00:02:14.520"
    timestamp_seconds: float = 0.0
    video_id: Optional[str] = None
    camera_id: Optional[str] = None
    location: str = "Road Segment"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    frame_number: int = 0
    object_id: Optional[str] = None
    object_type: Optional[str] = None
    description: Optional[str] = None
    evidence_path: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class EventCreate(EventBase):
    event_id: str


class EventUpdate(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None


class EventResponse(BaseModel):
    event_id: str
    event_type: str
    severity: str
    status: str
    timestamp: str
    timestamp_seconds: float
    video_id: Optional[str] = None
    camera_id: Optional[str] = None
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    frame_number: int
    object_id: Optional[str] = None
    object_type: Optional[str] = None
    description: Optional[str] = None
    evidence_path: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EventDetailResponse(EventResponse):
    reviews: List[EventReviewResponse] = []


# --- Metrics Schemas ---
class MetricSummaryResponse(BaseModel):
    total_videos: int
    total_events: int
    critical_alerts: int
    high_alerts: int
    medium_alerts: int
    low_alerts: int
    active_cameras: int
    resolved_events: int
    avg_congestion_level: str


class EventsByTypeResponse(BaseModel):
    event_type: str
    count: int
    severity: str


class EventsByLocationResponse(BaseModel):
    location: str
    camera_id: Optional[str] = None
    count: int
    critical_count: int


class TimelinePoint(BaseModel):
    time_label: str
    count: int
    critical: int
    high: int
    medium: int
    low: int


class HotspotResponse(BaseModel):
    location: str
    latitude: float
    longitude: float
    event_count: int
    severity_score: float
    risk_level: str  # LOW, MODERATE, HIGH, SEVERE
    primary_event_types: List[str]


class TrafficMetricResponse(BaseModel):
    metric_id: str
    video_id: str
    timestamp: float
    vehicle_count: int
    congestion_level: str
    flow_rate: float
    breakdown: Dict[str, int] = {}
    created_at: datetime
