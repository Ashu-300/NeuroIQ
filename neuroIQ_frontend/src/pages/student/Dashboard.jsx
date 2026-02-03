import { Card, CardTitle, CardDescription, Button } from '../../components/ui';
import { Link } from 'react-router-dom';

const upcomingExams = [
  {
    id: 1,
    subject: 'Data Structures',
    date: 'Feb 5, 2026',
    time: '10:00 AM',
    duration: '2 hours',
    status: 'upcoming',
  },
  {
    id: 2,
    subject: 'Operating Systems',
    date: 'Feb 8, 2026',
    time: '2:00 PM',
    duration: '3 hours',
    status: 'upcoming',
  },
];

const recentReports = [
  {
    id: 1,
    subject: 'Computer Networks',
    date: 'Jan 28, 2026',
    score: '85%',
    violations: 0,
  },
  {
    id: 2,
    subject: 'Database Systems',
    date: 'Jan 20, 2026',
    score: '92%',
    violations: 1,
  },
];

const StudentDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
        <p className="text-gray-500 mt-1">View your exams and reports</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md">
          <p className="text-sm font-medium text-gray-500">Upcoming Exams</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">2</p>
          <p className="text-sm text-indigo-600 mt-2">Next: Feb 5</p>
        </Card>
        <Card padding="md">
          <p className="text-sm font-medium text-gray-500">Completed Exams</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">8</p>
          <p className="text-sm text-green-600 mt-2">Avg score: 88%</p>
        </Card>
        <Card padding="md">
          <p className="text-sm font-medium text-gray-500">Proctoring Status</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">Clean</p>
          <p className="text-sm text-green-600 mt-2">No violations</p>
        </Card>
      </div>

      {/* Upcoming Exams */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Exams</h2>
          <Link to="/student/exams" className="text-sm text-indigo-600 hover:text-indigo-500">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingExams.map((exam) => (
            <Card key={exam.id}>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{exam.subject}</CardTitle>
                  <CardDescription>
                    {exam.date} at {exam.time} • {exam.duration}
                  </CardDescription>
                </div>
                <span className="px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                  Upcoming
                </span>
              </div>
              <div className="mt-4">
                <Link to={`/student/exam/${exam.id}/launch`}>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Reports */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Reports</h2>
          <Link to="/student/reports" className="text-sm text-indigo-600 hover:text-indigo-500">
            View all →
          </Link>
        </div>
        <Card padding="none">
          <div className="divide-y divide-gray-100">
            {recentReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{report.subject}</p>
                  <p className="text-sm text-gray-500">{report.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">{report.score}</p>
                  <p className="text-sm text-gray-500">
                    {report.violations === 0
                      ? 'No violations'
                      : `${report.violations} violation(s)`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
