import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import Camera
from app.database.repositories import CameraRepository
from app.models.schemas import CameraCreate, CameraUpdate, CameraResponse

router = APIRouter(prefix="/cameras", tags=["Cameras"])


@router.get("", response_model=List[CameraResponse])
def list_cameras(db: Session = Depends(get_db)):
    cameras = CameraRepository.list(db)
    return [CameraResponse.model_validate(c) for c in cameras]


@router.post("", response_model=CameraResponse)
def create_camera(camera_in: CameraCreate, db: Session = Depends(get_db)):
    existing = CameraRepository.get(db, camera_in.camera_id)
    if existing:
        raise HTTPException(status_code=400, detail="Camera ID already exists")
    camera = CameraRepository.create(db, camera_in)
    return CameraResponse.model_validate(camera)


@router.get("/{camera_id}", response_model=CameraResponse)
def get_camera(camera_id: str, db: Session = Depends(get_db)):
    camera = CameraRepository.get(db, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return CameraResponse.model_validate(camera)


@router.patch("/{camera_id}", response_model=CameraResponse)
def update_camera(camera_id: str, camera_in: CameraUpdate, db: Session = Depends(get_db)):
    camera = CameraRepository.update(db, camera_id, camera_in)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return CameraResponse.model_validate(camera)


@router.delete("/{camera_id}")
def delete_camera(camera_id: str, db: Session = Depends(get_db)):
    success = CameraRepository.delete(db, camera_id)
    if not success:
        raise HTTPException(status_code=404, detail="Camera not found")
    return {"status": "DELETED", "camera_id": camera_id}
