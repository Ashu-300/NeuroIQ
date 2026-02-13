import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getScheduledExams } from '../../api/management.api';
import { Button, Card, CardTitle, Loader, Select } from '../../components/ui';
import { EmptyState } from '../../components/feedback';

const ExamLaunchPage = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [error, setError] = useState('');
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');

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
        // exam.exam_id -> question bank / proctoring exam id
        // exam._id     -> scheduled exam record id
        const proctorExamId = exam.exam_id || exam._id || `exam-${idx}`;
        const examDate = new Date(exam.date);
        const [startHour, startMin] = exam.start_time.split(':').map(Number);
        const [endHour, endMin] = exam.end_time.split(':').map(Number);
        
        const startDateTime = new Date(examDate);
        startDateTime.setHours(startHour, startMin, 0);
        
        const endDateTime = new Date(examDate);
        endDateTime.setHours(endHour, endMin, 0);

        let status = 'upcoming';
        if (now >= startDateTime && now <= endDateTime) {
          status = 'live';
        } else if (now > endDateTime) {
          status = 'completed';
        }

        return {
          id: proctorExamId,
          schedule_id: exam._id,
          title: exam.title,
          subject: exam.subject,
          semester: exam.semester,
          duration: exam.duration_min,
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

  const handleStartExam = (exam) => {
    setSelectedExam(exam);
    // Navigate to identity verification first
    navigate('/student/verify-identity', { state: { exam } });
  };

  const getStatusBadge = (status) => {
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

              <li>Ensure your webcam is working properly</li>
              <li>Find a quiet, well-lit place</li>
              <li>Close all other applications</li>
              <li>Keep your ID card ready for verification</li>
            </ul>
          </div>
        </div>
      </Card>

      {error && (
        <Card>
          <p className="text-red-600 text-sm text-center py-2">{error}</p>
        </Card>
      )}

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
                  {getStatusBadge(exam.status)}
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
                  {exam.status === 'live' ? (
                    <Button fullWidth onClick={() => handleStartExam(exam)}>
                      Start Exam
                    </Button>
                  ) : exam.status === 'completed' ? (
                    <Button variant="outline" fullWidth disabled>
                      Completed
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
