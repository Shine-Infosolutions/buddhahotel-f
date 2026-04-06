import { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { createGuest } from '../api/guests';
import { updateBooking, getBooking } from '../api/bookings';
import toast from 'react-hot-toast';

const emptyGuest = {
  salutation: 'Mr.', name: '', age: '', gender: '', phone: '', whatsappNo: '',
  email: '', address: '', city: '', state: '', pinCode: '', nationality: '', dateOfBirth: '',
  anniversaryDate: '', companyDetails: '', idType: '', idNumber: '', isVIP: false,
};

export default function AddGuestModal({ bookingId, onClose, onSuccess }) {
  const [guest, setGuest] = useState(emptyGuest);
  const [loading, setLoading] = useState(false);

  const inputCls = 'border border-[#C9A84C] rounded px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-[#A07830] focus:border-[#A07830] transition bg-white';
  const labelCls = 'text-sm text-[#5a4228] mb-1 block font-medium';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const guestRes = await createGuest(guest);
      const newGuestId = guestRes.data._id;
      
      const bookingRes = await getBooking(bookingId);
      const bookingData = bookingRes.data;
      
      const additionalGuests = bookingData.additionalGuests?.map(g => g._id || g) || [];
      additionalGuests.push(newGuestId);
      
      await updateBooking(bookingId, { additionalGuests });
      
      toast.success('Guest added to booking');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add guest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b-2 border-[#E8D5A0] p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#FDF6E3] text-[#9C7C38] p-2 rounded-full">
              <UserPlus size={20} />
            </div>
            <h2 className="text-xl font-bold text-[#3d2e10]">Add Additional Guest</h2>
          </div>
          <button onClick={onClose} className="text-[#9C7C38] hover:text-[#7A5F28]">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
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
              <input className={inputCls} maxLength={6} value={guest.pinCode} onChange={(e) => setGuest({ ...guest, pinCode: e.target.value })} />
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#E8D5A0]">
            <button type="button" onClick={onClose} className="border-2 border-[#9C7C38] text-[#9C7C38] hover:bg-[#FDF6E3] px-6 py-2 rounded text-sm font-semibold transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="bg-[#9C7C38] hover:bg-[#7A5F28] disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-semibold transition-colors">
              {loading ? 'Adding...' : 'Add Guest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
