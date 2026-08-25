# Vigilant Vision | IBVAP (Smart Road & Border Video Analytics)

An event-driven AI video analytics platform built for road and border surveillance. It processes CCTV and dataset videos frame-by-frame, detects meaningful road and surveillance conditions using **YOLOv8** and **OpenCV**, converts validated detections into structured deduplicated events, stores them in **PostgreSQL / SQLAlchemy**, and presents them through a **React + Leaflet** authority command center.

---

## Technology Stack

- **Python 3.13+** — Core language for AI processing, video analytics, behavioral algorithms, and backend services.
- **YOLOv8 (Ultralytics)** — Real-time vehicle, pedestrian, and object detection.
- **OpenCV 4.x** — Video input, frame extraction, surface defect analysis, annotation, and forensic evidence generation.
- **FastAPI** — High-performance asynchronous backend and REST API layer with automatic OpenAPI documentation.
- **PostgreSQL / SQLite (SQLAlchemy ORM)** — Relational database for videos, detections, structured events, camera infrastructure, and audit reviews.
- **React 18 + Vite** — High-performance authority command dashboard with Tailwind CSS and Lucide icons.
- **Leaflet & CartoDB Dark Matter** — Interactive GIS spatial mapping, camera radar circles, and high-risk corridor hotspot clustering.

---

## System Architecture

```text
Road CCTV / Dataset Video / RTSP / Synthetic Stream
                     |
                     v
             OpenCV + Python
      Video Import & Frame Ingestion
                     |
                     v
                 YOLOv8 AI
    Object, Vehicle & Pedestrian Detection
                     |
                     v
           Multi-Object Tracker
      Trajectory History & Kinematics
                     |
                     +---------------------------------------+
                     |                                       |
                     v                                       v
          Behavior Analytics                       Road Surface Defect
   (Wrong-Way, Rash, Collision, Hit-Run)     (Potholes, Defects, Waterlogging)
                     |                                       |
                     +-------------------+-------------------+
                                         |
                                         v
                              Event Processing Engine
                   (Temporal Debounce, IoU Deduplication, Severity)
                                         |
                                         v
                         Forensic Evidence Generator
                      (HUD Overlay, Telemetry, Snapshot)
                                         |
                                         v
                           PostgreSQL / Database
                                         |
                                         v
                                  FastAPI Backend
                                         |
                                         v
                             React Authority Dashboard
                                         |
                     +-------------------+-------------------+
                     |                                       |
                     v                                       v
               Metrics & KPIs                           Leaflet GIS Map
```

---

## Analytics & Detection Modules

| Module | Detection / Event | Technology | Severity |
| :--- | :--- | :--- | :--- |
| **Traffic Analytics** | `VEHICLE_DETECTED`, `TRAFFIC_CONGESTION`, `HEAVY_TRAFFIC` | YOLOv8 + Density Engine | LOW / MEDIUM / HIGH |
| **Road Surface** | `POTHOLE_DETECTED`, `GARBAGE_DETECTED` | OpenCV Adaptive Contours & Chrominance | MEDIUM / HIGH |
| **Waterlogging** | `WATERLOGGING_DETECTED` | Specular Reflection, Puddle Contours & HSV Saturation | MEDIUM / HIGH |
| **Behavioral** | `WRONG_WAY_DRIVING` | Trajectory Vector vs Lane Direction | HIGH |
| **Behavioral** | `RASH_DRIVING` | Lateral Swerve Variance & Speed Delta | HIGH |
| **Behavioral** | `POSSIBLE_COLLISION` | Converging Trajectories & Proximity | HIGH |
| **Behavioral** | `POSSIBLE_HIT_AND_RUN` | High-Speed Pedestrian Contact Vector | CRITICAL |

---

## Project Structure

