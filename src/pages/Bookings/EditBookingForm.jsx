import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBooking, updateBooking } from '../../api/bookings';
import { updateGuest } from '../../api/guests';
import { getRooms } from '../../api/rooms';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Button from '../../components/Button';
import PageHeader from '../../components/PageHeader';
import toast from 'react-hot-toast';

const statusOptions = ['confirmed', 'checked_in', 'checked_out', 'cancelled'].map((s) => ({
  value: s,
  label: s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
}));

export default function EditBookingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [guest, setGuest] = useState(null);
  const [booking, setBooking] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getBooking(id).then((r) => {
      const b = r.data;
      setGuest(b.guest);
      setBooking({ room: b.room?._id, checkIn: b.checkIn?.slice(0, 10), checkOut: b.checkOut?.slice(0, 10), status: b.status, notes: b.notes || '' });
    });
    getRooms().then((r) => setRooms(r.data));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateGuest(guest._id, guest);
      await updateBooking(id, { ...booking, guest: guest._id });
      toast.success('Booking updated');
      navigate('/bookings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  if (!booking || !guest) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <PageHeader title="Edit Booking" />
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">

        {/* Booking Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-700 mb-4">Booking Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Room" value={booking.room} onChange={(e) => setBooking({ ...booking, room: e.target.value })}
              options={rooms.filter((r) => r.status === 'available' || r._id === booking.room).map((r) => ({ value: r._id, label: `${r.roomNumber} - ${r.category?.name || ''} (₹${r.price})` }))} />
            <Select label="Status" value={booking.status} onChange={(e) => setBooking({ ...booking, status: e.target.value })} options={statusOptions} />
            <Input label="Check In" type="date" value={booking.checkIn} onChange={(e) => setBooking({ ...booking, checkIn: e.target.value })} required />
            <Input label="Check Out" type="date" value={booking.checkOut} onChange={(e) => setBooking({ ...booking, checkOut: e.target.value })} required />
            <div className="sm:col-span-2">
              <Input label="Notes" value={booking.notes} onChange={(e) => setBooking({ ...booking, notes: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Guest Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-700 mb-4">Guest Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full Name" value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} required />
            <Input label="Phone" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} required />
            <Input label="Email" type="email" value={guest.email || ''} onChange={(e) => setGuest({ ...guest, email: e.target.value })} />
            <Select label="ID Type" value={guest.idType || ''} onChange={(e) => setGuest({ ...guest, idType: e.target.value })}
              options={['passport', 'aadhar', 'driving_license', 'other'].map((t) => ({ value: t, label: t.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }))} />
            <Input label="ID Number" value={guest.idNumber || ''} onChange={(e) => setGuest({ ...guest, idNumber: e.target.value })} />
            <Input label="Address" value={guest.address || ''} onChange={(e) => setGuest({ ...guest, address: e.target.value })} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate('/bookings')}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update Booking'}</Button>
        </div>
      </form>
    </div>
  );
}
