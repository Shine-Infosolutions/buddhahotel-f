import { useEffect, useState } from 'react';
import { getRooms } from '../../api/rooms';

const statusStyle = {
  available: { bg: '#e8f5e9', text: '#2e7d32', label: 'Available' },
  occupied:  { bg: '#fff3e0', text: '#e65100', label: 'Occupied'  },
  maintenance: { bg: '#fce4ec', text: '#c62828', label: 'Maintenance' },
};

export default function RoomStatus() {
  const [rooms, setRooms] = useState([]);

  useEffect(() => { getRooms().then((r) => setRooms(r.data)); }, []);

  const counts = rooms.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#3d2e10] mb-5">Room Status</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {Object.entries(statusStyle).map(([key, { bg, text, label }]) => (
          <div key={key} className="rounded-xl p-4 border border-[#E8D5A0] bg-white flex items-center gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: bg, color: text }}>
              {counts[key] || 0}
            </div>
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-sm font-semibold" style={{ color: text }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Room grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {rooms.map((room) => {
          const s = statusStyle[room.status] || statusStyle.available;
          return (
            <div key={room._id} className="rounded-xl border border-[#E8D5A0] bg-white p-3 flex flex-col items-center gap-1 shadow-sm">
              <span className="text-lg font-bold text-[#3d2e10]">{room.roomNumber}</span>
              <span className="text-xs text-gray-500">{room.category?.name || '—'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-1" style={{ backgroundColor: s.bg, color: s.text }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
