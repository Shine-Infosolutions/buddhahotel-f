import { useEffect, useState } from 'react';
import { getRooms, createRoom, updateRoom, deleteRoom } from '../../api/rooms';
import { getCategories } from '../../api/roomCategories';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Badge from '../../components/Badge';
import PageHeader from '../../components/PageHeader';
import toast from 'react-hot-toast';

const empty = { roomNumber: '', category: '', price: '', status: 'available', description: '', amenities: '' };

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = () => getRooms().then((r) => setRooms(r.data));

  useEffect(() => {
    load();
    getCategories().then((r) => setCategories(r.data));
  }, []);

  const openAdd = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (room) => {
    setEditing(room);
    setForm({ ...room, category: room.category?._id, amenities: room.amenities?.join(', ') });
    setModal(true);
  };

  const handleCategoryChange = (e) => {
    const cat = categories.find((c) => c._id === e.target.value);
    setForm({ ...form, category: e.target.value, price: cat?.basePrice || form.price });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, price: Number(form.price), amenities: form.amenities ? form.amenities.split(',').map((a) => a.trim()) : [] };
    try {
      editing ? await updateRoom(editing._id, data) : await createRoom(data);
      toast.success(editing ? 'Room updated' : 'Room created');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this room?')) return;
    try {
      await deleteRoom(id);
      toast.success('Room deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const columns = [
    { key: 'roomNumber', label: 'Room No.' },
    { key: 'category', label: 'Category', render: (r) => r.category?.name || '—' },
    { key: 'price', label: 'Price', render: (r) => `₹${r.price}` },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
    { key: 'description', label: 'Description' },
  ];

  return (
    <div>
      <PageHeader title="Rooms" action={<Button onClick={openAdd}>+ Add Room</Button>} />
      <Table columns={columns} data={rooms} actions={(row) => (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => openEdit(row)}>Edit</Button>
          <Button variant="danger" onClick={() => handleDelete(row._id)}>Delete</Button>
        </div>
      )} />
      {modal && (
        <Modal title={editing ? 'Edit Room' : 'Add Room'} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Room Number" value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} required />
            <Select label="Category" value={form.category} onChange={handleCategoryChange}
              options={categories.map((c) => ({ value: c._id, label: `${c.name} (₹${c.basePrice})` }))} />
            <Input label="Price per night (₹)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={['available', 'occupied', 'maintenance'].map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
            <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input label="Amenities (comma separated)" value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} />
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
