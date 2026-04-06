import { useEffect, useState, useRef, Fragment } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBooking, updateBooking, checkAvailability } from '../../api/bookings';
import { updateGuest, createGuest } from '../../api/guests';
import { BedDouble, User, Info, CreditCard, Search, CheckCircle2, Upload, Camera, X, Users } from 'lucide-react';
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
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [showCompany, setShowCompany] = useState(false);
  const [showVehicle, setShowVehicle] = useState(false);
  const [guestPhoto, setGuestPhoto] = useState(null);
  const [idProofPhotos, setIdProofPhotos] = useState([]);
  const [existingGuestPhoto, setExistingGuestPhoto] = useState('');
  const [existingIdProofPhotos, setExistingIdProofPhotos] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [advancePayments, setAdvancePayments] = useState([]);
  const [loading, setLoading] = useState(false);
  // extraBeds for multiple rooms: { [roomId]: { enabled, chargePerDay, from, to } }
  const [extraBeds, setExtraBeds] = useState({});
  // Custom prices for multiple rooms: { [roomId]: customPrice }
  const [customPrices, setCustomPrices] = useState({});
  // Room discounts for multiple rooms: { [roomId]: { type, value } }
  const [roomDiscounts, setRoomDiscounts] = useState({});
  const [additionalGuests, setAdditionalGuests] = useState([]);
  const [existingAdditionalGuests, setExistingAdditionalGuests] = useState([]);

  const loadBookingData = () => {
    getBooking(id).then((r) => {
      const b = r.data;
      setGuest(b.guest);
      setShowCompany(!!b.guest?.companyDetails);
      setShowVehicle(!!(b.vehicleNumber || b.vehicleType));
      setExistingGuestPhoto(b.guest?.guestPhoto || '');
      setExistingIdProofPhotos(b.guest?.idProofPhotos || []);
      setAdvancePayments(b.advancePayments || []);
      setExistingAdditionalGuests(b.additionalGuests || []);
      setAdditionalGuests([]);
      
      // Load rooms (support both single and multiple)
      const rooms = b.rooms?.length ? b.rooms : (b.room ? [b.room] : []);
      setSelectedRooms(rooms);
      
      // Load extra beds for all rooms
      const extraBedData = {};
      b.extraBeds?.forEach((eb) => {
        const roomId = eb.room?._id || eb.room;
        extraBedData[roomId] = {
          enabled: true,
          chargePerDay: eb.chargePerDay || '',
          from: eb.from?.slice(0, 10) || '',
          to: eb.to?.slice(0, 10) || ''
        };
      });
      setExtraBeds(extraBedData);
      
      // Load custom prices for all rooms
      const customPriceData = {};
      b.customPrices?.forEach((cp) => {
        const roomId = cp.room?._id || cp.room;
        customPriceData[roomId] = cp.price;
      });
      setCustomPrices(customPriceData);
      
      // Load room discounts for all rooms
      const roomDiscountData = {};
      b.roomDiscounts?.forEach((rd) => {
        const roomId = rd.room?._id || rd.room;
        roomDiscountData[roomId] = {
          type: rd.discountType || 'fixed',
          value: rd.discountValue || ''
        };
      });
      setRoomDiscounts(roomDiscountData);
      
      setBooking({
        checkIn: b.checkIn?.slice(0, 10), checkOut: b.checkOut?.slice(0, 10),
        checkInTime: b.checkInTime || '12:00', checkOutTime: b.checkOutTime || '12:00',
        numberOfRooms: rooms.length, arrivalFrom: b.arrivalFrom || '',
        purposeOfVisit: b.purposeOfVisit || '',
        vehicleNumber: b.vehicleNumber || '', vehicleType: b.vehicleType || '',
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

  const toggleRoom = (room) => {
    setSelectedRooms((prev) => {
      const exists = prev.find((r) => r._id === room._id);
      if (exists) {
        setExtraBeds((eb) => { const n = { ...eb }; delete n[room._id]; return n; });
        setCustomPrices((cp) => { const n = { ...cp }; delete n[room._id]; return n; });
        setRoomDiscounts((rd) => { const n = { ...rd }; delete n[room._id]; return n; });
        return prev.filter((r) => r._id !== room._id);
      }
      return [...prev, room];
    });
  };

  const updateExtraBed = (roomId, field, value) => {
    setExtraBeds((prev) => ({ ...prev, [roomId]: { ...prev[roomId], [field]: value } }));
  };

  const calcExtraBedCost = (roomId) => {
    const eb = extraBeds[roomId];
    if (!eb?.enabled || !eb.chargePerDay || !eb.from || !eb.to) return 0;
    const ebDays = Math.max(1, Math.ceil((new Date(eb.to) - new Date(eb.from)) / (1000 * 60 * 60 * 24)));
    return Number(eb.chargePerDay) * ebDays;
  };

  const days = booking?.checkIn && booking?.checkOut
    ? Math.max(1, Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24)))
    : 0;

  const totalRoomCost = selectedRooms.reduce((sum, r) => {
    const price = customPrices[r._id] !== undefined ? Number(customPrices[r._id]) : r.price;
    const roomSubtotal = price * days;
    
    const discount = roomDiscounts[r._id];
    let discountAmount = 0;
    if (discount?.value) {
      if (discount.type === 'percentage') {
        discountAmount = (roomSubtotal * Number(discount.value)) / 100;
      } else {
        discountAmount = Number(discount.value);
      }
    }
    
    return sum + roomSubtotal - discountAmount;
  }, 0);
  
  const totalExtraBedCost = selectedRooms.reduce((sum, r) => sum + calcExtraBedCost(r._id), 0);
  const taxableAmount = totalRoomCost + totalExtraBedCost;
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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setShowCamera(true);
      // Wait for next tick to ensure modal is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(err => console.error('Video play error:', err));
          };
        }
      }, 100);
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('Camera access denied or not available');
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        const file = new File([blob], `guest-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setGuestPhoto(file);
        stopCamera();
        toast.success('Photo captured!');
      }, 'image/jpeg');
    }
  };

  const removeExistingIdProof = (url) => {
    setExistingIdProofPhotos(existingIdProofPhotos.filter(p => p !== url));
  };

  const removeNewIdProof = (index) => {
    setIdProofPhotos(idProofPhotos.filter((_, i) => i !== index));
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedRooms.length === 0) return toast.error('Please select at least one room');
    setLoading(true);
    try {
      const { _id, __v, createdAt, updatedAt, idProofPhotos: _existingPhotos, guestPhoto: _existingPhoto, ...guestData } = guest;
      if (guestPhoto) guestData.guestPhoto = guestPhoto;
      guestData.idProofPhotos = idProofPhotos;
      guestData.existingIdProofPhotos = existingIdProofPhotos;
      await updateGuest(_id, guestData);
      
      // Create new additional guests
      const newAdditionalGuestIds = [];
      for (const addGuest of additionalGuests) {
        const addGuestRes = await createGuest(addGuest);
        newAdditionalGuestIds.push(addGuestRes.data._id);
      }
      
      // Combine existing and new additional guest IDs
      const allAdditionalGuestIds = [
        ...existingAdditionalGuests.map(g => g._id || g),
        ...newAdditionalGuestIds
      ];
      
      const extraBedsArray = Object.entries(extraBeds)
        .filter(([, eb]) => eb?.enabled && eb.chargePerDay && eb.from && eb.to)
        .map(([roomId, eb]) => ({ room: roomId, chargePerDay: Number(eb.chargePerDay), from: eb.from, to: eb.to }));
      
      const customPricesArray = Object.entries(customPrices)
        .filter(([, price]) => price !== undefined && price !== '')
        .map(([roomId, price]) => ({ room: roomId, price: Number(price) }));
      
      const roomDiscountsArray = Object.entries(roomDiscounts)
        .filter(([, disc]) => disc?.value)
        .map(([roomId, disc]) => ({ room: roomId, discountType: disc.type, discountValue: Number(disc.value) }));
      
      // Filter and format advance payments - only include valid entries
      const validAdvancePayments = advancePayments
        .filter(ap => ap.amount && ap.method && ap.date)
        .map(ap => ({
          amount: Number(ap.amount),
          method: ap.method,
          date: ap.date,
          note: ap.note || ''
        }));
      
      await updateBooking(id, {
        ...booking,
        rooms: selectedRooms.map((r) => r._id),
        room: selectedRooms[0]._id,
        numberOfRooms: selectedRooms.length,
        guest: _id,
        additionalGuests: allAdditionalGuestIds,
        taxableAmount,
        totalAmount: totalWithTax,
        advancePayments: validAdvancePayments,
        extraBeds: extraBedsArray,
        customPrices: customPricesArray,
        roomDiscounts: roomDiscountsArray
      });
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

          {/* Current rooms + per-room controls */}
          {selectedRooms.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-[#3d2e10] mb-3">{selectedRooms.length} room(s) selected:</p>
              <div className="space-y-3">
                {selectedRooms.map((r) => {
                  const eb = extraBeds[r._id] || {};
                  const customPrice = customPrices[r._id];
                  const discount = roomDiscounts[r._id] || {};
                  return (
                    <div key={r._id} className="border border-[#E8D5A0] rounded-lg bg-white p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-[#3d2e10]">
                          Room {r.roomNumber} · {r.category?.name} · ₹{r.price}/night (default)
                        </span>
                        <button type="button" onClick={() => toggleRoom(r)}
                          className="text-red-400 hover:text-red-600 text-xs font-bold">&times; Remove</button>
                      </div>
                      
                      {/* Custom Price Checkbox */}
                      <div className="mb-2">
                        <label className="flex items-center gap-2 text-sm text-[#5a4228] cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={customPrices[r._id] !== undefined}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCustomPrices((prev) => ({ ...prev, [r._id]: '' }));
                              } else {
                                setCustomPrices((prev) => { const n = { ...prev }; delete n[r._id]; return n; });
                              }
                            }}
                          />
                          Set Custom Price
                        </label>
                        {customPrices[r._id] !== undefined && (
                          <div className="mt-2 pl-6">
                            <input 
                              type="number" 
                              className={inputCls} 
                              placeholder={`Default: ₹${r.price}`}
                              value={customPrices[r._id] || ''}
                              onChange={(e) => setCustomPrices((prev) => ({ ...prev, [r._id]: e.target.value }))} 
                            />
                            <p className="text-xs text-[#8B7D3A] mt-1">💡 Enter custom price for special rates</p>
                          </div>
                        )}
                      </div>

                      {/* Room Discount Checkbox */}
                      <div className="mb-2">
                        <label className="flex items-center gap-2 text-sm text-[#5a4228] cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={roomDiscounts[r._id] !== undefined}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRoomDiscounts((prev) => ({ ...prev, [r._id]: { type: 'fixed', value: '' } }));
                              } else {
                                setRoomDiscounts((prev) => { const n = { ...prev }; delete n[r._id]; return n; });
                              }
                            }}
                          />
                          Apply Room Discount
                        </label>
                        {roomDiscounts[r._id] !== undefined && (
                          <div className="mt-2 pl-6">
                            <div className="grid grid-cols-2 gap-2">
                              <select 
                                className={inputCls}
                                value={discount.type || 'fixed'}
                                onChange={(e) => setRoomDiscounts((prev) => ({ ...prev, [r._id]: { ...prev[r._id], type: e.target.value } }))}>
                                <option value="fixed">Fixed Amount (₹)</option>
                                <option value="percentage">Percentage (%)</option>
                              </select>
                              <input 
                                type="number" 
                                className={inputCls} 
                                placeholder={discount.type === 'percentage' ? 'e.g. 10' : 'e.g. 500'}
                                value={discount.value || ''}
                                onChange={(e) => setRoomDiscounts((prev) => ({ ...prev, [r._id]: { ...prev[r._id], value: e.target.value } }))} 
                              />
                            </div>
                            <p className="text-xs text-[#8B7D3A] mt-1">💰 Discount applied before taxes</p>
                          </div>
                        )}
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
                  ? `${availabilityResult.total} room(s) available — select from any category:`
                  : 'No rooms available for these dates.'}
              </p>
              <div className="space-y-3">
                {availabilityResult.grouped.map((cat) => (
                  <div key={cat.categoryId} className="border border-[#E8D5A0] rounded-lg overflow-hidden">
                    {/* Category header — click to expand/collapse */}
                    <button type="button" onClick={() => setSelectedCategory((prev) => prev?.categoryId === cat.categoryId ? null : cat)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-[#FDF6E3] hover:bg-[#f5e9c8] transition-colors">
                      <span className="text-sm font-semibold text-[#3d2e10]">
                        {cat.categoryName}
                        <span className="ml-2 text-xs text-[#9C7C38]">({cat.rooms.length} available)</span>
                        {cat.basePrice && <span className="ml-2 text-xs text-[#9C7C38]">· ₹{cat.basePrice}/night</span>}
                      </span>
                      <span className="text-xs text-[#9C7C38]">
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
                                  : 'bg-white text-[#3d2e10] border-[#C9A84C] hover:border-[#9C7C38]'
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

          {/* Photo Uploads */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelCls}>Guest Photo</label>
              {(existingGuestPhoto || guestPhoto) && (
                <div className="mb-2 relative inline-block">
                  <img src={guestPhoto ? URL.createObjectURL(guestPhoto) : existingGuestPhoto} alt="Guest" className="w-24 h-24 object-cover rounded border border-[#E8D5A0]" />
                  <button type="button" onClick={() => { setGuestPhoto(null); setExistingGuestPhoto(''); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                    <X size={14} />
                  </button>
                  <p className="text-xs text-[#8B7D3A] mt-1">✅ {guestPhoto ? 'New photo' : 'Current photo'}</p>
                </div>
              )}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input 
                    type="file" 
                    accept="image/jpeg,image/jpg,image/png" 
                    onChange={(e) => e.target.files[0] && setGuestPhoto(e.target.files[0])}
                    className="hidden" 
                    id="guestPhoto" 
                  />
                  <label 
                    htmlFor="guestPhoto" 
                    className="flex items-center gap-2 border border-[#C9A84C] rounded px-3 py-2 text-sm w-full cursor-pointer hover:bg-[#FDF6E3] transition">
                    <Upload size={16} className="text-[#9C7C38]" />
                    <span className="text-[#5a4228] truncate">{guestPhoto ? guestPhoto.name : existingGuestPhoto ? 'Change photo' : 'Choose photo'}</span>
                  </label>
                </div>
                <button type="button" onClick={startCamera} className="bg-[#9C7C38] hover:bg-[#7A5F28] text-white px-3 py-2 rounded transition-colors">
                  <Camera size={16} />
                </button>
              </div>
              <p className="text-xs text-[#8B7D3A] mt-1">📷 Upload or capture photo (Max 5MB)</p>
            </div>
            <div>
              <label className={labelCls}>ID Proof Photos (Multiple)</label>
              {(existingIdProofPhotos.length > 0 || idProofPhotos.length > 0) && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {existingIdProofPhotos.map((url, i) => (
                    <div key={`existing-${i}`} className="relative inline-block">
                      {url.endsWith('.pdf') ? (
                        <div className="w-20 h-20 border border-[#E8D5A0] rounded flex items-center justify-center bg-gray-50">
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#9C7C38]">📄 PDF</a>
                        </div>
                      ) : (
                        <img src={url} alt={`ID ${i+1}`} className="w-20 h-20 object-cover rounded border border-[#E8D5A0]" />
                      )}
                      <button type="button" onClick={() => removeExistingIdProof(url)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {idProofPhotos.map((file, i) => (
                    <div key={`new-${i}`} className="relative inline-block">
                      {file.type === 'application/pdf' ? (
                        <div className="w-20 h-20 border border-[#E8D5A0] rounded flex items-center justify-center bg-gray-50">
                          <span className="text-xs text-[#9C7C38]">📄 PDF</span>
                        </div>
                      ) : (
                        <img src={URL.createObjectURL(file)} alt={`New ID ${i+1}`} className="w-20 h-20 object-cover rounded border border-[#E8D5A0]" />
                      )}
                      <button type="button" onClick={() => removeNewIdProof(i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative">
                <input 
                  type="file" 
                  accept="image/jpeg,image/jpg,image/png,application/pdf" 
                  multiple
                  onChange={(e) => setIdProofPhotos([...idProofPhotos, ...Array.from(e.target.files)])}
                  className="hidden" 
                  id="idProofPhotos" 
                />
                <label 
                  htmlFor="idProofPhotos" 
                  className="flex items-center gap-2 border border-[#C9A84C] rounded px-3 py-2 text-sm w-full cursor-pointer hover:bg-[#FDF6E3] transition">
                  <Upload size={16} className="text-[#9C7C38]" />
                  <span className="text-[#5a4228]">Add more ID proofs ({existingIdProofPhotos.length + idProofPhotos.length} total)</span>
                </label>
              </div>
              <p className="text-xs text-[#8B7D3A] mt-1">📄 JPEG, JPG, PNG, PDF (Max 5MB each, up to 10 files)</p>
            </div>
          </div>
        </div>

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#3d2e10]">Capture Guest Photo</h3>
                <button type="button" onClick={stopCamera} className="text-[#9C7C38] hover:text-[#7A5F28]">
                  <X size={24} />
                </button>
              </div>
              <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ minHeight: '400px' }}>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex gap-3 justify-center">
                <button type="button" onClick={stopCamera} className={btnOutline}>Cancel</button>
                <button type="button" onClick={capturePhoto} className={btnPrimary}>
                  <Camera size={16} className="inline mr-2" />
                  Capture Photo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Additional Guests */}
        <div className={sectionCls}>
          {sectionTitle(<Users size={18} />, 'Additional Guests')}
          
          {/* Existing Additional Guests */}
          {existingAdditionalGuests.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-[#3d2e10] mb-3">Current Additional Guests ({existingAdditionalGuests.length})</h4>
              {existingAdditionalGuests.map((guest, idx) => (
                <div key={guest._id} className="border border-[#E8D5A0] rounded-lg p-4 mb-3 bg-[#FFFEF9]">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-[#3d2e10]">{guest.name}</h5>
                    <button type="button" 
                      onClick={() => setExistingAdditionalGuests(existingAdditionalGuests.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-600 text-xs font-bold">&times; Remove</button>
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
          )}
          
          {/* New Additional Guests */}
          {additionalGuests.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-[#3d2e10] mb-3">New Guests to Add ({additionalGuests.length})</h4>
              {additionalGuests.map((addGuest, idx) => (
                <div key={idx} className="border border-[#E8D5A0] rounded-lg p-4 mb-4 bg-[#FFFEF9]">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-semibold text-[#3d2e10]">New Guest #{idx + 1}</h5>
                    <button type="button" onClick={() => setAdditionalGuests(additionalGuests.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-600 text-xs font-bold">&times; Remove</button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                    <div>
                      <label className={labelCls}>Salutation</label>
                      <select className={inputCls} value={addGuest.salutation} 
                        onChange={(e) => {
                          const updated = [...additionalGuests];
                          updated[idx].salutation = e.target.value;
                          setAdditionalGuests(updated);
                        }}>
                        {['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'].map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Name <span className="text-red-500">*</span></label>
                      <input className={inputCls} value={addGuest.name}
                        onChange={(e) => {
                          const updated = [...additionalGuests];
                          updated[idx].name = e.target.value;
                          setAdditionalGuests(updated);
                        }} required />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                    <div>
                      <label className={labelCls}>Age</label>
                      <input type="number" className={inputCls} value={addGuest.age}
                        onChange={(e) => {
                          const updated = [...additionalGuests];
                          updated[idx].age = e.target.value;
                          setAdditionalGuests(updated);
                        }} />
                    </div>
                    <div>
                      <label className={labelCls}>Gender</label>
                      <select className={inputCls} value={addGuest.gender}
                        onChange={(e) => {
                          const updated = [...additionalGuests];
                          updated[idx].gender = e.target.value;
                          setAdditionalGuests(updated);
                        }}>
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Mobile No <span className="text-red-500">*</span></label>
                      <input className={inputCls} value={addGuest.phone}
                        onChange={(e) => {
                          const updated = [...additionalGuests];
                          updated[idx].phone = e.target.value;
                          setAdditionalGuests(updated);
                        }} required />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className={labelCls}>Email</label>
                      <input type="email" className={inputCls} value={addGuest.email}
                        onChange={(e) => {
                          const updated = [...additionalGuests];
                          updated[idx].email = e.target.value;
                          setAdditionalGuests(updated);
                        }} />
                    </div>
                    <div>
                      <label className={labelCls}>ID Type</label>
                      <select className={inputCls} value={addGuest.idType}
                        onChange={(e) => {
                          const updated = [...additionalGuests];
                          updated[idx].idType = e.target.value;
                          setAdditionalGuests(updated);
                        }}>
                        <option value="">Select ID Proof Type</option>
                        {['passport', 'aadhar', 'driving_license', 'voter_id', 'other'].map((t) => (
                          <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className={labelCls}>ID Proof Number</label>
                    <input className={inputCls} disabled={!addGuest.idType} value={addGuest.idNumber}
                      onChange={(e) => {
                        const updated = [...additionalGuests];
                        updated[idx].idNumber = e.target.value;
                        setAdditionalGuests(updated);
                      }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <button type="button" 
            onClick={() => setAdditionalGuests([...additionalGuests, { salutation: 'Mr.', name: '', age: '', gender: '', phone: '', email: '', idType: '', idNumber: '' }])}
            className="flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
            <User size={16} />
            Add Another Guest
          </button>
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
              <label className={labelCls}>Number of Adults <span className="text-red-500">*</span></label>
              <input type="number" min="1" className={inputCls} value={booking.adults || 1} onChange={(e) => setBooking({ ...booking, adults: Number(e.target.value) })} required />
            </div>
            <div>
              <label className={labelCls}>Number of Children</label>
              <input type="number" min="0" className={inputCls} value={booking.children || 0} onChange={(e) => setBooking({ ...booking, children: Number(e.target.value) })} />
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
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm text-[#5a4e28] cursor-pointer">
              <input type="checkbox" checked={showVehicle} onChange={(e) => setShowVehicle(e.target.checked)} />
              Vehicle Details
            </label>
            {showVehicle && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className={labelCls}>Vehicle Number</label>
                  <input className={inputCls} placeholder="e.g., MH 01 AB 1234" value={booking.vehicleNumber} onChange={(e) => setBooking({ ...booking, vehicleNumber: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <label className={labelCls}>Vehicle Type</label>
                  <select className={inputCls} value={booking.vehicleType} onChange={(e) => setBooking({ ...booking, vehicleType: e.target.value })}>
                    <option value="">Select Vehicle Type</option>
                    <option value="car">Car</option>
                    <option value="bike">Bike</option>
                    <option value="suv">SUV</option>
                    <option value="bus">Bus</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            )}
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
                  {selectedRooms.map((r) => {
                    const price = customPrices[r._id] !== undefined ? Number(customPrices[r._id]) : r.price;
                    const roomSubtotal = price * days;
                    const isCustom = customPrices[r._id] !== undefined;
                    
                    const discount = roomDiscounts[r._id];
                    let discountAmount = 0;
                    if (discount?.value) {
                      if (discount.type === 'percentage') {
                        discountAmount = (roomSubtotal * Number(discount.value)) / 100;
                      } else {
                        discountAmount = Number(discount.value);
                      }
                    }
                    
                    return (
                      <Fragment key={r._id}>
                        <tr className="border-b border-[#f0e8c8]">
                          <td className="px-4 py-2 text-[#5a4e28]">
                            Room {r.roomNumber} ({days}d){isCustom && <span className="text-xs text-orange-600 ml-1">(Custom)</span>}:
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-[#3d3416]">₹{roomSubtotal.toFixed(2)}</td>
                        </tr>
                        {discountAmount > 0 && (
                          <tr className="border-b border-[#f0e8c8]">
                            <td className="px-4 py-2 text-[#5a4e28] pl-8">
                              Discount ({discount.type === 'percentage' ? `${discount.value}%` : `₹${discount.value}`}):
                            </td>
                            <td className="px-4 py-2 text-right text-green-600">-₹{discountAmount.toFixed(2)}</td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
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
                  {advancePayments.filter(ap => ap.amount && ap.method && ap.date).map((ap, i) => (
                    <tr key={`adv-${i}`} className="border-t border-[#f0e8c8]">
                      <td className="px-4 py-2 text-[#5a4e28]">Advance ({ap.method}):</td>
                      <td className="px-4 py-2 text-right text-blue-600">-₹{Number(ap.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                  {advancePayments.filter(ap => ap.amount && ap.method && ap.date).length > 0 && (
                    <tr className="bg-[#fdf8ec] border-t-2 border-[#e0d5a0]">
                      <td className="px-4 py-2 font-bold text-[#3d3416]">Balance Due:</td>
                      <td className="px-4 py-2 text-right font-bold text-red-600">
                        ₹{(totalWithTax - advancePayments.filter(ap => ap.amount && ap.method && ap.date).reduce((sum, ap) => sum + Number(ap.amount), 0)).toFixed(2)}
                      </td>
                    </tr>
                  )}
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
          <button type="submit" disabled={loading} className="bg-[#9C7C38] hover:bg-[#7A5F28] disabled:opacity-50 text-white px-10 py-2.5 rounded text-sm font-semibold transition-colors">
            {loading ? 'Updating...' : 'Update Booking'}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
