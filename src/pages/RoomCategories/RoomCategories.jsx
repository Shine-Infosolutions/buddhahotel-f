import { useEffect, useState } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api/roomCategories';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Input from '../../components/Input';
import PageHeader from '../../components/PageHeader';
import toast from 'react-hot-toast';

const empty = { name: '', description: '', basePrice: '', amenities: '' };

export default function RoomCategories() {
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = () => getCategories().then((r) => setCategories(r.data));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...c, amenities: c.amenities?.join(', ') }); setModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, basePrice: Number(form.basePrice), amenities: form.amenities ? form.amenities.split(',').map((a) => a.trim()) : [] };
    try {
      editing ? await updateCategory(editing._id, data) : await createCategory(data);
      toast.success(editing ? 'Category updated' : 'Category created');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category?')) return;
    try {
      await deleteCategory(id);
      toast.success('Category deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'basePrice', label: 'Base Price', render: (r) => `₹${r.basePrice}` },
    { key: 'amenities', label: 'Amenities', render: (r) => r.amenities?.join(', ') || '—' },
  ];

  return (
    <div>
      <PageHeader title="Room Categories" action={<Button onClick={openAdd}>+ Add Category</Button>} />
      <Table columns={columns} data={categories} actions={(row) => (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => openEdit(row)}>Edit</Button>
          <Button variant="danger" onClick={() => handleDelete(row._id)}>Delete</Button>
        </div>
      )} />
      {modal && (
        <Modal title={editing ? 'Edit Category' : 'Add Category'} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input label="Base Price (₹)" type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} required />
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
