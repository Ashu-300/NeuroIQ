import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { submitExam, getExamQuestions } from '../../api/proctoring.api';
import { useCamera, useWebSocket } from '../../hooks';
import { Button, Card, CardTitle, Loader, Modal } from '../../components/ui';
import { Toast } from '../../components/feedback';

const ProctoringExamPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const exam = location.state?.exam;
  const sessionId = location.state?.session_id;

  const { videoRef, isReady: cameraReady, captureFrame } = useCamera();
  const {
    isConnected,
    lastMessage,
    connect,
    disconnect,
    sendFrame,
  } = useWebSocket(sessionId);

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(exam?.duration * 60 || 7200);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [violations, setViolations] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const frameIntervalRef = useRef(null);
  const timerRef = useRef(null);

  // Fetch questions
  useEffect(() => {
    if (!exam) {
      navigate('/student/exams');
      return;
    }

    const fetchQuestions = async () => {
      try {
        const response = await getExamQuestions(exam.id);
        setQuestions(response.data?.questions || []);
      } catch (err) {
        console.error('Failed to fetch questions:', err);
        // Demo questions
        setQuestions([
          {
            id: 'q1',
            question: 'What is the time complexity of binary search?',
            type: 'MCQ',
            options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
            marks: 2,
          },
          {
            id: 'q2',
            question: 'Explain the difference between stack and queue.',
            type: 'THEORY',
            marks: 5,
          },
          {
            id: 'q3',
            question: 'Which data structure uses LIFO principle?',
            type: 'MCQ',
            options: ['Queue', 'Stack', 'Tree', 'Graph'],
            marks: 2,
          },
          {
            id: 'q4',
            question: 'Write a function to reverse a linked list.',
            type: 'THEORY',
            marks: 10,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [exam, navigate]);

  // Connect WebSocket
  useEffect(() => {
    if (sessionId) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [sessionId, connect, disconnect]);

  // Send frames periodically
  useEffect(() => {
    if (cameraReady && isConnected) {
      frameIntervalRef.current = setInterval(() => {
        const frame = captureFrame('blob');
        if (frame) {
          sendFrame(frame);
        }
      }, 2000); // Send frame every 2 seconds
    }

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, [cameraReady, isConnected, captureFrame, sendFrame]);

  // Handle proctoring violations from WebSocket
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        if (data.type === 'violation') {
          setViolations((prev) => [
            ...prev,
            { time: new Date().toISOString(), message: data.message },
          ]);
          setToast({
            show: true,
            message: `Warning: ${data.message}`,
            type: 'error',
          });
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    }
  }, [lastMessage]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Prevent tab switching / window blur
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setViolations((prev) => [
          ...prev,
          { time: new Date().toISOString(), message: 'Tab switched detected' },
        ]);
        setToast({
          show: true,
          message: 'Warning: Switching tabs is not allowed!',
          type: 'error',
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleAutoSubmit = async () => {
    await submitAnswers();
  };

  const submitAnswers = async () => {
    setIsSubmitting(true);
    try {
      const formattedAnswers = questions.map((q) => ({
        question_id: q.id,
        answer: answers[q.id] || '',
      }));

      await submitExam({
        exam_id: exam.id,
        session_id: sessionId,
        answers: formattedAnswers,
        violations,
      });

      // Clear intervals
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      disconnect();

      setToast({
        show: true,
        message: 'Exam submitted successfully!',
        type: 'success',
      });

      setTimeout(() => {
        navigate('/student');
      }, 2000);
    } catch (err) {
      setToast({
        show: true,
        message: err.message || 'Failed to submit exam',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isLowTime = timeLeft < 300; // Less than 5 minutes

  if (!exam) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-gray-900">{exam.title}</h1>
            <p className="text-sm text-gray-500">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>

          <div className="flex items-center gap-6">
            {/* Camera Preview */}
            <div className="relative w-24 h-18 rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div
                className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
            </div>

            {/* Timer */}
            <div
              className={`text-xl font-mono font-bold ${
                isLowTime ? 'text-red-600 animate-pulse' : 'text-gray-900'
              }`}
            >
              {formatTime(timeLeft)}
            </div>

            <Button
              variant="secondary"
              onClick={() => setShowSubmitModal(true)}
            >
              Submit Exam
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-8 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Area */}
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      currentQuestion?.type === 'MCQ'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {currentQuestion?.type}
                  </span>
                  <span className="text-sm text-gray-500">
                    {currentQuestion?.marks} marks
                  </span>
                </div>

                <p className="text-lg text-gray-900 leading-relaxed">
                  {currentQuestion?.question}
                </p>

                {/* MCQ Options */}
                {currentQuestion?.type === 'MCQ' && (
                  <div className="space-y-3 pt-4">
                    {currentQuestion.options.map((option, index) => (
                      <label
                        key={index}
                        className={`flex items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                          answers[currentQuestion.id] === option
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          value={option}
                          checked={answers[currentQuestion.id] === option}
                          onChange={() =>
                            handleAnswerChange(currentQuestion.id, option)
                          }
                          className="sr-only"
                        />
                        <span className="w-6 h-6 flex items-center justify-center rounded-full border-2 border-gray-300 mr-3 text-sm font-medium">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Theory Answer */}
                {currentQuestion?.type === 'THEORY' && (
                  <div className="pt-4">
                    <textarea
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[200px]"
                      placeholder="Type your answer here..."
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) =>
                        handleAnswerChange(currentQuestion.id, e.target.value)
                      }
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                {answeredCount} of {questions.length} answered
              </span>
              <Button
                onClick={() =>
                  setCurrentIndex((prev) =>
                    Math.min(questions.length - 1, prev + 1)
                  )
                }
                disabled={currentIndex === questions.length - 1}
              >
                Next
              </Button>
            </div>
          </div>

          {/* Question Navigator */}
          <div className="space-y-4">
            <Card>
              <CardTitle>Questions</CardTitle>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {questions.map((q, index) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                      currentIndex === index
                        ? 'bg-indigo-600 text-white'
                        : answers[q.id]
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-indigo-600" />
                  <span>Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gray-100" />
                  <span>Not answered</span>
                </div>
              </div>
            </Card>

            {/* Violations Warning */}
            {violations.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <div className="text-sm">
                  <p className="font-medium text-red-800">
                    ⚠️ Violations: {violations.length}
                  </p>
                  <p className="text-red-600 mt-1">
                    Suspicious activity detected. Your actions are being
                    recorded.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Exam"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to submit your exam?
          </p>
          <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
            <p>
              <span className="text-gray-500">Questions answered:</span>{' '}
              <span className="font-medium">
                {answeredCount} / {questions.length}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Time remaining:</span>{' '}
              <span className="font-medium">{formatTime(timeLeft)}</span>
            </p>
            {violations.length > 0 && (
              <p className="text-red-600">
                Violations recorded: {violations.length}
              </p>
            )}
          </div>
          {answeredCount < questions.length && (
            <p className="text-amber-600 text-sm">
              ⚠️ You have {questions.length - answeredCount} unanswered
              questions.
            </p>
          )}
          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowSubmitModal(false)}
            >
              Continue Exam
            </Button>
            <Button fullWidth onClick={submitAnswers} loading={isSubmitting}>
              Submit
            </Button>
          </div>
        </div>
      </Modal>

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

export default ProctoringExamPage;
