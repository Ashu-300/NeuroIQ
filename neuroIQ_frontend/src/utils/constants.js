// API Base URLs for each service (loaded from environment variables)
export const API_BASE_URLS = {
  AUTH: import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8001',
  INGESTION: import.meta.env.VITE_INGESTION_API_URL || 'http://localhost:8002',
  LLM: import.meta.env.VITE_LLM_API_URL || 'http://localhost:8003',
  MANAGEMENT: import.meta.env.VITE_MANAGEMENT_API_URL || 'http://localhost:8004',
  QUESTION: import.meta.env.VITE_QUESTION_API_URL || 'http://localhost:8005',
  PROCTORING: import.meta.env.VITE_PROCTORING_API_URL || 'http://localhost:8000',
  ANSWER: import.meta.env.VITE_ANSWER_API_URL || 'http://localhost:8006',
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

// Branch codes - must match backend validation: oneof=CSE IT ECE MECH CIVIL EE EC
export const BRANCHES = [
  { value: '', label: 'Select Branch' },
  { value: 'CSE', label: 'CSE' },
  { value: 'IT', label: 'IT' },
  { value: 'ECE', label: 'ECE' },
  { value: 'EE', label: 'EE' },
  { value: 'EC', label: 'EC' },
  { value: 'MECH', label: 'MECH' },
  { value: 'CIVIL', label: 'CIVIL' },
];

// Semester options
export const SEMESTERS = [
  { value: '', label: 'Select Semester' },
  { value: '1', label: 'Semester 1' },
  { value: '2', label: 'Semester 2' },
  { value: '3', label: 'Semester 3' },
  { value: '4', label: 'Semester 4' },
  { value: '5', label: 'Semester 5' },
  { value: '6', label: 'Semester 6' },
  { value: '7', label: 'Semester 7' },
  { value: '8', label: 'Semester 8' },
];

// Section options
export const SECTIONS = [
  { value: '', label: 'Select Section (Optional)' },
  { value: 'A', label: 'Section A' },
  { value: 'B', label: 'Section B' },
  { value: 'C', label: 'Section C' },
  { value: 'D', label: 'Section D' },
];
