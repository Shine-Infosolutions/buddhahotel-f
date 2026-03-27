import { useEffect, useState } from 'react';
import StatCard from '../../components/StatCard';
import { getRooms } from '../../api/rooms';
import { getBookings } from '../../api/bookings';
import { getGuests } from '../../api/guests';
import { getStaff } from '../../api/staff';
import { BedDouble, CheckCircle, XCircle, CalendarDays, Users, UserCog } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ rooms: 0, bookings: 0, guests: 0, staff: 0, available: 0, occupied: 0 });

  useEffect(() => {
    Promise.all([getRooms(), getBookings(), getGuests(), getStaff()]).then(([rooms, bookings, guests, staff]) => {
      setStats({
        rooms: rooms.data.length,
        bookings: bookings.data.length,
        guests: guests.data.length,
        staff: staff.data.length,
        available: rooms.data.filter((r) => r.status === 'available').length,
        occupied: rooms.data.filter((r) => r.status === 'occupied').length,
      });
    });
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard label="Total Rooms" value={stats.rooms} icon={BedDouble} color="yellow" />
        <StatCard label="Available Rooms" value={stats.available} icon={CheckCircle} color="green" />
        <StatCard label="Occupied Rooms" value={stats.occupied} icon={XCircle} color="red" />
        <StatCard label="Total Bookings" value={stats.bookings} icon={CalendarDays} color="blue" />
        <StatCard label="Total Guests" value={stats.guests} icon={Users} color="yellow" />
        <StatCard label="Staff Members" value={stats.staff} icon={UserCog} color="blue" />
      </div>
    </div>
  );
}
