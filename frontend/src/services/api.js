import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export const VideosAPI = {
  list: (skip = 0, limit = 50) => api.get(`/videos?skip=${skip}&limit=${limit}`),
  get: (videoId) => api.get(`/videos/${videoId}`),
  upload: (formData) => api.post('/videos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  process: (videoId, cameraId = 'CAM-01') => api.post(`/videos/${videoId}/process?camera_id=${cameraId}`),
  progress: (videoId) => api.get(`/videos/${videoId}/progress`),
  delete: (videoId) => api.delete(`/videos/${videoId}`),
  streamUrl: (videoId) => `/api/videos/${videoId}/stream`,
};

export const EventsAPI = {
  list: (params = {}) => api.get('/events', { params }),
  get: (eventId) => api.get(`/events/${eventId}`),
  update: (eventId, data) => api.patch(`/events/${eventId}`, data),
  addReview: (eventId, reviewData) => api.post(`/events/${eventId}/review`, reviewData),
};

export const CamerasAPI = {
  list: () => api.get('/cameras'),
  get: (cameraId) => api.get(`/cameras/${cameraId}`),
  create: (data) => api.post('/cameras', data),
  update: (cameraId, data) => api.patch(`/cameras/${cameraId}`, data),
  delete: (cameraId) => api.delete(`/cameras/${cameraId}`),
};

export const MetricsAPI = {
  summary: () => api.get('/metrics/summary'),
  eventsByType: () => api.get('/metrics/events-by-type'),
  eventsByLocation: () => api.get('/metrics/events-by-location'),
  timeline: (hours = 24) => api.get(`/metrics/timeline?hours=${hours}`),
  traffic: (videoId) => api.get(`/metrics/traffic/${videoId}`),
};

export const MapAPI = {
  events: () => api.get('/map/events'),
  hotspots: () => api.get('/map/hotspots'),
};

export const DatasetsAPI = {
  list: () => api.get('/datasets'),
  generateSynthetic: (scenarioType = 'all_inclusive', durationSec = 8, cameraId = 'CAM-01') =>
    api.post(`/datasets/generate-synthetic?scenario_type=${scenarioType}&duration_sec=${durationSec}&camera_id=${cameraId}`),
};

export default api;
