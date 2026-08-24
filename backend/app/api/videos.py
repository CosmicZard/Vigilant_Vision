import json
import shutil
import uuid
import cv2
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Request
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database.connection import get_db
from app.database.models import Video, Camera, Event
from app.database.repositories import VideoRepository
from app.models.schemas import VideoResponse
from app.services.video_processor import VideoProcessor, processing_progress

router = APIRouter(prefix="/videos", tags=["Videos"])


def stream_video_with_range(request: Request, file_path: Path, content_type: str = "video/mp4"):
    """
    HTTP 206 Partial Content Byte Range streaming:
    Allows Chrome, Edge, and iOS/Android HTML5 video players to buffer, seek,
    and play large video files without stalling or hanging.
    """
    file_size = file_path.stat().st_size
    range_header = request.headers.get("range")

    if not range_header:
        # Full content response
        def iter_full():
            with open(file_path, "rb") as f:
                while chunk := f.read(1024 * 1024):
                    yield chunk

        return StreamingResponse(
            iter_full(),
            status_code=200,
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
                "Content-Type": content_type,
            },
        )

    # Parse Range: bytes=start-end
    range_str = range_header.replace("bytes=", "").strip()
    parts = range_str.split("-")
    start = int(parts[0]) if parts[0] else 0
    end = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1
    end = min(end, file_size - 1)
    content_length = end - start + 1

    def iter_range():
        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = content_length
            chunk_size = 1024 * 512  # 512 KB chunks for smooth browser buffer
            while remaining > 0:
                read_size = min(chunk_size, remaining)
                chunk = f.read(read_size)
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": content_type,
    }
    return StreamingResponse(iter_range(), status_code=206, headers=headers)


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
def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    camera_id: Optional[str] = Form("CAM-01"),
    db: Session = Depends(get_db)
):
    video_id = f"VID-{uuid.uuid4().hex[:8].upper()}"
    raw_name = file.filename or "video.mp4"
    clean_orig_name = Path(raw_name).name.replace(" ", "_")
    filename = f"{video_id}_{clean_orig_name}"
    file_path = settings.UPLOAD_DIR / filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Probe duration and FPS with OpenCV
    duration = 0.0
    fps = 24.0
    try:
        cap = cv2.VideoCapture(str(file_path))
        if cap.isOpened():
            fps_val = cap.get(cv2.CAP_PROP_FPS)
            fps = fps_val if fps_val and fps_val > 0 else 24.0
            total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
            if total_frames and total_frames > 0:
                duration = total_frames / fps
        cap.release()
    except Exception:
        pass

    video = Video(
        video_id=video_id,
        filename=filename,
        source="upload",
        duration=round(duration, 2),
        fps=round(fps, 1),
        status="QUEUED"
    )
    saved_video = VideoRepository.create(db, video)

    # Automatically launch background AI processing on upload
    assigned_cam = camera_id or "CAM-01"
    processor = VideoProcessor(video_id, file_path, camera_id=assigned_cam)
    background_tasks.add_task(processor.process)

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
def stream_video(video_id: str, request: Request, db: Session = Depends(get_db)):
    video = VideoRepository.get(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    file_path = settings.UPLOAD_DIR / video.filename
    if not file_path.exists():
        # Check datasets directory
        file_path = settings.DATASETS_DIR / video.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found on disk")

    return stream_video_with_range(request, file_path)


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


@router.get("/{video_id}/detections")
def get_video_detections(video_id: str, db: Session = Depends(get_db)):
    """
    Returns all timestamped object detections for the video,
    allowing the frontend player to overlay live AI bounding boxes.
    """
    from app.database.models import Detection
    dets = db.query(Detection).filter(Detection.video_id == video_id).order_by(Detection.timestamp.asc()).all()
    result = []
    for d in dets:
        try:
            bbox = json.loads(d.bounding_box) if d.bounding_box else [0, 0, 0, 0]
        except Exception:
            bbox = [0, 0, 0, 0]
        result.append({
            "detection_id": d.detection_id,
            "frame_number": d.frame_number,
            "timestamp": d.timestamp,
            "object_type": d.object_type,
            "confidence": d.confidence,
            "bbox": bbox,
            "track_id": d.track_id
        })
    return result


@router.delete("/synthetic/clear")
def clear_synthetic_videos(db: Session = Depends(get_db)):
    """
    Deletes all synthetic sample test videos and their associated detections/events.
    """
    from app.database.models import Detection, Event, TrafficMetric
    sample_videos = db.query(Video).filter(
        (Video.source == "synthetic") | 
        (Video.video_id.like("SYN-%")) | 
        (Video.video_id.like("TEST-%")) |
        (Video.video_id.like("VID-TEST%"))
    ).all()

    count = len(sample_videos)
    for v in sample_videos:
        db.query(Detection).filter(Detection.video_id == v.video_id).delete()
        db.query(Event).filter(Event.video_id == v.video_id).delete()
        db.query(TrafficMetric).filter(TrafficMetric.video_id == v.video_id).delete()
        db.delete(v)
        f_path = settings.DATASETS_DIR / v.filename
        if f_path.exists():
            try:
                f_path.unlink()
            except Exception:
                pass

    db.commit()
    return {"status": "SUCCESS", "cleared_count": count}


@router.delete("/{video_id}")
def delete_video(video_id: str, db: Session = Depends(get_db)):
    video = VideoRepository.get(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Delete video file if exists
    file_path = settings.UPLOAD_DIR / video.filename
    if not file_path.exists():
        file_path = settings.DATASETS_DIR / video.filename
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception:
            pass

    VideoRepository.delete(db, video_id)
    return {"status": "DELETED", "video_id": video_id}
