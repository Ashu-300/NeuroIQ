import createAxiosInstance from './axios';
import { API_BASE_URLS } from '../utils/constants';

// LLM API with no timeout (LLM responses can take a long time)
const llmApi = createAxiosInstance(API_BASE_URLS.LLM, { timeout: 0 });

/**
 * Generate theory questions from syllabus text
 * POST /api/llm/generate/theory/questions
 * Request: {
 *   subject: string,
 *   unit_syllabus: string,
 *   num_3marks?: int (default 2),
 *   num_4marks?: int (default 2),
 *   num_10marks?: int (default 1)
 * }
 * Response: {
 *   success: boolean,
 *   questions: [{ question: string, marks: int }]
 * }
 */
export const generateTheoryQuestions = async (data) => {
  const response = await llmApi.post('/api/llm/generate/theory/questions', data);
  return response.data;
};

/**
 * Generate MCQ questions from syllabus text
 * POST /api/llm/generate/mcq/questions
 * Request: {
 *   subject: string,
 *   semester?: string,
 *   unit_syllabus: string,
 *   num_mcqs?: int (default 5)
 * }
 * Response: {
 *   success: boolean,
 *   questions: [{ question: string, options: [string], correct_option: string }]
 * }
 */
export const generateMCQQuestions = async (data) => {
  const response = await llmApi.post('/api/llm/generate/mcq/questions', data);
  return response.data;
};

/**
 * Generate seating arrangement
 * POST /generate-seating-arrangement
 * Request: {
 *   exam_name: string,
 *   exam_date: string,
 *   rooms: [room_no],
 *   students: [{ roll_no, name, branch }]
 * }
 * Response: {
 *   exam_name: string,
 *   exam_date: string,
 *   allocation: { room_no: [{ roll_no, name, seat }] }
 * }
 */
export const generateSeatingArrangement = async (data) => {
  const response = await llmApi.post('/api/llm/generate-seating-arrangement', data);
  return response.data;
};

export default {
  generateTheoryQuestions,
  generateMCQQuestions,
  generateSeatingArrangement,
};
