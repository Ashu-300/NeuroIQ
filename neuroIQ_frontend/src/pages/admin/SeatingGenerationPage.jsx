import { useState, useEffect } from 'react';
import { generateSeatingArrangement } from '../../api/management.api';
import { getRooms } from '../../api/management.api';
import { Button, Card, CardTitle, Input, Select, Loader } from '../../components/ui';
import { Toast } from '../../components/feedback';

const SeatingGenerationPage = () => {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [seatingResult, setSeatingResult] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [formData, setFormData] = useState({
    exam_name: '',
    exam_date: '',
    selected_rooms: [],
    students: '',
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const response = await getRooms();
      setRooms(response.data?.rooms || []);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
      // Demo data
      setRooms([
        { room_no: 'A101', no_of_seats: 30, block: 'A', floor: 1 },
        { room_no: 'A102', no_of_seats: 40, block: 'A', floor: 1 },
        { room_no: 'B201', no_of_seats: 35, block: 'B', floor: 2 },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoomToggle = (roomNo) => {
    const current = formData.selected_rooms;
    if (current.includes(roomNo)) {
      setFormData({
        ...formData,
        selected_rooms: current.filter((r) => r !== roomNo),
      });
    } else {
      setFormData({
        ...formData,
        selected_rooms: [...current, roomNo],
      });
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();

    if (formData.selected_rooms.length === 0) {
      setToast({ show: true, message: 'Please select at least one room', type: 'error' });
      return;
    }

    let studentsArray;
    try {
      studentsArray = JSON.parse(formData.students);
    } catch {
      setToast({ show: true, message: 'Invalid students JSON format', type: 'error' });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await generateSeatingArrangement({
        exam_name: formData.exam_name,
        exam_date: formData.exam_date,
        rooms: formData.selected_rooms,
        students: studentsArray,
      });
      setSeatingResult(response.data);
      setToast({ show: true, message: 'Seating arrangement generated!', type: 'success' });
    } catch (err) {
      setToast({
        show: true,
        message: err.message || 'Failed to generate seating',
        type: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const totalCapacity = rooms
    .filter((r) => formData.selected_rooms.includes(r.room_no))
    .reduce((sum, r) => sum + (r.no_of_seats || 0), 0);

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
        <h1 className="text-2xl font-bold text-gray-900">
          Generate Seating Arrangement
        </h1>
        <p className="text-gray-500 mt-1">
          Allocate students to exam rooms automatically
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <form onSubmit={handleGenerate} className="space-y-6">
          <Card>
            <CardTitle>Exam Details</CardTitle>
            <div className="mt-4 space-y-4">
              <Input
                label="Exam Name"
                value={formData.exam_name}
                onChange={(e) =>
                  setFormData({ ...formData, exam_name: e.target.value })
                }
                placeholder="e.g., End Semester Examination"
                required
              />
              <Input
                label="Exam Date"
                type="date"
                value={formData.exam_date}
                onChange={(e) =>
                  setFormData({ ...formData, exam_date: e.target.value })
                }
                required
              />
            </div>
          </Card>

          <Card>
            <CardTitle>Select Rooms</CardTitle>
            <p className="text-sm text-gray-500 mb-4">
              Selected: {formData.selected_rooms.length} rooms | Capacity:{' '}
              {totalCapacity} seats
            </p>
            <div className="grid grid-cols-2 gap-2">
              {rooms.map((room) => (
                <button
                  key={room.room_no}
                  type="button"
                  onClick={() => handleRoomToggle(room.room_no)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    formData.selected_rooms.includes(room.room_no)
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium">{room.room_no}</p>
                  <p className="text-xs text-gray-500">
                    {room.no_of_seats} seats
                  </p>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Students Data</CardTitle>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Students JSON Array
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-40 font-mono text-sm"
                value={formData.students}
                onChange={(e) =>
                  setFormData({ ...formData, students: e.target.value })
                }
                placeholder={`[
  {"roll_no": "2021001", "name": "John Doe", "branch": "CSE"},
  {"roll_no": "2021002", "name": "Jane Smith", "branch": "CSE"}
]`}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Paste student data as JSON array
              </p>
            </div>
          </Card>

          <Button type="submit" fullWidth loading={isGenerating}>
            Generate Seating Arrangement
          </Button>
        </form>

        {/* Result */}
        <div className="space-y-4">
          {seatingResult ? (
            <>
              <Card>
                <CardTitle>Generated Arrangement</CardTitle>
                <div className="mt-4 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Exam:</span>{' '}
                    {seatingResult.exam_name || formData.exam_name}
                  </p>
                  <p>
                    <span className="font-medium">Date:</span>{' '}
                    {seatingResult.exam_date || formData.exam_date}
                  </p>
                </div>
              </Card>

              {seatingResult.allocation &&
                Object.entries(seatingResult.allocation).map(
                  ([roomNo, students]) => (
                    <Card key={roomNo}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">
                          Room {roomNo}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {students.length} students
                        </span>
                      </div>
                      <div className="overflow-auto max-h-64">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="py-2 text-left">Seat</th>
                              <th className="py-2 text-left">Roll No</th>
                              <th className="py-2 text-left">Name</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.map((s, index) => (
                              <tr key={index} className="border-b">
                                <td className="py-2">{index + 1}</td>
                                <td className="py-2">{s.roll_no}</td>
                                <td className="py-2">{s.name}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )
                )}

              <div className="flex gap-2">
                <Button variant="outline" fullWidth>
                  Export PDF
                </Button>
                <Button variant="secondary" fullWidth>
                  Save Arrangement
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <div className="text-center py-12 text-gray-500">
                <p>No seating arrangement generated yet.</p>
                <p className="text-sm mt-1">
                  Fill in the details and click generate.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

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

export default SeatingGenerationPage;
