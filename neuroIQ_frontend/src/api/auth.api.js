import createAxiosInstance from './axios';
import { API_BASE_URLS } from '../utils/constants';

const authApi = createAxiosInstance(API_BASE_URLS.AUTH);

/**
 * User signup
 * POST /signup
 * Request: { name: string, email: string, password: string, role: string, institution?: string }
 * Response: { message: string }
 */
export const signup = async (userData) => {
  const response = await authApi.post('/api/auth/signup', userData);
  return response.data;
};

/**
 * User login
 * POST /login
 * Request: { email: string, password: string }
 * Response: { accessToken: string, refreshToken: string, User: { name, email, role, institution } }
 */
export const login = async (credentials) => {
  const response = await authApi.post('/api/auth/login', credentials);
  return response.data;
};

/**
 * Refresh token
 * POST /refresh
 * Request: { refreshToken: string }
 * Response: { accessToken: string, refreshToken: string }
 */
export const refreshToken = async (token) => {
  const response = await authApi.post('/api/auth/token/refresh', { refresh_token: token });
  return response.data;
};

/**
 * Register a student profile (for authenticated students)
 * POST /register/student
 * Request: { first_name, last_name, roll_number, enrollment_no, branch, semester, section, email, phone }
 * Response: { message: string }
 */
export const registerStudent = async (studentData) => {
  const response = await authApi.post('/api/auth/register/student', studentData);
  return response.data;
};

/**
 * Bulk register students
 * POST /register/student/bulk
 * Request: { students: [{ name, email, password, roll_no, branch, semester }] }
 * Response: { message: string, count: int }
 */
export const bulkRegisterStudents = async (studentsData) => {
  const response = await authApi.post('/api/auth/register/student/bulk', studentsData);
  return response.data;
};

/**
 * Get student list with filters
 * GET /get/studentlist?branch=X&semester=Y
 * Response: { students: [{ id, name, email, roll_no, branch, semester }] }
 */
export const getStudentList = async (filters = {}) => {
  const response = await authApi.get('/api/auth/get/studentlist', { params: filters });
  return response.data;
};

/**
 * Get current user profile
 * GET /get/user
 * Response: { user: { id, name, email, role, institution } }
 */
export const getUser = async () => {
  const response = await authApi.get('/api/auth/get/user');
  return response.data;
};

/**
 * Update user profile
 * PUT /update
 * Request: { name?: string, password?: string, institution?: string }
 * Response: { message: string, user: {} }
 */
export const updateProfile = async (updateData) => {
  const response = await authApi.put('/api/auth/update', updateData);
  return response.data;
};

/**
 * Logout
 * POST /logout
 * Request: (uses token from header)
 * Response: { message: string }
 */
export const logout = async () => {
  const response = await authApi.post('/api/auth/logout');
  return response.data;
};

export default {
  signup,
  login,
  refreshToken,
  registerStudent,
  bulkRegisterStudents,
  getStudentList,
  getUser,
  updateProfile,
  logout,
};
