import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import SeverityBadge from './SeverityBadge';
import { Camera, ExternalLink } from 'lucide-react';

// Fix default Leaflet icon urls
delete L.Icon.Default.prototype._getIconUrl;

const createSeverityIcon = (severity) => {
  const sev = (severity || 'MEDIUM').toUpperCase();
  let color = '#0284c7'; // sky blue
  if (sev === 'CRITICAL') color = '#e11d48'; // rose red
  if (sev === 'HIGH') color = '#d97706'; // amber orange
  if (sev === 'LOW') color = '#059669'; // emerald green

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2.5px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 5px; height: 5px; background-color: white; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  });
};

const createCameraIcon = () => {
  return L.divIcon({
    className: 'custom-camera-marker',
    html: `
      <div style="
        background-color: #0284c7;
        width: 28px;
        height: 28px;
        border-radius: 8px;
        border: 2px solid white;
        box-shadow: 0 2px 10px rgba(2, 132, 199, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 13px;
      ">
        📹
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

export default function LeafletMap({
  events = [],
  cameras = [],
  hotspots = [],
  onSelectEvent,
  center = [28.6139, 77.2090],
  zoom = 13,
  height = '500px',
}) {
  return (
    <div style={{ height }} className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative z-0 isolate bg-slate-50">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', backgroundColor: '#f8fafc' }}
      >
        <ChangeMapView center={center} zoom={zoom} />
        {/* CartoDB Voyager Clean Light Map Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {/* Camera Nodes & Coverage Radii */}
        {cameras.map((cam) => {
          if (!cam.latitude || !cam.longitude) return null;
          return (
            <React.Fragment key={cam.camera_id}>
              <Circle
                center={[cam.latitude, cam.longitude]}
                radius={400}
                pathOptions={{
                  color: '#0284c7',
                  fillColor: '#38bdf8',
                  fillOpacity: 0.12,
                  dashArray: '4, 8',
                }}
              />
              <Marker
                position={[cam.latitude, cam.longitude]}
                icon={createCameraIcon()}
              >
                <Popup>
                  <div className="p-1 min-w-[200px] text-slate-800">
                    <div className="flex items-center gap-1.5 font-bold text-sm text-sky-700">
                      <span>📹 {cam.name}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{cam.location}</p>
                    <div className="mt-2 text-[11px] text-slate-500 font-mono">
                      ID: {cam.camera_id} • {cam.zone_type}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Event / Defect Markers */}
        {events.map((evt) => {
          if (!evt.latitude || !evt.longitude) return null;
          return (
            <Marker
              key={evt.event_id}
              position={[evt.latitude, evt.longitude]}
              icon={createSeverityIcon(evt.severity)}
            >
              <Popup>
                <div className="p-1 min-w-[230px] text-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900">{evt.event_type.replace(/_/g, ' ')}</span>
                    <SeverityBadge severity={evt.severity} showIcon={false} />
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">{evt.description}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>{evt.timestamp}</span>
                    <span>{evt.camera_id}</span>
                  </div>
                  {evt.evidence_path && (
                    <div className="mt-1">
                      <img
                        src={`/${evt.evidence_path}`}
                        alt="Evidence snapshot"
                        className="w-full h-24 object-cover rounded-lg border border-slate-200"
                      />
                    </div>
                  )}
                  {onSelectEvent && (
                    <button
                      onClick={() => onSelectEvent(evt)}
                      className="w-full py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Defect Evidence
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Hotspots visualization */}
        {hotspots.map((hs, i) => (
          <Circle
            key={i}
            center={[hs.latitude, hs.longitude]}
            radius={hs.event_count * 140}
            pathOptions={{
              color: hs.risk_level === 'SEVERE' ? '#e11d48' : '#d97706',
              fillColor: hs.risk_level === 'SEVERE' ? '#f43f5e' : '#f59e0b',
              fillOpacity: 0.18,
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
