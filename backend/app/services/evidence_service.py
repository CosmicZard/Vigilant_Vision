import cv2
import numpy as np
from pathlib import Path
from typing import List, Optional, Dict, Any
from app.config import settings


class EvidenceGenerator:
    """
    Creates professional, annotated evidence snapshots with HUD watermarks,
    severity-coded bounding boxes, and timestamped forensic banners.
    """

    SEVERITY_COLORS = {
        "LOW": (76, 175, 80),        # Green (BGR: 80, 175, 76) -> OpenCV uses BGR: (80, 175, 76)
        "MEDIUM": (0, 165, 255),     # Orange (BGR: 0, 165, 255)
        "HIGH": (0, 69, 255),        # Red-Orange (BGR: 0, 69, 255)
        "CRITICAL": (36, 36, 235),   # Crimson Red (BGR: 36, 36, 235)
    }

    @classmethod
    def generate_and_save(
        cls,
        frame: np.ndarray,
        event_id: str,
        event_type: str,
        severity: str,
        timestamp_str: str,
        camera_id: str,
        location: str,
        bbox: Optional[List[int]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Annotates frame with HUD metadata and bounding boxes, then saves to evidence/EVT-XXXXXX.jpg.
        Returns the relative file path.
        """
        if frame is None:
            return ""

        annotated = frame.copy()
        h, w, _ = annotated.shape
        color = cls.SEVERITY_COLORS.get(severity.upper(), (0, 165, 255))

        # 1. Draw Target Bounding Box if provided
        if bbox and len(bbox) == 4:
            x1, y1, x2, y2 = [int(v) for v in bbox]
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w - 1, x2), min(h - 1, y2)

            # Target Box with thicker double border for clarity
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (255, 255, 255), 6) # Outer white border
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 4)           # Inner color border
            
            # Semi-transparent overlay inside the box
            overlay = annotated.copy()
            cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)
            cv2.addWeighted(overlay, 0.25, annotated, 0.75, 0, annotated)

            # Corner markers (thicker)
            corner_len = min(25, (x2 - x1) // 3, (y2 - y1) // 3)
            if corner_len > 0:
                # Top-left
                cv2.line(annotated, (x1, y1), (x1 + corner_len, y1), (0, 0, 0), 8)
                cv2.line(annotated, (x1, y1), (x1 + corner_len, y1), (255, 255, 255), 4)
                cv2.line(annotated, (x1, y1), (x1, y1 + corner_len), (0, 0, 0), 8)
                cv2.line(annotated, (x1, y1), (x1, y1 + corner_len), (255, 255, 255), 4)
                # Bottom-right
                cv2.line(annotated, (x2, y2), (x2 - corner_len, y2), (0, 0, 0), 8)
                cv2.line(annotated, (x2, y2), (x2 - corner_len, y2), (255, 255, 255), 4)
                cv2.line(annotated, (x2, y2), (x2, y2 - corner_len), (0, 0, 0), 8)
                cv2.line(annotated, (x2, y2), (x2, y2 - corner_len), (255, 255, 255), 4)

            # Floating Tag above box (Bolder and Larger)
            tag = f"{event_type.replace('_', ' ')} [{severity}]"
            font = cv2.FONT_HERSHEY_DUPLEX
            (tw, th), _ = cv2.getTextSize(tag, font, 0.8, 2)
            tag_y1 = max(0, y1 - th - 15)
            # Tag background shadow
            cv2.rectangle(annotated, (x1, tag_y1), (x1 + tw + 14, y1), (0, 0, 0), -1)
            # Tag color background
            cv2.rectangle(annotated, (x1, tag_y1), (x1 + tw + 10, y1), color, -1)
            # Tag text
            cv2.putText(annotated, tag, (x1 + 5, y1 - 6), font, 0.8, (255, 255, 255), 2, cv2.LINE_AA)

        # 2. Draw Top HUD Banner
        banner_h = 44
        cv2.rectangle(annotated, (0, 0), (w, banner_h), (20, 24, 33), -1)
        # Severity indicator bar
        cv2.rectangle(annotated, (0, 0), (10, banner_h), color, -1)

        # Title & Event ID
        cv2.putText(
            annotated,
            f"VIGILANT VISION FORENSIC EVIDENCE  |  ID: {event_id}",
            (22, 28),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (255, 255, 255),
            2,
            cv2.LINE_AA
        )

        # 3. Draw Bottom Telemetry Bar
        bot_banner_h = 36
        cv2.rectangle(annotated, (0, h - bot_banner_h), (w, h), (20, 24, 33), -1)
        cv2.rectangle(annotated, (0, h - 3), (w, h), color, -1)

        telemetry_text = f"CAM: {camera_id}  |  LOC: {location}  |  TIME: {timestamp_str}  |  SEVERITY: {severity}"
        cv2.putText(
            annotated,
            telemetry_text,
            (16, h - 12),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (200, 210, 220),
            1,
            cv2.LINE_AA
        )

        # 4. Save Evidence Image
        evidence_filename = f"{event_id}.jpg"
        save_path = settings.EVIDENCE_DIR / evidence_filename
        cv2.imwrite(str(save_path), annotated)

        # Return relative path for web serving
        return f"evidence/{evidence_filename}"
