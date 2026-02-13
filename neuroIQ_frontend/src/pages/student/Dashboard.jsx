import { useState, useEffect } from 'react';
import { Card, Button, Modal, Input, Select } from '../../components/ui';
import { Link } from 'react-router-dom';
import { registerStudent } from '../../api/auth.api';
import { useAuth } from '../../auth/useAuth';

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
  const { user } = useAuth();
  const [error, setError] = useState('');
  
  // Student Registration State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [isStudentRegistered, setIsStudentRegistered] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);
  const [registerForm, setRegisterForm] = useState({
    first_name: '',
    last_name: '',
    roll_number: '',
    enrollment_no: '',
    branch: '',
    semester: '',
    section: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    // Check if student profile exists (could be stored in localStorage or fetched)
    const storedProfile = localStorage.getItem('neuroiq_student_profile');
    if (storedProfile) {
      const parsedProfile = JSON.parse(storedProfile);
      setIsStudentRegistered(true);
      setStudentProfile(parsedProfile);
    }
  }, [studentProfile?.branch, studentProfile?.semester]);

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterForm(prev => ({ ...prev, [name]: value }));
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');

    // Basic validation
    if (!registerForm.first_name || !registerForm.last_name || !registerForm.roll_number || 
        !registerForm.enrollment_no || !registerForm.branch || !registerForm.semester || !registerForm.email) {
      setRegisterError('Please fill all required fields');
      return;
    }

    try {
      setIsRegistering(true);
      const payload = {
        ...registerForm,
        semester: parseInt(registerForm.semester, 10),
      };
      
      await registerStudent(payload);
      setRegisterSuccess('Student profile registered successfully!');
      setIsStudentRegistered(true);
      localStorage.setItem('neuroiq_student_profile', JSON.stringify(payload));
      
      setTimeout(() => {
        setShowRegisterModal(false);
        setRegisterSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Failed to register student:', err);
      setRegisterError(err.response?.data?.error || err.message || 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  const openRegisterModal = () => {
    // Pre-fill email from user context if available
    setRegisterForm(prev => ({
      ...prev,
      email: user?.email || '',
    }));
    setShowRegisterModal(true);
    setRegisterError('');
    setRegisterSuccess('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
        <p className="text-gray-500 mt-1">View your exams and reports</p>
      </div>

      {/* Complete Profile Banner */}
      {!isStudentRegistered && (
        <Card className="bg-linear-to-r from-indigo-500 to-purple-600 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Complete Your Student Profile</h3>
              <p className="text-indigo-100 text-sm mt-1">
                Register your academic details to access exams and features
              </p>
            </div>
            <Button 
              onClick={openRegisterModal}
              className="bg-white text-indigo-600 hover:bg-indigo-50"
            >
              Register Now
            </Button>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md">
          <p className="text-sm font-medium text-gray-500">Upcoming Exams</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">-</p>
          <p className="text-sm text-indigo-600 mt-2">
            View details in "My Exams" or "Scheduled Exams".
          </p>
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

      {/* Upcoming Exams section removed; students can use dedicated pages */}

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

      {/* Student Registration Modal */}
      <Modal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        title="Register Student Profile"
        size="lg"
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          {registerError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{registerError}</p>
            </div>
          )}
          {registerSuccess && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <p className="text-sm text-green-600">{registerSuccess}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name *"
              name="first_name"
              value={registerForm.first_name}
              onChange={handleRegisterChange}
              placeholder="Enter first name"
              required
            />
            <Input
              label="Last Name *"
              name="last_name"
              value={registerForm.last_name}
              onChange={handleRegisterChange}
              placeholder="Enter last name"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Roll Number *"
              name="roll_number"
              value={registerForm.roll_number}
              onChange={handleRegisterChange}
              placeholder="e.g., 21CS001"
              required
            />
            <Input
              label="Enrollment Number *"
              name="enrollment_no"
              value={registerForm.enrollment_no}
              onChange={handleRegisterChange}
              placeholder="e.g., 0901CS211001"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Branch *"
              name="branch"
              value={registerForm.branch}
              onChange={handleRegisterChange}
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
              required
            />
            <Select
              label="Semester *"
              name="semester"
              value={registerForm.semester}
              onChange={handleRegisterChange}
              options={[
                { value: '', label: 'Select' },
                { value: '1', label: '1st' },
                { value: '2', label: '2nd' },
                { value: '3', label: '3rd' },
                { value: '4', label: '4th' },
                { value: '5', label: '5th' },
                { value: '6', label: '6th' },
                { value: '7', label: '7th' },
                { value: '8', label: '8th' },
              ]}
              required
            />
            <Input
              label="Section"
              name="section"
              value={registerForm.section}
              onChange={handleRegisterChange}
              placeholder="e.g., A"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email *"
              name="email"
              type="email"
              value={registerForm.email}
              onChange={handleRegisterChange}
              placeholder="student@example.com"
              required
            />
            <Input
              label="Phone"
              name="phone"
              value={registerForm.phone}
              onChange={handleRegisterChange}
              placeholder="e.g., 9876543210"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowRegisterModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isRegistering}>
              Register
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StudentDashboard;
