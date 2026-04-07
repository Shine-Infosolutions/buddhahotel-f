import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBooking, sendBookingConfirmation } from '../../api/bookings';
import { ArrowLeft, User, Calendar, DoorOpen, CreditCard, FileText, Bed, IndianRupee, Clock, MapPin, Target, MessageSquare, Receipt, UserPlus, Users, Mail } from 'lucide-react';
import { getInvoiceByBooking } from '../../api/billing';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import AddGuestModal from '../../components/AddGuestModal';
import InvoiceTemplate from './InvoiceTemplate';

export default function BookingDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const invoiceRef = useRef();

  const handleSendConfirmation = async () => {
    if (!booking.guest?.email) return toast.error('Guest has no email address');
    setSending(true);
    try {
      const invRes = await getInvoiceByBooking(id);
      setInvoiceData(invRes.data);

      // Wait for the hidden invoice to render
      await new Promise(r => setTimeout(r, 500));

      const element = invoiceRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      // If content is taller than one page, add multiple pages
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

      await sendBookingConfirmation(id, pdfBase64);
      toast.success('Confirmation email sent with invoice!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send email');
    } finally {
      setSending(false);
      setInvoiceData(null);
    }
  };

  const loadBooking = () => {
    getBooking(id)
      .then((res) => setBooking(res.data))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load booking'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBooking();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading booking details...</div>;
  if (!booking) return <div className="min-h-screen flex items-center justify-center text-red-500">Booking not found</div>;

  const statusColors = {
    booked: 'bg-blue-100 text-blue-800 border-blue-300',
    checked_in: 'bg-green-100 text-green-800 border-green-300',
    checked_out: 'bg-gray-100 text-gray-800 border-gray-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
  };

  const paymentColors = {
    pending: 'bg-red-100 text-red-800 border-red-300',
    partial: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    paid: 'bg-green-100 text-green-800 border-green-300',
  };

  const rooms = booking.rooms?.length > 0 ? booking.rooms : (booking.room ? [booking.room] : []);
  const days = Math.max(1, Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24)));

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/bookings')} className="p-2 rounded-lg hover:bg-[#FDF6E3] transition-colors">
            <ArrowLeft size={20} className="text-[#9C7C38]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#3d2e10]">Booking Details</h1>
            <p className="text-sm text-gray-500 mt-1">Complete information about this booking</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSendConfirmation} disabled={sending} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors flex items-center gap-2 disabled:opacity-50">
            <Mail size={16} />
            {sending ? 'Sending...' : 'Send Confirmation'}
          </button>
          <button onClick={() => setShowAddGuestModal(true)} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors flex items-center gap-2">
            <UserPlus size={16} />
            Add Guest
          </button>
          <button onClick={() => navigate(`/bookings/edit/${id}`)} className="px-4 py-2 rounded-lg bg-[#C9A84C] hover:bg-[#a8893a] text-white font-medium transition-colors">
            Edit Booking
          </button>
          <button onClick={() => navigate('/invoice', { state: { bookingId: id } })} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors">
            View Invoice
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border-2 border-[#E8D5A0] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-[#FDF6E3]">
              <FileText size={24} className="text-[#9C7C38]" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">GRC Number</p>
              <p className="text-lg font-bold text-[#3d2e10]">{booking.grcNumber || '—'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border-2 border-[#E8D5A0] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-[#FDF6E3]">
              <Receipt size={24} className="text-[#9C7C38]" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Invoice Number</p>
              <p className="text-lg font-bold text-[#3d2e10]">{booking.invoiceNumber || '—'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border-2 border-[#E8D5A0] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-lg border-2 font-semibold text-sm ${statusColors[booking.status]}`}>
              {booking.status?.toUpperCase().replace('_', ' ')}
            </div>
          </div>
        </div>
        <div className="bg-white border-2 border-[#E8D5A0] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-lg border-2 font-semibold text-sm ${paymentColors[booking.paymentStatus]}`}>
              {booking.paymentStatus?.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guest Information */}
          <div className="bg-white border-2 border-[#E8D5A0] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User size={20} className="text-[#9C7C38]" />
                <h2 className="text-lg font-bold text-[#3d2e10]">Primary Guest Information</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Full Name</p>
                <p className="text-sm font-semibold text-[#3d2e10]">{booking.guest?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Phone Number</p>
                <p className="text-sm font-semibold text-[#3d2e10]">{booking.guest?.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Email</p>
                <p className="text-sm font-semibold text-[#3d2e10]">{booking.guest?.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">ID Type</p>
                <p className="text-sm font-semibold text-[#3d2e10]">{booking.guest?.idType || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">ID Number</p>
                <p className="text-sm font-semibold text-[#3d2e10]">{booking.guest?.idNumber || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Address</p>
                <p className="text-sm font-semibold text-[#3d2e10]">{booking.guest?.address || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">City</p>
                <p className="text-sm font-semibold text-[#3d2e10]">{booking.guest?.city || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">State</p>
                <p className="text-sm font-semibold text-[#3d2e10]">{booking.guest?.state || '—'}</p>
              </div>
            </div>
          </div>

          {/* Additional Guests */}
          {booking.additionalGuests?.length > 0 && (
            <div className="bg-white border-2 border-[#E8D5A0] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users size={20} className="text-[#9C7C38]" />
                  <h2 className="text-lg font-bold text-[#3d2e10]">Additional Guests ({booking.additionalGuests.length})</h2>
                </div>
              </div>
              <div className="space-y-4">
                {booking.additionalGuests.map((guest, idx) => (
                  <div key={guest._id} className="border border-[#E8D5A0] rounded-lg p-4 bg-[#FFFEF9]">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-[#3d2e10]">Guest #{idx + 1}: {guest.name}</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="font-semibold text-[#3d2e10]">{guest.phone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="font-semibold text-[#3d2e10]">{guest.email || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">ID Type</p>
                        <p className="font-semibold text-[#3d2e10]">{guest.idType || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">ID Number</p>
                        <p className="font-semibold text-[#3d2e10]">{guest.idNumber || '—'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Room Information */}
          <div className="bg-white border-2 border-[#E8D5A0] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <DoorOpen size={20} className="text-[#9C7C38]" />
              <h2 className="text-lg font-bold text-[#3d2e10]">Room Information</h2>
            </div>
            <div className="space-y-4">
              {rooms.map((room, idx) => {
                const customPrice = booking.customPrices?.find(cp => cp.room.toString() === room._id.toString());
                const roomDiscount = booking.roomDiscounts?.find(rd => rd.room.toString() === room._id.toString());
                const extraBed = booking.extraBeds?.find(eb => eb.room.toString() === room._id.toString());
                
                return (
                  <div key={room._id} className="border border-[#E8D5A0] rounded-lg p-4 bg-[#FFFEF9]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-[#C9A84C] text-white px-3 py-1 rounded-lg font-bold">
                          Room {room.roomNumber}
                        </div>
                        <div className="text-sm font-semibold text-[#3d2e10] uppercase">
                          {room.category?.name || '—'}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Price per night</p>
                        <p className="text-lg font-bold text-[#9C7C38]">
                          ₹{customPrice ? customPrice.price : room.price}
                          {customPrice && <span className="text-xs text-gray-500 ml-1">(Custom)</span>}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Floor</p>
                        <p className="font-semibold text-[#3d2e10]">{room.floor || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Capacity</p>
                        <p className="font-semibold text-[#3d2e10]">{room.capacity || '—'} persons</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Original Price</p>
                        <p className="font-semibold text-[#3d2e10]">₹{room.price}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Total ({days} nights)</p>
                        <p className="font-semibold text-[#3d2e10]">₹{(customPrice ? customPrice.price : room.price) * days}</p>
                      </div>
                    </div>

                    {roomDiscount && (
                      <div className="mt-3 pt-3 border-t border-[#E8D5A0]">
                        <p className="text-xs text-gray-500 mb-1">Room Discount</p>
                        <p className="text-sm font-semibold text-green-600">
                          {roomDiscount.discountType === 'percentage' 
                            ? `${roomDiscount.discountValue}% off` 
                            : `₹${roomDiscount.discountValue} off`}
                        </p>
                      </div>
                    )}

                    {extraBed && (
                      <div className="mt-3 pt-3 border-t border-[#E8D5A0]">
                        <div className="flex items-center gap-2 mb-2">
                          <Bed size={16} className="text-[#9C7C38]" />
                          <p className="text-xs font-semibold text-[#3d2e10] uppercase">Extra Bed</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-500">Charge/Day</p>
                            <p className="font-semibold text-[#3d2e10]">₹{extraBed.chargePerDay || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">From</p>
                            <p className="font-semibold text-[#3d2e10]">{extraBed.from ? new Date(extraBed.from).toLocaleDateString('en-GB') : '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">To</p>
                            <p className="font-semibold text-[#3d2e10]">{extraBed.to ? new Date(extraBed.to).toLocaleDateString('en-GB') : '—'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Booking Details */}
          <div className="bg-white border-2 border-[#E8D5A0] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={20} className="text-[#9C7C38]" />
              <h2 className="text-lg font-bold text-[#3d2e10]">Booking Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Check-In Date</p>
                <p className="text-sm font-semibold text-[#3d2e10]">{new Date(booking.checkIn).toLocaleDateString('en-GB')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Check-In Time</p>
                <p className="text-sm font-semibold text-[#3d2e10]">{booking.checkInTime || '12:00'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Check-Out Date</p>
                <p className="text-sm font-semibold text-[#3d2e10]">{new Date(booking.checkOut).toLocaleDateString('en-GB')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Check-Out Time</p>
                <p className="text-sm font-semibold text-[#3d2e10]">{booking.checkOutTime || '12:00'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Number of Nights</p>
                <p className="text-sm font-semibold text-[#3d2e10]">{days} night{days > 1 ? 's' : ''}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Number of Rooms</p>
                <p className="text-sm font-semibold text-[#3d2e10]">{rooms.length} room{rooms.length > 1 ? 's' : ''}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Adults</p>
                <p className="text-sm font-semibold text-[#3d2e10]">{booking.adults || 1}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Children</p>
                <p className="text-sm font-semibold text-[#3d2e10]">{booking.children || 0}</p>
              </div>
              {booking.arrivalFrom && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1 flex items-center gap-1">
                    <MapPin size={12} /> Arrival From
                  </p>
                  <p className="text-sm font-semibold text-[#3d2e10]">{booking.arrivalFrom}</p>
                </div>
              )}
              {booking.purposeOfVisit && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1 flex items-center gap-1">
                    <Target size={12} /> Purpose of Visit
                  </p>
                  <p className="text-sm font-semibold text-[#3d2e10]">{booking.purposeOfVisit}</p>
                </div>
              )}
              {booking.vehicleNumber && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Vehicle Number</p>
                  <p className="text-sm font-semibold text-[#3d2e10]">{booking.vehicleNumber}</p>
                </div>
              )}
              {booking.vehicleType && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Vehicle Type</p>
                  <p className="text-sm font-semibold text-[#3d2e10] capitalize">{booking.vehicleType}</p>
                </div>
              )}
            </div>
            {booking.remarks && (
              <div className="mt-4 pt-4 border-t border-[#E8D5A0]">
                <p className="text-xs text-gray-500 uppercase mb-1 flex items-center gap-1">
                  <MessageSquare size={12} /> Remarks
                </p>
                <p className="text-sm text-[#3d2e10]">{booking.remarks}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-white border-2 border-[#E8D5A0] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <IndianRupee size={20} className="text-[#9C7C38]" />
              <h2 className="text-lg font-bold text-[#3d2e10]">Payment Summary</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-[#E8D5A0]">
                <span className="text-sm text-gray-600">Taxable Amount</span>
                <span className="text-sm font-semibold text-[#3d2e10]">₹{booking.taxableAmount?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#E8D5A0]">
                <span className="text-sm text-gray-600">CGST ({booking.cgstRate}%)</span>
                <span className="text-sm font-semibold text-[#3d2e10]">₹{((booking.taxableAmount * booking.cgstRate) / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#E8D5A0]">
                <span className="text-sm text-gray-600">SGST ({booking.sgstRate}%)</span>
                <span className="text-sm font-semibold text-[#3d2e10]">₹{((booking.taxableAmount * booking.sgstRate) / 100).toFixed(2)}</span>
              </div>
              {booking.discount > 0 && (
                <div className="flex justify-between items-center pb-2 border-b border-[#E8D5A0]">
                  <span className="text-sm text-gray-600">Discount</span>
                  <span className="text-sm font-semibold text-green-600">-₹{booking.discount?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2">
                <span className="text-base font-bold text-[#3d2e10]">Total Amount</span>
                <span className="text-xl font-bold text-[#9C7C38]">₹{booking.totalAmount?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-white border-2 border-[#E8D5A0] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={20} className="text-[#9C7C38]" />
              <h2 className="text-lg font-bold text-[#3d2e10]">Payment Information</h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Payment Mode</p>
                <p className="text-sm font-semibold text-[#3d2e10] uppercase">{booking.paymentMode || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Payment Status</p>
                <div className={`inline-block px-3 py-1 rounded-lg border font-semibold text-xs ${paymentColors[booking.paymentStatus]}`}>
                  {booking.paymentStatus?.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Advance Payments */}
          {booking.advancePayments?.filter(ap => !ap.isFinalPayment).length > 0 && (
            <div className="bg-white border-2 border-[#E8D5A0] rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Receipt size={20} className="text-[#9C7C38]" />
                <h2 className="text-lg font-bold text-[#3d2e10]">Advance Payments</h2>
              </div>
              <div className="space-y-3">
                {booking.advancePayments.filter(ap => !ap.isFinalPayment).map((payment, idx) => (
                  <div key={idx} className="border border-[#E8D5A0] rounded-lg p-3 bg-[#FFFEF9]">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-[#9C7C38]">Payment #{idx + 1}</span>
                      <span className="text-sm font-bold text-[#3d2e10]">₹{payment.amount}</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Method:</span>
                        <span className="font-semibold text-[#3d2e10] uppercase">{payment.method || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date:</span>
                        <span className="font-semibold text-[#3d2e10]">{new Date(payment.date).toLocaleDateString('en-GB')}</span>
                      </div>
                      {payment.note && (
                        <div className="mt-2 pt-2 border-t border-[#E8D5A0]">
                          <p className="text-gray-500">Note:</p>
                          <p className="text-[#3d2e10] mt-1">{payment.note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t-2 border-[#E8D5A0]">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-[#3d2e10]">Total Advance</span>
                    <span className="text-lg font-bold text-[#9C7C38]">
                      ₹{booking.advancePayments.filter(ap => !ap.isFinalPayment).reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-bold text-[#3d2e10]">Balance Due</span>
                    <span className="text-lg font-bold text-red-600">
                      ₹{Math.max(0, booking.totalAmount - booking.advancePayments.filter(ap => !ap.isFinalPayment).reduce((sum, p) => sum + (p.amount || 0), 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Billing Instruction */}
          {booking.billingInstruction && (
            <div className="bg-white border-2 border-[#E8D5A0] rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare size={20} className="text-[#9C7C38]" />
                <h2 className="text-lg font-bold text-[#3d2e10]">Billing Instruction</h2>
              </div>
              <p className="text-sm text-[#3d2e10]">{booking.billingInstruction}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-white border-2 border-[#E8D5A0] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={20} className="text-[#9C7C38]" />
              <h2 className="text-lg font-bold text-[#3d2e10]">Timestamps</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created At:</span>
                <span className="font-semibold text-[#3d2e10]">{new Date(booking.createdAt).toLocaleString('en-GB')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Updated:</span>
                <span className="font-semibold text-[#3d2e10]">{new Date(booking.updatedAt).toLocaleString('en-GB')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddGuestModal && (
        <AddGuestModal 
          bookingId={id} 
          onClose={() => setShowAddGuestModal(false)} 
          onSuccess={loadBooking} 
        />
      )}

      {/* Hidden invoice for PDF capture */}
      {invoiceData && (
        <div ref={invoiceRef} style={{ position: 'absolute', left: '-9999px', top: 0, width: '750px', background: 'white' }}>
          <InvoiceTemplate inv={invoiceData} booking={booking} />
        </div>
      )}
    </div>
  );
}
