import sys
from pathlib import Path

# Add root and backend to sys.path
root_dir = Path(__file__).resolve().parent
backend_dir = root_dir / "backend"
sys.path.insert(0, str(root_dir))
sys.path.insert(0, str(backend_dir))

from backend.tests.test_api import (
    test_root_endpoint,
    test_health_endpoint,
    test_cameras_crud,
    test_metrics_summary,
    test_map_endpoints,
    test_synthetic_scenario_generation,
    test_training_endpoints
)
from backend.tests.test_event_engine import (
    test_iou_computation,
    test_event_deduplication_and_debounce
)

def run_all_tests():
    print("=== Running Backend Test Suite ===")
    
    tests = [
        ("test_root_endpoint", test_root_endpoint),
        ("test_health_endpoint", test_health_endpoint),
        ("test_cameras_crud", test_cameras_crud),
        ("test_metrics_summary", test_metrics_summary),
        ("test_map_endpoints", test_map_endpoints),
        ("test_synthetic_scenario_generation", test_synthetic_scenario_generation),
        ("test_training_endpoints", test_training_endpoints),
        ("test_iou_computation", test_iou_computation),
        ("test_event_deduplication_and_debounce", test_event_deduplication_and_debounce),
    ]

    passed = 0
    failed = 0

    for name, func in tests:
        try:
            print(f"-> Running {name}...", end=" ")
            func()
            print("[PASS]")
            passed += 1
        except Exception as e:
            print(f"[FAIL]: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

    print(f"\nResults: {passed} passed, {failed} failed out of {len(tests)} tests.")
    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_all_tests()
