import { useState, useEffect } from 'react';
import { X, User, DoorOpen, Calendar, IndianRupee, CreditCard, Receipt } from 'lucide-react';
import { updateBooking } from '../api/bookings';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function CheckoutModal({ booking, onClose, onSuccess }) {
  const navigate = useNavigate();
  const [paymentMode, setPaymentMode] = useState(booking.paymentMode || 'cash');
  const [finalPayment, setFinalPayment] = useState(0);
  const [paymentNote, setPaymentNote] = useState('');
  const [loading, setLoading] = useState(false);

  const rooms = booking.rooms?.length > 0 ? booking.rooms : (booking.room ? [booking.room] : []);
  const days = Math.max(1, Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24)));
  const totalAdvance = booking.advancePayments?.filter(ap => !ap.isFinalPayment).reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  const balanceDue = Math.max(0, booking.totalAmount - totalAdvance);

  useEffect(() => {
    setFinalPayment(balanceDue);
  }, [balanceDue]);

  const handleCheckout = async () => {
    if (finalPayment > 0 && finalPayment > balanceDue) {
      toast.error('Final payment cannot exceed balance due');
      return;
    }

    setLoading(true);
    try {
      // Don't add final payment to advancePayments array
      // Just keep existing advance payments and update payment status
      const newTotalPaid = totalAdvance + finalPayment;
      const newPaymentStatus = newTotalPaid >= booking.totalAmount ? 'paid' : 'partial';

      await updateBooking(booking._id, {
        status: 'checked_out',
        paymentStatus: newPaymentStatus,
        paymentMode,
      });

      toast.success('Checkout completed successfully');
      onSuccess();
      onClose();
      
      // Navigate to invoice page for printing
      navigate('/invoice', { state: { bookingId: booking._id } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#C9A84C] text-white px-6 py-4 flex items-center justify-between rounded-t-lg flex-shrink-0">
          <h2 className="text-xl font-bold">Checkout - {booking.grcNumber}</h2>
          <button onClick={onClose} className="hover:bg-[#a8893a] p-1 rounded transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Guest Information */}
          <div className="border-2 border-[#E8D5A0] rounded-lg p-4 bg-[#FFFEF9]">
            <div className="flex items-center gap-2 mb-3">
              <User size={18} className="text-[#9C7C38]" />
              <h3 className="font-bold text-[#3d2e10]">Guest Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="font-semibold text-[#3d2e10]">{booking.guest?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="font-semibold text-[#3d2e10]">{booking.guest?.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-semibold text-[#3d2e10]">{booking.guest?.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">ID Type</p>
                <p className="font-semibold text-[#3d2e10]">{booking.guest?.idType || '—'}</p>
              </div>
            </div>
          </div>

          {/* Room & Stay Information */}
          <div className="border-2 border-[#E8D5A0] rounded-lg p-4 bg-[#FFFEF9]">
            <div className="flex items-center gap-2 mb-3">
              <DoorOpen size={18} className="text-[#9C7C38]" />
              <h3 className="font-bold text-[#3d2e10]">Room & Stay Information</h3>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-500">Rooms:</span>
                {rooms.map((room) => (
                  <span key={room._id} className="bg-[#C9A84C] text-white px-2 py-1 rounded text-xs font-semibold">
                    Room {room.roomNumber}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Check-In</p>
                  <p className="font-semibold text-[#3d2e10]">{new Date(booking.checkIn).toLocaleDateString('en-GB')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Check-Out</p>
                  <p className="font-semibold text-[#3d2e10]">{new Date(booking.checkOut).toLocaleDateString('en-GB')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Nights</p>
                  <p className="font-semibold text-[#3d2e10]">{days} night{days > 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Adults</p>
                  <p className="font-semibold text-[#3d2e10]">{booking.adults || 1}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Children</p>
                  <p className="font-semibold text-[#3d2e10]">{booking.children || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="border-2 border-[#E8D5A0] rounded-lg p-4 bg-[#FFFEF9]">
            <div className="flex items-center gap-2 mb-3">
              <IndianRupee size={18} className="text-[#9C7C38]" />
              <h3 className="font-bold text-[#3d2e10]">Payment Summary</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between pb-2 border-b border-[#E8D5A0]">
                <span className="text-gray-600">Taxable Amount</span>
                <span className="font-semibold text-[#3d2e10]">₹{booking.taxableAmount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-[#E8D5A0]">
                <span className="text-gray-600">CGST ({booking.cgstRate}%)</span>
                <span className="font-semibold text-[#3d2e10]">₹{((booking.taxableAmount * booking.cgstRate) / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-[#E8D5A0]">
                <span className="text-gray-600">SGST ({booking.sgstRate}%)</span>
                <span className="font-semibold text-[#3d2e10]">₹{((booking.taxableAmount * booking.sgstRate) / 100).toFixed(2)}</span>
              </div>
              {booking.discount > 0 && (
                <div className="flex justify-between pb-2 border-b border-[#E8D5A0]">
                  <span className="text-gray-600">Discount</span>
                  <span className="font-semibold text-green-600">-₹{booking.discount?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 text-base">
                <span className="font-bold text-[#3d2e10]">Total Amount</span>
                <span className="font-bold text-[#9C7C38] text-lg">₹{booking.totalAmount?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Advance Payments */}
          {booking.advancePayments?.filter(ap => !ap.isFinalPayment).length > 0 && (
            <div className="border-2 border-[#E8D5A0] rounded-lg p-4 bg-[#FFFEF9]">
              <div className="flex items-center gap-2 mb-3">
                <Receipt size={18} className="text-[#9C7C38]" />
                <h3 className="font-bold text-[#3d2e10]">Advance Payments</h3>
              </div>
              <div className="space-y-2">
                {booking.advancePayments.filter(ap => !ap.isFinalPayment).map((payment, idx) => (
                  <div key={idx} className="flex justify-between text-sm border-b border-[#E8D5A0] pb-2">
                    <div>
                      <p className="font-semibold text-[#3d2e10]">Payment #{idx + 1}</p>
                      <p className="text-xs text-gray-500">{new Date(payment.date).toLocaleDateString('en-GB')} • {payment.method?.toUpperCase()}</p>
                    </div>
                    <p className="font-bold text-[#9C7C38]">₹{payment.amount?.toFixed(2)}</p>
                  </div>
                ))}
                <div className="flex justify-between pt-2 font-bold text-[#3d2e10]">
                  <span>Total Advance Paid</span>
                  <span className="text-[#9C7C38]">₹{booking.advancePayments.filter(ap => !ap.isFinalPayment).reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Balance Due */}
          <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
            <div className="flex justify-between items-center">
              <span className="font-bold text-red-800 text-lg">Balance Due</span>
              <span className="font-bold text-red-600 text-2xl">₹{balanceDue.toFixed(2)}</span>
            </div>
          </div>

          {/* Final Payment Section */}
          {balanceDue > 0 && (
            <div className="border-2 border-[#E8D5A0] rounded-lg p-4 bg-[#FFFEF9]">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard size={18} className="text-[#9C7C38]" />
                <h3 className="font-bold text-[#3d2e10]">Final Payment</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-[#3d2e10] mb-1">Payment Amount</label>
                  <input
                    type="number"
                    value={finalPayment}
                    onChange={(e) => setFinalPayment(Number(e.target.value))}
                    className="w-full px-3 py-2 border-2 border-[#E8D5A0] rounded-lg outline-none focus:border-[#C9A84C]"
                    placeholder="Enter amount"
                    min="0"
                    max={balanceDue}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3d2e10] mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#E8D5A0] rounded-lg outline-none focus:border-[#C9A84C]"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3d2e10] mb-1">Payment Note (Optional)</label>
                  <textarea
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#E8D5A0] rounded-lg outline-none focus:border-[#C9A84C] resize-none"
                    rows="2"
                    placeholder="Add any notes about this payment"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Complete Checkout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
