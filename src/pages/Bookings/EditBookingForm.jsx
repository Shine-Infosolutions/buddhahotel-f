import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBooking, updateBooking, checkAvailability } from '../../api/bookings';
import { updateGuest } from '../../api/guests';
import { BedDouble, User, Info, CreditCard, Search, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const sectionTitle = (icon, title) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="bg-[#FDF6E3] text-[#9C7C38] p-2 rounded-full">{icon}</div>
    <h3 className="text-lg font-semibold text-[#3d2e10]">{title}</h3>
  </div>
);

export default function EditBookingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [guest, setGuest] = useState(null);
  const [booking, setBooking] = useState(null);
  const [checking, setChecking] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showCompany, setShowCompany] = useState(false);
  const [advancePayments, setAdvancePayments] = useState([]);
  const [loading, setLoading] = useState(false);
  // extraBed for the single room: { enabled, chargePerDay, from, to }
  const [extraBed, setExtraBed] = useState({ enabled: false, chargePerDay: '', from: '', to: '' });

  const loadBookingData = () => {
    getBooking(id).then((r) => {
      const b = r.data;
      setGuest(b.guest);
      setShowCompany(!!b.guest?.companyDetails);
      setAdvancePayments(b.advancePayments || []);
      if (b.room) setSelectedRoom(b.room);
      // Load existing extra bed
      const eb = b.extraBeds?.[0];
      if (eb) setExtraBed({ enabled: true, chargePerDay: eb.chargePerDay || '', from: eb.from?.slice(0, 10) || '', to: eb.to?.slice(0, 10) || '' });
      else setExtraBed({ enabled: false, chargePerDay: '', from: '', to: '' });
      setBooking({
        room: b.room?._id, checkIn: b.checkIn?.slice(0, 10), checkOut: b.checkOut?.slice(0, 10),
        checkInTime: b.checkInTime || '12:00', checkOutTime: b.checkOutTime || '12:00',
        numberOfRooms: b.numberOfRooms || 1, arrivalFrom: b.arrivalFrom || '',
        purposeOfVisit: b.purposeOfVisit || '',
        remarks: b.remarks || '', status: b.status, cgstRate: b.cgstRate ?? 2.5,
        sgstRate: b.sgstRate ?? 2.5, discount: b.discount || 0,
        paymentMode: b.paymentMode || '', paymentStatus: b.paymentStatus || 'pending',
        billingInstruction: b.billingInstruction || '',
      });
      setAvailabilityResult(null);
      setSelectedCategory(null);
      toast.success('Form reset to original values');
    }).catch(() => toast.error('Failed to reload booking data'));
  };

  useEffect(() => {
    loadBookingData();
  }, [id]);

  const handleCheckAvailability = async () => {
    if (!booking.checkIn || !booking.checkOut) return toast.error('Select check-in and check-out dates');
    if (new Date(booking.checkOut) <= new Date(booking.checkIn)) return toast.error('Check-out must be after check-in');
    setChecking(true);
    setAvailabilityResult(null);
    setSelectedCategory(null);
    try {
      const res = await checkAvailability({ checkIn: booking.checkIn, checkOut: booking.checkOut, excludeBookingId: id });
      setAvailabilityResult(res.data);
      if (res.data.total === 0) toast.error('No rooms available for selected dates');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check availability');
    } finally {
      setChecking(false);
    }
  };

  const days = booking?.checkIn && booking?.checkOut
    ? Math.max(1, Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24)))
    : 0;
  const roomCost = selectedRoom ? days * selectedRoom.price : 0;

  const extraBedCost = (() => {
    if (!extraBed.enabled || !extraBed.chargePerDay || !extraBed.from || !extraBed.to) return 0;
    const ebDays = Math.max(1, Math.ceil((new Date(extraBed.to) - new Date(extraBed.from)) / (1000 * 60 * 60 * 24)));
    return Number(extraBed.chargePerDay) * ebDays;
  })();

  const taxableAmount = roomCost + extraBedCost;
  const cgst = (taxableAmount * (booking?.cgstRate || 0)) / 100;
  const sgst = (taxableAmount * (booking?.sgstRate || 0)) / 100;
  const totalWithTax = taxableAmount + cgst + sgst - (booking?.discount || 0);

  const handlePinCode = async (pin) => {
    setGuest((g) => ({ ...g, pinCode: pin }));
    if (pin.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data[0]?.Status === 'Success') {
          const p = data[0].PostOffice[0];
          setGuest((g) => ({ ...g, city: p.District, state: p.State }));
        }
      } catch {}
    }
  };

  const addAdvancePayment = () => setAdvancePayments([...advancePayments, { amount: '', method: '', date: '', note: '' }]);
  const updateAdvancePayment = (i, field, value) => {
    const updated = [...advancePayments];
    updated[i][field] = value;
    setAdvancePayments(updated);
  };
  const removeAdvancePayment = (i) => setAdvancePayments(advancePayments.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { _id, __v, createdAt, updatedAt, ...guestData } = guest;
      await updateGuest(_id, guestData);
      const extraBeds = extraBed.enabled && extraBed.chargePerDay && extraBed.from && extraBed.to
        ? [{ room: booking.room, chargePerDay: Number(extraBed.chargePerDay), from: extraBed.from, to: extraBed.to }]
        : [];
      await updateBooking(id, { ...booking, guest: _id, taxableAmount, totalAmount: totalWithTax, advancePayments, extraBeds });
      toast.success('Booking updated');
      navigate('/bookings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  if (!booking || !guest) return <p className="text-[#8B7D3A] p-8">Loading...</p>;

  const inputCls = 'border border-[#C9A84C] rounded px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-[#A07830] focus:border-[#A07830] transition bg-white';
  const labelCls = 'text-sm text-[#5a4228] mb-1 block font-medium';
  const sectionCls = 'bg-[#FFFDF7] rounded-xl border border-[#E8D5A0] p-6 mb-5';
  const btnPrimary = 'bg-[#9C7C38] hover:bg-[#7A5F28] text-white px-5 py-2 rounded text-sm font-semibold disabled:opacity-50 transition-colors';
  const btnOutline = 'border border-[#C9A84C] text-[#9C7C38] hover:bg-[#FDF6E3] bg-white px-8 py-2.5 rounded text-sm font-semibold transition-colors';

  return (
    <div className="-mx-8 -mt-8">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 flex items-center gap-4 px-8 py-3 bg-white border-b-4 border-[#3d2e10] shadow-sm mb-6">
        <button type="button" onClick={() => navigate('/bookings')}
          className="flex items-center gap-1.5 border border-[#3d2e10] text-[#3d2e10] hover:bg-[#f5f0e8] px-3 py-1.5 rounded text-sm font-medium transition-colors">
          &#8592; Back
        </button>
        <h1 className="text-xl font-bold text-[#3d2e10]">Booking Form</h1>
      </div>
      <div className="max-w-5xl mx-auto px-8 pb-8">
      <form onSubmit={handleSubmit}>

        {/* Room & Availability */}
        <div className={sectionCls}>
          {sectionTitle(<BedDouble size={18} />, 'Room & Availability')}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelCls}>Check-in Date <span className="text-red-500">*</span></label>
              <input type="date" className={inputCls} value={booking.checkIn}
                onChange={(e) => { setBooking({ ...booking, checkIn: e.target.value }); setAvailabilityResult(null); setSelectedCategory(null); }} required />
            </div>
            <div>
              <label className={labelCls}>Check-out Date <span className="text-red-500">*</span></label>
              <input type="date" className={inputCls} value={booking.checkOut}
                onChange={(e) => { setBooking({ ...booking, checkOut: e.target.value }); setAvailabilityResult(null); setSelectedCategory(null); }} required />
            </div>
          </div>

          {/* Current room + extra bed */}
          {selectedRoom && (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-sm text-[#5a4228] mb-3">
                <span>Current Room:</span>
                <span className="bg-[#FDF6E3] border border-[#E8D5A0] text-[#5a4228] px-2 py-0.5 rounded-full">
                  Room {selectedRoom.roomNumber} · {selectedRoom.category?.name} · ₹{selectedRoom.price}/night
                </span>
              </div>
              {/* Extra bed for this room */}
              <div className="border border-[#E8D5A0] rounded-lg bg-white p-3">
                <label className="flex items-center gap-2 text-sm text-[#5a4228] cursor-pointer mb-2">
                  <input type="checkbox" checked={extraBed.enabled}
                    onChange={(e) => setExtraBed({ ...extraBed, enabled: e.target.checked })} />
                  Add Extra Bed for Room {selectedRoom.roomNumber}
                </label>
                {extraBed.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-5">
                    <div>
                      <label className={labelCls}>Charge/Day (₹)</label>
                      <input type="number" className={inputCls} placeholder="e.g. 500"
                        value={extraBed.chargePerDay}
                        onChange={(e) => setExtraBed({ ...extraBed, chargePerDay: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>From Date</label>
                      <input type="date" className={inputCls}
                        min={booking.checkIn} max={booking.checkOut}
                        value={extraBed.from}
                        onChange={(e) => setExtraBed({ ...extraBed, from: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>To Date</label>
                      <input type="date" className={inputCls}
                        min={extraBed.from || booking.checkIn} max={booking.checkOut}
                        value={extraBed.to}
                        onChange={(e) => setExtraBed({ ...extraBed, to: e.target.value })} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <button type="button" onClick={handleCheckAvailability} disabled={checking}
            className={`flex items-center gap-2 mb-5 ${btnPrimary}`}>
            <Search size={15} />
            {checking ? 'Checking...' : 'Check Availability'}
          </button>

          {availabilityResult && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-[#3d3416] mb-3">
                {availabilityResult.total > 0
                  ? `${availabilityResult.total} room(s) available — select a category:`
                  : 'No rooms available for these dates.'}
              </p>
              <div className="flex flex-wrap gap-3">
                {availabilityResult.grouped.map((cat) => (
                  <button key={cat.categoryId} type="button" onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      selectedCategory?.categoryId === cat.categoryId
                        ? 'bg-[#9C7C38] text-white border-[#9C7C38]'
                        : 'bg-white text-[#3d2e10] border-[#C9A84C] hover:border-[#9C7C38]'
                    }`}>
                    {cat.categoryName}
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                      selectedCategory?.categoryId === cat.categoryId ? 'bg-[#7A5F28] text-white' : 'bg-[#FDF6E3] text-[#9C7C38]'
                    }`}>{cat.rooms.length}</span>
                    {cat.basePrice && <span className="ml-1 text-xs opacity-75">· ₹{cat.basePrice}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedCategory && (
            <div>
              <p className="text-sm font-semibold text-[#3d3416] mb-2">
                Select a room from <span className="text-[#8B7D3A]">{selectedCategory.categoryName}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedCategory.rooms.map((room) => {
                  const isSelected = booking.room === room._id;
                  return (
                    <button key={room._id} type="button"
                      onClick={() => { setSelectedRoom(room); setBooking({ ...booking, room: room._id }); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                        isSelected ? 'bg-[#9C7C38] text-white border-[#9C7C38]' : 'bg-white text-[#3d2e10] border-[#C9A84C] hover:border-[#9C7C38]'
                      }`}>
                      {isSelected && <CheckCircle2 size={13} />}
                      {room.roomNumber}
                      <span className="text-xs opacity-75">₹{room.price}/night</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Guest Details */}
        <div className={sectionCls}>
          {sectionTitle(<User size={18} />, 'Guest Details')}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelCls}>Salutation</label>
              <select className={inputCls} value={guest.salutation || 'Mr.'} onChange={(e) => setGuest({ ...guest, salutation: e.target.value })}>
                {['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Guest Name <span className="text-red-500">*</span></label>
              <input className={inputCls} value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelCls}>Age</label>
              <input type="number" className={inputCls} value={guest.age || ''} onChange={(e) => setGuest({ ...guest, age: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Gender</label>
              <select className={inputCls} value={guest.gender || ''} onChange={(e) => setGuest({ ...guest, gender: e.target.value })}>
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Mobile No <span className="text-red-500">*</span></label>
              <input className={inputCls} value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelCls}>Whatsapp No</label>
              <input className={inputCls} value={guest.whatsappNo || ''} onChange={(e) => setGuest({ ...guest, whatsappNo: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" className={inputCls} value={guest.email || ''} onChange={(e) => setGuest({ ...guest, email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Address</label>
              <input className={inputCls} value={guest.address || ''} onChange={(e) => setGuest({ ...guest, address: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Pin Code</label>
              <input className={inputCls} maxLength={6} value={guest.pinCode || ''} onChange={(e) => handlePinCode(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelCls}>City</label>
              <input className={inputCls} value={guest.city || ''} onChange={(e) => setGuest({ ...guest, city: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input className={inputCls} value={guest.state || ''} onChange={(e) => setGuest({ ...guest, state: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Nationality</label>
              <input className={inputCls} value={guest.nationality || ''} onChange={(e) => setGuest({ ...guest, nationality: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Date of Birth</label>
              <input type="date" className={inputCls} value={guest.dateOfBirth?.slice(0, 10) || ''} onChange={(e) => setGuest({ ...guest, dateOfBirth: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelCls}>Anniversary Date</label>
              <input type="date" className={inputCls} value={guest.anniversaryDate?.slice(0, 10) || ''} onChange={(e) => setGuest({ ...guest, anniversaryDate: e.target.value })} />
            </div>
          </div>
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm text-[#5a4e28] cursor-pointer">
              <input type="checkbox" checked={showCompany} onChange={(e) => setShowCompany(e.target.checked)} />
              Company Details
            </label>
            {showCompany && (
              <input className={`${inputCls} mt-2`} placeholder="Company name / GST / details" value={guest.companyDetails || ''} onChange={(e) => setGuest({ ...guest, companyDetails: e.target.value })} />
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelCls}>ID Proof Type</label>
              <select className={inputCls} value={guest.idType || ''} onChange={(e) => setGuest({ ...guest, idType: e.target.value })}>
                <option value="">Select ID Proof Type</option>
                {['passport', 'aadhar', 'driving_license', 'voter_id', 'other'].map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>ID Proof Number</label>
              <input className={inputCls} disabled={!guest.idType} value={guest.idNumber || ''} onChange={(e) => setGuest({ ...guest, idNumber: e.target.value })} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-[#9C7C38] font-medium cursor-pointer">
                <input type="checkbox" checked={guest.isVIP || false} onChange={(e) => setGuest({ ...guest, isVIP: e.target.checked })} />
                VIP Guest
              </label>
            </div>
          </div>
        </div>

        {/* Stay Information */}
        <div className={sectionCls}>
          {sectionTitle(<Info size={18} />, 'Stay Information')}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelCls}>Number of Rooms</label>
              <input type="number" min="1" className={inputCls} value={booking.numberOfRooms} onChange={(e) => setBooking({ ...booking, numberOfRooms: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Check-in Time</label>
              <input type="time" className={inputCls} value={booking.checkInTime} onChange={(e) => setBooking({ ...booking, checkInTime: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Check-out Time</label>
              <input type="time" className={inputCls} value={booking.checkOutTime} onChange={(e) => setBooking({ ...booking, checkOutTime: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelCls}>Arrival From</label>
              <input className={inputCls} value={booking.arrivalFrom} onChange={(e) => setBooking({ ...booking, arrivalFrom: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Purpose of Visit</label>
              <input className={inputCls} value={booking.purposeOfVisit} onChange={(e) => setBooking({ ...booking, purposeOfVisit: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Remarks</label>
            <textarea rows={3} className={`${inputCls} resize-none`} value={booking.remarks} onChange={(e) => setBooking({ ...booking, remarks: e.target.value })} />
          </div>
        </div>

        {/* Payment Details */}
        <div className={sectionCls}>
          {sectionTitle(<CreditCard size={18} />, 'Payment Details')}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelCls}>CGST Rate (%)</label>
              <input type="number" className={inputCls} value={booking.cgstRate} onChange={(e) => setBooking({ ...booking, cgstRate: Number(e.target.value) })} />
            </div>
            <div>
              <label className={labelCls}>SGST Rate (%)</label>
              <input type="number" className={inputCls} value={booking.sgstRate} onChange={(e) => setBooking({ ...booking, sgstRate: Number(e.target.value) })} />
            </div>
            <div>
              <label className={labelCls}>Discount (₹)</label>
              <input type="number" className={inputCls} value={booking.discount} onChange={(e) => setBooking({ ...booking, discount: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
            <div className="border border-[#E8D5A0] rounded-lg overflow-hidden text-sm">
              <table className="w-full">
                <tbody>
                  <tr className="border-b border-[#f0e8c8]">
                    <td className="px-4 py-2 text-[#5a4e28]">Room Cost ({days} days):</td>
                    <td className="px-4 py-2 text-right font-medium text-[#3d3416]">₹{roomCost.toFixed(2)}</td>
                  </tr>
                  {extraBedCost > 0 && (
                    <tr className="border-b border-[#f0e8c8]">
                      <td className="px-4 py-2 text-[#5a4e28]">
                        Extra Bed ({Math.max(1, Math.ceil((new Date(extraBed.to) - new Date(extraBed.from)) / (1000*60*60*24)))}d · ₹{extraBed.chargePerDay}/day):
                      </td>
                      <td className="px-4 py-2 text-right text-[#3d3416]">₹{extraBedCost.toFixed(2)}</td>
                    </tr>
                  )}
                  <tr className="border-b border-[#e0d5a0] bg-[#fdf8ec]">
                    <td className="px-4 py-2 font-semibold text-[#3d3416]">Subtotal:</td>
                    <td className="px-4 py-2 text-right font-semibold text-[#3d3416]">₹{taxableAmount.toFixed(2)}</td>
                  </tr>
                  <tr className="border-b border-[#f0e8c8]">
                    <td className="px-4 py-2 text-[#5a4e28]">CGST ({booking.cgstRate}%):</td>
                    <td className="px-4 py-2 text-right text-[#3d3416]">₹{cgst.toFixed(2)}</td>
                  </tr>
                  <tr className="border-b border-[#f0e8c8]">
                    <td className="px-4 py-2 text-[#5a4e28]">SGST ({booking.sgstRate}%):</td>
                    <td className="px-4 py-2 text-right text-[#3d3416]">₹{sgst.toFixed(2)}</td>
                  </tr>
                  {booking.discount > 0 && (
                    <tr className="border-b border-[#f0e8c8]">
                      <td className="px-4 py-2 text-[#5a4e28]">Discount:</td>
                      <td className="px-4 py-2 text-right text-green-600">-₹{Number(booking.discount).toFixed(2)}</td>
                    </tr>
                  )}
                  <tr className="bg-[#fdf8ec]">
                    <td className="px-4 py-2 font-bold text-[#3d3416]">Total:</td>
                    <td className="px-4 py-2 text-right font-bold text-[#8B7D3A]">₹{totalWithTax.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Payment Mode</label>
                <select className={inputCls} value={booking.paymentMode} onChange={(e) => setBooking({ ...booking, paymentMode: e.target.value })}>
                  <option value="">Select Payment Mode</option>
                  {['cash', 'card', 'upi', 'bank_transfer', 'other'].map((m) => (
                    <option key={m} value={m}>{m.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Payment Status</label>
                <select className={inputCls} value={booking.paymentStatus} onChange={(e) => setBooking({ ...booking, paymentStatus: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
            </div>
          </div>
          <div className="mt-6 border-t border-[#e0d5a0] pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-[#3d3416]">Advance Payments</h4>
              <button type="button" onClick={addAdvancePayment} className="bg-[#9C7C38] hover:bg-[#7A5F28] text-white text-xs px-3 py-1.5 rounded transition-colors">
                + Add Payment
              </button>
            </div>
            {advancePayments.map((ap, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 items-end">
                <div>
                  <label className={labelCls}>Amount (₹)</label>
                  <input type="number" className={inputCls} value={ap.amount} onChange={(e) => updateAdvancePayment(i, 'amount', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Method</label>
                  <select className={inputCls} value={ap.method} onChange={(e) => updateAdvancePayment(i, 'method', e.target.value)}>
                    <option value="">Select</option>
                    {['cash', 'card', 'upi', 'bank_transfer'].map((m) => <option key={m} value={m}>{m.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Date</label>
                  <input type="date" className={inputCls} value={ap.date?.slice(0, 10) || ''} onChange={(e) => updateAdvancePayment(i, 'date', e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className={labelCls}>Note</label>
                    <input className={inputCls} value={ap.note} onChange={(e) => updateAdvancePayment(i, 'note', e.target.value)} />
                  </div>
                  <button type="button" onClick={() => removeAdvancePayment(i)} className="text-red-400 hover:text-red-600 mt-5 text-lg leading-none">&times;</button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <label className={labelCls}>Billing Instruction</label>
            <textarea rows={3} className={`${inputCls} resize-none`} value={booking.billingInstruction} onChange={(e) => setBooking({ ...booking, billingInstruction: e.target.value })} />
          </div>
        </div>

        <div className="flex justify-center gap-4 pb-8">
          <button type="button" onClick={() => navigate('/bookings')} className={btnOutline}>
            Cancel
          </button>
          <button type="button" onClick={loadBookingData}
            className="border-2 border-[#9C7C38] text-[#9C7C38] hover:bg-[#FDF6E3] px-8 py-2.5 rounded text-sm font-semibold transition-colors">
            Reset Form
          </button>
          <button type="submit" disabled={loading} className="bg-[#9C7C38] hover:bg-[#7A5F28] disabled:opacity-50 text-white px-10 py-2.5 rounded text-sm font-semibold transition-colors">
            {loading ? 'Updating...' : 'Update Booking'}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
