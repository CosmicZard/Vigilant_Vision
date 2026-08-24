import sys
import numpy as np
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.database.connection import SessionLocal, init_db
from app.services.event_engine import EventEngine
from app.services.tracker import compute_iou


def test_iou_computation():
    box1 = [0, 0, 100, 100]
    box2 = [50, 50, 150, 150]
    iou = compute_iou(box1, box2)
    # Area 1 = 10000, Area 2 = 10000, Intersection = 50*50 = 2500, Union = 17500 -> IoU ~ 0.1428
    assert round(iou, 3) == 0.143

    # Exact overlap
    assert compute_iou(box1, box1) == 1.0

    # No overlap
    box3 = [200, 200, 300, 300]
    assert compute_iou(box1, box3) == 0.0


def test_event_deduplication_and_debounce():
    init_db()
    db = SessionLocal()
    engine = EventEngine()

    dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)

    candidate = {
        "event_type": "WRONG_WAY_DRIVING",
        "severity": "HIGH",
        "object_id": "TEST-TRK-1",
        "bbox": [100, 100, 200, 200],
        "description": "Test wrong-way driving vehicle",
        "metadata": {"speed": 45.0}
    }

    # Frame 1: Should create a new event
    evt1 = engine.process_candidate_event(
        db=db,
        candidate=candidate,
        frame=dummy_frame,
        video_id="TEST-V-1",
        camera_id="CAM-01",
        location="Sector Alpha",
        frame_num=10,
        timestamp_sec=1.0,
        latitude=28.6139,
        longitude=77.2090
    )
    assert evt1 is not None
    assert evt1.event_type == "WRONG_WAY_DRIVING"
    assert evt1.severity == "HIGH"

    # Frame 2 (0.2s later, same object): Should be deduplicated into existing event
    evt2 = engine.process_candidate_event(
        db=db,
        candidate=candidate,
        frame=dummy_frame,
        video_id="TEST-V-1",
        camera_id="CAM-01",
        location="Sector Alpha",
        frame_num=15,
        timestamp_sec=1.2,
        latitude=28.6139,
        longitude=77.2090
    )
    assert evt2 is None, "Immediate consecutive duplicate detection must be deduplicated."

    db.close()
