import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import TrafficMetric
from app.database.repositories import MetricsRepository
from app.models.schemas import (
    MetricSummaryResponse,
    EventsByTypeResponse,
    EventsByLocationResponse,
    TimelinePoint,
    TrafficMetricResponse
)

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get("/summary", response_model=MetricSummaryResponse)
def get_summary(db: Session = Depends(get_db)):
    data = MetricsRepository.get_summary(db)
    return MetricSummaryResponse(**data)


@router.get("/events-by-type", response_model=List[EventsByTypeResponse])
def get_events_by_type(db: Session = Depends(get_db)):
    results = MetricsRepository.get_events_by_type(db)
    return [EventsByTypeResponse(**r) for r in results]


@router.get("/events-by-location", response_model=List[EventsByLocationResponse])
def get_events_by_location(db: Session = Depends(get_db)):
    results = MetricsRepository.get_events_by_location(db)
    return [EventsByLocationResponse(**r) for r in results]


@router.get("/timeline", response_model=List[TimelinePoint])
def get_timeline(hours: int = 24, db: Session = Depends(get_db)):
    results = MetricsRepository.get_timeline(db, hours=hours)
    return [TimelinePoint(**r) for r in results]


@router.get("/traffic/{video_id}", response_model=List[TrafficMetricResponse])
def get_video_traffic_metrics(video_id: str, db: Session = Depends(get_db)):
    metrics = db.query(TrafficMetric).filter(TrafficMetric.video_id == video_id).order_by(TrafficMetric.timestamp).all()
    results = []
    for m in metrics:
        breakdown = {}
        if m.breakdown_json:
            try:
                breakdown = json.loads(m.breakdown_json)
            except Exception:
                pass
        results.append(TrafficMetricResponse(
            metric_id=m.metric_id,
            video_id=m.video_id,
            timestamp=m.timestamp,
            vehicle_count=m.vehicle_count,
            congestion_level=m.congestion_level,
            flow_rate=m.flow_rate,
            breakdown=breakdown,
            created_at=m.created_at
        ))
    return results
