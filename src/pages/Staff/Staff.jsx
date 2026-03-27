import { useEffect, useState } from 'react';
import { getStaff, createStaff, updateStaff, deleteStaff } from '../../api/staff';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Badge from '../../components/Badge';
import PageHeader from '../../components/PageHeader';
import toast from 'react-hot-toast';

const empty = { name: '', email: '', phone: '', role: 'receptionist', salary: '', status: 'active' };

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = () => getStaff().then((r) => setStaff(r.data));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (s) => { setEditing(s); setForm(s); setModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, salary: Number(form.salary) };
    try {
      editing ? await updateStaff(editing._id, data) : await createStaff(data);
      toast.success(editing ? 'Staff updated' : 'Staff added');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this staff member?')) return;
    try {
      await deleteStaff(id);
      toast.success('Staff deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'role', label: 'Role', render: (r) => <span className="capitalize">{r.role}</span> },
    { key: 'salary', label: 'Salary', render: (r) => `₹${r.salary || 0}` },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Staff" action={<Button onClick={openAdd}>+ Add Staff</Button>} />
      <Table columns={columns} data={staff} actions={(row) => (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => openEdit(row)}>Edit</Button>
          <Button variant="danger" onClick={() => handleDelete(row._id)}>Delete</Button>
        </div>
      )} />
      {modal && (
        <Modal title={editing ? 'Edit Staff' : 'Add Staff'} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              options={['manager', 'receptionist', 'housekeeping', 'security', 'other'].map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))} />
            <Input label="Salary (₹)" type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={['active', 'inactive'].map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
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
