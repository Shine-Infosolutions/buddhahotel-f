import { useEffect, useState } from 'react';
import { getRooms, createRoom, updateRoom, deleteRoom } from '../../api/rooms';
import { getCategories } from '../../api/roomCategories';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import { BedDouble, Pencil, Trash2, Search } from 'lucide-react';

const empty = { roomNumber: '', category: '', price: '', status: 'available', description: '', amenities: '' };

const statusStyle = {
  available:   { bg: '#e8f5e9', text: '#2e7d32', label: 'Available' },
  occupied:    { bg: '#fff3e0', text: '#e65100', label: 'Occupied' },
  booked:      { bg: '#fce4ec', text: '#c62828', label: 'Booked' },
  maintenance: { bg: '#fce4ec', text: '#c62828', label: 'Maintenance' },
};

const inputCls = 'border border-[#C9A84C] rounded px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-[#A07830] focus:border-[#A07830] transition bg-white';
const labelCls = 'text-sm text-[#5a4228] mb-1 block font-medium';

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

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
    try { await deleteRoom(id); toast.success('Room deleted'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const filtered = rooms.filter((r) => {
    const matchSearch = r.roomNumber?.toString().toLowerCase().includes(search.toLowerCase()) ||
      r.category?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-[#3d2e10]">Rooms</h2>
        <button onClick={openAdd}
          className="bg-[#C9A84C] hover:bg-[#a8893a] text-white px-5 py-2 rounded text-sm font-semibold transition-colors">
          + Add Room
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 mb-6 items-center">
        <div className="flex-1 flex items-center gap-2 bg-white border border-[#E8D5A0] rounded px-3 py-2 shadow-sm">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input
            className="flex-1 text-sm outline-none bg-transparent text-[#3d2e10] placeholder-gray-400"
            placeholder="Search by room title or number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-[#E8D5A0] bg-white rounded px-3 py-2 text-sm text-[#3d2e10] outline-none focus:ring-1 focus:ring-[#C9A84C] cursor-pointer"
        >
          <option value="all">All</option>
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filtered.length === 0 ? (
          <p className="text-gray-400 text-sm col-span-4 text-center py-10">No rooms found</p>
        ) : filtered.map((room) => {
          const s = statusStyle[room.status] || statusStyle.available;
          return (
            <div key={room._id} className="rounded-2xl overflow-hidden border border-[#E8D5A0] shadow-sm bg-white">
              {/* Top — gray image area */}
              <div className="relative bg-gray-100 h-40 flex items-center justify-center">
                {/* Status badge */}
                <span className="absolute top-3 left-3 text-xs px-2.5 py-1 rounded font-medium"
                  style={{ backgroundColor: s.bg, color: s.text }}>
                  {s.label}
                </span>
                {/* Action icons */}
                <div className="absolute top-3 right-3 flex gap-2">
                  <button onClick={() => openEdit(room)}
                    className="text-blue-500 hover:text-blue-700 transition-colors"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(room._id)}
                    className="text-red-500 hover:text-red-700 transition-colors"><Trash2 size={16} /></button>
                </div>
                {/* Bed icon */}
                <BedDouble size={48} className="text-gray-400" />
              </div>

              {/* Bottom — golden info area */}
              <div className="px-4 py-3" style={{ backgroundColor: '#C9A84C' }}>
                <h3 className="text-base font-bold text-[#3d2e10] mb-2">Room {room.roomNumber}</h3>
                <div className="flex justify-between text-sm text-[#3d2e10] mb-1">
                  <span>Room title:</span>
                  <span className="font-semibold">{room.category?.name?.toLowerCase() || '—'}</span>
                </div>
                <div className="flex justify-between text-sm text-[#3d2e10] mb-1">
                  <span>Category:</span>
                  <span className="font-bold uppercase">{room.category?.name || '—'}</span>
                </div>
                <div className="flex justify-between text-sm text-[#3d2e10]">
                  <span>Price:</span>
                  <span className="font-bold">₹{room.price}/night</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modal && (
        <Modal title={editing ? 'Edit Room' : 'Add Room'} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Room Number</label>
              <input className={inputCls} value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} required />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} value={form.category} onChange={handleCategoryChange}>
                <option value="">Select Category</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name} (₹{c.basePrice})</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Price per night (₹)</label>
              <input type="number" className={inputCls} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {['available', 'occupied', 'maintenance'].map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Amenities (comma separated)</label>
              <input className={inputCls} value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} />
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
