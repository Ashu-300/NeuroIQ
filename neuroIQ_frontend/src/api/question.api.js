import createAxiosInstance from './axios';
import { API_BASE_URLS } from '../utils/constants';

const questionApi = createAxiosInstance(API_BASE_URLS.QUESTION);

/**
 * Register theory question set
 * POST /api/question/register/theory
 * Request: {
 *   subject: string,
 *   semester: string,
 *   theory_questions: [{ question: string, marks: int }]
 * }
 * Response: { message: string }
 */
export const registerTheoryQuestions = async (data) => {
  const response = await questionApi.post('/api/question/register/theory', data);
  return response.data;
};

/**
 * Register MCQ question set
 * POST /api/question/register/mcq
 * Request: {
 *   subject: string,
 *   semester: string,
 *   mcq_questions: [{ question: string, options: [string], correct_option: string }]
 * }
 * Response: { message: string }
 */
export const registerMCQQuestions = async (data) => {
  const response = await questionApi.post('/api/question/register/mcq', data);
  return response.data;
};

/**
 * Get questions by subject and semester
 * GET /get/questions?subject=X&semester=Y&type=THEORY|MCQ
 * Response: { questions: [{ id, question, marks, type, options?, correct_option? }] }
 */
export const getQuestions = async (params) => {
  const response = await questionApi.get('/api/question/get/question', { params });
  return response.data;
};

/**
 * Get question by ID
 * GET /get/question/:id
 * Response: { question: { id, question, marks, type, subject, semester, ... } }
 */
export const getQuestionById = async (questionId) => {
  const response = await questionApi.get(`/api/question/get/question/${questionId}`);
  return response.data;
};

/**
 * Generate theory exam
 * POST /exam/generate/theory
 * Request: {
 *   subject: string,
 *   semester: string,
 *   questions: [{ question_id?: string, question: string, marks: int }]
 * }
 * Response: { exam_id: string, subject, semester, questions, total_marks, pdf_url?: string }
 */
export const generateTheoryExam = async (data) => {
  const response = await questionApi.post('/api/question/exam/generate/theory', data);
  return response.data;
};

/**
 * Generate MCQ exam
 * POST /exam/generate/mcq
 * Request: {
 *   subject: string,
 *   semester: string,
 *   questions: [{ question_id?: string, question: string, options: [], correct_option: int, marks: int }]
 * }
 * Response: { exam_id: string, subject, semester, questions, total_marks }
 */
export const generateMCQExam = async (data) => {
  const response = await questionApi.post('/api/question/exam/generate/mcq', data);
  return response.data;
};

/**
 * Generate both theory and MCQ exam
 * POST /api/question/exam/generate/both
 * Request: {
 *   subject: string,
 *   semester: string,
 *   theory_questions: [{ question: string, marks: int }],
 *   mcq_questions: [{ question: string, options: [], correct_option: string }]
 * }
 * Response: { message: string, mongo_response: { InsertedID: string } }
 */
export const generateBothExam = async (data) => {
  const response = await questionApi.post('/api/question/exam/generate/both', data);
  return response.data;
};

/**
 * Get exam by ID
 * GET /exam/:exam_id
 * Response: { exam_id, subject, semester, type, questions, total_marks, created_at }
 */
export const getExam = async (examId) => {
  const response = await questionApi.get(`/api/question/exam/${examId}`);
  return response.data;
};

/**
 * Get exams by subject and semester
 * GET /api/question/exam/subject/{subject}/semester/{semester}
 * Response: { message: string, exams: [{ _id, subject, semester, category, theory_questions, mcq_questions }] }
 */
export const getExamsBySubjectAndSemester = async (subject, semester) => {
  const response = await questionApi.get(`/api/question/exam/both/subject/${encodeURIComponent(subject)}/semester/${encodeURIComponent(semester)}`);
  return response.data;
};

/**
 * Get all exams by teacher (requires auth)
 * GET /exam/list
 * Response: { exams: [{ exam_id, subject, semester, type, total_marks, created_at }] }
 */
export const getExamList = async () => {
  const response = await questionApi.get('/api/question/exam/list');
  return response.data;
};

/**
 * Delete question
 * DELETE /delete/question/:id
 * Response: { message: string }
 */
export const deleteQuestion = async (questionId) => {
  const response = await questionApi.delete(`/api/question/delete/question/${questionId}`);
  return response.data;
};

/**
 * Update question
 * PUT /update/question/:id
 * Request: { question?: string, marks?: int, options?: [], correct_option?: int }
 * Response: { message: string, question: {} }
 */
export const updateQuestion = async (questionId, data) => {
  const response = await questionApi.put(`/api/question/update/question/${questionId}`, data);
  return response.data;
};

export default {
  registerTheoryQuestions,
  registerMCQQuestions,
  getQuestions,
  getQuestionById,
  generateTheoryExam,
  generateMCQExam,
  generateBothExam,
  getExam,
  getExamsBySubjectAndSemester,
  getExamList,
  deleteQuestion,
  updateQuestion,
};
