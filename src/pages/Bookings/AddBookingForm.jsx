import { useState, useEffect, Fragment, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBooking, checkAvailability, previewNumbers, searchGuestByQuery, getGuestByGRC, sendBookingConfirmation } from '../../api/bookings';
import { createGuest } from '../../api/guests';
import { getInvoiceByBooking } from '../../api/billing';
import { BedDouble, User, Info, CreditCard, Search, CheckCircle2, FileText, Upload, Camera, X } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import InvoiceTemplate from './InvoiceTemplate';

const emptyGuest = {
  salutation: 'Mr.', name: '', age: '', gender: '', phone: '', whatsappNo: '',
  email: '', address: '', city: '', state: '', pinCode: '', nationality: '', dateOfBirth: '',
  anniversaryDate: '', companyDetails: '', idType: '', idNumber: '', isVIP: false,
};

const emptyAdditionalGuest = {
  salutation: 'Mr.', name: '', age: '', gender: '', phone: '', email: '', 
  idType: '', idNumber: '',
};

const emptyBooking = {
  checkIn: '', checkOut: '', checkInTime: '12:00', checkOutTime: '12:00',
  numberOfRooms: 1, adults: 1, children: 0, arrivalFrom: '', purposeOfVisit: '', extraBedChargePerDay: 0,
  vehicleNumber: '', vehicleType: '',
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
  const [showVehicle, setShowVehicle] = useState(false);
  const [guestPhoto, setGuestPhoto] = useState(null);
  const [idProofPhotos, setIdProofPhotos] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [advancePayments, setAdvancePayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState({ grcNumber: '', invoiceNumber: '' });
  const [grcSearch, setGrcSearch] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [additionalGuests, setAdditionalGuests] = useState([]);
  const [invoiceData, setInvoiceData] = useState(null);
  const [bookingForInvoice, setBookingForInvoice] = useState(null);
  const invoiceRef = useRef();

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
  // Custom price per room: { [roomId]: customPrice }
  const [customPrices, setCustomPrices] = useState({});
  // Discount per room: { [roomId]: { type, value } }
  const [roomDiscounts, setRoomDiscounts] = useState({});

  const updateExtraBed = (roomId, field, value) => {
    setExtraBeds((prev) => ({ ...prev, [roomId]: { ...prev[roomId], [field]: value } }));
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

  const days = booking.checkIn && booking.checkOut
    ? Math.max(1, Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24)))
    : 0;

  const calcExtraBedCost = (roomId) => {
    const eb = extraBeds[roomId];
    if (!eb?.enabled || !eb.chargePerDay || !eb.from || !eb.to) return 0;
    const ebDays = Math.max(1, Math.ceil((new Date(eb.to) - new Date(eb.from)) / (1000 * 60 * 60 * 24)));
    return Number(eb.chargePerDay) * ebDays;
  };

  const totalRoomCost = selectedRooms.reduce((sum, r) => {
    const price = customPrices[r._id] !== undefined ? Number(customPrices[r._id]) : r.price;
    const roomSubtotal = price * days;
    
    // Calculate room discount
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
      const guestData = { ...guest };
      if (guestPhoto) guestData.guestPhoto = guestPhoto;
      if (idProofPhotos.length > 0) guestData.idProofPhotos = idProofPhotos;
      const guestRes = await createGuest(guestData);
      
      // Create additional guests
      const additionalGuestIds = [];
      for (const addGuest of additionalGuests) {
        const addGuestRes = await createGuest(addGuest);
        additionalGuestIds.push(addGuestRes.data._id);
      }
      
      // Filter and format advance payments - only include valid entries
      const validAdvancePayments = advancePayments
        .filter(ap => ap.amount && ap.method && ap.date)
        .map(ap => ({
          amount: Number(ap.amount),
          method: ap.method,
          date: ap.date,
          note: ap.note || ''
        }));
      
      const bookingRes = await createBooking({
        ...booking,
        rooms: selectedRooms.map((r) => r._id),
        customPrices: Object.entries(customPrices).map(([roomId, price]) => ({ room: roomId, price: Number(price) })),
        roomDiscounts: Object.entries(roomDiscounts)
          .filter(([, disc]) => disc?.value)
          .map(([roomId, disc]) => ({ room: roomId, discountType: disc.type || 'fixed', discountValue: Number(disc.value) })),
        guest: guestRes.data._id,
        additionalGuests: additionalGuestIds,
        taxableAmount,
        totalAmount: totalWithTax,
        advancePayments: validAdvancePayments,
        extraBeds: Object.entries(extraBeds)
          .filter(([, eb]) => eb?.enabled)
          .map(([roomId, eb]) => ({ room: roomId, chargePerDay: eb.chargePerDay, from: eb.from, to: eb.to })),
      });
      toast.success('Booking created');

      // Auto-send confirmation email if guest has email
      if (guest.email) {
        try {
          const bookingId = bookingRes.data._id;
          const invRes = await getInvoiceByBooking(bookingId);
          setInvoiceData(invRes.data);
          setBookingForInvoice(bookingRes.data);
          await new Promise(r => setTimeout(r, 500));
          const element = invoiceRef.current;
          const canvas = await html2canvas(element, { scale: 2, useCORS: true, width: element.scrollWidth, height: element.scrollHeight });
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
          await sendBookingConfirmation(bookingId, pdfBase64);
          toast.success('Confirmation email sent!');
        } catch {
          toast.error('Booking created but failed to send confirmation email');
        } finally {
          setInvoiceData(null);
          setBookingForInvoice(null);
        }
      }

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
      // If user entered only numbers, prepend the year prefix
      const fullGRC = grcSearch.startsWith('GRC') 
        ? grcSearch.trim() 
        : `GRC${new Date().getFullYear() % 100}${grcSearch.padStart(4, '0')}`;
      const res = await getGuestByGRC(fullGRC);
      const { _id, __v, createdAt, updatedAt, ...guestData } = res.data;
      setGuest({ ...emptyGuest, ...guestData });
      setGrcSearch('');
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
    setCustomPrices({});
    setRoomDiscounts({});
    setShowCompany(false);
    setShowVehicle(false);
    setGuestPhoto(null);
    setIdProofPhotos([]);
    setGrcSearch('');
    setNameSearch('');
    setSearchResults([]);
    setAdditionalGuests([]);
  };

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

  const removeIdProofPhoto = (index) => {
    setIdProofPhotos(idProofPhotos.filter((_, i) => i !== index));
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="-mx-8 -mt-8">
      {/* Hidden invoice for auto email PDF capture */}
      {invoiceData && bookingForInvoice && (
        <div ref={invoiceRef} style={{ position: 'absolute', left: '-9999px', top: 0, width: '750px', background: 'white' }}>
          <InvoiceTemplate inv={invoiceData} booking={bookingForInvoice} />
        </div>
      )}
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
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a4228] font-medium pointer-events-none">
                GRC{new Date().getFullYear() % 100}
              </span>
              <input 
                className={`${inputCls} pl-16`} 
                placeholder="0001" 
                value={grcSearch}
                maxLength={4}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setGrcSearch(value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (grcSearch) {
                      const fullGRC = `GRC${new Date().getFullYear() % 100}${grcSearch.padStart(4, '0')}`;
                      setGrcSearch(fullGRC);
                      handleGRCSearch();
                    }
                  }
                }} 
              />
            </div>
            <p className="text-xs text-[#8B7D3A] mt-1">💡 Enter 4-digit GRC number (e.g., 0001, 0023) to search for returning customer</p>
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
                const customPrice = customPrices[r._id];
                const discount = roomDiscounts[r._id] || {};
                const displayPrice = customPrice !== undefined ? customPrice : r.price;
                return (
                  <div key={r._id} className="border border-[#E8D5A0] rounded-lg bg-white p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-[#3d2e10]">
                        Room {r.roomNumber} &middot; ₹{r.price}/night (default)
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

          {/* Photo Uploads */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelCls}>Guest Photo</label>
              {guestPhoto && (
                <div className="mb-2 relative inline-block">
                  <img src={URL.createObjectURL(guestPhoto)} alt="Guest" className="w-24 h-24 object-cover rounded border border-[#E8D5A0]" />
                  <button type="button" onClick={() => setGuestPhoto(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                    <X size={14} />
                  </button>
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
                    <span className="text-[#5a4228] truncate">{guestPhoto ? guestPhoto.name : 'Choose photo'}</span>
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
              {idProofPhotos.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {idProofPhotos.map((file, i) => (
                    <div key={i} className="relative inline-block">
                      {file.type === 'application/pdf' ? (
                        <div className="w-20 h-20 border border-[#E8D5A0] rounded flex items-center justify-center bg-gray-50">
                          <span className="text-xs text-[#9C7C38]">📄 PDF</span>
                        </div>
                      ) : (
                        <img src={URL.createObjectURL(file)} alt={`ID ${i+1}`} className="w-20 h-20 object-cover rounded border border-[#E8D5A0]" />
                      )}
                      <button type="button" onClick={() => removeIdProofPhoto(i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
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
                  <span className="text-[#5a4228]">Choose ID proof photos ({idProofPhotos.length} selected)</span>
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
          {sectionTitle(<User size={18} />, 'Additional Guests (Optional)')}
          <p className="text-sm text-[#5a4228] mb-4">Add other guests staying in this booking (family members, companions, etc.)</p>
          
          {additionalGuests.map((addGuest, idx) => (
            <div key={idx} className="border border-[#E8D5A0] rounded-lg p-4 mb-4 bg-[#FFFEF9]">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-[#3d2e10]">Guest #{idx + 1}</h4>
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
          
          <button type="button" 
            onClick={() => setAdditionalGuests([...additionalGuests, { ...emptyAdditionalGuest }])}
            className="flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
            <User size={16} />
            Add Another Guest
          </button>
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
              <label className={labelCls}>Number of Adults <span className="text-red-500">*</span></label>
              <input type="number" min="1" className={inputCls} value={booking.adults} onChange={(e) => setBooking({ ...booking, adults: Number(e.target.value) })} required />
            </div>
            <div>
              <label className={labelCls}>Number of Children</label>
              <input type="number" min="0" className={inputCls} value={booking.children} onChange={(e) => setBooking({ ...booking, children: Number(e.target.value) })} />
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

          {/* Bill Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
            <div className="border border-[#e0d5a0] rounded-lg overflow-hidden text-sm">
              <table className="w-full">
                <tbody>
                  {selectedRooms.map((r) => {
                    const price = customPrices[r._id] !== undefined ? Number(customPrices[r._id]) : r.price;
                    const roomSubtotal = price * days;
                    const isCustom = customPrices[r._id] !== undefined;
                    
                    // Calculate discount
                    const discount = roomDiscounts[r._id];
                    let discountAmount = 0;
                    if (discount?.value) {
                      if (discount.type === 'percentage') {
                        discountAmount = (roomSubtotal * Number(discount.value)) / 100;
                      } else {
                        discountAmount = Number(discount.value);
                      }
                    }
                    
                    const roomTotal = roomSubtotal - discountAmount;
                    
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
