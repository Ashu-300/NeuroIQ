import createAxiosInstance from './axios';
import { API_BASE_URLS } from '../utils/constants';

const managementApi = createAxiosInstance(API_BASE_URLS.MANAGEMENT);

/**
 * Register single room
 * POST /register/room
 * Request: { room_no: string, no_of_seats: int, block: string, floor: int }
 * Response: { message: string, room: { room_no, no_of_seats, block, floor } }
 */
export const registerRoom = async (roomData) => {
  const response = await managementApi.post('/api/management/register/room', roomData);
  return response.data;
};

/**
 * Register multiple rooms (bulk)
 * POST /register/multiple-room
 * Request: { rooms: [{ room_no: string, no_of_seats: int, block: string, floor: int }] }
 * Response: { message: string, count: int }
 */
export const registerMultipleRooms = async (roomsData) => {
  const response = await managementApi.post('/api/management/register/multiple-room', roomsData);
  return response.data;
};

/**
 * Get all rooms
 * GET /get/rooms
 * Response: { rooms: [{ room_no, no_of_seats, block, floor }] }
 */
export const getRooms = async () => {
  const response = await managementApi.get('/api/management/get/rooms');
  return response.data;
};

/**
 * Get room by room number
 * GET /get/room/:room_no
 * Response: { room: { room_no, no_of_seats, block, floor } }
 */
export const getRoomByNo = async (roomNo) => {
  const response = await managementApi.get(`/api/management/get/room/${roomNo}`);
  return response.data;
};

/**
 * Mark attendance
 * POST /mark/attendance
 * Request: { session_id: string, attendance: [{ roll_no: string, present: boolean }] }
 * Response: { message: string, marked_count: int }
 */
export const markAttendance = async (attendanceData) => {
  const response = await managementApi.post('/api/management/mark/attendance', attendanceData);
  return response.data;
};

/**
 * Get attendance for a session
 * GET /get/attendance/:session_id
 * Response: { session_id, attendance: [{ roll_no, name, present, marked_at }] }
 */
export const getAttendance = async (sessionId) => {
  const response = await managementApi.get(`/api/management/get/attendance/${sessionId}`);
  return response.data;
};

/**
 * Generate seating arrangement using LLM service
 * This calls the LLM API endpoint for seating arrangement generation
 * POST /generate-seating-arrangement (via LLM service)
 * Request: { exam_name, exam_date, rooms: [room_no], students: [{ roll_no, name, branch }] }
 * Response: { exam_name, exam_date, allocation: { room_no: [{ roll_no, name, seat }] } }
 */
export const generateSeatingArrangement = async (data) => {
  // This actually goes to LLM service for generation
  const llmApi = createAxiosInstance(API_BASE_URLS.LLM);
  const response = await llmApi.post('/api/llm/generate-seating-arrangement', data);
  return response.data;
};

/**
 * Save seating arrangement to management service
 * POST /save/seating-arrangement
 * Request: { exam_name, exam_date, allocation: {} }
 * Response: { message: string, arrangement_id: string }
 */
export const saveSeatingArrangement = async (arrangementData) => {
  const response = await managementApi.post('/api/management/save/seating-arrangement', arrangementData);
  return response.data;
};

/**
 * Get seating arrangement by exam
 * GET /get/seating-arrangement/:exam_id
 * Response: { exam_name, exam_date, allocation: {} }
 */
export const getSeatingArrangement = async (examId) => {
  const response = await managementApi.get(`/api/management/get/seating-arrangement/${examId}`);
  return response.data;
};

/**
 * Schedule a new exam
 * POST /api/management/schedule/exam
 * Request: { exam_id, title, subject, semester, date, start_time, end_time, duration_min, total_marks }
 * Response: { exam_id, title, subject, semester, date, start_time, end_time, duration_min, total_marks, created_by, created_at }
 */
export const scheduleExam = async (examData) => {
  const response = await managementApi.post('/api/management/schedule/exam', examData);
  return response.data;
};

/**
 * Get scheduled exams for a specific branch and semester
 * GET /api/management/get/scheduled-exams/branch/{branch}/semester/{semester}
 * Response: [{ exam_id, title, subject, semester, date, start_time, end_time, duration_min, total_marks, created_by, created_at }]
 */
export const getScheduledExams = async (branch, semester) => {
  const response = await managementApi.get(`/api/management/get/scheduled-exams/branch/${encodeURIComponent(branch)}/semester/${encodeURIComponent(semester)}`);
  return response.data;
};

/**
 * Get details of a specific scheduled exam
 * GET /api/management/get/exam-details/{scheduleID}
 * Response: { exam_id, title, subject, semester, date, start_time, end_time, duration_min, total_marks, created_by, created_at }
 */
export const getScheduledExamDetails = async (scheduleId) => {
  const response = await managementApi.get(`/api/management/get/exam-details/${scheduleId}`);
  return response.data;
};

/**
 * Delete a scheduled exam
 * DELETE /api/management/delete/scheduled-exam/{scheduleID}
 * Response: { message: string }
 */
export const deleteScheduledExam = async (scheduleId) => {
  const response = await managementApi.delete(`/api/management/delete/scheduled-exam/${scheduleId}`);
  return response.data;
};

/**
 * Update exam time
 * PUT /api/management/update/exam-time/{scheduleID}
 * Request: { start_time, end_time }
 * Response: { message: string }
 */
export const updateExamTime = async (scheduleId, timeData) => {
  const response = await managementApi.put(`/api/management/update/exam-time/${scheduleId}`, timeData);
  return response.data;
};

export default {
  registerRoom,
  registerMultipleRooms,
  getRooms,
  getRoomByNo,
  markAttendance,
  getAttendance,
  generateSeatingArrangement,
  saveSeatingArrangement,
  getSeatingArrangement,
  scheduleExam,
  getScheduledExams,
  getScheduledExamDetails,
  deleteScheduledExam,
  updateExamTime,
};
