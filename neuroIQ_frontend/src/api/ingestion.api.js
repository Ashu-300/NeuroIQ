import createAxiosInstance from './axios';
import { API_BASE_URLS } from '../utils/constants';

const ingestionApi = createAxiosInstance(API_BASE_URLS.INGESTION);

/**
 * Upload material (PDF)
 * POST /upload
 * Request: FormData with:
 *   - file: PDF file
 *   - subject: string
 *   - semester: string
 * Response: { message: string, material_id: string, cloudinary_url: string, extracted_text: string }
 */
export const uploadMaterial = async (file, subject, semester, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('subject', subject);
  formData.append('semester', semester);

  const response = await ingestionApi.post('/api/ingestion/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: onUploadProgress ? (progressEvent) => {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      onUploadProgress(percentCompleted);
    } : undefined,
  });
  return response.data;
};

/**
 * Get material by ID
 * GET /get/:id
 * Response: { material: { id, subject, semester, cloudinary_url, extracted_text, created_at } }
 */
export const getMaterial = async (id) => {
  const response = await ingestionApi.get(`/api/ingestion/get/${id}`);
  return response.data;
};

/**
 * Get all user materials
 * GET /get
 * Response: { materials: [{ id, subject, semester, cloudinary_url, created_at }] }
 */
export const getAllMaterials = async () => {
  const response = await ingestionApi.get('/api/ingestion/get');
  return response.data;
};

/**
 * Delete material by ID
 * DELETE /delete/:id
 * Response: { message: string }
 */
export const deleteMaterial = async (id) => {
  const response = await ingestionApi.delete(`/api/ingestion/delete/${id}`);
  return response.data;
};

export default {
  uploadMaterial,
  getMaterial,
  getAllMaterials,
  deleteMaterial,
};
