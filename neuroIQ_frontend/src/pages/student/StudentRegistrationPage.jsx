import { useState, useEffect } from 'react';
import { Card, CardTitle, Button, Input, Select, Loader } from '../../components/ui';
import { registerStudent, getStudentProfile, updateStudentProfile } from '../../api/auth.api';
import { useAuth } from '../../auth/useAuth';
import { BRANCHES, SEMESTERS, SECTIONS } from '../../utils/constants';

const StudentRegistrationPage = () => {
  const { user } = useAuth();
  
  // View states: 'loading' | 'register' | 'profile' | 'edit'
  const [viewState, setViewState] = useState('loading');
  const [studentProfile, setStudentProfile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
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

  // On mount: fetch student profile to decide view
  useEffect(() => {
    checkStudentProfile();
  }, []);

  const checkStudentProfile = async () => {
    setViewState('loading');
    setError('');
    try {
      const response = await getStudentProfile();
      if (response && response.student) {
        setStudentProfile(response.student);
        setViewState('profile');
      } else {
        // No student data
        setStudentProfile(null);
        setViewState('register');
        prefillEmail();
      }
    } catch (err) {
      // Any error (including 404) means not registered - show registration form
      console.log('Profile check:', err.response?.status || err.message);
      setStudentProfile(null);
      setViewState('register');
      prefillEmail();
    }
  };

  const prefillEmail = () => {
    if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email }));
    }
  };

  const prefillFormWithProfile = (profile) => {
    setFormData({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      roll_number: profile.roll_number || '',
      enrollment_no: profile.enrollment_no || '',
      branch: profile.branch || '',
      semester: String(profile.semester) || '',
      section: profile.section || '',
      email: profile.email || '',
      phone: profile.phone || '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name) => (e) => {
    setFormData(prev => ({ ...prev, [name]: e.target.value }));
  };

  const validateForm = () => {
    if (!formData.first_name.trim()) return 'First name is required';
    if (!formData.last_name.trim()) return 'Last name is required';
    if (!formData.roll_number.trim()) return 'Roll number is required';
    if (!formData.enrollment_no.trim()) return 'Enrollment number is required';
    if (!formData.branch) return 'Branch is required';
    if (!formData.semester) return 'Semester is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!formData.phone.trim()) return 'Phone number is required';
    return null;
  };

  // Handle Registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        semester: parseInt(formData.semester, 10),
      };

      await registerStudent(payload);
      setSuccess('Registration successful!');
      
      // Fetch profile and switch to profile view
      const response = await getStudentProfile();
      if (response && response.student) {
        setStudentProfile(response.student);
        setViewState('profile');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Update
  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        semester: parseInt(formData.semester, 10),
      };

      await updateStudentProfile(payload);
      setSuccess('Student data updated successfully!');
      
      // Fetch updated profile and switch to profile view
      const response = await getStudentProfile();
      if (response && response.student) {
        setStudentProfile(response.student);
        setViewState('profile');
      }
    } catch (err) {
      console.error('Update error:', err);
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Update failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = () => {
    setError('');
    setSuccess('');
    if (studentProfile) {
      prefillFormWithProfile(studentProfile);
    }
    setViewState('edit');
  };

  const handleCancelEdit = () => {
    setError('');
    setViewState('profile');
  };

  const handleRefresh = async () => {
    await checkStudentProfile();
  };

  // ========== LOADING VIEW ==========
  if (viewState === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader size="lg" />
      </div>
    );
  }

  // ========== PROFILE VIEW (Student is registered) ==========
  if (viewState === 'profile' && studentProfile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Profile</h1>
            <p className="text-gray-500 mt-1">
              Your registered student information
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleRefresh}>
              Refresh
            </Button>
            <Button onClick={handleEditClick}>
              Update Student Data
            </Button>
          </div>
        </div>

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <Card padding="lg">
          <CardTitle>Student Information</CardTitle>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="text-lg font-medium text-gray-900">
                  {studentProfile.first_name} {studentProfile.last_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Roll Number</p>
                <p className="text-lg font-medium text-gray-900">{studentProfile.roll_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Enrollment Number</p>
                <p className="text-lg font-medium text-gray-900">{studentProfile.enrollment_no}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Branch</p>
                <p className="text-lg font-medium text-gray-900">{studentProfile.branch}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Semester</p>
                <p className="text-lg font-medium text-gray-900">Semester {studentProfile.semester}</p>
              </div>
              {studentProfile.section && (
                <div>
                  <p className="text-sm text-gray-500">Section</p>
                  <p className="text-lg font-medium text-gray-900">Section {studentProfile.section}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-lg font-medium text-gray-900">{studentProfile.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="text-lg font-medium text-gray-900">{studentProfile.phone}</p>
              </div>
            </div>
          </div>

          {studentProfile.created_at && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Registered on: {new Date(studentProfile.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ========== EDIT VIEW (Update existing student data) ==========
  if (viewState === 'edit' && studentProfile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Update Student Data</h1>
            <p className="text-gray-500 mt-1">
              Edit your student information (first name, roll number, branch, etc.)
            </p>
          </div>
          <Button variant="secondary" onClick={handleCancelEdit}>
            Cancel
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <Card padding="lg">
          <CardTitle>Edit Student Information</CardTitle>
          
          <form onSubmit={handleUpdate} className="mt-6 space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <Input
                  name="first_name"
                  placeholder="Enter first name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <Input
                  name="last_name"
                  placeholder="Enter last name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {/* Roll Number and Enrollment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Roll Number *
                </label>
                <Input
                  name="roll_number"
                  placeholder="e.g., 210123456"
                  value={formData.roll_number}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enrollment Number *
                </label>
                <Input
                  name="enrollment_no"
                  placeholder="e.g., EN2021001"
                  value={formData.enrollment_no}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {/* Branch, Semester, Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch *
                </label>
                <Select
                  options={BRANCHES}
                  value={formData.branch}
                  onChange={handleSelectChange('branch')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester *
                </label>
                <Select
                  options={SEMESTERS}
                  value={formData.semester}
                  onChange={handleSelectChange('semester')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section
                </label>
                <Select
                  options={SECTIONS}
                  value={formData.section}
                  onChange={handleSelectChange('section')}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <Input
                  type="email"
                  name="email"
                  placeholder="student@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <Input
                  type="tel"
                  name="phone"
                  placeholder="e.g., 9876543210"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // ========== REGISTRATION VIEW (Student not registered yet) ==========
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Registration</h1>
        <p className="text-gray-500 mt-1">
          Complete your student profile to access exams
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <Card padding="lg">
        <CardTitle>Student Information</CardTitle>
        
        <form onSubmit={handleRegister} className="mt-6 space-y-6">
          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <Input
                name="first_name"
                placeholder="Enter first name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <Input
                name="last_name"
                placeholder="Enter last name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          {/* Roll Number and Enrollment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Roll Number *
              </label>
              <Input
                name="roll_number"
                placeholder="e.g., 210123456"
                value={formData.roll_number}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enrollment Number *
              </label>
              <Input
                name="enrollment_no"
                placeholder="e.g., EN2021001"
                value={formData.enrollment_no}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          {/* Branch, Semester, Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch *
              </label>
              <Select
                options={BRANCHES}
                value={formData.branch}
                onChange={handleSelectChange('branch')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Semester *
              </label>
              <Select
                options={SEMESTERS}
                value={formData.semester}
                onChange={handleSelectChange('semester')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section
              </label>
              <Select
                options={SECTIONS}
                value={formData.section}
                onChange={handleSelectChange('section')}
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <Input
                type="email"
                name="email"
                placeholder="student@example.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <Input
                type="tel"
                name="phone"
                placeholder="e.g., 9876543210"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" loading={isSubmitting}>
              Register
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default StudentRegistrationPage;
