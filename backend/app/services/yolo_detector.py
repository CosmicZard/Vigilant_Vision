import logging
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import cv2
from ultralytics import YOLO

from app.config import settings

logger = logging.getLogger("ibvap.yolo")


class YOLODetector:
    """
    Advanced YOLOv8 Video Analytics Detector:
    - High sensitivity COCO object detection
    - Adaptive image enhancement (CLAHE / contrast boost for dark or washed-out CCTV)
    - Categorized detection labeling (Vehicles, Pedestrians, Infrastructure, Animals, Obstacles)
    """

    # Comprehensive Class categorization for Smart Road & Border Surveillance
    CATEGORY_MAPPING = {
        # Vehicles
        "car": ("vehicle", "Car"),
        "motorcycle": ("vehicle", "Motorcycle"),
        "bus": ("vehicle", "Bus"),
        "truck": ("vehicle", "Truck"),
        "bicycle": ("vehicle", "Bicycle"),
        "train": ("vehicle", "Train"),
        "airplane": ("vehicle", "Aircraft"),
        "boat": ("vehicle", "Boat"),
        
        # Pedestrians / Vulnerable Road Users
        "person": ("pedestrian", "Pedestrian"),
        
        # Infrastructure / Traffic Devices
        "traffic light": ("infrastructure", "Traffic Light"),
        "stop sign": ("infrastructure", "Stop Sign"),
        "parking meter": ("infrastructure", "Parking Meter"),
        "fire hydrant": ("infrastructure", "Fire Hydrant"),
        
        # Road Obstacles / Luggage / Debris Objects
        "backpack": ("obstacle", "Backpack / Luggage"),
        "umbrella": ("obstacle", "Umbrella"),
        "handbag": ("obstacle", "Handbag / Waste"),
        "tie": ("obstacle", "Object"),
        "suitcase": ("obstacle", "Suitcase / Luggage"),
        "bottle": ("obstacle", "Bottle / Trash"),
        "cup": ("obstacle", "Litter / Cup"),
        "chair": ("obstacle", "Road Obstacle (Chair)"),
        "couch": ("obstacle", "Road Obstacle (Debris)"),
        
        # Animals (Highway / Border Crossing Hazards)
        "dog": ("animal_hazard", "Stray Dog"),
        "cat": ("animal_hazard", "Cat"),
        "horse": ("animal_hazard", "Horse"),
        "sheep": ("animal_hazard", "Livestock / Sheep"),
        "cow": ("animal_hazard", "Livestock / Cow"),
        "elephant": ("animal_hazard", "Wildlife Hazard"),
        "bear": ("animal_hazard", "Wildlife Hazard"),
        
        # Priority Smart Road Defects
        "pothole": ("road_defect", "Pothole"),
        "missing traffic light": ("infrastructure", "Missing Traffic Light"),
        "missing_traffic_light": ("infrastructure", "Missing Traffic Light"),
        "missing sign board": ("infrastructure", "Missing Sign Board"),
        "missing_sign_board": ("infrastructure", "Missing Sign Board"),
        "water logging": ("road_defect", "Water Logging"),
        "water_logging": ("road_defect", "Water Logging"),
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

    def enhance_frame(self, frame: np.ndarray) -> np.ndarray:
        """
        Applies adaptive histogram equalization (CLAHE) on the luminance channel
        to dramatically boost object clarity in dark, shadowed, or hazy road frames.
        """
        try:
            lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            
            # Check average luminance
            avg_lum = np.mean(l)
            if avg_lum < 85 or avg_lum > 190:
                clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
                cl = clahe.apply(l)
                limg = cv2.merge((cl, a, b))
                return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
            return frame
        except Exception:
            return frame

    def detect_objects(
        self,
        frame: np.ndarray,
        conf_threshold: Optional[float] = None,
        apply_enhancement: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Run high-precision inference on a single frame.
        """
        if self.model is None or frame is None:
            return []

        conf = conf_threshold if conf_threshold is not None else settings.CONFIDENCE_THRESHOLD
        
        # Optimize frame contrast if necessary
        proc_frame = self.enhance_frame(frame) if apply_enhancement else frame

        try:
            # Run inference with standardized image size and NMS
            results = self.model(
                proc_frame,
                conf=conf,
                iou=settings.IOU_THRESHOLD,
                imgsz=640,
                verbose=False
            )
            detections = []

            for result in results:
                boxes = result.boxes
                if boxes is None:
                    continue

                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    score = float(box.conf[0].item())
                    raw_name = result.names.get(cls_id, f"obj_{cls_id}").lower()

                    # Extract category and human-friendly display label
                    cat_info = self.CATEGORY_MAPPING.get(raw_name, ("other", raw_name.title()))
                    category, display_name = cat_info

                    xyxy = box.xyxy[0].cpu().numpy().tolist()
                    x1, y1, x2, y2 = [int(v) for v in xyxy]
                    
                    # Sanitize bounding box boundaries
                    h, w = frame.shape[:2]
                    x1, y1 = max(0, x1), max(0, y1)
                    x2, y2 = min(w, x2), min(h, y2)
                    
                    cw = max(0, x2 - x1)
                    ch = max(0, y2 - y1)
                    area = cw * ch
                    
                    if cw < 6 or ch < 6:
                        continue  # Skip microscopic false positives

                    cx = x1 + cw // 2
                    cy = y1 + ch // 2

                    detections.append({
                        "class_id": cls_id,
                        "class_name": raw_name,
                        "display_name": display_name,
                        "category": category,
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