```text
Vigilant_Vision/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entry point & CORS configuration
│   │   ├── config.py                # App configuration, directory paths, AI thresholds
│   │   ├── api/                     # REST API Routers
│   │   │   ├── videos.py            # Upload, stream, trigger AI processing, progress
│   │   │   ├── events.py            # Query events, filters, patch status, audit reviews
│   │   │   ├── cameras.py           # Camera infrastructure CRUD & GPS positions
│   │   │   ├── metrics.py           # Summary KPIs, timeline trends, category distribution
│   │   │   ├── map.py               # GeoJSON event pins & high-risk corridor hotspots
│   │   │   └── datasets.py          # Dataset browser & synthetic video scenario generator
│   │   ├── database/
│   │   │   ├── connection.py        # SQLAlchemy engine, session maker & seeding
│   │   │   ├── models.py            # Video, Camera, Detection, Event, EventReview, TrafficMetric
│   │   │   └── repositories.py      # Database CRUD abstraction layer
│   │   ├── models/
│   │   │   └── schemas.py           # Pydantic validation & response schemas
│   │   └── services/
│   │       ├── yolo_detector.py     # YOLOv8 object detector with COCO class mapping
│   │       ├── tracker.py           # Centroid & IoU trajectory tracker with kinematics
│   │       ├── behavior_service.py  # Wrong-way, rash driving, collision detection
│   │       ├── traffic_service.py   # Volume counting, flow rate, congestion levels
│   │       ├── road_defect_service.py # Pothole and waterlogging analyzers
│   │       ├── event_engine.py      # Temporal debounce, spatial deduplication, severity
│   │       ├── evidence_service.py  # HUD forensic snapshot generator
│   │       ├── video_processor.py   # Full OpenCV video processing pipeline orchestrator
│   │       └── synthetic_generator.py # Synthetic video scenario generator
│   └── tests/
│       ├── test_api.py              # API endpoint integration tests
│       └── test_event_engine.py     # IoU and deduplication unit tests
├── frontend/
│   ├── src/
│   │   ├── main.jsx                 # React DOM mount
│   │   ├── App.jsx                  # Application layout & navigation
│   │   ├── services/api.js          # Axios API client
│   │   ├── components/              # Reusable UI components
│   │   │   ├── Navbar.jsx           # Top telemetry bar, live clock, scenario trigger
│   │   │   ├── Sidebar.jsx          # Tab navigation
│   │   │   ├── MetricsCards.jsx     # KPI summary cards
│   │   │   ├── SeverityBadge.jsx    # Animated severity pills
│   │   │   ├── StatusBadge.jsx      # Audit status pills
│   │   │   ├── LeafletMap.jsx       # Dark matter GIS map with camera coverage
│   │   │   ├── EvidenceViewer.jsx   # Forensic snapshot inspector & review console
│   │   │   └── VideoPlayer.jsx      # Video player with timeline event markers
│   │   └── pages/
│   │       ├── Dashboard.jsx        # Command center with live alerts & mini map
│   │       ├── Events.jsx           # Incident registry with filters & CSV export
│   │       ├── Videos.jsx           # Video studio & background processing tracker
│   │       ├── MapView.jsx          # Fullscreen GIS map & danger corridor index
│   │       ├── Analytics.jsx        # Traffic intelligence & safety scorecards
│   │       ├── Cameras.jsx          # Surveillance camera infrastructure manager
│   │       └── Datasets.jsx         # Scenario simulator & benchmark datasets
├── datasets/                        # Stored video datasets & synthetic clips
├── evidence/                        # Stored forensic evidence JPEG snapshots
├── uploads/                         # User uploaded video files
├── test_backend.py                  # End-to-end backend verification script
├── run_tests.py                     # Python test suite runner
└── start_servers.py                 # Unified launcher for backend and frontend
```

---

## Quick Start & Installation

### 1. Requirements
- Python 3.10+
- Node.js 18+ and npm

### 2. Launching the Full System
Run the unified launcher:

```powershell
python start_servers.py
```

This starts:
- **React Frontend**: [http://localhost:5173](http://localhost:5173)
- **FastAPI Backend**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Running Backend Tests
```powershell
python run_tests.py
```

---

## User Workflow & Key Features

1. **Instant Simulation**: Click **"Instant Test Scenario"** on the top navigation bar to generate a synthetic road CCTV clip and run the full AI analytics pipeline automatically.
2. **Video Playback Studio**: Watch the video with **interactive timeline incident markers**; clicking a marker jumps immediately to the incident timestamp.
3. **Forensic Evidence Review**: Click **"Inspect"** on any alert to open the high-resolution evidence snapshot with HUD watermarks, bounding boxes, and an authority audit panel (**Confirm**, **Resolve**, **Escalate**, or **Dismiss**).
4. **Interactive GIS Map**: Explore road corridors, camera coverage radii, and dynamic danger hotspot clusters with CartoDB dark matter tiles.
5. **Data Export**: Filter incidents by severity, camera, or type and export forensic records directly to CSV.