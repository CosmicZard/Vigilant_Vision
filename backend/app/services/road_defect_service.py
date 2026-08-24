import cv2
import numpy as np
from typing import List, Dict, Any, Optional


class RoadDefectAnalyzer:
    """
    Comprehensive civic and smart road defect detection engine:
    1. POTHOLE_DETECTED - Road asphalt depressions, deep craters
    2. GARBAGE_DETECTED - Roadside trash piles, plastic debris, dropped cargo/luggage
    3. WATERLOGGING_DETECTED - Road surface ponding, water puddles, and flooded sectors
    4. PEDESTRIAN_HAZARD - Vulnerable road users / pedestrians in active vehicle corridors
    5. ANIMAL_HAZARD - Stray livestock or animals on road
    """

    def __init__(self):
        pass

    def analyze_surface(
        self,
        frame: np.ndarray,
        detections: List[Dict[str, Any]],
        frame_num: int,
        timestamp_sec: float
    ) -> List[Dict[str, Any]]:
        anomalies = []
        if frame is None:
            return anomalies

        h, w, _ = frame.shape
        road_roi_y1 = int(h * 0.30)
        road_roi = frame[road_roi_y1:h, 0:w]
        gray_roi = cv2.cvtColor(road_roi, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray_roi, (7, 7), 0)

        # Mask vehicles to prevent vehicle contours being misclassified as road surface defects
        vehicle_mask = np.zeros((h - road_roi_y1, w), dtype=np.uint8)
        
        for det in detections:
            cat = det.get("category")
            class_name = det.get("class_name", "")

            # -------------------------------------------------------------
            # A. Convert Object Detections (Obstacles, Animals, Pedestrians)
            # -------------------------------------------------------------
            bx1, by1, bx2, by2 = det["bbox"]

            if cat == "vehicle":
                ry1 = max(0, by1 - road_roi_y1)
                ry2 = max(0, by2 - road_roi_y1)
                if ry2 > ry1:
                    cv2.rectangle(vehicle_mask, (max(0, bx1), ry1), (min(w - 1, bx2), ry2), 255, -1)

            elif cat == "obstacle":
                # Dropped luggage, trash, bottles, boxes on roadway
                anomalies.append({
                    "event_type": "GARBAGE_DETECTED",
                    "severity": "MEDIUM",
                    "object_id": f"OBST-{bx1}_{by1}",
                    "object_type": class_name,
                    "bbox": [bx1, by1, bx2, by2],
                    "description": f"Roadside debris / obstruction detected: {det.get('display_name', class_name)} (conf: {det.get('confidence', 0.8):.2f})",
                    "metadata": {
                        "detection_confidence": det.get("confidence"),
                        "item_type": class_name,
                        "zone": "road_corridor"
                    }
                })

            elif cat == "animal_hazard":
                anomalies.append({
                    "event_type": "ANIMAL_ON_ROAD",
                    "severity": "HIGH",
                    "object_id": f"ANML-{bx1}_{by1}",
                    "object_type": class_name,
                    "bbox": [bx1, by1, bx2, by2],
                    "description": f"Animal hazard detected on roadway: {det.get('display_name', class_name)}",
                    "metadata": {
                        "animal_type": class_name,
                        "confidence": det.get("confidence")
                    }
                })

            elif cat == "pedestrian" and by2 > road_roi_y1:
                # Pedestrian inside active road lane
                anomalies.append({
                    "event_type": "PEDESTRIAN_HAZARD",
                    "severity": "HIGH",
                    "object_id": f"PED-{bx1}_{by1}",
                    "object_type": "pedestrian",
                    "bbox": [bx1, by1, bx2, by2],
                    "description": f"Pedestrian detected inside active traffic corridor (conf: {det.get('confidence', 0.8):.2f})",
                    "metadata": {
                        "confidence": det.get("confidence"),
                        "position_y": by2
                    }
                })

        # -------------------------------------------------------------
        # 1. POTHOLE DETECTION (Dark asphalt depressions & craters)
        # -------------------------------------------------------------
        pothole_thresh = max(18, int(np.mean(gray_roi) * 0.60))
        _, dark_pothole_mask = cv2.threshold(blurred, pothole_thresh, 255, cv2.THRESH_BINARY_INV)
        dark_pothole_mask = cv2.bitwise_and(dark_pothole_mask, cv2.bitwise_not(vehicle_mask))
        
        # Corridor mask (in driving lanes where vehicles hit potholes)
        corridor_mask = np.zeros_like(gray_roi)
        corridor_mask[:, int(w * 0.16):int(w * 0.84)] = 255
        dark_pothole_mask = cv2.bitwise_and(dark_pothole_mask, corridor_mask)

        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        morph_potholes = cv2.morphologyEx(dark_pothole_mask, cv2.MORPH_OPEN, kernel)
        contours, _ = cv2.findContours(morph_potholes, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if 400 < area < 30000:
                x, y, cw, ch = cv2.boundingRect(cnt)
                aspect_ratio = float(cw) / max(1, ch)
                if 0.35 <= aspect_ratio <= 3.0:
                    abs_y1 = y + road_roi_y1
                    abs_y2 = abs_y1 + ch
                    anomalies.append({
                        "event_type": "POTHOLE_DETECTED",
                        "severity": "HIGH" if area > 1800 else "MEDIUM",
                        "object_id": f"POTH-{x}_{abs_y1}",
                        "object_type": "pothole",
                        "bbox": [x, abs_y1, x + cw, abs_y2],
                        "description": f"Road pothole / surface crater detected (area: {int(area)} sq px)",
                        "metadata": {
                            "area_sq_px": int(area),
                            "lane_position": f"X:{x}, Y:{abs_y1}"
                        }
                    })

        # -------------------------------------------------------------
        # 2. GARBAGE & LITTER CLUSTERS (Roadside shoulder debris)
        # -------------------------------------------------------------
        hsv_roi = cv2.cvtColor(road_roi, cv2.COLOR_BGR2HSV)
        
        # Detect high saturation/contrast color debris clusters on road shoulders (left 25% or right 25%)
        garbage_candidate_mask = cv2.inRange(hsv_roi, np.array([0, 50, 60]), np.array([180, 255, 255]))
        bright_debris = cv2.inRange(hsv_roi, np.array([0, 0, 210]), np.array([180, 40, 255]))
        garbage_candidate_mask = cv2.bitwise_or(garbage_candidate_mask, bright_debris)
        garbage_candidate_mask = cv2.bitwise_and(garbage_candidate_mask, cv2.bitwise_not(vehicle_mask))
        
        # Keep only road edges / shoulder zones
        shoulder_mask = np.zeros_like(gray_roi)
        shoulder_mask[:, :int(w * 0.25)] = 255
        shoulder_mask[:, int(w * 0.75):] = 255
        garbage_candidate_mask = cv2.bitwise_and(garbage_candidate_mask, shoulder_mask)

        kernel_g = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
        morph_garbage = cv2.morphologyEx(garbage_candidate_mask, cv2.MORPH_CLOSE, kernel_g)
        g_contours, _ = cv2.findContours(morph_garbage, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in g_contours:
            g_area = cv2.contourArea(cnt)
            if 300 < g_area < 25000:
                gx, gy, gcw, gch = cv2.boundingRect(cnt)
                aspect = float(gcw) / max(1, gch)
                if 0.3 <= aspect <= 3.5:
                    abs_gy1 = gy + road_roi_y1
                    abs_gy2 = abs_gy1 + gch
                    anomalies.append({
                        "event_type": "GARBAGE_DETECTED",
                        "severity": "MEDIUM",
                        "object_id": f"GARB-{gx}_{abs_gy1}",
                        "object_type": "garbage_pile",
                        "bbox": [gx, abs_gy1, gx + gcw, abs_gy2],
                        "description": f"Roadside garbage / waste debris detected (area: {int(g_area)} sq px)",
                        "metadata": {
                            "waste_type": "plastic/solid_waste",
                            "estimated_area": int(g_area),
                            "zone": "road_edge"
                        }
                    })

        # -------------------------------------------------------------
        # 3. WATERLOGGING & ROAD FLOODING DETECTION
        # -------------------------------------------------------------
        # Waterlogged asphalt in driving lanes: Blue/Cyan tint (H: 80-140, S: 25-255, V: 65-255)
        water_mask = cv2.inRange(hsv_roi, np.array([80, 25, 65]), np.array([135, 255, 255]))
        water_mask = cv2.bitwise_and(water_mask, corridor_mask)
        water_mask = cv2.bitwise_and(water_mask, cv2.bitwise_not(vehicle_mask))

        kernel_w = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        morph_water = cv2.morphologyEx(water_mask, cv2.MORPH_CLOSE, kernel_w)
        morph_water = cv2.morphologyEx(morph_water, cv2.MORPH_OPEN, kernel_w)
        w_contours, _ = cv2.findContours(morph_water, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in w_contours:
            w_area = cv2.contourArea(cnt)
            if 500 < w_area < 45000:
                wx, wy, wcw, wch = cv2.boundingRect(cnt)
                w_aspect = float(wcw) / max(1, wch)
                if 0.35 <= w_aspect <= 4.5:
                    abs_wy1 = wy + road_roi_y1
                    abs_wy2 = abs_wy1 + wch
                    anomalies.append({
                        "event_type": "WATERLOGGING_DETECTED",
                        "severity": "HIGH" if w_area > 2500 else "MEDIUM",
                        "object_id": f"WTR-{wx}_{abs_wy1}",
                        "object_type": "waterlogging",
                        "bbox": [wx, abs_wy1, wx + wcw, abs_wy2],
                        "description": f"Waterlogging / standing road water detected (area: {int(w_area)} sq px). Hydroplaning hazard.",
                        "metadata": {
                            "waterlogged_area_sq_px": int(w_area),
                            "hazard_type": "standing_water_puddle",
                            "lane_position": f"X:{wx}, Y:{abs_wy1}"
                        }
                    })

        return anomalies
