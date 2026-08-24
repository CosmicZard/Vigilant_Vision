import logging
from typing import List, Dict, Any, Optional
import numpy as np
import cv2
from ultralytics import YOLO

from app.config import settings

logger = logging.getLogger("ibvap.yolo")


class YOLODetector:
    """
    Wraps YOLOv8 for smart road and border video object detection.
    Maps classes: person, car, bus, truck, motorcycle, bicycle, traffic light, stop sign, etc.
    Also provides specialized defect detection heuristics.
    """

    # COCO Class mapping relevant to road / border monitoring
    RELEVANT_CLASSES = {
        0: "person",
        1: "bicycle",
        2: "car",
        3: "motorcycle",
        5: "bus",
        7: "truck",
        9: "traffic light",
        11: "stop sign",
        12: "parking meter",
        13: "bench",
        26: "handbag",
        28: "suitcase",
    }

    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.YOLO_MODEL_NAME
        self.model = None
        self._load_model()

    def _load_model(self):
        try:
            logger.info(f"Loading YOLO model: {self.model_name}...")
            self.model = YOLO(self.model_name)
            logger.info("YOLOv8 Model loaded successfully.")
        except Exception as e:
            logger.error(f"Error loading YOLO model: {e}. Falling back to default YOLOv8n.")
            try:
                self.model = YOLO("yolov8n.pt")
            except Exception as ex:
                logger.error(f"Failed to load fallback YOLO model: {ex}")
                self.model = None

    def detect_objects(self, frame: np.ndarray, conf_threshold: Optional[float] = None) -> List[Dict[str, Any]]:
        """
        Run inference on a single frame.
        Returns list of detections with format:
        {
            "class_id": int,
            "class_name": str,
            "confidence": float,
            "bbox": [x1, y1, x2, y2], # absolute pixels
            "center": (cx, cy),
            "area": float
        }
        """
        if self.model is None or frame is None:
            return []

        conf = conf_threshold if conf_threshold is not None else settings.CONFIDENCE_THRESHOLD
        
        try:
            # Run inference
            results = self.model(frame, conf=conf, verbose=False)
            detections = []

            for result in results:
                boxes = result.boxes
                if boxes is None:
                    continue

                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    score = float(box.conf[0].item())
                    
                    # Filter for traffic / road / border relevant objects
                    class_name = self.RELEVANT_CLASSES.get(cls_id, result.names.get(cls_id, f"obj_{cls_id}"))

                    xyxy = box.xyxy[0].cpu().numpy().tolist()
                    x1, y1, x2, y2 = [int(v) for v in xyxy]
                    cx = (x1 + x2) // 2
                    cy = (y1 + y2) // 2
                    area = (x2 - x1) * (y2 - y1)

                    detections.append({
                        "class_id": cls_id,
                        "class_name": class_name,
                        "confidence": round(score, 3),
                        "bbox": [x1, y1, x2, y2],
                        "center": (cx, cy),
                        "area": area
                    })

            return detections
        except Exception as e:
            logger.error(f"Inference error in YOLO detector: {e}")
            return []


# Global singleton detector instance
detector_instance = None

def get_yolo_detector() -> YOLODetector:
    global detector_instance
    if detector_instance is None:
        detector_instance = YOLODetector()
    return detector_instance
