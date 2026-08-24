import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.config import settings
from app.database.connection import get_db
from app.database.models import Video
from app.database.repositories import VideoRepository
from app.services.synthetic_generator import SyntheticVideoGenerator
from app.models.schemas import VideoResponse

router = APIRouter(prefix="/datasets", tags=["Datasets"])


@router.get("")
def list_datasets():
    """Lists pre-packaged and generated benchmark dataset video files."""
    datasets = []
    for file in settings.DATASETS_DIR.glob("*.mp4"):
        datasets.append({
            "name": file.name,
            "size_mb": round(file.stat().st_size / (1024 * 1024), 2),
            "path": str(file)
        })
    return datasets


@router.post("/generate-synthetic", response_model=VideoResponse)
def generate_synthetic_scenario(
    scenario_type: str = Query("all_inclusive", description="potholes, garbage, missing_traffic_light, missing_sign_board, missing_street_light_night, all_inclusive"),
    duration_sec: int = Query(8, ge=4, le=30),
    camera_id: str = Query("CAM-01"),
    db: Session = Depends(get_db)
):
    """
    Generates a synthetic road traffic CCTV video with injected anomalies,
    registers it into the Video database table, ready for one-click AI analysis.
    """
    video_id = f"SYN-{uuid.uuid4().hex[:8].upper()}"
    filename = f"{video_id}_{scenario_type}.mp4"
    output_path = settings.DATASETS_DIR / filename

    SyntheticVideoGenerator.generate_road_scenario(
        output_path=output_path,
        duration_sec=duration_sec,
        fps=24,
        scenario_type=scenario_type
    )

    video = Video(
        video_id=video_id,
        filename=filename,
        source="synthetic",
        duration=float(duration_sec),
        fps=24.0,
        total_frames=duration_sec * 24,
        status="QUEUED"
    )
    saved = VideoRepository.create(db, video)
    return VideoResponse.model_validate(saved)
