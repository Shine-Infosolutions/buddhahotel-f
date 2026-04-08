import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBookings, deleteBooking, updateBooking, sendBookingConfirmation } from '../../api/bookings';
import { getInvoiceByBooking } from '../../api/billing';
import toast from 'react-hot-toast';
import { Eye, Pencil, Printer, FileText, Trash2, RefreshCw, Search, Mail, Loader2, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import InvoiceTemplate from './InvoiceTemplate';
import CheckoutModal from '../../components/CheckoutModal';

const STATUS_OPTIONS = ['booked', 'checked_in', 'checked_out', 'cancelled'];
const PAYMENT_OPTIONS = ['pending', 'partial', 'paid'];
const statusLabel = { booked: 'Booked', checked_in: 'Checked In', checked_out: 'Checked Out', cancelled: 'Cancelled' };

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [invoiceCapture, setInvoiceCapture] = useState({ data: null, booking: null });
  const [mailStatus, setMailStatus] = useState({});
  const invoiceRef = useRef();
  const [checkoutBooking, setCheckoutBooking] = useState(null);
  const perPage = 10;
  const navigate = useNavigate();

  const load = () => getBookings().then((r) => { setBookings(r.data); setFiltered(r.data); setPage(1); });
  useEffect(() => { load(); }, []);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
    const q = val.toLowerCase();
    setFiltered(bookings.filter((b) => {
      const roomNumbers = b.rooms?.length > 0 
        ? b.rooms.map(r => r.roomNumber).join(', ')
        : b.room?.roomNumber?.toString() || '';
      return b.guest?.name?.toLowerCase().includes(q) ||
        roomNumbers.includes(q) ||
        b.grcNumber?.toLowerCase().includes(q);
    }));
  };

  const handleExtraBedOnly = () => {
    setPage(1);
    setSearch('');
    setFiltered(bookings.filter((b) => b.extraBeds?.length > 0));
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

  const handleSendConfirmation = async (b) => {
    if (!b.guest?.email) return toast.error('Guest has no email address');
    setMailStatus(s => ({ ...s, [b._id]: 'loading' }));
    try {
      const invRes = await getInvoiceByBooking(b._id);
      setInvoiceCapture({ data: invRes.data, booking: b });
      await new Promise(r => setTimeout(r, 500));
      const element = invoiceRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, useCORS: true,
        width: element.scrollWidth, height: element.scrollHeight,
        windowWidth: element.scrollWidth, windowHeight: element.scrollHeight,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      if (pdfHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      } else {
        let yOffset = 0;
        while (yOffset < pdfHeight) {
          pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfWidth, pdfHeight);
          yOffset += pageHeight;
          if (yOffset < pdfHeight) pdf.addPage();
        }
      }
      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      await sendBookingConfirmation(b._id, pdfBase64);
      toast.success('Confirmation email sent with invoice!');
      setMailStatus(s => ({ ...s, [b._id]: 'success' }));
      setTimeout(() => setMailStatus(s => ({ ...s, [b._id]: 'idle' })), 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send email');
      setMailStatus(s => ({ ...s, [b._id]: 'idle' }));
    } finally {
      setInvoiceCapture({ data: null, booking: null });
    }
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
        <h2 className="text-xl md:text-2xl font-bold text-[#3d2e10]">Bookings</h2>
        <button onClick={() => navigate('/bookings/add')} className={btnCls}>
          Add Booking
        </button>
      </div>

      {/* Search + Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-[#E8D5A0] rounded-md px-3 py-2 shadow-sm">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input
            className="flex-1 text-sm outline-none bg-transparent text-[#3d2e10] placeholder-gray-400"
            placeholder="Search by name, room number, or GRC No..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => handleSearch(search)} className={btnCls}>Search GRC</button>
          <button onClick={handleExtraBedOnly} className={btnCls}>Extra Bed Only</button>
          <button onClick={load}
            className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-semibold bg-[#3b82f6] hover:bg-[#2563eb] text-white transition-colors">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {paginated.length === 0 ? (
          <p className="text-center py-10 text-gray-400 text-sm">No bookings found</p>
        ) : paginated.map((b) => (
          <div key={b._id} className="bg-white border border-[#E8D5A0] rounded-xl shadow-sm p-4 space-y-3">
            {/* Top row */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-[#3d2e10] text-sm">{b.guest?.name || '—'}</p>
                <p className="text-xs text-[#9C7C38] mt-0.5">GRC: {b.grcNumber || '—'} · INV: {b.invoiceNumber || '—'}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => navigate(`/bookings/${b._id}`)} className="text-purple-500"><Eye size={16} /></button>
                <button onClick={() => navigate(`/bookings/edit/${b._id}`)} className="text-blue-500"><Pencil size={16} /></button>
                <button onClick={() => navigate('/invoice', { state: { bookingId: b._id } })} className="text-green-500"><FileText size={16} /></button>
                <button onClick={() => handleDelete(b._id)} disabled={b.status === 'checked_out'}
                  className={b.status === 'checked_out' ? 'text-gray-300' : 'text-red-500'}><Trash2 size={16} /></button>
                <button onClick={() => mailStatus[b._id] !== 'loading' && mailStatus[b._id] !== 'success' && handleSendConfirmation(b)}
                  className={mailStatus[b._id] === 'loading' ? 'text-yellow-500' : mailStatus[b._id] === 'success' ? 'text-green-500' : 'text-purple-500'}>
                  {mailStatus[b._id] === 'loading' ? <Loader2 size={16} className="animate-spin" /> : mailStatus[b._id] === 'success' ? <CheckCircle size={16} /> : <Mail size={16} />}
                </button>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[#3d2e10]">
              <div><span className="text-gray-400">Room: </span>
                {b.rooms?.length > 0 ? b.rooms.map(r => r.roomNumber).join(', ') : b.room?.roomNumber || '—'}
              </div>
              <div><span className="text-gray-400">Category: </span>
                {b.rooms?.length > 0 ? [...new Set(b.rooms.map(r => r.category?.name).filter(Boolean))].join(', ') : b.room?.category?.name || '—'}
              </div>
              <div><span className="text-gray-400">Check In: </span>{b.checkIn?.slice(0, 10)}</div>
              <div><span className="text-gray-400">Check Out: </span>{b.checkOut?.slice(0, 10)}</div>
              <div><span className="text-gray-400">Extra Bed: </span>{b.extraBeds?.length > 0 ? <span className="text-green-600 font-medium">✓ Yes</span> : 'No'}</div>
            </div>

            {/* Dropdowns + action buttons */}
            <div className="flex flex-wrap gap-2 items-center">
              <select value={b.status} onChange={(e) => handleStatusChange(b._id, e.target.value)}
                disabled={b.status === 'checked_out' || b.status === 'cancelled'}
                className="text-xs px-2 py-1 rounded outline-none bg-white flex-1"
                style={{ border: '1px solid #C9A84C', color: '#9C7C38', opacity: (b.status === 'checked_out' || b.status === 'cancelled') ? 0.6 : 1 }}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
              </select>
              <select value={b.paymentStatus} onChange={(e) => handlePaymentChange(b._id, e.target.value)}
                className="text-xs px-2 py-1 rounded outline-none cursor-pointer bg-white text-[#3d2e10] flex-1"
                style={{ border: '1px solid #C9A84C' }}>
                {PAYMENT_OPTIONS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
              {b.status === 'booked' && (
                <button onClick={() => handleStatusChange(b._id, 'checked_in')}
                  className="text-xs px-3 py-1 rounded font-medium text-white bg-green-600 hover:bg-green-700 transition-colors">
                  Check In
                </button>
              )}
              {b.status === 'checked_in' && (
                <button onClick={() => setCheckoutBooking(b)}
                  className="text-xs px-3 py-1 rounded font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                  Check Out
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white border border-[#E8D5A0] rounded-lg overflow-hidden shadow-sm">
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
                  <td className="px-3 py-3 text-sm text-[#3d2e10]">
                    {b.rooms?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {b.rooms.map((room) => (
                          <span key={room._id} className="inline-block bg-[#FDF6E3] border border-[#E8D5A0] text-[#9C7C38] px-2 py-0.5 rounded text-xs font-medium">
                            {room.roomNumber}
                          </span>
                        ))}
                      </div>
                    ) : (
                      b.room?.roomNumber || '—'
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-[#3d2e10] uppercase">
                    {b.rooms?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(b.rooms.map(r => r.category?.name).filter(Boolean))].map((cat, idx) => (
                          <span key={idx}>{cat}</span>
                        ))}
                      </div>
                    ) : (
                      b.room?.category?.name || '—'
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-[#3d2e10]">
                    {b.extraBeds?.length > 0 ? <span className="text-green-600 font-medium">✓ Yes</span> : '-'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-[#3d2e10]">{b.checkIn?.slice(0, 10)}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-[#3d2e10]">{b.checkOut?.slice(0, 10)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <select value={b.status} onChange={(e) => handleStatusChange(b._id, e.target.value)}
                      disabled={b.status === 'checked_out' || b.status === 'cancelled'}
                      className="text-xs px-2 py-1 rounded outline-none bg-white"
                      style={{ border: '1px solid #C9A84C', color: '#9C7C38', minWidth: '105px', cursor: (b.status === 'checked_out' || b.status === 'cancelled') ? 'not-allowed' : 'pointer', opacity: (b.status === 'checked_out' || b.status === 'cancelled') ? 0.6 : 1 }}>
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <select value={b.paymentStatus} onChange={(e) => handlePaymentChange(b._id, e.target.value)}
                      className="text-xs px-2 py-1 rounded outline-none cursor-pointer bg-white text-[#3d2e10]"
                      style={{ border: '1px solid #C9A84C', minWidth: '65px' }}>
                      {PAYMENT_OPTIONS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2 mb-1">
                      <button onClick={() => navigate(`/bookings/${b._id}`)} title="View" className="text-purple-500 hover:text-purple-700"><Eye size={15} /></button>
                      <button onClick={() => navigate(`/bookings/edit/${b._id}`)} title="Edit" className="text-blue-500 hover:text-blue-700"><Pencil size={15} /></button>
                      <button title="Print" className="text-gray-400 hover:text-gray-600"><Printer size={15} /></button>
                      <button onClick={() => navigate('/invoice', { state: { bookingId: b._id } })} title="Invoice" className="text-green-500 hover:text-green-700"><FileText size={15} /></button>
                      <button onClick={() => handleDelete(b._id)} title="Delete" disabled={b.status === 'checked_out'}
                        className={`transition-colors ${b.status === 'checked_out' ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:text-red-700'}`}><Trash2 size={15} /></button>
                      <button onClick={() => mailStatus[b._id] !== 'loading' && mailStatus[b._id] !== 'success' && handleSendConfirmation(b)}
                        title="Send Confirmation Email"
                        className={`transition-colors ${mailStatus[b._id] === 'loading' ? 'text-yellow-500 cursor-wait' : mailStatus[b._id] === 'success' ? 'text-green-500 cursor-default' : 'text-purple-500 hover:text-purple-700'}`}>
                        {mailStatus[b._id] === 'loading' ? <Loader2 size={15} className="animate-spin" /> : mailStatus[b._id] === 'success' ? <CheckCircle size={15} /> : <Mail size={15} />}
                      </button>
                    </div>
                    {b.status === 'booked' && (
                      <button onClick={() => handleStatusChange(b._id, 'checked_in')}
                        className="text-xs px-3 py-0.5 rounded font-medium text-white w-full text-center bg-green-600 hover:bg-green-700 transition-colors">
                        Check In
                      </button>
                    )}
                    {b.status === 'checked_in' && (
                      <button onClick={() => setCheckoutBooking(b)}
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

      {/* Hidden invoice for PDF capture */}
      {invoiceCapture.data && (
        <div ref={invoiceRef} style={{ position: 'absolute', left: '-9999px', top: 0, width: '750px', background: 'white' }}>
          <InvoiceTemplate inv={invoiceCapture.data} booking={invoiceCapture.booking} />
        </div>
      )}
      {checkoutBooking && (
        <CheckoutModal 
          booking={checkoutBooking} 
          onClose={() => setCheckoutBooking(null)} 
          onSuccess={load} 
        />
      )}
    </div>
  );
}
