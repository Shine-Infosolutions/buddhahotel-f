import { useEffect, useState } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api/roomCategories';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import { Pencil, Trash2 } from 'lucide-react';

const empty = { name: '', description: '', basePrice: '', amenities: '', status: 'active' };

const inputCls = 'border border-[#C9A84C] rounded px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-[#A07830] focus:border-[#A07830] transition bg-white';
const labelCls = 'text-sm text-[#5a4228] mb-1 block font-medium';

const perPage = 10;

export default function RoomCategories() {
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [page, setPage] = useState(1);

  const load = () => getCategories().then((r) => setCategories(r.data));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({ ...c, amenities: c.amenities?.join(', ') });
    setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...form,
      basePrice: Number(form.basePrice),
      amenities: form.amenities ? form.amenities.split(',').map((a) => a.trim()) : [],
    };
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
    try { await deleteCategory(id); toast.success('Category deleted'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const totalPages = Math.max(1, Math.ceil(categories.length / perPage));
  const paginated = categories.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#3d2e10]">Room Categories</h2>
        <button onClick={openAdd}
          className="bg-[#C9A84C] hover:bg-[#a8893a] text-white px-5 py-2 rounded text-sm font-semibold transition-colors">
          + Add Category
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-[#E8D5A0] shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E8D5A0] bg-white">
              <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 tracking-wide uppercase w-48">Name</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 tracking-wide uppercase">Description</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 tracking-wide uppercase w-32">Status</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 tracking-wide uppercase w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-gray-400">No categories found</td></tr>
            ) : paginated.map((cat) => (
              <tr key={cat._id} className="border-b border-[#f0e8c8] hover:bg-[#fffdf5] transition-colors">
                <td className="px-5 py-4 font-bold text-[#3d2e10] uppercase">{cat.name}</td>
                <td className="px-5 py-4 text-[#3d2e10]">{cat.description || '—'}</td>
                <td className="px-5 py-4">
                  {cat.status === 'active' ? (
                    <span className="text-xs px-3 py-1 rounded-full font-medium bg-green-100 text-green-700 border border-green-200">Active</span>
                  ) : (
                    <span className="text-xs px-3 py-1 rounded-full font-medium bg-red-100 text-red-500 border border-red-200">Inactive</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => openEdit(cat)} className="text-blue-500 hover:text-blue-700 transition-colors"><Pencil size={16} /></button>
                    <button onClick={() => handleDelete(cat._id)} className="text-red-500 hover:text-red-700 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination inside card */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4 border-t border-[#E8D5A0]">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-5 py-1.5 rounded border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
              Previous
            </button>
            <span className="px-5 py-1.5 rounded border border-gray-300 bg-white text-sm text-gray-700 font-medium">
              {page} of {totalPages}
            </span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-5 py-1.5 rounded border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <Modal title={editing ? 'Edit Category' : 'Add Category'} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Base Price (₹)</label>
              <input type="number" className={inputCls} value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} required />
            </div>
            <div>
              <label className={labelCls}>Amenities (comma separated)</label>
              <input className={inputCls} value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(false)}
                className="border border-[#C9A84C] text-[#9C7C38] hover:bg-[#FDF6E3] px-4 py-2 rounded text-sm font-semibold transition-colors">
                Cancel
              </button>
              <button type="submit"
                className="bg-[#C9A84C] hover:bg-[#a8893a] text-white px-5 py-2 rounded text-sm font-semibold transition-colors">
                {editing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
