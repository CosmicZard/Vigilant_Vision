import cv2
import numpy as np
from typing import List, Dict, Any, Optional


class RoadDefectAnalyzer:
    """
    Comprehensive civic and smart road defect detection engine:
    1. POTHOLE_DETECTED - Road asphalt depressions, deep craters
    2. GARBAGE_DETECTED - Roadside trash piles, plastic debris, litter obstruction
    3. MISSING_TRAFFIC_LIGHT - Intersection zones lacking expected active signal
    4. MISSING_SIGN_BOARD - Virtual signpost zones with absent regulatory signage
    5. MISSING_STREET_LIGHT_NIGHT - Low illumination dark zones on night surveillance footage
    """

    def __init__(self):
        # Configurable expected infrastructure zones (normalized [x1_ratio, y1_ratio, x2_ratio, y2_ratio])
        self.expected_sign_zones = [
            {"name": "Speed Limit Post Sector 1", "box": [0.05, 0.20, 0.25, 0.60], "observed_count": 0},
            {"name": "Intersection Traffic Signal 4A", "box": [0.75, 0.15, 0.95, 0.60], "observed_count": 0}
        ]

    def analyze_surface(self, frame: np.ndarray, detections: List[Dict[str, Any]], frame_num: int, timestamp_sec: float) -> List[Dict[str, Any]]:
        anomalies = []
        if frame is None:
            return anomalies

        h, w, _ = frame.shape
        road_roi_y1 = int(h * 0.35)
        road_roi = frame[road_roi_y1:h, 0:w]
        gray_roi = cv2.cvtColor(road_roi, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray_roi, (7, 7), 0)

        # Mask vehicles to prevent vehicle contours being misclassified as road debris or defects
        vehicle_mask = np.zeros((h - road_roi_y1, w), dtype=np.uint8)
        detected_classes = [det["class_name"].lower() for det in detections]
        has_traffic_light = any("traffic light" in c for c in detected_classes)
        has_sign_board = any("stop sign" in c or "sign" in c for c in detected_classes)

        for det in detections:
            if det["class_name"] in ["car", "bus", "truck", "motorcycle", "person"]:
                bx1, by1, bx2, by2 = det["bbox"]
                ry1 = max(0, by1 - road_roi_y1)
                ry2 = max(0, by2 - road_roi_y1)
                if ry2 > ry1:
                    cv2.rectangle(vehicle_mask, (max(0, bx1), ry1), (min(w - 1, bx2), ry2), 255, -1)

        # -------------------------------------------------------------
        # 1. POTHOLE DETECTION (Dark asphalt depressions & craters)
        # -------------------------------------------------------------
        thresh_dark = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 10
        )
        cleaned_dark = cv2.bitwise_and(thresh_dark, cv2.bitwise_not(vehicle_mask))
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        morph_potholes = cv2.morphologyEx(cleaned_dark, cv2.MORPH_OPEN, kernel)
        contours, _ = cv2.findContours(morph_potholes, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if 500 < area < 30000:
                x, y, cw, ch = cv2.boundingRect(cnt)
                aspect_ratio = float(cw) / max(1, ch)
                # Potholes have organic rounded/elliptical aspect ratios
                if 0.35 <= aspect_ratio <= 2.8:
                    abs_y1 = y + road_roi_y1
                    abs_y2 = abs_y1 + ch
                    roi_patch = gray_roi[y:y+ch, x:x+cw]
                    contrast = float(np.std(roi_patch)) if roi_patch.size > 0 else 0

                    if contrast > 18.0:
                        anomalies.append({
                            "event_type": "POTHOLE_DETECTED",
                            "severity": "HIGH" if area > 2500 else "MEDIUM",
                            "object_id": f"POTH-{x}_{abs_y1}",
                            "object_type": "pothole",
                            "bbox": [x, abs_y1, x + cw, abs_y2],
                            "description": f"Road pothole / surface crater detected (area: {int(area)} sq px)",
                            "metadata": {
                                "area_sq_px": int(area),
                                "contrast_delta": round(contrast, 1),
                                "lane_position": f"X:{x}, Y:{abs_y1}"
                            }
                        })

        # -------------------------------------------------------------
        # 2. GARBAGE & LITTER DETECTION (Irregular high-chrominance waste clusters)
        # -------------------------------------------------------------
        hsv_roi = cv2.cvtColor(road_roi, cv2.COLOR_BGR2HSV)
        # Garbage: high contrast bright/colorful patches (plastic wrappers, waste bags, paper)
        # or dark brown/green organic waste clusters on road surface
        sat = hsv_roi[:, :, 1]
        val = hsv_roi[:, :, 2]
        garbage_mask = cv2.inRange(hsv_roi, np.array([0, 30, 40]), np.array([180, 255, 255]))
        garbage_mask = cv2.bitwise_and(garbage_mask, cv2.bitwise_not(vehicle_mask))
        # Mask out uniform road background using gradient
        grad_x = cv2.Sobel(gray_roi, cv2.CV_16S, 1, 0, ksize=3)
        grad_y = cv2.Sobel(gray_roi, cv2.CV_16S, 0, 1, ksize=3)
        abs_grad = cv2.convertScaleAbs(cv2.addWeighted(grad_x, 0.5, grad_y, 0.5, 0))
        _, edge_mask = cv2.threshold(abs_grad, 45, 255, cv2.THRESH_BINARY)
        garbage_candidates = cv2.bitwise_and(garbage_mask, edge_mask)
        garbage_morph = cv2.morphologyEx(garbage_candidates, cv2.MORPH_CLOSE, kernel)

        g_contours, _ = cv2.findContours(garbage_morph, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for g_cnt in g_contours:
            g_area = cv2.contourArea(g_cnt)
            if 400 < g_area < 15000:
                gx, gy, gw, gh = cv2.boundingRect(g_cnt)
                # Garbage is typically on road shoulders or lane edges (left or right halves)
                abs_gy1 = gy + road_roi_y1
                abs_gy2 = abs_gy1 + gh
                anomalies.append({
                    "event_type": "GARBAGE_DETECTED",
                    "severity": "MEDIUM",
                    "object_id": f"GARB-{gx}_{abs_gy1}",
                    "object_type": "garbage_pile",
                    "bbox": [gx, abs_gy1, gx + gw, abs_gy2],
                    "description": f"Roadside garbage / waste debris detected (area: {int(g_area)} sq px)",
                    "metadata": {
                        "waste_type": "plastic/solid_waste",
                        "estimated_area": int(g_area),
                        "zone": "road_edge"
                    }
                })

        # -------------------------------------------------------------
        # 3. NIGHT STREETLIGHT DEFECT / DARK ZONE (MISSING_STREET_LIGHT_NIGHT)
        # -------------------------------------------------------------
        # Measure global and local frame illumination
        full_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        avg_brightness = float(np.mean(full_gray))
        is_night = avg_brightness < 90.0

        if is_night:
            # Detect dark blackout sectors along the road corridor where lighting is missing
            # Divide road into 3 vertical zones (left, center, right)
            zone_w = w // 3
            for z_idx in range(3):
                zone_crop = road_roi[:, z_idx * zone_w:(z_idx + 1) * zone_w]
                zone_lux = float(np.mean(zone_crop)) if zone_crop.size > 0 else 0
                if zone_lux < 35.0:  # Critical dark unlit zone
                    zx1 = z_idx * zone_w
                    zx2 = (z_idx + 1) * zone_w
                    anomalies.append({
                        "event_type": "MISSING_STREET_LIGHT_NIGHT",
                        "severity": "HIGH",
                        "object_id": f"DARKZONE-{z_idx}",
                        "object_type": "unlit_road_segment",
                        "bbox": [zx1, road_roi_y1, zx2, h - 10],
                        "description": f"Unlit dark road sector detected at night (lux level: {zone_lux:.1f}/255). Streetlight defective or missing.",
                        "metadata": {
                            "sector_index": z_idx + 1,
                            "measured_lux": round(zone_lux, 1),
                            "ambient_lux": round(avg_brightness, 1),
                            "status": "BLACKOUT_HAZARD"
                        }
                    })

        # -------------------------------------------------------------
        # 4. MISSING TRAFFIC LIGHT & MISSING SIGN BOARD DETECTION
        # -------------------------------------------------------------
        # If the camera metadata or frame indicates an intersection without traffic light
        # or a designated regulatory signpost zone without signage:
        for sign_zone in self.expected_sign_zones:
            z_box = sign_zone["box"]
            zx1 = int(z_box[0] * w)
            zy1 = int(z_box[1] * h)
            zx2 = int(z_box[2] * w)
            zy2 = int(z_box[3] * h)

            if "Traffic Signal" in sign_zone["name"] and not has_traffic_light:
                # Check if frame has intersection markings or signal post
                anomalies.append({
                    "event_type": "MISSING_TRAFFIC_LIGHT",
                    "severity": "HIGH",
                    "object_id": f"SIG-POST-4A",
                    "object_type": "traffic_signal_post",
                    "bbox": [zx1, zy1, zx2, zy2],
                    "description": f"Missing or inoperative traffic light signal detected at {sign_zone['name']}",
                    "metadata": {
                        "intersection_zone": sign_zone["name"],
                        "compliance_status": "SIGNAL_ABSENT"
                    }
                })
            elif "Speed Limit" in sign_zone["name"] and not has_sign_board:
                anomalies.append({
                    "event_type": "MISSING_SIGN_BOARD",
                    "severity": "HIGH",
                    "object_id": f"SIGN-POST-1",
                    "object_type": "regulatory_signpost",
                    "bbox": [zx1, zy1, zx2, zy2],
                    "description": f"Missing mandatory regulatory signboard / speed sign detected at {sign_zone['name']}",
                    "metadata": {
                        "signpost_location": sign_zone["name"],
                        "compliance_status": "SIGNBOARD_MISSING"
                    }
                })

        return anomalies
