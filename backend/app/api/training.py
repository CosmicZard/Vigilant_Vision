from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from app.config import settings
from app.services.ai_trainer import AITrainer, training_state
from app.services.yolo_detector import get_yolo_detector

router = APIRouter(prefix="/training", tags=["AI Model Training"])


class TrainRequest(BaseModel):
    base_model: Optional[str] = "yolov8n.pt"
    epochs: Optional[int] = 10
    batch_size: Optional[int] = 8
    image_size: Optional[int] = 640


@router.post("/start")
def start_training(req: TrainRequest):
    """
    Triggers YOLOv8 fine-tuning on civic and road defect datasets in the background.
    """
    if training_state["status"] in ["TRAINING", "PREPARING_DATA"]:
        return {
            "status": "ALREADY_RUNNING",
            "message": "A training session is already in progress.",
            "current_state": training_state
        }

    epochs = max(1, min(50, req.epochs or 10))
    batch_size = max(2, min(32, req.batch_size or 8))

    AITrainer.start_background_training(
        base_model_name=req.base_model or "yolov8n.pt",
        epochs=epochs,
        batch_size=batch_size,
    )

    return {
        "status": "TRAINING_STARTED",
        "epochs": epochs,
        "base_model": req.base_model,
        "message": f"AI model training initialized for {epochs} epochs."
    }


@router.get("/status")
def get_training_status():
    """
    Returns real-time training progress, losses, and mAP metrics.
    """
    return training_state


@router.post("/activate")
def activate_custom_model(model_name: Optional[str] = None):
    """
    Hot-reloads the active YOLOv8 detection engine with the newly trained model weights.
    """
    detector = get_yolo_detector()
    
    target_weights = model_name or "models/vigilant_vision_custom_yolov8.pt"
    p = Path(target_weights)
    if not p.is_absolute():
        p = settings.BASE_DIR / target_weights

    if not p.exists():
        # Check in models dir
        p = settings.MODELS_DIR / "vigilant_vision_custom_yolov8.pt"

    if not p.exists():
        raise HTTPException(
            status_code=404,
            detail="Trained custom model file not found on disk. Run training first."
        )

    try:
        detector.model_name = str(p)
        detector._load_model()
        training_state["active_model"] = str(p.name)
        return {
            "status": "ACTIVATED",
            "model_path": str(p),
            "model_name": p.name,
            "message": f"Successfully activated custom trained model: {p.name}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to activate model: {e}")


@router.get("/models")
def list_available_models():
    """
    Lists all available base and custom trained model weights on disk.
    """
    models = [
        {
            "name": "yolov8n.pt (Base COCO Nano)",
            "type": "base",
            "filename": "yolov8n.pt",
            "size_mb": "6.2",
            "is_active": "yolov8n.pt" in str(training_state["active_model"])
        }
    ]

    custom_weights = settings.MODELS_DIR / "vigilant_vision_custom_yolov8.pt"
    if custom_weights.exists():
        size_mb = round(custom_weights.stat().st_size / (1024 * 1024), 1)
        models.append({
            "name": "vigilant_vision_custom_yolov8.pt (Fine-Tuned Road Defect Model)",
            "type": "custom_trained",
            "filename": "vigilant_vision_custom_yolov8.pt",
            "size_mb": f"{size_mb}",
            "is_active": "custom" in str(training_state["active_model"])
        })

    return models
