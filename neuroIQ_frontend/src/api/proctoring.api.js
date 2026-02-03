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
 * POST /api/exam/start
 * Request: { exam_id: string }
 * Response: { session_id: string, started_at: string }
 */
export const startExam = async (examData) => {
  const response = await proctoringApi.post('/api/proctoring/exam/start', examData);
  return response.data;
};

/**
 * Get exam session status
 * GET /api/exam/status/{session_id}
 * Response: { session_id, status, time_remaining, violations_count }
 */
export const getExamStatus = async (sessionId) => {
  const response = await proctoringApi.get('/api/proctoring/exam/status', {
    params: { session_id: sessionId }
  });
  return response.data;
};

/**
 * Verify identity before exam
 * POST /api/proctor/verify-identity
 * Request: FormData with face_image, id_card_image, exam_id
 * Response: { verified: boolean, message: string, session_id?: string }
 */
export const verifyIdentity = async (data) => {
  const formData = new FormData();
  
  // Convert base64 to blob if needed
  if (data.face_image.startsWith('data:')) {
    const faceBlob = await fetch(data.face_image).then(r => r.blob());
    formData.append('face_image', faceBlob, 'face.jpg');
  } else {
    formData.append('face_image', data.face_image);
  }
  
  if (data.id_card_image.startsWith('data:')) {
    const idBlob = await fetch(data.id_card_image).then(r => r.blob());
    formData.append('id_card_image', idBlob, 'id_card.jpg');
  } else {
    formData.append('id_card_image', data.id_card_image);
  }
  
  formData.append('exam_id', data.exam_id);

  const response = await proctoringApi.post('/api/proctoring/proctor/verify-identity', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Process video frame for proctoring (used with WebSocket fallback)
 * POST /api/proctoring/proctor/frame
 * Request: FormData with frame blob
 * Response: { violations: [{ type, message, timestamp }] }
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
 * Submit exam answers
 * POST /api/submission/submit
 * Request: { exam_id, session_id, answers: [{ question_id, answer }], violations: [] }
 * Response: { success: boolean, message: string, score?: number }
 */
export const submitExam = async (submissionData) => {
  const response = await proctoringApi.post('/api/proctoring/submission/submit', submissionData);
  return response.data;
};

/**
 * Get exam report
 * GET /api/submission/report/{session_id}
 * Response: { session_id, score, total_marks, answers, violations, submitted_at }
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
