import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBookings, deleteBooking } from '../../api/bookings';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import PageHeader from '../../components/PageHeader';
import toast from 'react-hot-toast';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const navigate = useNavigate();

  const load = () => getBookings().then((r) => setBookings(r.data));
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this booking?')) return;
    try {
      await deleteBooking(id);
      toast.success('Booking deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const columns = [
    { key: 'guest', label: 'Guest', render: (r) => r.guest?.name || '—' },
    { key: 'room', label: 'Room', render: (r) => r.room?.roomNumber || '—' },
    { key: 'checkIn', label: 'Check In', render: (r) => r.checkIn?.slice(0, 10) },
    { key: 'checkOut', label: 'Check Out', render: (r) => r.checkOut?.slice(0, 10) },
    { key: 'totalAmount', label: 'Amount', render: (r) => `₹${r.totalAmount || 0}` },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Bookings" action={<Button onClick={() => navigate('/bookings/add')}>+ New Booking</Button>} />
      <Table columns={columns} data={bookings} actions={(row) => (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(`/bookings/edit/${row._id}`)}>Edit</Button>
          <Button variant="danger" onClick={() => handleDelete(row._id)}>Delete</Button>
        </div>
      )} />
    </div>
  );
}
