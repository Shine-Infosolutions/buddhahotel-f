import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBooking, checkAvailability, previewNumbers, searchGuestByQuery, getGuestByGRC } from '../../api/bookings';
import { createGuest } from '../../api/guests';
import { BedDouble, User, Info, CreditCard, Search, CheckCircle2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const emptyGuest = {
  salutation: 'Mr.', name: '', age: '', gender: '', phone: '', whatsappNo: '',
  email: '', address: '', city: '', state: '', pinCode: '', nationality: '', dateOfBirth: '',
  anniversaryDate: '', companyDetails: '', idType: '', idNumber: '', isVIP: false,
};

const emptyBooking = {
  checkIn: '', checkOut: '', checkInTime: '12:00', checkOutTime: '12:00',
  numberOfRooms: 1, arrivalFrom: '', purposeOfVisit: '', extraBedChargePerDay: 0,
  remarks: '', status: 'booked', cgstRate: 2.5, sgstRate: 2.5, discount: 0,
  paymentMode: '', paymentStatus: 'pending', billingInstruction: '',
};

const sectionTitle = (icon, title) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="bg-[#FDF6E3] text-[#9C7C38] p-2 rounded-full">{icon}</div>
    <h3 className="text-lg font-semibold text-[#3d2e10]">{title}</h3>
  </div>
);

const inputCls = 'border border-[#C9A84C] rounded px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-[#A07830] focus:border-[#A07830] transition bg-white';
const labelCls = 'text-sm text-[#5a4228] mb-1 block font-medium';
const sectionCls = 'bg-[#FFFDF7] rounded-xl border border-[#E8D5A0] p-6 mb-5';
const btnPrimary = 'bg-[#9C7C38] hover:bg-[#7A5F28] text-white px-5 py-2 rounded text-sm font-semibold disabled:opacity-50 transition-colors';
const btnOutline = 'border border-[#C9A84C] text-[#9C7C38] hover:bg-[#FDF6E3] bg-white px-5 py-2 rounded text-sm font-semibold transition-colors';

