import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import Event
from app.database.repositories import EventRepository
from app.models.schemas import (
    EventResponse,
    EventDetailResponse,
    EventUpdate,
    EventReviewCreate,
    EventReviewResponse
)

router = APIRouter(prefix="/events", tags=["Events"])


def event_to_response(e: Event) -> EventResponse:
    meta = {}
    if e.meta_info:
        try:
            meta = json.loads(e.meta_info)
        except Exception:
            meta = {}

    return EventResponse(
        event_id=e.event_id,
        event_type=e.event_type,
        severity=e.severity,
        status=e.status,
        timestamp=e.timestamp,
        timestamp_seconds=e.timestamp_seconds or 0.0,
        video_id=e.video_id,
        camera_id=e.camera_id,
        location=e.location or "Road Segment",
        latitude=e.latitude,
        longitude=e.longitude,
        frame_number=e.frame_number or 0,
        object_id=e.object_id,
        object_type=e.object_type,
        description=e.description,
        evidence_path=e.evidence_path,
        metadata=meta,
        created_at=e.created_at,
        updated_at=e.updated_at
    )


@router.get("", response_model=List[EventResponse])
def list_events(
    skip: int = 0,
    limit: int = 50,
    severity: Optional[str] = None,
    event_type: Optional[str] = None,
    status: Optional[str] = None,
    camera_id: Optional[str] = None,
    video_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    events, total = EventRepository.list(
        db,
        skip=skip,
        limit=limit,
        severity=severity,
        event_type=event_type,
        status=status,
        camera_id=camera_id,
        video_id=video_id
    )
    return [event_to_response(e) for e in events]


@router.get("/{event_id}", response_model=EventDetailResponse)
def get_event(event_id: str, db: Session = Depends(get_db)):
    event = EventRepository.get(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    res = event_to_response(event)
    reviews_res = [
        EventReviewResponse(
            review_id=r.review_id,
            event_id=r.event_id,
            action=r.action,
            reviewer=r.reviewer,
            remarks=r.remarks,
            timestamp=r.timestamp
        )
        for r in event.reviews
    ]

    return EventDetailResponse(
        **res.model_dump(),
        reviews=reviews_res
    )


@router.patch("/{event_id}", response_model=EventResponse)
def update_event(event_id: str, update_in: EventUpdate, db: Session = Depends(get_db)):
    event = EventRepository.update(db, event_id, update_in)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event_to_response(event)


@router.post("/{event_id}/review", response_model=EventReviewResponse)
def add_review(event_id: str, review_in: EventReviewCreate, db: Session = Depends(get_db)):
    event = EventRepository.get(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    review = EventRepository.add_review(db, event_id, review_in)
    return EventReviewResponse.model_validate(review)

from datetime import datetime
from app.config import settings

@router.post("/{event_id}/report")
def generate_and_send_report(event_id: str, db: Session = Depends(get_db)):
    event = EventRepository.get(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    reports_dir = settings.EVIDENCE_DIR / "reports"
    reports_dir.mkdir(exist_ok=True)
    report_filename = f"{event_id}_Authority_Report.txt"
    report_path = reports_dir / report_filename

    meta = event.meta_info if event.meta_info else "None"
    
    report_content = f"""==================================================
VIGILANT VISION - CIVIC AUTHORITY DISPATCH REPORT
==================================================
Report ID: REP-{event_id}
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

[ DEFECT DETAILS ]
Event ID:      {event.event_id}
Type:          {event.event_type}
Severity:      {event.severity}
Status:        {event.status}
Description:   {event.description}

[ LOCATION & TELEMETRY ]
Camera Node:   {event.camera_id}
Location:      {event.location}
GPS:           {event.latitude}, {event.longitude}
Timestamp:     {event.timestamp}

[ EVIDENCE ]
Snapshot Path: {event.evidence_path}

[ METADATA ]
{meta}

==================================================
STATUS: Dispatched to Municipal Authorities automatically.
==================================================
"""
    
    with open(report_path, "w") as f:
        f.write(report_content)
        
    return {
        "message": "Report generated and sent to authorities successfully.",
        "report_url": f"evidence/reports/{report_filename}"
    }
