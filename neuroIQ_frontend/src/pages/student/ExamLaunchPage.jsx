import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudentExams } from '../../api/proctoring.api';
import { Button, Card, CardTitle, Loader } from '../../components/ui';
import { EmptyState } from '../../components/feedback';

const ExamLaunchPage = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const response = await getStudentExams();
      setExams(response.data?.exams || []);
    } catch (err) {
      console.error('Failed to fetch exams:', err);
      // Demo data
      setExams([
        {
          id: 'exam1',
          title: 'Mid Semester - Data Structures',
          subject: 'Data Structures',
          duration: 120,
          total_marks: 100,
          start_time: '2024-01-15T09:00:00Z',
          end_time: '2024-01-15T11:00:00Z',
          status: 'upcoming',
          type: 'THEORY',
        },
        {
          id: 'exam2',
          title: 'Quiz 1 - Computer Networks',
          subject: 'Computer Networks',
          duration: 30,
          total_marks: 25,
          start_time: '2024-01-16T14:00:00Z',
          end_time: '2024-01-16T14:30:00Z',
          status: 'live',
          type: 'MCQ',
        },
      ]);
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
              <li>Ensure your webcam is working properly</li>
              <li>Find a quiet, well-lit place</li>
              <li>Close all other applications</li>
              <li>Keep your ID card ready for verification</li>
            </ul>
          </div>
        </div>
      </Card>

      {exams.length === 0 ? (
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
