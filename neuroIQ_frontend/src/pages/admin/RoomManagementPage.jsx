import { useState, useEffect } from 'react';
import {
  registerRoom,
  registerMultipleRooms,
  getRooms,
} from '../../api/management.api';
import { Button, Card, CardTitle, Input, Modal, Loader } from '../../components/ui';
import { EmptyState, Toast } from '../../components/feedback';

const RoomManagementPage = () => {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [singleRoom, setSingleRoom] = useState({
    room_no: '',
    no_of_seats: '',
    block: '',
    floor: '',
  });

  const [bulkRooms, setBulkRooms] = useState('');

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
      // Use sample data for demo
      setRooms([
        { room_no: 'A101', no_of_seats: 30, block: 'A', floor: 1 },
        { room_no: 'A102', no_of_seats: 40, block: 'A', floor: 1 },
        { room_no: 'B201', no_of_seats: 35, block: 'B', floor: 2 },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSingleRoomSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await registerRoom({
        room_no: singleRoom.room_no,
        no_of_seats: parseInt(singleRoom.no_of_seats),
        block: singleRoom.block,
        floor: parseInt(singleRoom.floor),
      });
      setToast({ show: true, message: 'Room registered successfully!', type: 'success' });
      setIsModalOpen(false);
      setSingleRoom({ room_no: '', no_of_seats: '', block: '', floor: '' });
      fetchRooms();
    } catch (err) {
      setToast({ show: true, message: err.message || 'Failed to register room', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkRoomsSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Parse bulk input - expected format: JSON array
      const roomsArray = JSON.parse(bulkRooms);
      await registerMultipleRooms({ rooms: roomsArray });
      setToast({ show: true, message: 'Rooms registered successfully!', type: 'success' });
      setIsBulkModalOpen(false);
      setBulkRooms('');
      fetchRooms();
    } catch (err) {
      if (err instanceof SyntaxError) {
        setToast({ show: true, message: 'Invalid JSON format', type: 'error' });
      } else {
        setToast({ show: true, message: err.message || 'Failed to register rooms', type: 'error' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSeats = rooms.reduce((sum, room) => sum + (room.no_of_seats || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Room Management</h1>
          <p className="text-gray-500 mt-1">
            Register and manage examination rooms
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBulkModalOpen(true)}>
            Bulk Import
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>Add Room</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Total Rooms</p>
          <p className="text-2xl font-bold text-gray-900">{rooms.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Total Capacity</p>
          <p className="text-2xl font-bold text-gray-900">{totalSeats}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Unique Blocks</p>
          <p className="text-2xl font-bold text-gray-900">
            {new Set(rooms.map((r) => r.block)).size}
          </p>
        </Card>
      </div>

      {/* Rooms List */}
      {rooms.length === 0 ? (
        <EmptyState
          title="No rooms registered"
          description="Add your first examination room to get started"
          action={<Button onClick={() => setIsModalOpen(true)}>Add Room</Button>}
        />
      ) : (
        <Card padding="none">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Block
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Floor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seats
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rooms.map((room, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {room.room_no}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {room.block}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {room.floor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {room.no_of_seats}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Add Single Room Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Room"
      >
        <form onSubmit={handleSingleRoomSubmit} className="space-y-4">
          <Input
            label="Room Number"
            value={singleRoom.room_no}
            onChange={(e) =>
              setSingleRoom({ ...singleRoom, room_no: e.target.value })
            }
            placeholder="e.g., A101"
            required
          />
          <Input
            label="Number of Seats"
            type="number"
            value={singleRoom.no_of_seats}
            onChange={(e) =>
              setSingleRoom({ ...singleRoom, no_of_seats: e.target.value })
            }
            placeholder="e.g., 30"
            required
          />
          <Input
            label="Block"
            value={singleRoom.block}
            onChange={(e) =>
              setSingleRoom({ ...singleRoom, block: e.target.value })
            }
            placeholder="e.g., A"
            required
          />
          <Input
            label="Floor"
            type="number"
            value={singleRoom.floor}
            onChange={(e) =>
              setSingleRoom({ ...singleRoom, floor: e.target.value })
            }
            placeholder="e.g., 1"
            required
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Add Room
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Import Rooms"
      >
        <form onSubmit={handleBulkRoomsSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rooms JSON Array
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-40 font-mono text-sm"
              value={bulkRooms}
              onChange={(e) => setBulkRooms(e.target.value)}
              placeholder={`[
  {"room_no": "A101", "no_of_seats": 30, "block": "A", "floor": 1},
  {"room_no": "A102", "no_of_seats": 40, "block": "A", "floor": 1}
]`}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Paste a JSON array of room objects
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBulkModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Import Rooms
            </Button>
          </div>
        </form>
      </Modal>

      {/* Toast */}
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

export default RoomManagementPage;
