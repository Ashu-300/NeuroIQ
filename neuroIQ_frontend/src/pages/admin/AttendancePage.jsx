import { useState, useEffect } from 'react';
import { markAttendance, getAttendance } from '../../api/management.api';
import { Button, Card, CardTitle, Input, Select, Loader } from '../../components/ui';
import { Toast, EmptyState } from '../../components/feedback';

const AttendancePage = () => {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API when available
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSessions([
        {
          id: 'session1',
          exam_name: 'Mid Semester - Data Structures',
          date: '2024-01-15',
          room: 'A101',
        },
        {
          id: 'session2',
          exam_name: 'End Semester - Computer Networks',
          date: '2024-01-20',
          room: 'B201',
        },
      ]);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionSelect = async (sessionId) => {
    const session = sessions.find((s) => s.id === sessionId);
    setSelectedSession(session);

    // Fetch students for this session
    // TODO: Replace with actual API
    setStudents([
      { roll_no: '2021001', name: 'John Doe', seat: 1 },
      { roll_no: '2021002', name: 'Jane Smith', seat: 2 },
      { roll_no: '2021003', name: 'Bob Wilson', seat: 3 },
      { roll_no: '2021004', name: 'Alice Johnson', seat: 4 },
      { roll_no: '2021005', name: 'Charlie Brown', seat: 5 },
    ]);

    // Initialize attendance (all absent by default)
    const initialAttendance = {};
    setAttendance(initialAttendance);
  };

  const handleToggleAttendance = (rollNo) => {
    setAttendance((prev) => ({
      ...prev,
      [rollNo]: !prev[rollNo],
    }));
  };

  const handleMarkAll = (present) => {
    const newAttendance = {};
    students.forEach((s) => {
      newAttendance[s.roll_no] = present;
    });
    setAttendance(newAttendance);
  };

  const handleSubmitAttendance = async () => {
    setIsSubmitting(true);
    try {
      const attendanceData = students.map((s) => ({
        roll_no: s.roll_no,
        present: attendance[s.roll_no] || false,
      }));

      await markAttendance({
        session_id: selectedSession.id,
        attendance: attendanceData,
      });

      setToast({
        show: true,
        message: 'Attendance marked successfully!',
        type: 'success',
      });
    } catch (err) {
      setToast({
        show: true,
        message: err.message || 'Failed to mark attendance',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.roll_no.includes(searchTerm)
  );

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const totalStudents = students.length;

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
        <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
        <p className="text-gray-500 mt-1">
          Record student attendance for exam sessions
        </p>
      </div>

      {/* Session Selector */}
      <Card>
        <CardTitle>Select Exam Session</CardTitle>
        <div className="mt-4">
          <Select
            options={[
              { value: '', label: 'Select a session...' },
              ...sessions.map((s) => ({
                value: s.id,
                label: `${s.exam_name} - ${s.date} (${s.room})`,
              })),
            ]}
            value={selectedSession?.id || ''}
            onChange={(e) => handleSessionSelect(e.target.value)}
          />
        </div>
      </Card>

      {selectedSession ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">Present</p>
              <p className="text-2xl font-bold text-green-600">{presentCount}</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">Absent</p>
              <p className="text-2xl font-bold text-red-600">
                {totalStudents - presentCount}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">Attendance %</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalStudents > 0
                  ? Math.round((presentCount / totalStudents) * 100)
                  : 0}
                %
              </p>
            </Card>
          </div>

          {/* Search and Actions */}
          <Card padding="md">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name or roll number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarkAll(true)}
                >
                  Mark All Present
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarkAll(false)}
                >
                  Mark All Absent
                </Button>
              </div>
            </div>
          </Card>

          {/* Student List */}
          <Card padding="none">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roll No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr
                    key={student.roll_no}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      attendance[student.roll_no] ? 'bg-green-50' : ''
                    }`}
                    onClick={() => handleToggleAttendance(student.roll_no)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.seat}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {student.roll_no}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {student.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAttendance(student.roll_no);
                        }}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          attendance[student.roll_no]
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {attendance[student.roll_no] ? 'Present' : 'Absent'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Submit */}
          <div className="flex justify-end">
            <Button onClick={handleSubmitAttendance} loading={isSubmitting}>
              Submit Attendance
            </Button>
          </div>
        </>
      ) : (
        <EmptyState
          title="No session selected"
          description="Select an exam session to mark attendance"
        />
      )}

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

export default AttendancePage;
