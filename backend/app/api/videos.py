import shutil
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database.connection import get_db
from app.database.models import Video, Camera, Event
from app.database.repositories import VideoRepository
from app.models.schemas import VideoResponse
from app.services.video_processor import VideoProcessor, processing_progress

router = APIRouter(prefix="/videos", tags=["Videos"])


@router.get("", response_model=List[VideoResponse])
def list_videos(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    videos = VideoRepository.list(db, skip=skip, limit=limit)
    response = []
    for v in videos:
        events_count = db.query(Event).filter(Event.video_id == v.video_id).count()
        v_dict = VideoResponse.model_validate(v).model_dump()
        v_dict["events_count"] = events_count
        response.append(VideoResponse(**v_dict))
    return response


@router.post("/upload", response_model=VideoResponse)
async def upload_video(
    file: UploadFile = File(...),
    camera_id: str = Form("CAM-01"),
    db: Session = Depends(get_db)
):
    video_id = f"VID-{uuid.uuid4().hex[:8].upper()}"
    filename = f"{video_id}_{file.filename}"
    file_path = settings.UPLOAD_DIR / filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    video = Video(
        video_id=video_id,
        filename=filename,
        source="upload",
        status="QUEUED"
    )
    saved_video = VideoRepository.create(db, video)
    return VideoResponse.model_validate(saved_video)


@router.get("/{video_id}", response_model=VideoResponse)
def get_video(video_id: str, db: Session = Depends(get_db)):
    video = VideoRepository.get(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    events_count = db.query(Event).filter(Event.video_id == video.video_id).count()
    v_dict = VideoResponse.model_validate(video).model_dump()
    v_dict["events_count"] = events_count
    return VideoResponse(**v_dict)


@router.get("/{video_id}/stream")
def stream_video(video_id: str, db: Session = Depends(get_db)):
    video = VideoRepository.get(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    file_path = settings.UPLOAD_DIR / video.filename
    if not file_path.exists():
        # Check datasets directory
        file_path = settings.DATASETS_DIR / video.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found on disk")

    return FileResponse(path=file_path, media_type="video/mp4", filename=video.filename)


@router.post("/{video_id}/process")
def process_video(
    video_id: str,
    background_tasks: BackgroundTasks,
    camera_id: Optional[str] = "CAM-01",
    db: Session = Depends(get_db)
):
    video = VideoRepository.get(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    file_path = settings.UPLOAD_DIR / video.filename
    if not file_path.exists():
        file_path = settings.DATASETS_DIR / video.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found on disk")

    processor = VideoProcessor(video_id, file_path, camera_id=camera_id)
    background_tasks.add_task(processor.process)

    return {
        "status": "PROCESSING_STARTED",
        "video_id": video_id,
        "message": "AI video analytics pipeline started in background."
    }


@router.get("/{video_id}/progress")
def get_video_progress(video_id: str):
    if video_id in processing_progress:
        return processing_progress[video_id]
    return {
        "progress": 0.0,
        "status": "IDLE",
        "current_frame": 0,
        "total_frames": 0,
        "events_count": 0,
        "error": None
    }


@router.delete("/{video_id}")
def delete_video(video_id: str, db: Session = Depends(get_db)):
    video = VideoRepository.get(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Delete video file if exists
    file_path = settings.UPLOAD_DIR / video.filename
    if file_path.exists():
        file_path.unlink()

    VideoRepository.delete(db, video_id)
    return {"status": "DELETED", "video_id": video_id}
