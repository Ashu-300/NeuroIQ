import createAxiosInstance from './axios';
import { API_BASE_URLS } from '../utils/constants';

const proctoringApi = createAxiosInstance(API_BASE_URLS.PROCTORING);

/**
 * Get student's available exams
 * GET /api/proctoring/exam/student/list
 * Response: { exams: [{ id, title, subject, duration, total_marks, start_time, end_time, status, type }] }
 */
export const getStudentExams = async () => {
  const response = await proctoringApi.get('/api/proctoring/exam/student/list');
  return response.data;
};

/**
 * Get exam questions
 * GET /api/proctoring/exam/{exam_id}/questions
 * Response: { questions: [{ id, question, type, options?, marks }] }
 */
export const getExamQuestions = async (examId) => {
  const response = await proctoringApi.get(`/api/proctoring/exam/${examId}/questions`);
  return response.data;
};

/**
 * Start exam session
 * POST /api/proctoring/exam/start
 * Request: { exam_id: string }
 * Response: { session_id: string, exam_id: string, start_time: string, status: string }
 */
export const startExam = async (examData) => {
  const response = await proctoringApi.post('/api/proctoring/exam/start', {
    exam_id: examData.exam_id,
  });
  return response.data;
};

/**
 * Get exam session status
 * GET /api/proctoring/exam/status?session_id=xxx
 * Response: { session_id, status, start_time, elapsed_seconds, warnings }
 */
export const getExamStatus = async (sessionId) => {
  const response = await proctoringApi.get('/api/proctoring/exam/status', {
    params: { session_id: sessionId }
  });
  return response.data;
};

/**
 * Verify identity during exam
 * POST /api/proctoring/proctor/verify-identity?session_id=xxx
 * Request: FormData with frame (webcam image file)
 * Response: { verified: boolean, message: string, session_id: string }
 */
export const verifyIdentity = async (sessionId, frameData) => {
  const formData = new FormData();
  
  // Convert base64 to blob if needed
  if (typeof frameData === 'string' && frameData.startsWith('data:')) {
    const frameBlob = await fetch(frameData).then(r => r.blob());
    formData.append('frame', frameBlob, 'frame.jpg');
  } else if (frameData instanceof Blob) {
    formData.append('frame', frameData, 'frame.jpg');
  } else {
    formData.append('frame', frameData);
  }

  const response = await proctoringApi.post('/api/proctoring/proctor/verify-identity', formData, {
    params: { session_id: sessionId },
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Process video frame for proctoring (used with WebSocket fallback)
 * POST /api/proctoring/proctor/frame
 * Request: FormData with frame blob and session_id
 * Response: { status, processed, auto_submit, violation_message? }
 */
export const sendProctoringFrame = async (frameBlob, sessionId) => {
  const formData = new FormData();
  formData.append('frame', frameBlob, 'frame.jpg');
  formData.append('session_id', sessionId);

  const response = await proctoringApi.post('/api/proctoring/proctor/frame', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Submit exam
 * POST /api/proctoring/submission/submit
 * Request: { session_id: string }
 * Response: { session_id, status, submitted_at, total_warnings, violations_count }
 */
export const submitExam = async (sessionId) => {
  const response = await proctoringApi.post('/api/proctoring/submission/submit', {
    session_id: sessionId,
  });
  return response.data;
};

/**
 * Get exam report
 * GET /api/proctoring/submission/report/{session_id}
 * Response: { session_id, student_id, exam_id, start_time, end_time, duration_seconds, status, total_warnings, violations, identity_verified }
 */
export const getExamReport = async (sessionId) => {
  const response = await proctoringApi.get(`/api/proctoring/submission/report/${sessionId}`);
  return response.data;
};

export default {
  getStudentExams,
  getExamQuestions,
  startExam,
  getExamStatus,
  verifyIdentity,
  sendProctoringFrame,
  submitExam,
  getExamReport,
};
