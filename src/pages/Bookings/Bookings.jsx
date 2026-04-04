import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBookings, deleteBooking, updateBooking } from '../../api/bookings';
import toast from 'react-hot-toast';
import { Eye, Pencil, Printer, FileText, Trash2, RefreshCw, Search } from 'lucide-react';

const STATUS_OPTIONS = ['booked', 'checked_in', 'checked_out', 'cancelled'];
const PAYMENT_OPTIONS = ['pending', 'partial', 'paid'];
const statusLabel = { booked: 'Booked', checked_in: 'Checked In', checked_out: 'Checked Out', cancelled: 'Cancelled' };

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;
  const navigate = useNavigate();

  const load = () => getBookings().then((r) => { setBookings(r.data); setFiltered(r.data); setPage(1); });
  useEffect(() => { load(); }, []);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
    const q = val.toLowerCase();
    setFiltered(bookings.filter((b) =>
      b.guest?.name?.toLowerCase().includes(q) ||
      b.room?.roomNumber?.toString().includes(q) ||
      b.grcNumber?.toLowerCase().includes(q)
    ));
  };

  const handleExtraBedOnly = () => {
    setPage(1);
    setSearch('');
    setFiltered(bookings.filter((b) => b.extraBedChargePerDay > 0));
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this booking?')) return;
    try { await deleteBooking(id); toast.success('Deleted'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleStatusChange = async (id, status) => {
    try { await updateBooking(id, { status }); toast.success('Status updated'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handlePaymentChange = async (id, paymentStatus) => {
    try { await updateBooking(id, { paymentStatus }); toast.success('Payment updated'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const btnCls = 'px-5 py-2 rounded text-sm font-semibold transition-colors bg-[#C9A84C] hover:bg-[#a8893a] text-white';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-[#3d2e10]">Bookings</h2>
        <button onClick={() => navigate('/bookings/add')} className={btnCls}>
          Add Booking
        </button>
      </div>

      {/* Search + Buttons */}
      <div className="flex gap-3 mb-4 items-center">
        <div className="flex-1 flex items-center gap-2 bg-white border border-[#E8D5A0] rounded-md px-3 py-2 shadow-sm">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input
            className="flex-1 text-sm outline-none bg-transparent text-[#3d2e10] placeholder-gray-400"
            placeholder="Search by name, room number, or GRC No..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <button onClick={() => handleSearch(search)} className={btnCls}>Search GRC</button>
        <button onClick={handleExtraBedOnly} className={btnCls}>Extra Bed Only</button>
        <button onClick={load}
          className="flex items-center gap-1.5 px-5 py-2 rounded text-sm font-semibold bg-[#3b82f6] hover:bg-[#2563eb] text-white transition-colors">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E8D5A0] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '420px' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#f5e9c8' }}>
                {['GRC', 'INVOICE', 'NAME', 'ROOM', 'CATEGORY', 'EXTRA', 'CHECK IN', 'CHECK OUT', 'STATUS', 'PAYMENT', 'ACTIONS'].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-bold tracking-wide whitespace-nowrap" style={{ color: '#9C7C38' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-gray-400 text-sm">No bookings found</td>
                </tr>
              ) : paginated.map((b) => (
                <tr key={b._id} className="border-b border-[#f0e8c8] hover:bg-[#fffdf5] transition-colors">
                  <td className="px-3 py-3 whitespace-nowrap text-xs font-semibold" style={{ color: '#9C7C38' }}>{b.grcNumber || '—'}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs" style={{ color: '#9C7C38' }}>{b.invoiceNumber || '—'}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-[#3d2e10]">{b.guest?.name || '—'}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-[#3d2e10]">{b.room?.roomNumber || '—'}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-[#3d2e10] uppercase">{b.room?.category?.name || '—'}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-[#3d2e10]">{b.extraBedChargePerDay > 0 ? `₹${b.extraBedChargePerDay}` : '-'}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-[#3d2e10]">{b.checkIn?.slice(0, 10)}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-[#3d2e10]">{b.checkOut?.slice(0, 10)}</td>

                  {/* Status dropdown */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <select value={b.status} onChange={(e) => handleStatusChange(b._id, e.target.value)}
                      disabled={b.status === 'checked_out' || b.status === 'cancelled'}
                      className="text-xs px-2 py-1 rounded outline-none bg-white"
                      style={{ border: '1px solid #C9A84C', color: '#9C7C38', minWidth: '105px', cursor: (b.status === 'checked_out' || b.status === 'cancelled') ? 'not-allowed' : 'pointer', opacity: (b.status === 'checked_out' || b.status === 'cancelled') ? 0.6 : 1 }}>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{statusLabel[s]}</option>
                      ))}
                    </select>
                  </td>

                  {/* Payment dropdown */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <select value={b.paymentStatus} onChange={(e) => handlePaymentChange(b._id, e.target.value)}
                      className="text-xs px-2 py-1 rounded outline-none cursor-pointer bg-white text-[#3d2e10]"
                      style={{ border: '1px solid #C9A84C', minWidth: '65px' }}>
                      {PAYMENT_OPTIONS.map((p) => (
                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                      ))}
                    </select>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2 mb-1">
                      <button onClick={() => navigate(`/bookings/${b._id}`)} title="View"
                        className="text-purple-500 hover:text-purple-700"><Eye size={15} /></button>
                      <button onClick={() => navigate(`/bookings/edit/${b._id}`)} title="Edit"
                        className="text-blue-500 hover:text-blue-700"><Pencil size={15} /></button>
                      <button title="Print"
                        className="text-gray-400 hover:text-gray-600"><Printer size={15} /></button>
                      <button onClick={() => navigate('/invoice', { state: { bookingId: b._id } })} title="Invoice"
                        className="text-green-500 hover:text-green-700"><FileText size={15} /></button>
                      <button onClick={() => handleDelete(b._id)} title="Delete"
                        disabled={b.status === 'checked_out'}
                        className={`transition-colors ${b.status === 'checked_out' ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:text-red-700'}`}><Trash2 size={15} /></button>
                    </div>
                    {b.status === 'booked' && (
                      <button onClick={() => handleStatusChange(b._id, 'checked_in')}
                        className="text-xs px-3 py-0.5 rounded font-medium text-white w-full text-center bg-green-600 hover:bg-green-700 transition-colors">
                        Check In
                      </button>
                    )}
                    {b.status === 'checked_in' && (
                      <button onClick={() => handleStatusChange(b._id, 'checked_out')}
                        className="text-xs px-3 py-0.5 rounded font-medium text-white w-full text-center bg-blue-600 hover:bg-blue-700 transition-colors">
                        Check Out
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination — only when more than 1 page */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
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
  );
}
