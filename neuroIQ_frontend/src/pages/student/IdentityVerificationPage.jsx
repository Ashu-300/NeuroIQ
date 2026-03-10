import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyIdentity, startExam, getMyExamStatus, getExamStatus } from '../../api/proctoring.api';
import { useCamera } from '../../hooks';
import { Button, Card, Loader } from '../../components/ui';
import { Toast } from '../../components/feedback';

const IdentityVerificationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const exam = location.state?.exam;

  const { videoRef, isActive, error: cameraError, startCamera, stopCamera, captureFrame } = useCamera();
  
  const [faceImage, setFaceImage] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Helper to check if status indicates submission
  const isSubmittedStatus = (statusValue) => {
    const normalized = String(statusValue || '').toLowerCase();
    return normalized === 'submitted' || normalized === 'auto_submitted' || normalized === 'terminated';
  };

  useEffect(() => {
    if (!exam) {
      navigate('/student/exams');
      return;
    }

    // Check if exam was already submitted before allowing attempt
    const checkExamStatus = async () => {
      try {
        const examId = exam.schedule_id || exam.id;
        const myStatus = await getMyExamStatus(examId);

        // If can_attempt is explicitly false, block
        if (myStatus?.can_attempt === false) {
          setAlreadySubmitted(true);
          setToast({
            show: true,
            message: 'You have already submitted this exam.',
            type: 'error',
          });
          setTimeout(() => navigate('/student/exams'), 2500);
          return;
        }

        // If a session exists, verify its status
        if (myStatus?.session_id) {
          try {
            const sessionStatus = await getExamStatus(myStatus.session_id);
            if (isSubmittedStatus(sessionStatus?.status)) {
              setAlreadySubmitted(true);
              setToast({
                show: true,
                message: 'You have already submitted this exam.',
                type: 'error',
              });
              setTimeout(() => navigate('/student/exams'), 2500);
              return;
            }
          } catch (sessionErr) {
            console.error('Failed to check session status:', sessionErr);
          }
        }
      } catch (err) {
        console.error('Failed to check exam status:', err);
        // Continue anyway if status check fails
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkExamStatus();
  }, [exam, navigate]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const handleCapture = () => {
    const frame = captureFrame();
    if (frame) {
      setFaceImage(frame);
    } else {
      setToast({ show: true, message: 'Failed to capture image', type: 'error' });
    }
  };

  const handleRetake = () => {
    setFaceImage(null);
  };

  const handleVerify = async () => {
    if (!faceImage) {
      setToast({
        show: true,
        message: 'Please capture your face photo',
        type: 'error',
      });
      return;
    }

    setIsVerifying(true);
    try {
      // Step 1: Start exam session first to get session_id
      setToast({
        show: true,
        message: 'Starting exam session...',
        type: 'success',
      });

      const startResult = await startExam({
        // Proctoring attempt lock is tracked against scheduled exam id.
        exam_id: exam.schedule_id || exam.id || exam.exam_id || exam.question_bank_id,
      });

      const sessionId = startResult.session_id;

      // Step 2: Verify identity with session_id and face frame
      setToast({
        show: true,
        message: 'Verifying identity...',
        type: 'success',
      });

      const verifyResult = await verifyIdentity(sessionId, faceImage);

      if (!verifyResult.verified) {
        setToast({
          show: true,
          message: verifyResult.message || 'Verification failed. Please try again.',
          type: 'error',
        });
        setFaceImage(null);
        setIsVerifying(false);
        return;
      }

      setToast({
        show: true,
        message: 'Identity verified! Starting exam...',
        type: 'success',
      });

      // Navigate to proctoring exam page with session info
      setTimeout(() => {
        navigate('/student/proctoring-exam', {
          state: {
            exam,
            session_id: sessionId,
            start_time: startResult.start_time,
            faceImage,
          },
        });
      }, 1000);
    } catch (err) {
      console.error('Exam start error:', err);
      const status = err.status || err.response?.status;
      const detail = err.data?.detail || err.response?.data?.detail || '';
      const message = err.message || detail;
      
      // Check if exam was already submitted (409 Conflict)
      if (status === 409) {
        setToast({
          show: true,
          message: detail || 'You have already submitted this exam.',
          type: 'error',
        });
        // Navigate back to exams list after showing message
        setTimeout(() => {
          navigate('/student/exams');
        }, 3000);
        return;
      }

      // Identity verification specific message for unclear/invalid face photos.
      const isIdentityVerificationBadRequest =
        status === 400 &&
        /identity verification failed|no face detected|multiple faces detected|camera appears to be hidden|failed to decode frame/i.test(
          detail || message
        );

      if (isIdentityVerificationBadRequest) {
        setToast({
          show: true,
          message: 'Photo not clear. Please retake your face photo and try again.',
          type: 'error',
        });
        setFaceImage(null);
        return;
      }
      
      // Show error for other failures
      setToast({
        show: true,
        message: detail || message || 'Failed to start exam. Please try again.',
        type: 'error',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (!exam) {
    return null;
  }

  // Show loading while checking submission status
  if (isCheckingStatus) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader size="lg" />
        <p className="text-gray-500">Checking exam status...</p>
      </div>
    );
  }

  // Show message if already submitted
  if (alreadySubmitted) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-12">
        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Exam Already Submitted</h2>
        <p className="text-gray-600">You have already submitted this exam. Multiple attempts are not allowed.</p>
        <p className="text-sm text-gray-500">Redirecting to exams list...</p>
        {toast.show && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ ...toast, show: false })}
          />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Identity Verification</h1>
        <p className="text-gray-500 mt-1">
          Capture your photo before starting: {exam.title}
        </p>
      </div>

      {/* Single Step Indicator */}
      <div className="flex items-center justify-center">
        <div className="flex items-center text-indigo-600">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
              faceImage ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white'
            }`}
          >
            {faceImage ? '✓' : '1'}
          </div>
          <span className="ml-3 text-base font-medium">Capture Face Photo</span>
        </div>
      </div>

      {/* Camera Error */}
      {cameraError && (
        <Card className="border-red-200 bg-red-50">
          <p className="text-red-600 text-center">
            Camera error: {cameraError}. Please allow camera access and refresh.
          </p>
        </Card>
      )}

      {/* Camera View */}
      <Card padding="none">
        <div className="aspect-video bg-black relative overflow-hidden rounded-lg">
          {/* Live Camera */}
          {!faceImage && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          {/* Face Preview */}
          {faceImage && (
            <img
              src={faceImage}
              alt="Face capture"
              className="w-full h-full object-cover"
            />
          )}

          {/* Overlay Guide */}
          {!faceImage && isActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-64 border-2 border-dashed border-white/50 rounded-xl" />
            </div>
          )}

          {/* Loading */}
          {!isActive && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <Loader size="lg" />
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="p-4 text-center">
          {!faceImage && (
            <p className="text-gray-600">
              Position your face within the frame and capture a clear photo
            </p>
          )}
          {faceImage && (
            <p className="text-green-600 font-medium">
              Face photo captured! Click "Start Exam" to proceed.
            </p>
          )}
        </div>
      </Card>

      {/* Captured Image Preview */}
      {faceImage && (
        <div className="max-w-xs mx-auto">
          <p className="text-sm font-medium text-gray-700 mb-2 text-center">Your Photo</p>
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={faceImage}
              alt="Face"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        {!faceImage && (
          <>
            <Button
              variant="outline"
              fullWidth
              onClick={() => navigate('/student/exams')}
            >
              Cancel
            </Button>
            <Button fullWidth onClick={handleCapture} disabled={!isActive}>
              Capture Photo
            </Button>
          </>
        )}

        {faceImage && (
          <>
            <Button variant="outline" fullWidth onClick={handleRetake} disabled={isVerifying}>
              Retake
            </Button>
            <Button fullWidth onClick={handleVerify} loading={isVerifying} disabled={alreadySubmitted}>
              {alreadySubmitted ? 'Already Submitted' : 'Start Exam'}
            </Button>
          </>
        )}
      </div>

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </div>
  );
};

export default IdentityVerificationPage;
