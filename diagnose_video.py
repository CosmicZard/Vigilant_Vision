import cv2
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.services.yolo_detector import get_yolo_detector

def diagnose():
    detector = get_yolo_detector()
    uploads = list(Path("uploads").glob("*.mp4"))
    print("Found video files:", [u.name for u in uploads])
    if not uploads:
        print("No uploaded videos found in uploads/")
        return

    vid = uploads[0]
    cap = cv2.VideoCapture(str(vid))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_HEIGHT) if hasattr(cv2, 'CAP_PROP_HEIGHT') else cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"Video {vid.name}: {w}x{h} @ {fps:.1f} FPS, {total} frames")

    frame_num = 0
    detected_summary = {}

    while cap.isOpened() and frame_num < 120:
        ret, frame = cap.read()
        if not ret:
            break
        frame_num += 1

        if frame_num % 10 == 0:
            dets_standard = detector.detect_objects(frame, conf_threshold=0.20)
            items = [f"{d['class_name']} ({d['confidence']:.2f})" for d in dets_standard]
            print(f"Frame {frame_num:03d} (conf=0.20): {len(dets_standard)} detections -> {items}")
            for d in dets_standard:
                c = d["class_name"]
                detected_summary[c] = detected_summary.get(c, 0) + 1

    cap.release()
    print("\nSummary of classes observed across sample frames:", detected_summary)

if __name__ == "__main__":
    diagnose()
