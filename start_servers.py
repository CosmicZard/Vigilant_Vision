"""
IBVAP / Vigilant Vision - Unified Application Server Launcher
Launches FastAPI backend (port 8000) and React frontend (port 5173) concurrently.
"""
import subprocess
import sys
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR / "backend"
FRONTEND_DIR = BASE_DIR / "frontend"

def main():
    print("=" * 60)
    print("  IBVAP | Vigilant Vision - Smart Video Analytics")
    print("=" * 60)

    # 1. Start Backend
    print("[1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...")
    backend_proc = subprocess.Popen(
        [sys.executable, str(BACKEND_DIR / "run_server.py")],
        cwd=str(BACKEND_DIR)
    )

    time.sleep(2)

    # 2. Start Frontend
    print("[2/2] Starting React Vite Frontend on http://localhost:5173 ...")
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=str(FRONTEND_DIR),
        shell=True
    )

    print("\n" + "=" * 60)
    print("  SYSTEM READY!")
    print("  - Frontend Authority Dashboard: http://localhost:5173")
    print("  - Backend REST API Docs:         http://127.0.0.1:8000/docs")
    print("  - Health Status:                http://127.0.0.1:8000/health")
    print("=" * 60)
    print("Press Ctrl+C to terminate both servers.\n")

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\nShutting down IBVAP servers...")
        backend_proc.terminate()
        frontend_proc.terminate()

if __name__ == "__main__":
    main()
