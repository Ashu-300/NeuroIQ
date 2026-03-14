import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getScheduledExams } from '../../api/management.api';
import { getExamStatus, getMyExamStatus, startExam, startProctoringAgent } from '../../api/proctoring.api';
import { Button, Card, CardTitle, Loader, Select } from '../../components/ui';
import { EmptyState, Toast } from '../../components/feedback';

// LocalStorage key for caching submitted exams
const SUBMITTED_EXAMS_KEY = 'neuroiq_submitted_exams';

const ExamLaunchPage = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [examStatuses, setExamStatuses] = useState({}); // exam_id -> { can_attempt, status, message }
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [error, setError] = useState('');
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

  // Get current student ID from localStorage
  const getStudentId = useCallback(() => {
    const storedProfile = localStorage.getItem('neuroiq_student_profile');
    if (storedProfile) {
      const profile = JSON.parse(storedProfile);
      return profile._id || profile.id || profile.student_id;
    }
    // Fallback to auth token info
    const authData = localStorage.getItem('neuroiq_auth');
    if (authData) {
      const auth = JSON.parse(authData);
      return auth.userId || auth.user_id || auth.id;
    }
    return null;
  }, []);

  // Check if exam is submitted in localStorage cache (by student_id + exam_id)
  const isExamSubmittedInCache = useCallback((examId) => {
    const studentId = getStudentId();
    if (!studentId || !examId) return false;
    
    try {
      const submittedExams = JSON.parse(localStorage.getItem(SUBMITTED_EXAMS_KEY) || '{}');
      const key = `${studentId}_${examId}`;
      return submittedExams[key] === true;
    } catch {
      return false;
    }
  }, [getStudentId]);

  // Mark exam as submitted in localStorage cache (by student_id + exam_id)
  const markExamAsSubmittedInCache = useCallback((examId) => {
    const studentId = getStudentId();
    if (!studentId || !examId) return;
    
    try {
      const submittedExams = JSON.parse(localStorage.getItem(SUBMITTED_EXAMS_KEY) || '{}');
      const key = `${studentId}_${examId}`;
      submittedExams[key] = true;
      localStorage.setItem(SUBMITTED_EXAMS_KEY, JSON.stringify(submittedExams));
    } catch (err) {
      console.error('Failed to cache submitted exam:', err);
    }
  }, [getStudentId]);

  const isSubmittedStatus = (statusValue) => {
    const normalized = String(statusValue || '').toLowerCase();
    return normalized === 'submitted' || normalized === 'auto_submitted' || normalized === 'terminated';
  };

  // Check if exam is submitted - combines API status with localStorage cache
  const isExamSubmitted = useCallback((examId, examStatus) => {
    // First check localStorage cache (student_id + exam_id)
    if (isExamSubmittedInCache(examId)) {
      return true;
    }
    
    // Then check API status
    if (!examStatus) return false;
    if (examStatus.can_attempt === false) return true;
    return isSubmittedStatus(examStatus.status);
  }, [isExamSubmittedInCache]);

  useEffect(() => {
    const storedProfile = localStorage.getItem('neuroiq_student_profile');
    if (storedProfile) {
      const parsedProfile = JSON.parse(storedProfile);
      setStudentProfile(parsedProfile);
      // Do not auto-fetch; user will select branch & semester
      setIsLoading(false);
    } else {
      setIsLoading(false);
      setError('Select your branch and semester below to see your scheduled exams. You can also complete your student profile to save these details.');
    }
  }, []);

  const fetchExams = async (branchValue, semesterValue) => {
    setIsLoading(true);
    try {
      if (!branchValue || !semesterValue) {
        setError('Please select both branch and semester to see your exams');
        setExams([]);
        return;
      }

      const response = await getScheduledExams(branchValue, semesterValue);
      // Transform the response to expected format and determine status
      const now = new Date();
      const transformedExams = (response || []).map((exam, idx) => {
        // exam.exam_id -> question bank exam id (for fetching questions)
        // exam._id     -> scheduled exam record id (unique per scheduled instance)
        const questionBankId = exam.exam_id || `exam-${idx}`;
        const scheduleId = exam._id;
        const examDate = new Date(exam.date);
        const [startHour, startMin] = exam.start_time.split(':').map(Number);
        const [endHour, endMin] = exam.end_time.split(':').map(Number);
        
        const startDateTime = new Date(examDate);
        startDateTime.setHours(startHour, startMin, 0);
        
        const endDateTime = new Date(examDate);
        endDateTime.setHours(endHour, endMin, 0);

        // Calculate duration from start and end times
        const durationMinutes = Math.floor((endDateTime - startDateTime) / (1000 * 60));

        let status = 'upcoming';
        if (now >= startDateTime && now <= endDateTime) {
          status = 'live';
        } else if (now > endDateTime) {
          status = 'completed';
        }

        return {
          id: scheduleId, // Use schedule_id for proctoring session tracking (unique per scheduled instance)
          question_bank_id: questionBankId, // Use for fetching questions from question service
          schedule_id: scheduleId,
          title: exam.title,
          subject: exam.subject,
          semester: exam.semester,
          duration: durationMinutes > 0 ? durationMinutes : 120, // fallback to 120 if invalid
          total_marks: exam.total_marks,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status,
          type: 'BOTH',
        };
      });
      
      // Sort by date, upcoming first
      transformedExams.sort((a, b) => {
        if (a.status === 'live' && b.status !== 'live') return -1;
        if (b.status === 'live' && a.status !== 'live') return 1;
        if (a.status === 'upcoming' && b.status === 'completed') return -1;
        if (b.status === 'upcoming' && a.status === 'completed') return 1;
        return new Date(a.start_time) - new Date(b.start_time);
      });
      
      setExams(transformedExams);
      
      // Fetch submission status for each exam using student_id + exam_id
      const studentId = getStudentId();
      const statusPromises = transformedExams.map(async (exam) => {
        const examId = exam.schedule_id || exam.id;
        
        // First check localStorage cache for this student + exam combination
        if (isExamSubmittedInCache(examId)) {
          return {
            examId: exam.id,
            status: {
              has_session: true,
              can_attempt: false,
              status: 'submitted',
              message: 'Exam already submitted',
              cached: true,
            },
          };
        }
        
        try {
          // exam.id/schedule_id is the scheduled exam session identifier used by backend APIs.
          // The API uses student_id from auth token + exam_id to check status
          const myStatus = await getMyExamStatus(examId);

          // If status indicates submitted, cache it locally for future checks
          if (isSubmittedStatus(myStatus?.status) || myStatus?.can_attempt === false) {
            markExamAsSubmittedInCache(examId);
            return {
              examId: exam.id,
              status: {
                ...myStatus,
                can_attempt: false,
              },
            };
          }

          // If a session already exists, verify latest session state using session_id.
          if (myStatus?.session_id) {
            try {
              const sessionStatus = await getExamStatus(myStatus.session_id);
              
              // If session is submitted, cache it and mark as not attemptable
              if (isSubmittedStatus(sessionStatus?.status)) {
                markExamAsSubmittedInCache(examId);
                return {
                  examId: exam.id,
                  status: {
                    ...myStatus,
                    status: sessionStatus.status,
                    can_attempt: false,
                  },
                };
              }
              
              return {
                examId: exam.id,
                status: {
                  ...myStatus,
                  status: sessionStatus?.status || myStatus.status,
                  can_attempt: myStatus.can_attempt,
                },
              };
            } catch (sessionErr) {
              console.error(`Failed to fetch session status for ${myStatus.session_id}:`, sessionErr);
              // If we can't verify session status but we have a session, be conservative
              // Don't allow attempt if there's an existing session we can't verify
              if (myStatus?.has_session) {
                return {
                  examId: exam.id,
                  status: {
                    ...myStatus,
                    can_attempt: false,
                    message: 'Unable to verify exam status. Please try again.',
                  },
                };
              }
            }
          }

          return { examId: exam.id, status: myStatus };
        } catch (err) {
          console.error(`Failed to fetch status for exam ${exam.id}:`, err);
          // On error, check cache again - if submitted there, block attempt
          if (isExamSubmittedInCache(examId)) {
            return {
              examId: exam.id,
              status: {
                can_attempt: false,
                status: 'submitted',
                message: 'Exam already submitted',
                cached: true,
              },
            };
          }
          // Otherwise allow attempt (API might be temporarily down)
          return { examId: exam.id, status: { can_attempt: true } };
        }
      });
      
      const statuses = await Promise.all(statusPromises);
      const statusMap = {};
      statuses.forEach(({ examId, status }) => {
        statusMap[examId] = status;
      });
      setExamStatuses(statusMap);
    } catch (err) {
      console.error('Failed to fetch exams:', err);
      setExams([]);
      setError('Failed to load exams');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const handleStartExam = async (exam) => {
    try {
      const examId = exam.schedule_id || exam.id || exam.exam_id || exam.question_bank_id;
      const startResult = await startExam({ exam_id: examId });

      if (!startResult?.session_id) {
        const msg = 'Session could not be created. Please try again.';
        setError(msg);
        setToast({ show: true, message: msg, type: 'error' });
        return;
      }

      // Try to start local proctoring, but do not block navigation to instruction page.
      try {
        await startProctoringAgent(startResult.session_id, null, examId);
      } catch (agentErr) {
        console.warn('Local proctoring agent failed before navigation:', agentErr);
      }

      setError('');
      setSelectedExam(exam);
      // Navigate directly to exam instructions; agent preflight runs there.
      navigate('/student/proctoring-exam', {
        state: {
          exam,
          session_id: startResult.session_id,
          start_time: startResult.start_time,
        },
      });
    } catch (err) {
      console.error('Failed to start exam flow:', err);
      const detail = err.data?.detail || err.response?.data?.detail || err.message;
      const msg = detail || 'Unable to start exam right now. Please try again.';
      setError(msg);
      setToast({ show: true, message: msg, type: 'error' });
    }
  };

  const getStatusBadge = (status, examId, examStatus) => {
    // Check if exam has been submitted (using both localStorage cache and API status)
    if (isExamSubmitted(examId, examStatus)) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Submitted
        </span>
      );
    }
    
    const styles = {
      upcoming: 'bg-yellow-100 text-yellow-800',
      live: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          styles[status] || styles.upcoming
        }`}
      >
        {status === 'live' && (
          <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse" />
        )}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast.show && (
        <div className="fixed top-4 right-4 z-50">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast((prev) => ({ ...prev, show: false }))}
          />
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Exams</h1>
        <p className="text-gray-500 mt-1">
          View and launch your scheduled examinations
        </p>
      </div>

      {/* System Check Alert */}
      <Card className="border-blue-200 bg-blue-50">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-blue-800">Before starting an exam</h3>
            <ul className="mt-1 text-sm text-blue-700 list-disc list-inside space-y-1">
              <li>Download and run the NeuroIQ Proctoring Agent</li>
              <li>Find a quiet, well-lit place</li>
              <li>Close all other applications</li>
              <li>Keep your ID card ready for verification</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Proctoring Agent Download */}
      <Card className="border-indigo-200 bg-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-indigo-800">Proctoring Agent Required</h3>
              <p className="mt-1 text-sm text-indigo-700">
                Download and run the proctoring agent before starting your exam.
                The agent monitors your session and must remain running throughout the exam.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="ml-4 border-indigo-300 text-indigo-700 hover:bg-indigo-100"
            onClick={() => {
              window.open('/api/proctoring/download-agent', '_blank');
            }}
          >
            Download Agent
          </Button>
        </div>
      </Card>

      {/* Filters */}
      <Card className="mt-2" padding="md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Select
            label="Branch"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            options={[
              { value: '', label: 'Select Branch' },
              { value: 'CSE', label: 'CSE' },
              { value: 'IT', label: 'IT' },
              { value: 'ECE', label: 'ECE' },
              { value: 'MECH', label: 'MECH' },
              { value: 'CIVIL', label: 'CIVIL' },
              { value: 'EE', label: 'EE' },
              { value: 'EC', label: 'EC' },
            ]}
          />
          <Select
            label="Semester"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            options={[
              { value: '', label: 'Select Semester' },
              { value: '1', label: '1st' },
              { value: '2', label: '2nd' },
              { value: '3', label: '3rd' },
              { value: '4', label: '4th' },
              { value: '5', label: '5th' },
              { value: '6', label: '6th' },
              { value: '7', label: '7th' },
              { value: '8', label: '8th' },
            ]}
          />
          <div className="space-y-2">
            <Button
              className="w-full md:w-auto"
              onClick={() => {
                if (branch && semester) {
                  fetchExams(branch, semester);
                }
              }}
              disabled={!branch || !semester}
            >
              Load Exams
            </Button>
            <p className="text-xs text-gray-500">
              Select your branch and semester to see scheduled exams.
            </p>
          </div>
        </div>
      </Card>

      {exams.length === 0 && !error ? (
        <EmptyState
          title="No exams scheduled"
          description="You don't have any upcoming exams at the moment"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {exams.map((exam) => (
            <Card key={exam.id} hover>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{exam.title}</h3>
                    <p className="text-sm text-gray-500">{exam.subject}</p>
                  </div>
                  {getStatusBadge(exam.status, exam.id, examStatuses[exam.id])}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Duration:</span>{' '}
                    <span className="font-medium">{exam.duration} min</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Marks:</span>{' '}
                    <span className="font-medium">{exam.total_marks}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Start:</span>{' '}
                    <span className="font-medium">
                      {formatDateTime(exam.start_time)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">End:</span>{' '}
                    <span className="font-medium">
                      {formatDateTime(exam.end_time)}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  {/* Check if exam already submitted using student_id + exam_id */}
                  {isExamSubmitted(exam.id, examStatuses[exam.id]) ? (
                    <Button variant="outline" fullWidth disabled>
                      Submitted
                    </Button>
                  ) : exam.status === 'live' ? (
                    <Button fullWidth onClick={() => handleStartExam(exam)}>
                      {examStatuses[exam.id]?.has_session ? 'Continue Exam' : 'Start Exam'}
                    </Button>
                  ) : exam.status === 'completed' ? (
                    <Button variant="outline" fullWidth disabled>
                      Exam Window Closed
                    </Button>
                  ) : (
                    <Button variant="outline" fullWidth disabled>
                      Not Started Yet
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExamLaunchPage;
