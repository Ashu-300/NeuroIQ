import createAxiosInstance from './axios';
import { API_BASE_URLS } from '../utils/constants';

const answerApi = createAxiosInstance(API_BASE_URLS.ANSWER);

/**
 * Submit exam answers (theory/mcq arrays)
 * POST /api/answer/mixed/submit
 * Request: { exam_id, session_id, subject, semester, exam_type, theory_answers, mcq_answers }
 * Response: { success, message, submission_id }
 */
export const submitExamAnswers = async (answerData) => {
  const response = await answerApi.post('/api/answer/mixed/submit', answerData);
  return response.data;
};

/**
 * Get a specific student's submission for an exam
 * GET /api/answer/exam/{exam_id}/student/{student_id}/submission
 * Response: submission object
 */
export const getStudentExamSubmission = async (examId, studentId) => {
  const response = await answerApi.get(`/api/answer/exam/${examId}/student/${studentId}/submission`);
  return response.data;
};

/**
 * Evaluate one theory answer using AI
 * POST /api/answer/evaluate/theory
 * Request: { question_id, question_text, answer_text, subject, max_marks }
 */
export const evaluateTheoryAnswer = async (payload) => {
  const response = await answerApi.post('/api/answer/evaluate/theory', payload);
  return response.data;
};

/**
 * Store full exam evaluation
 * POST /api/answer/exam/evaluation
 * Request: { submission_id, exam_id, student_id, subject, semester, exam_type, theory_evaluations, mcq_evaluations }
 */
export const storeExamEvaluation = async (payload) => {
  const response = await answerApi.post('/api/answer/exam/evaluation', payload);
  return response.data;
};

/**
 * Get evaluation for a specific student's exam
 * GET /api/answer/exam/{exam_id}/student/{student_id}/evaluation
 * Response: evaluation object or 404 if not evaluated
 */
export const getStudentExamEvaluation = async (examId, studentId) => {
  const response = await answerApi.get(`/api/answer/exam/${examId}/student/${studentId}/evaluation`);
  return response.data;
};

/**
 * Check if an evaluation exists for a student's exam
 * Returns true if evaluated, false otherwise
 */
export const checkStudentEvaluationExists = async (examId, studentId) => {
  try {
    await answerApi.get(`/api/answer/exam/${examId}/student/${studentId}/evaluation`);
    return true;
  } catch (err) {
    return false;
  }
};

export default {
  submitExamAnswers,
  getStudentExamSubmission,
  evaluateTheoryAnswer,
  storeExamEvaluation,
  getStudentExamEvaluation,
  checkStudentEvaluationExists,
};
