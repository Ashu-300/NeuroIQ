import { useState, useEffect } from 'react';
import { Card, Button, Modal, Input, Select } from '../../components/ui';
import { getScheduledExams, deleteScheduledExam, updateExamTime, getScheduledExamDetails } from '../../api/management.api';

const ScheduledExamsPage = () => {
  const [scheduledExams, setScheduledExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');
  const [selectedExam, setSelectedExam] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({ date: '', start_time: '', end_time: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (branch && semester) {
      fetchScheduledExams(branch, semester);
    } else {
      setLoading(false);
    }
  }, [branch, semester]);

  const fetchScheduledExams = async (branchValue, semesterValue) => {
    try {
      setLoading(true);
      const data = await getScheduledExams(branchValue, semesterValue);
      console.log('Scheduled exams response:', data);
      setScheduledExams(data.scheduled_exams || data.exams || data || []);
    } catch (error) {
      console.error('Failed to fetch scheduled exams:', error);
      setScheduledExams([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (exam) => {
    try {
      const details = await getScheduledExamDetails(exam.id || exam._id);
      setSelectedExam(details);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Failed to fetch exam details:', error);
      setSelectedExam(exam);
      setShowDetailsModal(true);
    }
  };

  const handleEditClick = (exam) => {
    setSelectedExam(exam);
    // Extract just HH:mm from existing time values
    // Handle both "HH:mm" format and "YYYY-MM-DDTHH:mm" format
    const extractTime = (timeStr) => {
      if (!timeStr) return '';
      // If it contains 'T', it's a datetime string - extract time portion
      if (timeStr.includes('T')) {
        return timeStr.split('T')[1].slice(0, 5);
      }
      // Otherwise just take the first 5 chars (HH:mm)
      return timeStr.slice(0, 5);
    };
    // Extract date in YYYY-MM-DD format
    const extractDate = (dateVal) => {
      if (!dateVal) return '';
      // Handle both ISO string and $date object from MongoDB
      const dateStr = dateVal.$date || dateVal;
      return new Date(dateStr).toISOString().split('T')[0];
    };
    setUpdateForm({
      date: extractDate(exam.date),
      start_time: extractTime(exam.start_time),
      end_time: extractTime(exam.end_time)
    });
    setShowUpdateModal(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedExam) return;

    try {
      setActionLoading(true);
      // Convert date to ISO format for Go backend (time.Time expects ISO)
      const payload = {
        date: new Date(updateForm.date).toISOString(),
        start_time: updateForm.start_time,
        end_time: updateForm.end_time
      };
      await updateExamTime(selectedExam.id || selectedExam._id, payload);
      setShowUpdateModal(false);
      setSelectedExam(null);
      fetchScheduledExams(branch, semester);
    } catch (error) {
      console.error('Failed to update exam time:', error);
      alert('Failed to update exam time');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClick = (exam) => {
    setSelectedExam(exam);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedExam) return;

    try {
      setActionLoading(true);
      await deleteScheduledExam(selectedExam.id || selectedExam._id);
      setShowDeleteModal(false);
      setSelectedExam(null);
	  fetchScheduledExams(branch, semester);
    } catch (error) {
      console.error('Failed to delete scheduled exam:', error);
      alert('Failed to delete scheduled exam');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scheduled Exams</h1>
          <p className="text-gray-500 mt-1">View and manage all scheduled exams</p>
        </div>
        <Button
          onClick={() => {
            if (branch && semester) {
              fetchScheduledExams(branch, semester);
            }
          }}
          variant="secondary"
          disabled={!branch || !semester}
        >
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="mt-4" padding="md">
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
          <div className="flex gap-3">
            <Button
              className="w-full md:w-auto"
              onClick={() => {
                if (branch && semester) {
                  fetchScheduledExams(branch, semester);
                }
              }}
              disabled={!branch || !semester}
            >
              Load Exams
            </Button>
          </div>
        </div>
      </Card>

      {/* Scheduled Exams List */}
      {loading ? (
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-gray-600">Loading scheduled exams...</span>
          </div>
        </Card>
      ) : scheduledExams.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No scheduled exams</h3>
            <p className="mt-2 text-gray-500">Go to "My Exams" to schedule an exam from your question bank.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scheduledExams.map((exam) => (
            <Card key={exam.id || exam._id} padding="md" className="hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {exam.exam_name || exam.title || 'Untitled Exam'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {exam.subject} - Sem {exam.semester}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  exam.status === 'active' ? 'bg-green-100 text-green-800' :
                  exam.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {exam.status || 'scheduled'}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Date:</span>
                  <span className="text-gray-900">{exam.date ? new Date(exam.date).toLocaleDateString() : 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Start:</span>
                  <span className="text-gray-900">{exam.start_time || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">End:</span>
                  <span className="text-gray-900">{exam.end_time || 'Not set'}</span>
                </div>
                {exam.duration_min && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Duration:</span>
                    <span className="text-gray-900">{exam.duration_min} min</span>
                  </div>
                )}
                {exam.total_marks && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Marks:</span>
                    <span className="text-gray-900">{exam.total_marks}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2 border-t pt-4">
                <Button size="sm" variant="secondary" onClick={() => handleViewDetails(exam)}>
                  Details
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleEditClick(exam)}>
                  Edit Time
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDeleteClick(exam)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* View Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => { setShowDetailsModal(false); setSelectedExam(null); }}
        title="Exam Details"
      >
        {selectedExam && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Exam Name</label>
              <p className="text-gray-900 font-medium">{selectedExam.exam_name || selectedExam.title || 'N/A'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Subject</label>
                <p className="text-gray-900">{selectedExam.subject || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Semester</label>
                <p className="text-gray-900">{selectedExam.semester || 'N/A'}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Exam ID (Question Bank)</label>
              <p className="text-gray-900 text-sm font-mono bg-gray-50 p-2 rounded">{selectedExam.exam_id || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Date</label>
              <p className="text-gray-900">{selectedExam.date ? new Date(selectedExam.date).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Start Time</label>
                <p className="text-gray-900">{selectedExam.start_time || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">End Time</label>
                <p className="text-gray-900">{selectedExam.end_time || 'N/A'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Duration</label>
                <p className="text-gray-900">{selectedExam.duration_min ? `${selectedExam.duration_min} minutes` : 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Total Marks</label>
                <p className="text-gray-900">{selectedExam.total_marks || 'N/A'}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Status</label>
              <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                selectedExam.status === 'active' ? 'bg-green-100 text-green-800' :
                selectedExam.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {selectedExam.status || 'scheduled'}
              </span>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={() => { setShowDetailsModal(false); setSelectedExam(null); }}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Update Date & Time Modal */}
      <Modal
        isOpen={showUpdateModal}
        onClose={() => { setShowUpdateModal(false); setSelectedExam(null); }}
        title="Update Exam Schedule"
      >
        <form onSubmit={handleUpdateSubmit} className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              Updating: <span className="font-medium text-gray-900">{selectedExam?.exam_name || selectedExam?.title || 'Exam'}</span>
            </p>
          </div>
          <Input
            label="Date"
            type="date"
            value={updateForm.date}
            onChange={(e) => setUpdateForm({ ...updateForm, date: e.target.value })}
            required
          />
          <Input
            label="Start Time"
            type="time"
            value={updateForm.start_time}
            onChange={(e) => setUpdateForm({ ...updateForm, start_time: e.target.value })}
            required
          />
          <Input
            label="End Time"
            type="time"
            value={updateForm.end_time}
            onChange={(e) => setUpdateForm({ ...updateForm, end_time: e.target.value })}
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => { setShowUpdateModal(false); setSelectedExam(null); }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading}>
              Update Time
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedExam(null); }}
        title="Delete Scheduled Exam"
      >
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-gray-700">
              Are you sure you want to delete the scheduled exam{' '}
              <span className="font-semibold text-gray-900">"{selectedExam?.exam_name || selectedExam?.title || 'this exam'}"</span>?
            </p>
            <p className="text-sm text-red-600 mt-2">This action cannot be undone.</p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="secondary" 
              onClick={() => { setShowDeleteModal(false); setSelectedExam(null); }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} loading={actionLoading}>
              Delete Exam
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ScheduledExamsPage;
