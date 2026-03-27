import { useEffect, useState } from 'react';
import { getGuests, createGuest, updateGuest, deleteGuest } from '../../api/guests';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Select from '../../components/Select';
import PageHeader from '../../components/PageHeader';
import toast from 'react-hot-toast';

const empty = { name: '', email: '', phone: '', idType: '', idNumber: '', address: '' };

export default function Guests() {
  const [guests, setGuests] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = () => getGuests().then((r) => setGuests(r.data));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (g) => { setEditing(g); setForm(g); setModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      editing ? await updateGuest(editing._id, form) : await createGuest(form);
      toast.success(editing ? 'Guest updated' : 'Guest added');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this guest?')) return;
    try {
      await deleteGuest(id);
      toast.success('Guest deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'idType', label: 'ID Type', render: (r) => <span className="capitalize">{r.idType || '—'}</span> },
    { key: 'idNumber', label: 'ID Number' },
    { key: 'address', label: 'Address' },
  ];

  return (
    <div>
      <PageHeader title="Guests" action={<Button onClick={openAdd}>+ Add Guest</Button>} />
      <Table columns={columns} data={guests} actions={(row) => (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => openEdit(row)}>Edit</Button>
          <Button variant="danger" onClick={() => handleDelete(row._id)}>Delete</Button>
        </div>
      )} />
      {modal && (
        <Modal title={editing ? 'Edit Guest' : 'Add Guest'} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <Select label="ID Type" value={form.idType} onChange={(e) => setForm({ ...form, idType: e.target.value })}
              options={['passport', 'aadhar', 'driving_license', 'other'].map((t) => ({ value: t, label: t.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }))} />
            <Input label="ID Number" value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} />
            <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
