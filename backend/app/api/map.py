import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.connection import get_db
from app.database.models import Event, Camera
from app.models.schemas import HotspotResponse

router = APIRouter(prefix="/map", tags=["GIS Map"])


@router.get("/events")
def get_map_events(db: Session = Depends(get_db)):
    """Returns geolocated events for interactive Leaflet map rendering."""
    events = db.query(Event).filter(Event.latitude.isnot(None), Event.longitude.isnot(None)).all()
    
    features = []
    for e in events:
        meta = {}
        if e.meta_info:
            try:
                meta = json.loads(e.meta_info)
            except Exception:
                meta = {}

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [e.longitude, e.latitude]
            },
            "properties": {
                "event_id": e.event_id,
                "event_type": e.event_type,
                "severity": e.severity,
                "status": e.status,
                "timestamp": e.timestamp,
                "camera_id": e.camera_id,
                "location": e.location,
                "description": e.description,
                "evidence_path": e.evidence_path,
                "metadata": meta
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }


@router.get("/hotspots", response_model=List[HotspotResponse])
def get_map_hotspots(db: Session = Depends(get_db)):
    """
    Analyzes geographic density and severity weights to identify high-risk road hotspots.
    """
    cameras = db.query(Camera).all()
    hotspots = []

    for cam in cameras:
        events = db.query(Event).filter(Event.camera_id == cam.camera_id).all()
        if not events:
            continue

        # Compute weighted severity score
        # LOW=1, MEDIUM=3, HIGH=7, CRITICAL=15
        weights = {"LOW": 1, "MEDIUM": 3, "HIGH": 7, "CRITICAL": 15}
        total_score = sum(weights.get(e.severity, 2) for e in events)
        
        # Risk level determination
        if total_score >= 40:
            risk_level = "SEVERE"
        elif total_score >= 20:
            risk_level = "HIGH"
        elif total_score >= 8:
            risk_level = "MODERATE"
        else:
            risk_level = "LOW"

        # Find dominant event types
        event_types = {}
        for e in events:
            event_types[e.event_type] = event_types.get(e.event_type, 0) + 1
        sorted_types = sorted(event_types.items(), key=lambda x: x[1], reverse=True)
        dominant = [k for k, v in sorted_types[:3]]

        hotspots.append(HotspotResponse(
            location=cam.location,
            latitude=cam.latitude or 28.6139,
            longitude=cam.longitude or 77.2090,
            event_count=len(events),
            severity_score=round(float(total_score), 1),
            risk_level=risk_level,
            primary_event_types=dominant
        ))

    return hotspots
