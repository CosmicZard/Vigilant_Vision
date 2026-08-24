import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.database.connection import init_db, SessionLocal
from app.database.models import Video, Event, TrafficMetric, Camera
from app.services.synthetic_generator import SyntheticVideoGenerator
from app.services.video_processor import VideoProcessor
from app.config import settings

def test_full_pipeline():
    print("1. Initializing DB...")
    init_db()
    db = SessionLocal()

    cams = db.query(Camera).all()
    print(f"   Seeded Cameras count: {len(cams)}")
    for c in cams:
        print(f"   - {c.camera_id}: {c.name} ({c.latitude}, {c.longitude})")

    print("\n2. Generating Synthetic Road Anomaly Video...")
    sample_video_path = settings.DATASETS_DIR / "test_road_scenario.mp4"
    SyntheticVideoGenerator.generate_road_scenario(
        output_path=sample_video_path,
        duration_sec=6,
        fps=20,
        scenario_type="all_inclusive"
    )
    print(f"   Generated video at: {sample_video_path} ({sample_video_path.stat().st_size} bytes)")

    print("\n3. Registering Video in Database...")
    video_id = "VID-TEST-001"
    existing_video = db.query(Video).filter(Video.video_id == video_id).first()
    if existing_video:
        db.delete(existing_video)
        db.commit()

    video = Video(
        video_id=video_id,
        filename="test_road_scenario.mp4",
        source="synthetic",
        status="QUEUED"
    )
    db.add(video)
    db.commit()

    print("\n4. Running AI Video Processing Pipeline...")
    processor = VideoProcessor(video_id, sample_video_path, camera_id="CAM-01")
    processor.process()

    print("\n5. Verifying Results in Database...")
    processed_video = db.query(Video).filter(Video.video_id == video_id).first()
    print(f"   Video Status: {processed_video.status}")
    print(f"   Duration: {processed_video.duration:.2f}s, Total Frames: {processed_video.total_frames}")

    events = db.query(Event).filter(Event.video_id == video_id).all()
    print(f"\n   Total Events Detected & Validated: {len(events)}")
    for e in events:
        print(f"   - [{e.severity}] {e.event_id}: {e.event_type} | Time: {e.timestamp} | Evidence: {e.evidence_path}")
        print(f"     Desc: {e.description}")

    metrics = db.query(TrafficMetric).filter(TrafficMetric.video_id == video_id).all()
    print(f"\n   Traffic Metric Logs: {len(metrics)}")
    for m in metrics[:3]:
        print(f"   - t={m.timestamp:.1f}s | Vehicles: {m.vehicle_count} | Congestion: {m.congestion_level} | Flow: {m.flow_rate} veh/min")

    # Check evidence directory
    evidence_files = list(settings.EVIDENCE_DIR.glob("*.jpg"))
    print(f"\n   Evidence Files in {settings.EVIDENCE_DIR}: {len(evidence_files)}")
    for ef in evidence_files[:5]:
        print(f"   - {ef.name} ({ef.stat().st_size} bytes)")

    db.close()
    print("\n--- Pipeline Verification SUCCESSFUL! ---")

if __name__ == "__main__":
    test_full_pipeline()
