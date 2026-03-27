import { useEffect, useState } from 'react';
import { getBills, createBill, updateBill, deleteBill } from '../../api/billing';
import { getBookings } from '../../api/bookings';
import { getGuests } from '../../api/guests';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Badge from '../../components/Badge';
import PageHeader from '../../components/PageHeader';
import toast from 'react-hot-toast';

const empty = { booking: '', guest: '', roomCharges: '', extraCharges: '0', discount: '0', paymentStatus: 'pending', paymentMethod: 'cash' };

export default function Billing() {
  const [bills, setBills] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [guests, setGuests] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = () => getBills().then((r) => setBills(r.data));

  useEffect(() => {
    load();
    getBookings().then((r) => setBookings(r.data));
    getGuests().then((r) => setGuests(r.data));
  }, []);

  const openAdd = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (b) => { setEditing(b); setForm({ ...b, booking: b.booking?._id, guest: b.guest?._id }); setModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, roomCharges: Number(form.roomCharges), extraCharges: Number(form.extraCharges), discount: Number(form.discount) };
    try {
      editing ? await updateBill(editing._id, data) : await createBill(data);
      toast.success(editing ? 'Bill updated' : 'Bill created');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this bill?')) return;
    try {
      await deleteBill(id);
      toast.success('Bill deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const columns = [
    { key: 'guest', label: 'Guest', render: (r) => r.guest?.name || '—' },
    { key: 'roomCharges', label: 'Room Charges', render: (r) => `₹${r.roomCharges}` },
    { key: 'extraCharges', label: 'Extra', render: (r) => `₹${r.extraCharges}` },
    { key: 'discount', label: 'Discount', render: (r) => `₹${r.discount}` },
    { key: 'totalAmount', label: 'Total', render: (r) => `₹${r.totalAmount}` },
    { key: 'paymentStatus', label: 'Status', render: (r) => <Badge status={r.paymentStatus} /> },
    { key: 'paymentMethod', label: 'Method', render: (r) => <span className="capitalize">{r.paymentMethod}</span> },
  ];

  return (
    <div>
      <PageHeader title="Billing" action={<Button onClick={openAdd}>+ New Bill</Button>} />
      <Table columns={columns} data={bills} actions={(row) => (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => openEdit(row)}>Edit</Button>
          <Button variant="danger" onClick={() => handleDelete(row._id)}>Delete</Button>
        </div>
      )} />
      {modal && (
        <Modal title={editing ? 'Edit Bill' : 'New Bill'} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select label="Booking" value={form.booking} onChange={(e) => setForm({ ...form, booking: e.target.value })}
              options={bookings.map((b) => ({ value: b._id, label: `${b.guest?.name || b._id} - ${b.room?.roomNumber || ''}` }))} />
            <Select label="Guest" value={form.guest} onChange={(e) => setForm({ ...form, guest: e.target.value })}
              options={guests.map((g) => ({ value: g._id, label: g.name }))} />
            <Input label="Room Charges (₹)" type="number" value={form.roomCharges} onChange={(e) => setForm({ ...form, roomCharges: e.target.value })} required />
            <Input label="Extra Charges (₹)" type="number" value={form.extraCharges} onChange={(e) => setForm({ ...form, extraCharges: e.target.value })} />
            <Input label="Discount (₹)" type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
            <Select label="Payment Status" value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
              options={['pending', 'paid', 'partial'].map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
            <Select label="Payment Method" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              options={['cash', 'card', 'upi', 'other'].map((s) => ({ value: s, label: s.toUpperCase() }))} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
              <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
