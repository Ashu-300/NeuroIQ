import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyIdentity } from '../../api/proctoring.api';
import { useCamera } from '../../hooks';
import { Button, Card, CardTitle, Loader } from '../../components/ui';
import { Toast } from '../../components/feedback';

const IdentityVerificationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const exam = location.state?.exam;

  const { videoRef, isReady, error: cameraError, captureFrame } = useCamera();
  
  const [step, setStep] = useState(1); // 1: face, 2: id-card
  const [faceImage, setFaceImage] = useState(null);
  const [idCardImage, setIdCardImage] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (!exam) {
      navigate('/student/exams');
    }
  }, [exam, navigate]);

  const handleCapture = () => {
    const frame = captureFrame('base64');
    if (frame) {
      if (step === 1) {
        setFaceImage(frame);
        setStep(2);
      } else {
        setIdCardImage(frame);
      }
    } else {
      setToast({ show: true, message: 'Failed to capture image', type: 'error' });
    }
  };

  const handleRetake = () => {
    if (step === 1) {
      setFaceImage(null);
    } else {
      setIdCardImage(null);
    }
  };

  const handleVerify = async () => {
    if (!faceImage || !idCardImage) {
      setToast({
        show: true,
        message: 'Please capture both face and ID card images',
        type: 'error',
      });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await verifyIdentity({
        exam_id: exam.id,
        face_image: faceImage,
        id_card_image: idCardImage,
      });

      setVerificationResult(response.data);

      if (response.data.verified) {
        setToast({
          show: true,
          message: 'Identity verified successfully!',
          type: 'success',
        });
        // Navigate to proctoring exam page
        setTimeout(() => {
          navigate('/student/proctoring-exam', {
            state: {
              exam,
              session_id: response.data.session_id,
            },
          });
        }, 1500);
      } else {
        setToast({
          show: true,
          message: response.data.message || 'Verification failed. Please try again.',
          type: 'error',
        });
        // Reset for retry
        setFaceImage(null);
        setIdCardImage(null);
        setStep(1);
      }
    } catch (err) {
      setToast({
        show: true,
        message: err.message || 'Verification failed',
        type: 'error',
      });
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
          Verify your identity before starting: {exam.title}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4">
        <div
          className={`flex items-center ${
            step >= 1 ? 'text-indigo-600' : 'text-gray-400'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              faceImage ? 'bg-green-500 text-white' : step === 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200'
            }`}
          >
            {faceImage ? '✓' : '1'}
          </div>
          <span className="ml-2 text-sm font-medium">Face Photo</span>
        </div>
        <div className="w-16 h-0.5 bg-gray-200">
          <div
            className={`h-full bg-indigo-600 transition-all ${
              step > 1 ? 'w-full' : 'w-0'
            }`}
          />
        </div>
        <div
          className={`flex items-center ${
            step >= 2 ? 'text-indigo-600' : 'text-gray-400'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              idCardImage ? 'bg-green-500 text-white' : step === 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200'
            }`}
          >
            {idCardImage ? '✓' : '2'}
          </div>
          <span className="ml-2 text-sm font-medium">ID Card</span>
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
          {!((step === 1 && faceImage) || (step === 2 && idCardImage)) && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          {/* Face Preview */}
          {step === 1 && faceImage && (
            <img
              src={faceImage}
              alt="Face capture"
              className="w-full h-full object-cover"
            />
          )}

          {/* ID Card Preview */}
          {step === 2 && idCardImage && (
            <img
              src={idCardImage}
              alt="ID Card capture"
              className="w-full h-full object-cover"
            />
          )}

          {/* Overlay Guide */}
          {!faceImage && step === 1 && isReady && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-64 border-2 border-dashed border-white/50 rounded-xl" />
            </div>
          )}

          {!idCardImage && step === 2 && isReady && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-72 h-48 border-2 border-dashed border-white/50 rounded-lg" />
            </div>
          )}

          {/* Loading */}
          {!isReady && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <Loader size="lg" />
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="p-4 text-center">
          {step === 1 && !faceImage && (
            <p className="text-gray-600">
              Position your face within the frame and capture a clear photo
            </p>
          )}
          {step === 2 && !idCardImage && (
            <p className="text-gray-600">
              Hold your ID card within the frame and capture a clear photo
            </p>
          )}
          {step === 1 && faceImage && (
            <p className="text-green-600 font-medium">
              Face photo captured! Click "Next" to continue.
            </p>
          )}
          {step === 2 && idCardImage && (
            <p className="text-green-600 font-medium">
              ID card captured! Click "Verify" to proceed.
            </p>
          )}
        </div>
      </Card>

      {/* Captured Images Preview */}
      {(faceImage || idCardImage) && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Face Photo</p>
            {faceImage ? (
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={faceImage}
                  alt="Face"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                Not captured
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">ID Card</p>
            {idCardImage ? (
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={idCardImage}
                  alt="ID Card"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                Not captured
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        {step === 1 && !faceImage && (
          <>
            <Button
              variant="outline"
              fullWidth
              onClick={() => navigate('/student/exams')}
            >
              Cancel
            </Button>
            <Button fullWidth onClick={handleCapture} disabled={!isReady}>
              Capture Face
            </Button>
          </>
        )}

        {step === 1 && faceImage && (
          <>
            <Button variant="outline" fullWidth onClick={handleRetake}>
              Retake
            </Button>
            <Button fullWidth onClick={() => setStep(2)}>
              Next: ID Card
            </Button>
          </>
        )}

        {step === 2 && !idCardImage && (
          <>
            <Button variant="outline" fullWidth onClick={() => setStep(1)}>
              Back
            </Button>
            <Button fullWidth onClick={handleCapture} disabled={!isReady}>
              Capture ID Card
            </Button>
          </>
        )}

        {step === 2 && idCardImage && (
          <>
            <Button variant="outline" fullWidth onClick={handleRetake}>
              Retake
            </Button>
            <Button fullWidth onClick={handleVerify} loading={isVerifying}>
              Verify & Start Exam
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
