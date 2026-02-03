import { useState, useCallback } from 'react';

/**
 * Custom hook for file upload with progress
 */
export const useUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  /**
   * Upload file with progress tracking
   */
  const upload = useCallback(async (uploadFn, data) => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Simulate progress for API calls that don't support it
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const result = await uploadFn(data);

      clearInterval(progressInterval);
      setProgress(100);
      setIsUploading(false);

      return result;
    } catch (err) {
      setError(err.message || 'Upload failed');
      setIsUploading(false);
      throw err;
    }
  }, []);

  /**
   * Reset upload state
   */
  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  return {
    isUploading,
    progress,
    error,
    upload,
    reset,
  };
};

export default useUpload;
