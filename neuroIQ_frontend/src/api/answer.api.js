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
 * Get a specific student's submission for an exam schedule
 * GET /api/answer/exam/{exam_id}/student/{student_id}/{schedule_id}/schedule/submission
 * Response: submission object
 */
export const getStudentExamSubmission = async (examId, studentId, scheduleId) => {
  const response = await answerApi.get(
    `/api/answer/exam/${examId}/student/${studentId}/${scheduleId}/schedule/submission`,
  );
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
 * Get evaluation for a specific student's exam (optionally scoped to a schedule)
 * GET /api/answer/exam/{exam_id}/student/{student_id}/evaluation?exam_schedule_id={schedule_id}
 * Response: evaluation object or 404 if not evaluated
 */
export const getStudentExamEvaluation = async (examId, studentId, scheduleId) => {
  const response = await answerApi.get(
    `/api/answer/exam/${examId}/student/${studentId}/evaluation`,
    {
      params: scheduleId ? { exam_schedule_id: scheduleId } : {},
    },
  );
  return response.data;
};

/**
 * Check if an evaluation exists for a student's exam (optionally per schedule)
 * Returns true if evaluated, false otherwise
 */
export const checkStudentEvaluationExists = async (examId, studentId, scheduleId) => {
  try {
    await answerApi.get(
      `/api/answer/exam/${examId}/student/${studentId}/evaluation`,
      {
        params: scheduleId ? { exam_schedule_id: scheduleId } : {},
      },
    );
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
