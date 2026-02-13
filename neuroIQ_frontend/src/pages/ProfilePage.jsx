import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input } from '../components/ui';
import { getUser, updateProfile } from '../api/auth.api';
import { useAuth } from '../auth/useAuth';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [editForm, setEditForm] = useState({
    name: '',
    institution: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getUser();
      setProfile(data);
      setEditForm({
        name: data.name || '',
        institution: data.institution || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError('Failed to load profile. Please try again.');
      // If unauthorized, redirect to login
      if (err.response?.status === 401) {
        logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form when canceling
      setEditForm({
        name: profile?.name || '',
        institution: profile?.institution || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
    setIsEditing(!isEditing);
    setSaveSuccess('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaveSuccess('');

    // Validate passwords if changing
    if (editForm.newPassword) {
      if (!editForm.currentPassword) {
        setError('Current password is required to change password');
        return;
      }
      if (editForm.newPassword !== editForm.confirmPassword) {
        setError('New passwords do not match');
        return;
      }
      if (editForm.newPassword.length < 6) {
        setError('New password must be at least 6 characters');
        return;
      }
    }

    try {
      setIsSaving(true);
      const updateData = {
        name: editForm.name,
        institution: editForm.institution,
      };

      // Only include password fields if changing password
      if (editForm.newPassword) {
        updateData.password = editForm.newPassword;
      }

      const response = await updateProfile(updateData);
      
      // Update local state and context
      setProfile(prev => ({ ...prev, ...updateData }));
      updateUser({ name: editForm.name, institution: editForm.institution });
      
      setSaveSuccess('Profile updated successfully!');
      setIsEditing(false);
      
      // Clear password fields
      setEditForm(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="text-gray-600">Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>

        {/* Profile Card */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            {!isEditing && (
              <Button variant="secondary" onClick={handleEditToggle}>
                Edit Profile
              </Button>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {saveSuccess && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
              <p className="text-sm text-green-600">{saveSuccess}</p>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-6">
              <Input
                label="Name"
                name="name"
                value={editForm.name}
                onChange={handleInputChange}
                required
              />

              <Input
                label="Institution"
                name="institution"
                value={editForm.institution}
                onChange={handleInputChange}
                placeholder="Your institution or organization"
              />

              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                <p className="text-sm text-gray-500 mb-4">Leave blank to keep current password</p>
                
                <div className="space-y-4">
                  <Input
                    label="Current Password"
                    name="currentPassword"
                    type="password"
                    value={editForm.currentPassword}
                    onChange={handleInputChange}
                    placeholder="Enter current password"
                  />

                  <Input
                    label="New Password"
                    name="newPassword"
                    type="password"
                    value={editForm.newPassword}
                    onChange={handleInputChange}
                    placeholder="Enter new password"
                  />

                  <Input
                    label="Confirm New Password"
                    name="confirmPassword"
                    type="password"
                    value={editForm.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" loading={isSaving}>
                  Save Changes
                </Button>
                <Button type="button" variant="secondary" onClick={handleEditToggle}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-indigo-600">
                    {profile?.name?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{profile?.name || user?.name}</h2>
                  <span className={`inline-block mt-1 px-3 py-1 text-xs font-medium rounded-full ${
                    profile?.role === 'admin' ? 'bg-red-100 text-red-800' :
                    profile?.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1) || user?.role}
                  </span>
                </div>
              </div>

              {/* Profile Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <p className="mt-1 text-gray-900">{profile?.email || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Institution</label>
                  <p className="mt-1 text-gray-900">{profile?.institution || 'Not set'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Member Since</label>
                  <p className="mt-1 text-gray-900">{formatDate(profile?.created_at || profile?.CreatedAt)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="mt-1 text-gray-900">{formatDate(profile?.updated_at || profile?.UpdatedAt)}</p>
                </div>
              </div>

              {/* User ID */}
              <div className="pt-6 border-t">
                <label className="block text-sm font-medium text-gray-500">User ID</label>
                <p className="mt-1 text-sm font-mono text-gray-600 bg-gray-50 p-2 rounded">
                  {profile?.id || profile?.ID || 'N/A'}
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
