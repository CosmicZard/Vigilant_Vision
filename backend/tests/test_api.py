import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "app"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app
from app.database.connection import init_db

init_db()
client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["platform"] == "IBVAP / Vigilant Vision"
    assert data["status"] == "ONLINE"


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"


def test_cameras_crud():
    # List default seeded cameras
    response = client.get("/api/cameras")
    assert response.status_code == 200
    cameras = response.json()
    assert len(cameras) >= 5

    # Create new camera
    cam_id = f"TEST-CAM-99"
    create_res = client.post("/api/cameras", json={
        "camera_id": cam_id,
        "name": "Testing Camera Node 99",
        "location": "Sector 9 Test Highway",
        "latitude": 28.7000,
        "longitude": 77.1000,
        "stream_url": "rtsp://test/live",
        "zone_type": "HIGHWAY"
    })
    assert create_res.status_code == 200

    # Get created camera
    get_res = client.get(f"/api/cameras/{cam_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Testing Camera Node 99"

    # Delete test camera
    del_res = client.delete(f"/api/cameras/{cam_id}")
    assert del_res.status_code == 200


def test_metrics_summary():
    response = client.get("/api/metrics/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_videos" in data
    assert "total_events" in data
    assert "critical_alerts" in data
    assert "active_cameras" in data


def test_map_endpoints():
    evt_res = client.get("/api/map/events")
    assert evt_res.status_code == 200
    assert evt_res.json()["type"] == "FeatureCollection"

    hot_res = client.get("/api/map/hotspots")
    assert hot_res.status_code == 200
    assert isinstance(hot_res.json(), list)


def test_synthetic_scenario_generation():
    res = client.post("/api/datasets/generate-synthetic?scenario_type=all_inclusive&duration_sec=4&camera_id=CAM-01")
    assert res.status_code == 200
    data = res.json()
    assert "video_id" in data
    assert data["source"] == "synthetic"
