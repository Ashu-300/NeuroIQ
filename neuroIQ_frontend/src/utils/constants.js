// API Base URLs for each service (loaded from environment variables)
export const API_BASE_URLS = {
  AUTH: import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8001',
  INGESTION: import.meta.env.VITE_INGESTION_API_URL || 'http://localhost:8002',
  LLM: import.meta.env.VITE_LLM_API_URL || 'http://localhost:8003',
  MANAGEMENT: import.meta.env.VITE_MANAGEMENT_API_URL || 'http://localhost:8004',
  QUESTION: import.meta.env.VITE_QUESTION_API_URL || 'http://localhost:8005',
  PROCTORING: import.meta.env.VITE_PROCTORING_API_URL || 'http://localhost:8000',
};

// WebSocket URL for proctoring
export const WS_PROCTORING_URL = import.meta.env.VITE_PROCTORING_WS_URL || 'ws://localhost:8000/ws/proctor';

// User roles
export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
};

// Local storage keys
export const STORAGE_KEYS = {
  TOKEN: 'neuroiq_token',
  REFRESH_TOKEN: 'neuroiq_refresh_token',
  USER: 'neuroiq_user',
};

// Violation types for proctoring
export const VIOLATION_TYPES = {
  NO_FACE: 'NO_FACE',
  MULTIPLE_FACES: 'MULTIPLE_FACES',
  LOOKING_AWAY: 'LOOKING_AWAY',
  HEAD_TURN: 'HEAD_TURN',
  PHONE_DETECTED: 'PHONE_DETECTED',
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
};
