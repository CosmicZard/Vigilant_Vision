import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseModel):
    PROJECT_NAME: str = "IBVAP - Smart Road & Border Video Analytics (Vigilant Vision)"
    API_V1_STR: str = "/api"
    
    # Storage paths
    BASE_DIR: Path = BASE_DIR
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    EVIDENCE_DIR: Path = BASE_DIR / "evidence"
    DATASETS_DIR: Path = BASE_DIR / "datasets"
    MODELS_DIR: Path = BASE_DIR / "models"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{BASE_DIR / 'ibvap.db'}"
    )
    
    # AI / Detection
    YOLO_MODEL_NAME: str = os.getenv("YOLO_MODEL_NAME", "yolov8n.pt")
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.35"))
    IOU_THRESHOLD: float = float(os.getenv("IOU_THRESHOLD", "0.45"))
    FRAME_SKIP: int = int(os.getenv("FRAME_SKIP", "2"))
    
    # Deduplication & Debounce
    TEMPORAL_WINDOW_SECONDS: float = float(os.getenv("TEMPORAL_WINDOW_SECONDS", "5.0"))
    SPATIAL_IOU_THRESHOLD: float = float(os.getenv("SPATIAL_IOU_THRESHOLD", "0.30"))
    MIN_CONSECUTIVE_FRAMES: int = int(os.getenv("MIN_CONSECUTIVE_FRAMES", "2"))

settings = Settings()

# Ensure required directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
settings.DATASETS_DIR.mkdir(parents=True, exist_ok=True)
settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
