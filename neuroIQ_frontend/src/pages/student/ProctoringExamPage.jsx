import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  submitExam, 
  endExamSession, 
  getExamStatus,
  checkAgentConnected,
  startProctoringAgent,
  getAgentStatus,
  stopProctoringAgent,
  getExamReport,
  getPersistedActiveSession,
  clearPersistedActiveSession,
} from '../../api/proctoring.api';
import { submitExamAnswers } from '../../api/answer.api';
import { getExam } from '../../api/question.api';
import { Button, Card, CardTitle, Loader, Modal } from '../../components/ui';
import { Toast } from '../../components/feedback';

// LocalStorage key for caching submitted exams (shared with ExamLaunchPage)
const SUBMITTED_EXAMS_KEY = 'neuroiq_submitted_exams';

// Helper to mark exam as submitted in localStorage cache
const markExamAsSubmittedInCache = (examId) => {
  try {
    // Get student ID from localStorage
    let studentId = null;
    const storedProfile = localStorage.getItem('neuroiq_student_profile');
    if (storedProfile) {
      const profile = JSON.parse(storedProfile);
      studentId = profile._id || profile.id || profile.student_id;
    }
    if (!studentId) {
      const authData = localStorage.getItem('neuroiq_auth');
      if (authData) {
        const auth = JSON.parse(authData);
        studentId = auth.userId || auth.user_id || auth.id;
      }
    }
    
    if (!studentId || !examId) return;
    
    const submittedExams = JSON.parse(localStorage.getItem(SUBMITTED_EXAMS_KEY) || '{}');
    const key = `${studentId}_${examId}`;
    submittedExams[key] = true;
    localStorage.setItem(SUBMITTED_EXAMS_KEY, JSON.stringify(submittedExams));
    console.log(`Marked exam ${examId} as submitted for student ${studentId}`);
  } catch (err) {
    console.error('Failed to cache submitted exam:', err);
  }
};

// Question status enum
const QuestionStatus = {
  NOT_VISITED: 'not-visited',
  CURRENT: 'current',
  ANSWERED: 'answered',
  MARKED_FOR_REVIEW: 'marked-for-review',
  ANSWERED_AND_MARKED: 'answered-and-marked',
};

const ProctoringExamPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const exam = location.state?.exam;
  const persistedSession = getPersistedActiveSession();
  const sessionIdFromState = location.state?.session_id;
  const sessionId = sessionIdFromState || persistedSession?.session_id;
  const faceImage = location.state?.faceImage;
  const startTime = location.state?.start_time;

  // Agent connection state (replaces webcam/websocket)
  const [agentConnected, setAgentConnected] = useState(false);

  // Calculate initial time left based on exam end_time
  const calculateInitialTimeLeft = () => {
    // Prefer using end_time if available (scheduled exam window)
    if (exam?.end_time) {
      const endTime = new Date(exam.end_time).getTime();
      const now = Date.now();
      const remainingSeconds = Math.floor((endTime - now) / 1000);
      console.log('Time calculation from end_time:', { endTime: exam.end_time, now, remainingSeconds });
      
      if (remainingSeconds <= 0) {
        console.warn('Exam window has ended');
        return 1; // Trigger auto-submit
      }
      return remainingSeconds;
    }
    
    // Fallback: Use duration from exam object
    const durationMinutes = exam?.duration;
    console.log('Exam duration from state:', durationMinutes, 'exam object:', exam);
    const totalDuration = (durationMinutes || 120) * 60; // in seconds
    
    if (startTime) {
      const serverStartTime = new Date(startTime).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - serverStartTime) / 1000);
      console.log('Time calculation from startTime:', { serverStartTime, now, elapsed, totalDuration, startTime });
      
      // If start time is in the future, use full duration
      if (elapsed < 0) {
        console.warn('Start time is in the future, using full duration');
        return totalDuration;
      }
      
      // If elapsed time exceeds duration, exam time is over
      if (elapsed >= totalDuration) {
        console.warn('Exam time has expired');
        return 1;
      }
      
      return totalDuration - elapsed;
    }
    return totalDuration;
  };

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [visitedQuestions, setVisitedQuestions] = useState(new Set([0]));
  const [timeLeft, setTimeLeft] = useState(calculateInitialTimeLeft);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showEndExamModal, setShowEndExamModal] = useState(false);
  const [violations, setViolations] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [showAgentWarning, setShowAgentWarning] = useState(false);
  const [isPreflightChecking, setIsPreflightChecking] = useState(true);
  const [isPreflightReady, setIsPreflightReady] = useState(false);
  const [preflightError, setPreflightError] = useState('');
  const [preflightAttempt, setPreflightAttempt] = useState(0);
  const [isConnectingProctoring, setIsConnectingProctoring] = useState(false);

  const timerRef = useRef(null);
  const containerRef = useRef(null);
  const agentCheckIntervalRef = useRef(null);

  const stopAgentSafely = useCallback(async () => {
    try {
      await stopProctoringAgent();
    } catch (agentErr) {
      console.error('Failed to stop proctoring agent:', agentErr);
    }
  }, []);

  const cleanupRunningIntervals = useCallback(() => {
    if (agentCheckIntervalRef.current) clearInterval(agentCheckIntervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const getStudentId = useCallback(() => {
    const storedProfile = localStorage.getItem('neuroiq_student_profile');
    if (storedProfile) {
      const profile = JSON.parse(storedProfile);
      return profile._id || profile.id || profile.student_id;
    }

    const authData = localStorage.getItem('neuroiq_auth');
    if (authData) {
      const auth = JSON.parse(authData);
      return auth.userId || auth.user_id || auth.id;
    }

    return null;
  }, []);

  const connectToProctoring = useCallback(async () => {
    if (!exam || !sessionId) return;

    setIsConnectingProctoring(true);
    setPreflightError('');

    try {
      const examId = exam.schedule_id || exam.id || exam.exam_id || exam.question_bank_id;
      // Local agent derives student_id from JWT; only session_id and exam_id are required
      await startProctoringAgent(sessionId, null, examId);

      // Re-run /status verification sequence.
      setPreflightAttempt((prev) => prev + 1);
    } catch (err) {
      const isNetworkError =
        err?.code === 'ERR_NETWORK' ||
        (typeof err?.message === 'string' && err.message.toLowerCase().includes('network error'));

      const message = isNetworkError
        ? 'Cannot reach the NeuroIQ Proctoring Agent. Please make sure the agent is running on your computer, then try again.'
        : err?.data?.detail ||
          err?.response?.data?.detail ||
          err?.message ||
          'Failed to connect to proctoring.';

      setPreflightError(message);
    } finally {
      setIsConnectingProctoring(false);
    }
  }, [exam, sessionId]);

  // Mandatory preflight on instruction page before allowing exam start.
  // This uses local agent /status only; /start and /start-proctoring are called before reaching this page.
  useEffect(() => {
    if (!exam || !sessionId || examStarted) return;

    let cancelled = false;

    const runPreflight = async () => {
      setIsPreflightChecking(true);
      setIsPreflightReady(false);
      setPreflightError('');

      try {
        let verified = false;
        let lastStatus = null;
        for (let attempt = 1; attempt <= 8; attempt += 1) {
          const status = await getAgentStatus();
          lastStatus = status;
          if (
            status?.agent_running === true &&
            status?.socketio_connected === true &&
            status?.session_id === sessionId
          ) {
            verified = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        if (!verified) {
          let friendlyMessage = '';

          if (!lastStatus) {
            // Could not get any status from local agent (likely not running or unreachable)
            friendlyMessage =
              'Cannot reach the NeuroIQ Proctoring Agent. Please make sure the agent is downloaded and running, then retry.';
          } else if (lastStatus?.agent_running && !lastStatus?.socketio_connected) {
            // Agent is running but cannot connect its Socket.IO client to the backend
            friendlyMessage =
              'Proctoring connection failed. The agent could not connect to the exam server. Please check your internet connection and try again.';
          } else if (lastStatus?.agent_running === false) {
            // Agent explicitly reports that it is not running
            friendlyMessage =
              'NeuroIQ Proctoring Agent is not running. Please start the agent and try again.';
          } else {
            // Generic fallback for any other preflight failure
            friendlyMessage =
              'Proctoring agent is not ready yet. Please restart the agent and retry.';
          }

          throw new Error(friendlyMessage);
        }

        if (cancelled) return;
        setAgentConnected(true);
        setIsPreflightReady(true);
      } catch (err) {
        if (cancelled) return;
        const isNetworkError =
          err?.code === 'ERR_NETWORK' ||
          (typeof err?.message === 'string' && err.message.toLowerCase().includes('network error'));

        const message = isNetworkError
          ? 'Cannot reach the NeuroIQ Proctoring Agent. Please make sure the agent is running on your computer, then try again.'
          : err?.message || 'Pre-check failed. Please retry.';

        setPreflightError(message);
        setIsPreflightReady(false);
      } finally {
        if (!cancelled) {
          setIsPreflightChecking(false);
        }
      }
    };

    runPreflight();

    return () => {
      cancelled = true;
    };
  }, [exam, examStarted, preflightAttempt, sessionId]);

  // If session_id is missing or doesn't match current exam, return to exam list.
  useEffect(() => {
    if (!exam) {
      navigate('/student/exams');
      return;
    }

    if (!sessionId) {
      setToast({
        show: true,
        message: 'Exam session not found. Please start your exam again.',
        type: 'error',
      });
      setTimeout(() => navigate('/student/exams'), 1200);
      return;
    }

    if (persistedSession?.exam_id && persistedSession.exam_id !== (exam.schedule_id || exam.id || exam.exam_id || exam.question_bank_id)) {
      setToast({
        show: true,
        message: 'Session mismatch detected. Please restart the exam flow.',
        type: 'error',
      });
      setTimeout(() => navigate('/student/exams'), 1200);
    }
  }, [exam, navigate, persistedSession, sessionId]);

  // Check agent connection status periodically
  useEffect(() => {
    if (!examStarted || !sessionId) return;

    const checkAgentStatus = async () => {
      try {
        const status = await checkAgentConnected(sessionId);
        const wasConnected = agentConnected;
        setAgentConnected(status.agent_connected);
        
        if (wasConnected && !status.agent_connected) {
          // Agent disconnected during exam
          console.warn('Proctoring agent disconnected!');
          setShowAgentWarning(true);
          setViolations((prev) => [
            ...prev,
            { time: new Date().toISOString(), message: 'Proctoring agent disconnected' },
          ]);
          setToast({
            show: true,
            message: 'Warning: Proctoring agent disconnected!',
            type: 'error',
          });
        } else if (!wasConnected && status.agent_connected) {
          console.log('Agent connected to backend');
          setShowAgentWarning(false);
        }
      } catch (err) {
        console.error('Failed to check agent status:', err);
      }
    };

    // Check immediately
    checkAgentStatus();

    // Then check every 10 seconds
    agentCheckIntervalRef.current = setInterval(checkAgentStatus, 10000);

    return () => {
      if (agentCheckIntervalRef.current) {
        clearInterval(agentCheckIntervalRef.current);
      }
    };
  }, [examStarted, sessionId, agentConnected]);

  // Fetch questions
  useEffect(() => {
    if (!exam) {
      navigate('/student/exams');
      return;
    }

    const fetchQuestions = async () => {
      try {
        // Fetch exam data from question service using question_bank_id (not schedule_id)
        const questionBankId = exam.question_bank_id || exam.id;
        console.log('Fetching exam with question_bank_id:', questionBankId);
        const examData = await getExam(questionBankId);
        
        if (!examData || !examData.exam) {
          throw new Error('No exam data returned');
        }

        const fetchedQuestions = [];
        
        // Handle theory questions
        if (examData.exam.theory_questions && examData.exam.theory_questions.length > 0) {
          examData.exam.theory_questions.forEach((q, idx) => {
            fetchedQuestions.push({
              id: q.question_id || q._id || `theory_${idx}`,
              question: q.question,
              type: 'THEORY',
              marks: q.marks || 5,
            });
          });
        }
        
        // Handle MCQ questions  
        if (examData.exam.mcq_questions && examData.exam.mcq_questions.length > 0) {
          examData.exam.mcq_questions.forEach((q, idx) => {
            fetchedQuestions.push({
              id: q.question_id || q._id || `mcq_${idx}`,
              question: q.question,
              type: 'MCQ',
              options: q.options,
              correctOption: q.correct_option, // Store for potential auto-grading
              marks: q.marks || 1,
            });
          });
        }

        // Handle single type exams (theory only or mcq only)
        if (examData.exam.question_list) {
          const category = examData.exam.category;
          examData.exam.question_list.forEach((q, idx) => {
            if (category === 'MCQ') {
              fetchedQuestions.push({
                id: q.question_id || q._id || `mcq_${idx}`,
                question: q.question,
                type: 'MCQ',
                options: q.options,
                correctOption: q.correct_option,
                marks: q.marks || 1,
              });
            } else {
              fetchedQuestions.push({
                id: q.question_id || q._id || `theory_${idx}`,
                question: q.question,
                type: 'THEORY',
                marks: q.marks || 5,
              });
            }
          });
        }

        if (fetchedQuestions.length > 0) {
          setQuestions(fetchedQuestions);
          console.log(`Loaded ${fetchedQuestions.length} questions from exam`);
        } else {
          throw new Error('No questions found in exam');
        }
      } catch (err) {
        console.error('Failed to fetch exam questions:', err);
        setToast({
          show: true,
          message: 'Failed to load exam questions. Please try again.',
          type: 'error',
        });
        // Navigate back to exams list after error
        setTimeout(() => {
          navigate('/student/exams');
        }, 2000);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [exam, navigate]);

  // Timer
  useEffect(() => {
    if (!examStarted) return;
    
    // Add a small delay before starting timer to avoid race conditions
    const startDelay = setTimeout(() => {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          // Only auto-submit if time actually ran down (not on initial load)
          if (prev <= 1 && prev > 0) {
            handleAutoSubmit();
            return 0;
          }
          if (prev <= 0) {
            return 0; // Already submitted or invalid
          }
          return prev - 1;
        });
      }, 1000);
    }, 1000); // 1 second delay before starting countdown

    return () => {
      clearTimeout(startDelay);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [examStarted]);

  // Periodic exam status check from server
  useEffect(() => {
    if (!examStarted || !sessionId) return;

    const checkStatus = async () => {
      try {
        const status = await getExamStatus(sessionId);
        
        // Update warnings count from server
        if (status.warnings > violations.length) {
          setToast({
            show: true,
            message: `Server detected ${status.warnings} warnings`,
            type: 'error',
          });
        }

        // Check if exam was auto-submitted or ended by server
        if (status.status === 'submitted' || status.status === 'terminated') {
          setToast({
            show: true,
            message: 'Exam session ended by server',
            type: 'error',
          });
          await stopAgentSafely();
          await exitFullscreen();
          clearPersistedActiveSession();
          navigate('/student/dashboard');
        }
      } catch (err) {
        console.error('Failed to check exam status:', err);
      }
    };

    // Check status every 30 seconds
    const statusInterval = setInterval(checkStatus, 30000);
    
    return () => {
      clearInterval(statusInterval);
    };
  }, [examStarted, sessionId, violations.length, navigate, stopAgentSafely]);

  // Fullscreen change handler
  useEffect(() => {
    // Give a grace period after exam starts
    let fullscreenTrackingEnabled = false;
    const enableTracking = setTimeout(() => {
      fullscreenTrackingEnabled = true;
    }, 2000); // 2 second grace period

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      
      // Only trigger violation after grace period and if exam has started
      if (examStarted && !isCurrentlyFullscreen && fullscreenTrackingEnabled) {
        setShowFullscreenWarning(true);
        setViolations((prev) => [
          ...prev,
          { time: new Date().toISOString(), message: 'Exited fullscreen mode' },
        ]);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      clearTimeout(enableTracking);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [examStarted]);

  // Prevent tab switching / window blur
  useEffect(() => {
    if (!examStarted) return;

    // Give a grace period after exam starts before tracking blur
    let blurTrackingEnabled = false;
    const enableBlurTracking = setTimeout(() => {
      blurTrackingEnabled = true;
    }, 3000); // 3 second grace period

    const handleVisibilityChange = () => {
      if (document.hidden && blurTrackingEnabled) {
        setViolations((prev) => [
          ...prev,
          { time: new Date().toISOString(), message: 'Tab switched detected' },
        ]);
        setToast({
          show: true,
          message: 'Warning: Tab switching is not allowed!',
          type: 'error',
        });
      }
    };

    const handleWindowBlur = () => {
      // Only track blur after grace period and if in fullscreen
      if (blurTrackingEnabled && document.fullscreenElement) {
        setViolations((prev) => [
          ...prev,
          { time: new Date().toISOString(), message: 'Window lost focus' },
        ]);
        setToast({
          show: true,
          message: 'Warning: Please stay on the exam window!',
          type: 'error',
        });
      }
    };

    // Prevent keyboard shortcuts
    const handleKeyDown = (e) => {
      // Prevent common shortcuts
      if (
        (e.ctrlKey || e.metaKey) &&
        ['t', 'n', 'w', 'Tab', 'r', 'p'].includes(e.key)
      ) {
        e.preventDefault();
        setToast({
          show: true,
          message: 'Keyboard shortcuts are disabled during exam',
          type: 'error',
        });
      }
      // Prevent Alt+Tab
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
      }
      // Prevent F5 refresh
      if (e.key === 'F5') {
        e.preventDefault();
      }
    };

    // Prevent right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      clearTimeout(enableBlurTracking);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [examStarted]);

  // Enter fullscreen
  const enterFullscreen = async () => {
    try {
      if (containerRef.current) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
        setExamStarted(true);
        setShowFullscreenWarning(false);
      }
    } catch (err) {
      console.error('Failed to enter fullscreen:', err);
      // Allow exam to start even without fullscreen
      setExamStarted(true);
      setToast({
        show: true,
        message: 'Could not enter fullscreen. Please maximize your browser window.',
        type: 'error',
      });
    }
  };

  // Exit fullscreen
  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      setIsFullscreen(false);
    } catch (err) {
      console.error('Failed to exit fullscreen:', err);
    }
  };

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

  const toggleMarkForReview = (questionId) => {
    setMarkedForReview((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const goToQuestion = (index) => {
    setCurrentIndex(index);
    setVisitedQuestions((prev) => new Set([...prev, index]));
  };

  const getQuestionStatus = (question, index) => {
    const hasAnswer = !!answers[question.id];
    const isMarked = markedForReview.has(question.id);
    const isCurrent = currentIndex === index;

    if (isCurrent) return QuestionStatus.CURRENT;
    if (hasAnswer && isMarked) return QuestionStatus.ANSWERED_AND_MARKED;
    if (isMarked) return QuestionStatus.MARKED_FOR_REVIEW;
    if (hasAnswer) return QuestionStatus.ANSWERED;
    return QuestionStatus.NOT_VISITED;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case QuestionStatus.CURRENT:
        return 'bg-indigo-600 text-white ring-2 ring-indigo-300';
      case QuestionStatus.ANSWERED:
        return 'bg-green-500 text-white';
      case QuestionStatus.MARKED_FOR_REVIEW:
        return 'bg-orange-500 text-white';
      case QuestionStatus.ANSWERED_AND_MARKED:
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-200 text-gray-700 hover:bg-gray-300';
    }
  };

  const handleAutoSubmit = async () => {
    await submitAllAnswers();
  };

  // Build answer payload in separate arrays because backend expects theory_answers and mcq_answers.
  const buildSeparatedAnswers = () => {
    const theory_answers = [];
    const mcq_answers = [];

    questions.forEach((q) => {
      const answerValue = answers[q.id] || '';
      const isMcq = q.type === 'MCQ';

      if (isMcq) {
        mcq_answers.push({
          question_id: q.id,
          question_text: q.question,
          options: q.options || [],
          selected_option: answerValue,
          // Correct option is sent from backend when exam is loaded and echoed back at submit time.
          correct_option: q.correctOption || '',
          marks: q.marks || 1,
        });
        return;
      }

      theory_answers.push({
        question_id: q.id,
        question_text: q.question,
        max_marks: q.marks || 5,
        answer_text: answerValue,
      });
    });

    return { theory_answers, mcq_answers };
  };

  const submitAllAnswers = async () => {
    setIsSubmitting(true);
    try {
      // First, submit answers to Answer Service
      const separatedAnswers = buildSeparatedAnswers();
      const answerPayload = {
        exam_id: exam.question_bank_id || exam.id,
        session_id: sessionId,
        subject: exam.subject || '',
        semester: exam.semester || '',
        exam_type: 'ONLINE',
        theory_answers: separatedAnswers.theory_answers,
        mcq_answers: separatedAnswers.mcq_answers,
      };

      try {
        await submitExamAnswers(answerPayload);
        console.log('Answers submitted to Answer Service');
      } catch (answerErr) {
        console.error('Failed to submit answers to Answer Service:', answerErr);
        // Continue with exam submission even if answer service fails
      }

      // Then, submit exam session to Proctoring Service
      await submitExam(sessionId);

      // Mark exam as submitted in localStorage cache (using schedule_id/exam.id)
      const examIdForCache = exam.schedule_id || exam.id;
      markExamAsSubmittedInCache(examIdForCache);

      // Step 6 + 7: stop local proctoring and fetch final report.
      await stopAgentSafely();

      let finalReport = null;
      try {
        finalReport = await getExamReport(sessionId);
        console.log('Final proctoring report fetched:', finalReport);
      } catch (reportErr) {
        console.error('Final proctoring report is not available yet:', reportErr);
      }

      cleanupRunningIntervals();
      await exitFullscreen();
      clearPersistedActiveSession();

      setToast({
        show: true,
        message: finalReport ? 'Exam submitted and proctoring report generated.' : 'Exam submitted successfully!',
        type: 'success',
      });

      setTimeout(() => {
        navigate('/student/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Failed to submit exam session:', err);
      const detail = err.data?.detail || err.response?.data?.detail || err.message;
      setToast({
        show: true,
        message: detail || 'Failed to submit exam. Please try again.',
        type: 'error',
      });
    } finally {
      await stopAgentSafely();
      setIsSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  const handleEndExam = async () => {
    setIsSubmitting(true);
    try {
      cleanupRunningIntervals();

      await endExamSession(sessionId);
      
      // Mark exam as submitted in localStorage cache (using schedule_id/exam.id)
      const examIdForCache = exam.schedule_id || exam.id;
      markExamAsSubmittedInCache(examIdForCache);
      
      await stopAgentSafely();
      
      await exitFullscreen();
      clearPersistedActiveSession();

      setToast({
        show: true,
        message: 'Exam ended and proctoring data saved.',
        type: 'success',
      });

      setTimeout(() => {
        setExamStarted(false);
        setShowEndExamModal(false);
        navigate('/student/dashboard');
      }, 1200);
    } catch (err) {
      console.error('Failed to end exam cleanly:', err);
      await stopAgentSafely();
      await exitFullscreen();
      setToast({
        show: true,
        message: 'Could not confirm exam end on server. Please refresh dashboard and verify status.',
        type: 'error',
      });
      setShowEndExamModal(false);
    } finally {
      await stopAgentSafely();
      setIsSubmitting(false);
    }
  };

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const markedCount = markedForReview.size;
  const isLowTime = timeLeft < 300;

  if (!exam) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <Loader size="lg" />
          <p className="text-white mt-4">Loading exam questions...</p>
        </div>
      </div>
    );
  }

  // Pre-exam screen - show instructions and start button
  if (!examStarted) {
    return (
      <div ref={containerRef} className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
              <p className="text-gray-500 mt-1">You're ready to begin</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-left space-y-3">
              <h3 className="font-semibold text-gray-900">Exam Instructions:</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500">•</span>
                  The exam will open in fullscreen mode
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500">•</span>
                  <strong>Do not</strong> exit fullscreen, switch tabs, or open other applications
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500">•</span>
                  Ensure the NeuroIQ Proctoring Agent is running on your computer
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500">•</span>
                  You can mark questions for review and navigate between them
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500">•</span>
                  Click "Submit Exam" when you're done
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-600">{questions.length}</p>
                <p className="text-sm text-blue-700">Questions</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-600">{exam.duration || 120}</p>
                <p className="text-sm text-green-700">Minutes</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-purple-600">{exam.total_marks || questions.reduce((acc, q) => acc + (q.type === 'MCQ' ? 1 : (q.marks || 0)), 0)}</p>
                <p className="text-sm text-purple-700">Total Marks</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                fullWidth
                onClick={() => navigate('/student/exams')}
              >
                Cancel
              </Button>
              <Button
                fullWidth
                onClick={enterFullscreen}
                disabled={!isPreflightReady || isPreflightChecking}
              >
                {isPreflightChecking ? 'Preparing Proctoring...' : 'Start Exam'}
              </Button>
            </div>

            {isPreflightChecking && (
              <p className="text-sm text-blue-700">Checking agent health, starting proctoring, and verifying connection...</p>
            )}

            {!!preflightError && (
              <div className="space-y-3">
                <p className="text-sm text-red-600">{preflightError}</p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={connectToProctoring}
                    loading={isConnectingProctoring}
                    disabled={isConnectingProctoring}
                  >
                    Connect To Proctoring
                  </Button>
                  <Button variant="outline" onClick={() => setPreflightAttempt((prev) => prev + 1)}>
                    Retry Agent Check
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-100 flex flex-col">
      {/* Fixed Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-semibold text-gray-900 text-lg">{exam.title}</h1>
            <p className="text-sm text-gray-500">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Agent Status */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            agentConnected ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              agentConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'
            }`} />
            <span className={`text-sm font-medium ${
              agentConnected ? 'text-green-700' : 'text-red-700'
            }`}>
              {agentConnected ? 'Proctor Agent Active' : 'Agent Disconnected'}
            </span>
          </div>

          {/* Timer */}
          <div
            className={`text-xl font-mono font-bold px-4 py-2 rounded-lg ${
              isLowTime ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-900'
            }`}
          >
            {formatTime(timeLeft)}
          </div>

          {/* End Exam Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEndExamModal(true)}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            End Exam
          </Button>

          <Button onClick={() => setShowSubmitModal(true)}>
            Submit Exam
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Question Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <Card className="max-w-4xl mx-auto">
            <div className="space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-indigo-600">
                    Q{currentIndex + 1}
                  </span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      currentQuestion?.type === 'MCQ'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {currentQuestion?.type}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {currentQuestion?.marks} marks
                  </span>
                  <Button
                    variant={markedForReview.has(currentQuestion?.id) ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => toggleMarkForReview(currentQuestion?.id)}
                    className={markedForReview.has(currentQuestion?.id) ? 'bg-orange-500 hover:bg-orange-600 border-orange-500' : ''}
                  >
                    {markedForReview.has(currentQuestion?.id) ? '★ Marked for Review' : '☆ Mark for Review'}
                  </Button>
                </div>
              </div>

              {/* Question Text */}
              <div className="py-4">
                <p className="text-lg text-gray-900 leading-relaxed">
                  {currentQuestion?.question}
                </p>
              </div>

              {/* Answer Section */}
              <div className="pt-4">
                {/* MCQ Options */}
                {currentQuestion?.type === 'MCQ' && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                      <label
                        key={index}
                        className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          answers[currentQuestion.id] === option
                            ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
                        <span
                          className={`w-8 h-8 flex items-center justify-center rounded-full border-2 mr-4 text-sm font-bold ${
                            answers[currentQuestion.id] === option
                              ? 'border-indigo-500 bg-indigo-500 text-white'
                              : 'border-gray-300 text-gray-500'
                          }`}
                        >
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="text-gray-700 flex-1">{option}</span>
                        {answers[currentQuestion.id] === option && (
                          <svg className="w-6 h-6 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </label>
                    ))}
                  </div>
                )}

                {/* Theory Answer */}
                {currentQuestion?.type === 'THEORY' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Answer:
                    </label>
                    <textarea
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[300px] text-gray-900 resize-y"
                      placeholder="Type your answer here..."
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) =>
                        handleAnswerChange(currentQuestion.id, e.target.value)
                      }
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      {(answers[currentQuestion.id] || '').length} characters
                    </p>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => goToQuestion(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                >
                  ← Previous
                </Button>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className={answers[currentQuestion?.id] ? 'text-green-600 font-medium' : ''}>
                    {answers[currentQuestion?.id] ? '✓ Answered' : 'Not answered'}
                  </span>
                </div>
                <Button
                  onClick={() => goToQuestion(Math.min(questions.length - 1, currentIndex + 1))}
                  disabled={currentIndex === questions.length - 1}
                >
                  Next →
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Sidebar - Question Navigator */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto p-4">
          <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{answeredCount}</p>
                <p className="text-xs text-green-700">Answered</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-orange-600">{markedCount}</p>
                <p className="text-xs text-orange-700">For Review</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-600">{questions.length - answeredCount}</p>
                <p className="text-xs text-gray-700">Unanswered</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{questions.length}</p>
                <p className="text-xs text-blue-700">Total</p>
              </div>
            </div>

            {/* Question Grid */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Questions</h3>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, index) => {
                  const status = getQuestionStatus(q, index);
                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(index)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${getStatusColor(status)}`}
                      title={`Question ${index + 1}`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Legend:</h4>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 ring-2 ring-indigo-300" />
                  <span className="text-gray-600">Current Question</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-500" />
                  <span className="text-gray-600">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-orange-500" />
                  <span className="text-gray-600">Marked for Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-purple-500" />
                  <span className="text-gray-600">Answered & Marked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gray-200" />
                  <span className="text-gray-600">Not Visited</span>
                </div>
              </div>
            </div>

            {/* Violations Warning */}
            {violations.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="font-medium text-red-800 text-sm">
                  ⚠️ Violations: {violations.length}
                </p>
                <p className="text-red-600 text-xs mt-1">
                  Suspicious activity detected
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Fullscreen Warning Modal */}
      <Modal
        isOpen={showFullscreenWarning}
        onClose={() => {}}
        title="⚠️ Fullscreen Required"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            You have exited fullscreen mode. This has been recorded as a violation.
            Please return to fullscreen to continue your exam.
          </p>
          <Button fullWidth onClick={enterFullscreen}>
            Return to Fullscreen
          </Button>
        </div>
      </Modal>

      {/* Agent Disconnected Warning Modal */}
      <Modal
        isOpen={showAgentWarning}
        onClose={() => {}}
        title="⚠️ Proctoring Agent Disconnected"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            The proctoring agent has disconnected. This has been recorded as a violation.
            Please ensure the NeuroIQ proctoring agent is running on your computer.
          </p>
          <p className="text-sm text-red-600">
            The exam will continue, but your proctoring status will be flagged for review.
          </p>
          <Button fullWidth onClick={() => setShowAgentWarning(false)}>
            I Understand
          </Button>
        </div>
      </Modal>

      {/* End Exam Confirmation Modal */}
      <Modal
        isOpen={showEndExamModal}
        onClose={() => setShowEndExamModal(false)}
        title="End Exam"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to end the exam without submitting? Your answers will not be saved.
          </p>
          <div className="flex gap-4">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowEndExamModal(false)}
            >
              Continue Exam
            </Button>
            <Button
              fullWidth
              onClick={handleEndExam}
              className="bg-red-600 hover:bg-red-700"
            >
              End Exam
            </Button>
          </div>
        </div>
      </Modal>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Exam"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to submit your exam? You cannot make changes after submission.
          </p>
          <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
            <p>
              <span className="text-gray-500">Questions answered:</span>{' '}
              <span className="font-medium text-green-600">
                {answeredCount} / {questions.length}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Marked for review:</span>{' '}
              <span className="font-medium text-orange-600">{markedCount}</span>
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
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-amber-700 text-sm">
                ⚠️ You have {questions.length - answeredCount} unanswered questions.
              </p>
            </div>
          )}
          <div className="flex gap-4 pt-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowSubmitModal(false)}
            >
              Continue Exam
            </Button>
            <Button fullWidth onClick={submitAllAnswers} loading={isSubmitting}>
              Submit Exam
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
