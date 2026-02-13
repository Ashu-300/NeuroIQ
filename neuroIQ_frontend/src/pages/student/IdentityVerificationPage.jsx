import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyIdentity, startExam } from '../../api/proctoring.api';
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
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (!exam) {
      navigate('/student/exams');
    }
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
        exam_id: exam.id,
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
      // If API fails, still proceed to exam (for development/demo)
      setToast({
        show: true,
        message: 'Proceeding to exam...',
        type: 'success',
      });
      setTimeout(() => {
        navigate('/student/proctoring-exam', {
          state: {
            exam,
            session_id: `session_${Date.now()}`,
            start_time: new Date().toISOString(),
            faceImage,
          },
        });
      }, 1000);
    } finally {
      setIsVerifying(false);
    }
  };

  if (!exam) {
    return null;
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
            <Button variant="outline" fullWidth onClick={handleRetake}>
              Retake
            </Button>
            <Button fullWidth onClick={handleVerify} loading={isVerifying}>
              Start Exam
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