export default function AddBookingForm() {
  const navigate = useNavigate();
  const [guest, setGuest] = useState(emptyGuest);
  const [booking, setBooking] = useState(emptyBooking);
  const [showCompany, setShowCompany] = useState(false);
  const [advancePayments, setAdvancePayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState({ grcNumber: '', invoiceNumber: '' });
  const [grcSearch, setGrcSearch] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    previewNumbers(new Date().toISOString().slice(0, 10)).then((r) => setPreview(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (booking.checkIn) previewNumbers(booking.checkIn).then((r) => setPreview(r.data)).catch(() => {});
  }, [booking.checkIn]);

  // Availability state
  const [checking, setChecking] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedRooms, setSelectedRooms] = useState([]);
  // Extra bed per room: { [roomId]: { enabled, chargePerDay, from, to } }
  const [extraBeds, setExtraBeds] = useState({});

  const updateExtraBed = (roomId, field, value) => {
    setExtraBeds((prev) => ({ ...prev, [roomId]: { ...prev[roomId], [field]: value } }));
  };

  const toggleRoom = (room) => {
    setSelectedRooms((prev) => {
      const exists = prev.find((r) => r._id === room._id);
      if (exists) {
        setExtraBeds((eb) => { const n = { ...eb }; delete n[room._id]; return n; });
        return prev.filter((r) => r._id !== room._id);
      }
      return [...prev, room];
    });
  };

  const days = booking.checkIn && booking.checkOut
    ? Math.max(1, Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24)))
    : 0;

  const calcExtraBedCost = (roomId) => {
    const eb = extraBeds[roomId];
    if (!eb?.enabled || !eb.chargePerDay || !eb.from || !eb.to) return 0;
    const ebDays = Math.max(1, Math.ceil((new Date(eb.to) - new Date(eb.from)) / (1000 * 60 * 60 * 24)));
    return Number(eb.chargePerDay) * ebDays;
  };

  const totalRoomCost = selectedRooms.reduce((sum, r) => sum + r.price * days, 0);
  const totalExtraBedCost = selectedRooms.reduce((sum, r) => sum + calcExtraBedCost(r._id), 0);
  const taxableAmount = totalRoomCost + totalExtraBedCost;
  const cgst = (taxableAmount * (booking.cgstRate || 0)) / 100;
  const sgst = (taxableAmount * (booking.sgstRate || 0)) / 100;
  const totalWithTax = taxableAmount + cgst + sgst - (booking.discount || 0);

  const handleCheckAvailability = async () => {
    if (!booking.checkIn || !booking.checkOut) return toast.error('Select check-in and check-out dates');
    if (new Date(booking.checkOut) <= new Date(booking.checkIn)) return toast.error('Check-out must be after check-in');
    setChecking(true);
    setAvailabilityResult(null);
    setSelectedCategory(null);
    setSelectedRooms([]);
    setExtraBeds({});
    try {
      const res = await checkAvailability({ checkIn: booking.checkIn, checkOut: booking.checkOut });
      setAvailabilityResult(res.data);
      if (res.data.total === 0) toast.error('No rooms available for selected dates');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check availability');
    } finally {
      setChecking(false);
    }
  };

  const handleSelectCategory = (cat) => {
    setSelectedCategory((prev) => prev?.categoryId === cat.categoryId ? null : cat);
  };

  const handlePinCode = async (pin, setter) => {
    setter((g) => ({ ...g, pinCode: pin }));
    if (pin.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data[0]?.Status === 'Success') {
          const p = data[0].PostOffice[0];
          setter((g) => ({ ...g, city: p.District, state: p.State }));
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
    if (selectedRooms.length === 0) return toast.error('Please select at least one room');
    setLoading(true);
    try {
      const guestRes = await createGuest(guest);
      await createBooking({
        ...booking,
        rooms: selectedRooms.map((r) => r._id),
        guest: guestRes.data._id,
        taxableAmount,
        totalAmount: totalWithTax,
        advancePayments,
        extraBeds: Object.entries(extraBeds)
          .filter(([, eb]) => eb?.enabled)
          .map(([roomId, eb]) => ({ room: roomId, chargePerDay: eb.chargePerDay, from: eb.from, to: eb.to })),
      });
      toast.success('Booking created');
      navigate('/bookings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleGRCSearch = async () => {
    if (!grcSearch.trim()) return;
    setSearchLoading(true);
    try {
      const res = await getGuestByGRC(grcSearch.trim());
      const { _id, __v, createdAt, updatedAt, ...guestData } = res.data;
      setGuest({ ...emptyGuest, ...guestData });
      toast.success('Guest loaded from GRC');
    } catch {
      toast.error('GRC not found');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleNameSearch = async () => {
    if (!nameSearch.trim()) return;
    setSearchLoading(true);
    try {
      const res = await searchGuestByQuery(nameSearch.trim());
      setSearchResults(res.data);
      if (res.data.length === 0) toast.error('No guests found');
    } catch {
      toast.error('Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectSearchResult = (g) => {
    const { _id, __v, createdAt, updatedAt, ...guestData } = g;
    setGuest({ ...emptyGuest, ...guestData });
    setSearchResults([]);
    setNameSearch('');
    toast.success('Guest details loaded');
  };

  const handleReset = () => {
    setGuest(emptyGuest);
    setBooking(emptyBooking);
    setAdvancePayments([]);
    setAvailabilityResult(null);
    setSelectedCategory(null);
    setSelectedRooms([]);
    setExtraBeds({});
    setShowCompany(false);
    setGrcSearch('');
    setNameSearch('');
    setSearchResults([]);
  };

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

        {/* GRC / Returning Customer Search */}
        <div className={sectionCls}>
          {sectionTitle(<FileText size={18} />, 'Guest Registration Card (GRC) Details')}

          {/* GRC No & Invoice No */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelCls}>GRC No.</label>
              <input className={inputCls} value={preview.grcNumber || ''} readOnly placeholder="Auto-generated" />
            </div>
            <div>
              <label className={labelCls}>Invoice No.</label>
              <input className={inputCls} value={preview.invoiceNumber || ''} readOnly placeholder="Auto-generated after booking" />
            </div>
          </div>

          {/* Search by GRC */}
          <div className="mb-4">
            <label className={labelCls}>Search by GRC (Returning Customer)</label>
            <input className={inputCls} placeholder="Enter a previous GRC number" value={grcSearch}
              onChange={(e) => setGrcSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleGRCSearch())} />
            <p className="text-xs text-[#8B7D3A] mt-1">💡 Enter a previous GRC number to auto-fill customer details for a new booking</p>
          </div>

          {/* Search by Name/Mobile */}
          <div className="mb-5 relative">
            <label className={labelCls}>Or Search by Name/Mobile</label>
            <div className="flex gap-2">
              <input className={inputCls} placeholder="Search by customer name or mobile number" value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleNameSearch())} />
              <button type="button" onClick={handleNameSearch} disabled={searchLoading}
                className="text-[#9C7C38] hover:text-[#7A5F28] px-3 py-2 text-sm font-semibold whitespace-nowrap disabled:opacity-50 transition-colors">
                Search
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 bg-white border border-[#c8b97a] rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                {searchResults.map((g) => (
                  <button key={g._id} type="button" onClick={() => handleSelectSearchResult(g)}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#f5edd6] text-sm border-b border-[#f0e8c8] last:border-0">
                    <span className="font-medium text-[#3d3416]">{g.salutation} {g.name}</span>
                    <span className="text-[#8B7D3A] ml-2 text-xs">{g.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button type="button" onClick={handleGRCSearch} disabled={searchLoading} className={btnPrimary}>
              {searchLoading ? 'Loading...' : 'Load Customer Details'}
            </button>
          </div>
        </div>

        {/* Room & Availability */}
        <div className={sectionCls}>
          {sectionTitle(<BedDouble size={18} />, 'Room & Availability')}

          {/* Step 1: Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelCls}>Check-in Date <span className="text-red-500">*</span></label>
              <input type="date" className={inputCls} value={booking.checkIn}
                onChange={(e) => { setBooking({ ...booking, checkIn: e.target.value }); setAvailabilityResult(null); setSelectedCategory(null); setSelectedRooms([]); }} required />
            </div>
            <div>
              <label className={labelCls}>Check-out Date <span className="text-red-500">*</span></label>
              <input type="date" className={inputCls} value={booking.checkOut}
                onChange={(e) => { setBooking({ ...booking, checkOut: e.target.value }); setAvailabilityResult(null); setSelectedCategory(null); setSelectedRooms([]); }} required />
            </div>
          </div>

          <button type="button" onClick={handleCheckAvailability} disabled={checking}
            className={`flex items-center gap-2 mb-5 ${btnPrimary}`}>
            <Search size={15} />
            {checking ? 'Checking...' : 'Check Availability'}
          </button>

          {/* Step 2: Categories with rooms */}
          {availabilityResult && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-[#3d3416] mb-3">
                {availabilityResult.total > 0
                  ? `${availabilityResult.total} room(s) available — select from any category:`
                  : 'No rooms available for these dates.'}
              </p>
              <div className="space-y-3">
                {availabilityResult.grouped.map((cat) => (
                  <div key={cat.categoryId} className="border border-[#E8D5A0] rounded-lg overflow-hidden">
                    {/* Category header — click to expand/collapse */}
                    <button type="button" onClick={() => handleSelectCategory(cat)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-[#FDF6E3] hover:bg-[#f5e9c8] transition-colors">
                      <span className="text-sm font-semibold text-[#3d2e10]">
                        {cat.categoryName}
                        <span className="ml-2 text-xs text-[#9C7C38]">({cat.rooms.length} available)</span>
                        {cat.basePrice && <span className="ml-2 text-xs text-[#9C7C38]">· ₹{cat.basePrice}/night</span>}
                      </span>
                      <span className="text-xs text-[#9C7C38]">
                        {selectedRooms.filter((r) => cat.rooms.find((cr) => cr._id === r._id)).length > 0 && (
                          <span className="bg-[#9C7C38] text-white px-2 py-0.5 rounded-full mr-2">
                            {selectedRooms.filter((r) => cat.rooms.find((cr) => cr._id === r._id)).length} selected
                          </span>
                        )}
                        {selectedCategory?.categoryId === cat.categoryId ? '▲' : '▼'}
                      </span>
                    </button>
                    {/* Rooms — shown when category is expanded */}
                    {selectedCategory?.categoryId === cat.categoryId && (
                      <div className="px-4 py-3 flex flex-wrap gap-2">
                        {cat.rooms.map((room) => {
                          const isSelected = selectedRooms.find((r) => r._id === room._id);
                          return (
                            <button key={room._id} type="button" onClick={() => toggleRoom(room)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                                isSelected
                                  ? 'bg-[#9C7C38] text-white border-[#9C7C38]'
                                  : 'bg-white text-[#3d3416] border-[#C9A84C] hover:border-[#9C7C38]'
                              }`}>
                              {isSelected && <CheckCircle2 size={13} />}
                              Room {room.roomNumber}
                              <span className="text-xs opacity-75">₹{room.price}/night</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected rooms + per-room extra bed */}
          {selectedRooms.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-xs font-semibold text-[#3d2e10]">{selectedRooms.length} room(s) selected:</p>
              {selectedRooms.map((r) => {
                const eb = extraBeds[r._id] || {};
                return (
                  <div key={r._id} className="border border-[#E8D5A0] rounded-lg bg-white p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-[#3d2e10]">
                        Room {r.roomNumber} &middot; ₹{r.price}/night
                      </span>
                      <button type="button" onClick={() => toggleRoom(r)}
                        className="text-red-400 hover:text-red-600 text-xs font-bold">&times; Remove</button>
                    </div>
                    {/* Extra bed checkbox */}
                    <label className="flex items-center gap-2 text-sm text-[#5a4228] cursor-pointer mb-2">
                      <input type="checkbox" checked={!!eb.enabled}
                        onChange={(e) => updateExtraBed(r._id, 'enabled', e.target.checked)} />
                      Add Extra Bed for this room
                    </label>
                    {eb.enabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 pl-5">
                        <div>
                          <label className={labelCls}>Charge/Day (₹)</label>
                          <input type="number" className={inputCls} placeholder="e.g. 500"
                            value={eb.chargePerDay || ''}
                            onChange={(e) => updateExtraBed(r._id, 'chargePerDay', e.target.value)} />
                        </div>
                        <div>
                          <label className={labelCls}>From Date</label>
                          <input type="date" className={inputCls}
                            min={booking.checkIn} max={booking.checkOut}
                            value={eb.from || ''}
                            onChange={(e) => updateExtraBed(r._id, 'from', e.target.value)} />
                        </div>
                        <div>
                          <label className={labelCls}>To Date</label>
                          <input type="date" className={inputCls}
                            min={eb.from || booking.checkIn} max={booking.checkOut}
                            value={eb.to || ''}
                            onChange={(e) => updateExtraBed(r._id, 'to', e.target.value)} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Guest Details */}
        <div className={sectionCls}>
          {sectionTitle(<User size={18} />, 'Guest Details')}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelCls}>Salutation</label>
              <select className={inputCls} value={guest.salutation} onChange={(e) => setGuest({ ...guest, salutation: e.target.value })}>
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
              <input type="number" className={inputCls} value={guest.age} onChange={(e) => setGuest({ ...guest, age: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Gender</label>
              <select className={inputCls} value={guest.gender} onChange={(e) => setGuest({ ...guest, gender: e.target.value })}>
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
              <input className={inputCls} value={guest.whatsappNo} onChange={(e) => setGuest({ ...guest, whatsappNo: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" className={inputCls} value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Address</label>
              <input className={inputCls} value={guest.address} onChange={(e) => setGuest({ ...guest, address: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Pin Code</label>
              <input className={inputCls} maxLength={6} value={guest.pinCode} onChange={(e) => handlePinCode(e.target.value, setGuest)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelCls}>City</label>
              <input className={inputCls} value={guest.city} onChange={(e) => setGuest({ ...guest, city: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input className={inputCls} value={guest.state} onChange={(e) => setGuest({ ...guest, state: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Nationality</label>
              <input className={inputCls} value={guest.nationality} onChange={(e) => setGuest({ ...guest, nationality: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Date of Birth</label>
              <input type="date" className={inputCls} value={guest.dateOfBirth} onChange={(e) => setGuest({ ...guest, dateOfBirth: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelCls}>Anniversary Date</label>
              <input type="date" className={inputCls} value={guest.anniversaryDate} onChange={(e) => setGuest({ ...guest, anniversaryDate: e.target.value })} />
            </div>
          </div>
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm text-[#5a4e28] cursor-pointer">
              <input type="checkbox" checked={showCompany} onChange={(e) => setShowCompany(e.target.checked)} />
              Company Details
            </label>
            {showCompany && (
              <input className={`${inputCls} mt-2`} placeholder="Company name / GST / details" value={guest.companyDetails} onChange={(e) => setGuest({ ...guest, companyDetails: e.target.value })} />
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelCls}>ID Proof Type</label>
              <select className={inputCls} value={guest.idType} onChange={(e) => setGuest({ ...guest, idType: e.target.value })}>
                <option value="">Select ID Proof Type</option>
                {['passport', 'aadhar', 'driving_license', 'voter_id', 'other'].map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>ID Proof Number</label>
              <input className={inputCls} disabled={!guest.idType} value={guest.idNumber} onChange={(e) => setGuest({ ...guest, idNumber: e.target.value })} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-[#8B7D3A] font-medium cursor-pointer">
                <input type="checkbox" checked={guest.isVIP} onChange={(e) => setGuest({ ...guest, isVIP: e.target.checked })} />
                VIP Guest
              </label>
            </div>
          </div>
        </div>

        {/* Stay Information */}
        <div className={sectionCls}>
          {sectionTitle(<Info size={18} />, 'Stay Information')}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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

          {/* Bill Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
            <div className="border border-[#e0d5a0] rounded-lg overflow-hidden text-sm">
              <table className="w-full">
                <tbody>
                  {selectedRooms.map((r) => (
                    <tr key={r._id} className="border-b border-[#f0e8c8]">
                      <td className="px-4 py-2 text-[#5a4e28]">Room {r.roomNumber} ({days}d):</td>
                      <td className="px-4 py-2 text-right font-medium text-[#3d3416]">₹{(r.price * days).toFixed(2)}</td>
                    </tr>
                  ))}
                  {selectedRooms.map((r) => {
                    const cost = calcExtraBedCost(r._id);
                    const eb = extraBeds[r._id];
                    if (!cost) return null;
                    const ebDays = Math.max(1, Math.ceil((new Date(eb.to) - new Date(eb.from)) / (1000 * 60 * 60 * 24)));
                    return (
                      <tr key={`eb-${r._id}`} className="border-b border-[#f0e8c8]">
                        <td className="px-4 py-2 text-[#5a4e28]">Extra Bed Rm {r.roomNumber} ({ebDays}d):</td>
                        <td className="px-4 py-2 text-right text-[#3d3416]">₹{cost.toFixed(2)}</td>
                      </tr>
                    );
                  })}
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

          {/* Advance Payments */}
          <div className="border-t border-[#e0d5a0] pt-4">
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
                  <input type="date" className={inputCls} value={ap.date} onChange={(e) => updateAdvancePayment(i, 'date', e.target.value)} />
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

        {/* Actions */}
        <div className="flex justify-center gap-4 pb-8">
          <button type="button" onClick={handleReset}
            className="border-2 border-[#9C7C38] text-[#9C7C38] hover:bg-[#FDF6E3] px-10 py-2.5 rounded text-sm font-semibold transition-colors">
            Reset Form
          </button>
          <button type="submit" disabled={loading || selectedRooms.length === 0}
            className="bg-[#9C7C38] hover:bg-[#7A5F28] disabled:opacity-50 text-white px-10 py-2.5 rounded text-sm font-semibold transition-colors">
            {loading ? 'Submitting...' : `Submit Booking${selectedRooms.length > 1 ? ` (${selectedRooms.length} rooms)` : ''}`}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
