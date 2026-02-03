import { Card, CardTitle, CardDescription } from '../../components/ui';
import { Link } from 'react-router-dom';

const quickActions = [
  {
    title: 'Upload Syllabus',
    description: 'Upload PDF and generate AI questions',
    path: '/teacher/upload',
    icon: (
      <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
    color: 'bg-indigo-50',
  },
  {
    title: 'Question Bank',
    description: 'Browse and manage your questions',
    path: '/teacher/question-bank',
    icon: (
      <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    color: 'bg-green-50',
  },
  {
    title: 'Create Exam',
    description: 'Build an exam from question sets',
    path: '/teacher/create-exam',
    icon: (
      <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
    color: 'bg-purple-50',
  },
];

const stats = [
  { label: 'Materials Uploaded', value: '12', change: '+2 this week' },
  { label: 'Questions Generated', value: '245', change: '+38 today' },
  { label: 'Question Sets', value: '8', change: '3 pending review' },
  { label: 'Exams Created', value: '5', change: '2 published' },
];

const recentMaterials = [
  { id: 1, subject: 'Data Structures', uploadedAt: '2 hours ago', questions: 42 },
  { id: 2, subject: 'Operating Systems', uploadedAt: '1 day ago', questions: 35 },
  { id: 3, subject: 'Computer Networks', uploadedAt: '3 days ago', questions: 28 },
];

const TeacherDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
        <p className="text-gray-500 mt-1">Create content and manage exams</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} padding="md">
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
            <p className="text-sm text-green-600 mt-2">{stat.change}</p>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link key={action.path} to={action.path}>
              <Card hover className="h-full">
                <div className={`inline-flex p-3 rounded-lg ${action.color} mb-4`}>
                  {action.icon}
                </div>
                <CardTitle>{action.title}</CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Materials */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Materials</h2>
          <Link to="/teacher/upload" className="text-sm text-indigo-600 hover:text-indigo-500">
            View all →
          </Link>
        </div>
        <Card padding="none">
          <div className="divide-y divide-gray-100">
            {recentMaterials.map((material) => (
              <div
                key={material.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{material.subject}</p>
                  <p className="text-sm text-gray-500">{material.uploadedAt}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-indigo-600">
                    {material.questions} questions
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

export default TeacherDashboard;
