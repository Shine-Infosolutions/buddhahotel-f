import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getBooking } from '../../api/bookings';
import { getInvoiceByBooking } from '../../api/billing';
import { FaWhatsapp } from 'react-icons/fa';

const TABS = ['Hotel Invoice', 'Room Service', 'Restaurant', 'Laundry'];

export default function InvoicePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const id = location.state?.bookingId;
  const [activeTab, setActiveTab] = useState('Hotel Invoice');
  const [showPax, setShowPax] = useState(false);
  const [booking, setBooking] = useState(null);
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getBooking(id), getInvoiceByBooking(id)])
      .then(([bRes, iRes]) => { setBooking(bRes.data); setInv(iRes.data); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading Invoice...</div>;
  if (!inv || !booking) return <div className="min-h-screen flex items-center justify-center text-red-500">Failed to load invoice.</div>;

  const calcRoomAmt = () => inv.items?.filter(i => i.particulars?.toLowerCase().includes('room rent')).reduce((s, i) => s + (i.amount || 0), 0) || 0;
  const calcExtraBedAmt = () => inv.summary?.extraBedAmount || 0;
  const calcSubTotal = () => inv.items?.reduce((s, i) => s + (i.amount || 0), 0) || 0;
  const taxable = () => inv.summary?.taxableAmount || 0;
  const cgst = () => inv.summary?.cgstAmount || 0;
  const sgst = () => inv.summary?.sgstAmount || 0;
  const netAmt = () => taxable() + cgst() + sgst();
  const roundOff = () => Math.round(netAmt()) - netAmt();
  const totalAdv = () => inv.summary?.totalAdvance || 0;
  const grandTotal = () => inv.summary?.grandTotal || Math.round(netAmt());
  const balanceDue = () => Math.max(0, grandTotal() - totalAdv());

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          @page { margin: 0.2in; size: A4; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          table { border-collapse: collapse !important; }
          table, th, td { border: 1px solid black !important; }
        }
      `}</style>

      <div className="bg-white -m-8 p-2 sm:p-4 min-h-screen">
        <div className="max-w-5xl mx-auto border-2 border-black p-4 relative"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='80' viewBox='0 0 300 80'%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='52' font-weight='bold' fill='%23C9A84C' opacity='0.07'%3EBUDDHA%3C/text%3E%3C/svg%3E")`,
            backgroundSize: '55%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat'
          }}>

          {/* Hotel Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
            <div className="flex items-start gap-4">
              <div className="text-xs leading-5">
                <p className="font-bold text-lg tracking-wide">BUDDHA HOTEL</p>
                <p>Gorakhpur, Uttar Pradesh</p>
                <p>Website: buddhahotel.in</p>
                <p>contact@buddhahotel.in</p>
                <p className="font-semibold">GSTIN: —</p>
              </div>
            </div>
            <div className="text-xs text-right mt-2 sm:mt-0 space-y-1 no-print">
              <p>📞 +91-XXXXXXXXXX</p>
              <p>✉ contact@buddhahotel.in</p>
            </div>
          </div>

          {/* Tabs + Action Buttons */}
          <div className="no-print flex flex-wrap justify-between items-center gap-2 mb-4">
            {/* Left: Tabs */}
            <div className="flex gap-2 flex-wrap">
              {TABS.map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}>
                  {tab}
                </button>
              ))}
            </div>
            {/* Right: Actions */}
            <div className="flex gap-2 flex-wrap items-center">
              <button onClick={() => navigate('/bookings')}
                className="flex items-center gap-1 px-4 py-2 rounded text-sm border border-gray-300 bg-white hover:bg-gray-50 text-gray-700">
                ← Back
              </button>
              {activeTab === 'Hotel Invoice' && (
                <button onClick={() => setShowPax((p) => !p)}
                  className="px-4 py-2 rounded text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white">
                  {showPax ? 'Hide PAX' : 'Show PAX'}
                </button>
              )}
              <button
                onClick={() => {
                  const url = `${window.location.origin}/invoice`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, '_blank');
                }}
                className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium bg-green-500 hover:bg-green-600 text-white">
                <FaWhatsapp className="text-base" />
                Share on WhatsApp
              </button>
              <button onClick={() => window.print()}
                className="px-4 py-2 rounded text-sm font-semibold bg-green-600 hover:bg-green-700 text-white">
                Print
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'Hotel Invoice' && (
            <>
              <p className="text-center font-bold text-base mb-3">TAX INVOICE</p>

              {/* Client + Booking Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 text-xs border border-black mb-3">
                <div className="border-r border-black p-2">
                  <div className="grid grid-cols-3 gap-x-1 gap-y-0.5">
                    <p>Name</p><p className="col-span-2">: {inv.guestDetails?.name || '—'}</p>
                    <p>Address</p><p className="col-span-2">: {inv.guestDetails?.address || '—'}</p>
                    <p>City</p><p className="col-span-2">: {inv.guestDetails?.city || '—'}</p>
                    <p>Mobile No.</p><p className="col-span-2">: {inv.guestDetails?.phone || '—'}</p>
                  </div>
                </div>
                <div className="p-2">
                  <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
                    <p className="font-bold">Invoice No. & Date</p>
                    <p>: {inv.invoiceDetails?.invoiceNumber || '—'} {inv.invoiceDetails?.invoiceDate}</p>
                    <p className="font-bold">GRC No.</p>
                    <p>: {inv.invoiceDetails?.grcNumber || '—'}</p>
                    <p className="font-bold">Room No.</p>
                    <p>: {inv.invoiceDetails?.roomNumber || '—'}</p>
                    <p className="font-bold">Room Type</p>
                    <p>: {inv.invoiceDetails?.roomType?.toUpperCase() || '—'}</p>
                    {showPax && (
                      <>
                        <p className="font-bold">PAX</p>
                        <p>: {(booking.numberOfRooms || 1)} room(s)</p>
                      </>
                    )}
                    <p className="font-bold">CheckIn Date & Time</p>
                    <p>: {inv.invoiceDetails?.checkIn} at {inv.invoiceDetails?.checkInTime}</p>
                    <p className="font-bold">CheckOut Date & Time</p>
                    <p>: {inv.invoiceDetails?.checkOut} at {inv.invoiceDetails?.checkOutTime}</p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-3 overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border border-black bg-gray-200">
                      <th className="p-1 border border-black text-left" style={{ width: 90 }}>Date</th>
                      <th className="p-1 border border-black text-left">Particulars</th>
                      <th className="p-1 border border-black text-right whitespace-nowrap">Room Rate</th>
                      <th className="p-1 border border-black text-right whitespace-nowrap">Declared Rate</th>
                      <th className="p-1 border border-black text-center whitespace-nowrap">HSN/SAC Code</th>
                      <th className="p-1 border border-black text-right whitespace-nowrap">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.items?.map((item, i) => (
                      <tr key={i} className="border border-black">
                        <td className="p-1 border border-black">{item.date}</td>
                        <td className="p-1 border border-black">{item.particulars}</td>
                        <td className="p-1 border border-black text-right">₹{(item.roomRate || 0).toFixed(2)}</td>
                        <td className="p-1 border border-black text-right">₹{(item.declaredRate || 0).toFixed(2)}</td>
                        <td className="p-1 border border-black text-center">{item.hsn}</td>
                        <td className="p-1 border border-black text-right font-bold">₹{(item.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="border border-black bg-gray-100">
                      <td colSpan={2} className="p-1 border border-black text-right font-bold">SUB TOTAL :</td>
                      <td className="p-1 border border-black text-right font-bold">₹{calcRoomAmt().toFixed(2)}</td>
                      <td className="p-1 border border-black text-right font-bold">₹{taxable().toFixed(2)}</td>
                      <td className="p-1 border border-black"></td>
                      <td className="p-1 border border-black text-right font-bold">₹{calcSubTotal().toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tax Before + Net Amount Summary */}
              <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-3 text-xs">
                <div className="w-full sm:w-3/5">
                  <p className="font-bold mb-1">Tax Before</p>
                  <table className="w-full border-collapse border border-black">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="p-0.5 border border-black">Tax%</th>
                        <th className="p-0.5 border border-black">Txb.Amt</th>
                        <th className="p-0.5 border border-black">PayType</th>
                        <th className="p-0.5 border border-black">Rec.Amt</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-0.5 border border-black text-center">{(inv.taxes?.cgstRate || 0) + (inv.taxes?.sgstRate || 0)}</td>
                        <td className="p-0.5 border border-black text-right">{taxable().toFixed(2)}</td>
                        <td className="p-0.5 border border-black text-center uppercase">{inv.invoiceDetails?.paymentMode || ''}</td>
                        <td className="p-0.5 border border-black text-right">{totalAdv().toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="p-0.5 border border-black text-right font-bold">Total</td>
                        <td className="p-0.5 border border-black text-right font-bold">{totalAdv().toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="w-full sm:w-2/5">
                  <p className="font-bold mb-1">Net Amount Summary</p>
                  <table className="w-full border-collapse border border-black">
                    <tbody>
                      {[
                        ['Room Amount:', `₹${calcRoomAmt().toFixed(2)}`],
                        ...(calcExtraBedAmt() > 0 ? [['Extra Bed Charge:', `₹${calcExtraBedAmt().toFixed(2)}`]] : []),
                        ['Room After Discount:', `₹${(calcSubTotal() - (inv.summary?.discount || 0)).toFixed(2)}`],
                        ['Total Taxable Amount:', `₹${taxable().toFixed(2)}`],
                        [`SGST (${inv.taxes?.sgstRate || 0}%):`, `₹${sgst().toFixed(2)}`],
                        [`CGST (${inv.taxes?.cgstRate || 0}%):`, `₹${cgst().toFixed(2)}`],
                        ['Round Off:', `${roundOff() >= 0 ? '+' : ''}${roundOff().toFixed(2)}`],
                      ].map(([label, val]) => (
                        <tr key={label}>
                          <td className="p-0.5 text-right font-medium">{label}</td>
                          <td className="p-0.5 border-l border-black text-right">{val}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-200">
                        <td className="p-0.5 text-right font-bold">NET AMOUNT:</td>
                        <td className="p-0.5 border-l border-black text-right font-bold">₹{Math.round(netAmt())}</td>
                      </tr>
                      {totalAdv() > 0 && (
                        <tr>
                          <td className="p-0.5 text-right font-medium">Advance Payment:</td>
                          <td className="p-0.5 border-l border-black text-right">-₹{totalAdv().toFixed(2)}</td>
                        </tr>
                      )}
                      <tr className="bg-yellow-100">
                        <td className="p-0.5 text-right font-bold">GRAND TOTAL:</td>
                        <td className="p-0.5 border-l border-black text-right font-bold">₹{balanceDue().toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Advance Payments */}
              {inv.advancePayments?.length > 0 && (
                <div className="mb-3 text-xs">
                  <p className="font-bold mb-1">Advance Payment Details ({inv.advancePayments.length} payment(s)):</p>
                  <table className="w-full border-collapse border border-black">
                    <thead>
                      <tr className="bg-gray-200">
                        {['#', 'Amount', 'Mode', 'Date', 'Note'].map(h => <th key={h} className="p-1 border border-black">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {inv.advancePayments.map((ap, i) => (
                        <tr key={i}>
                          <td className="p-1 border border-black text-center">{i + 1}</td>
                          <td className="p-1 border border-black text-right font-bold">₹{ap.amount}</td>
                          <td className="p-1 border border-black text-center uppercase">{ap.method || '—'}</td>
                          <td className="p-1 border border-black text-center">{ap.date?.slice(0, 10)}</td>
                          <td className="p-1 border border-black">{ap.note || '—'}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-200">
                        <td className="p-1 border border-black font-bold text-right">Total:</td>
                        <td className="p-1 border border-black text-right font-bold">₹{totalAdv().toFixed(2)}</td>
                        <td colSpan={3} className="p-1 border border-black"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {inv.billingInstruction && (
                <p className="text-xs mb-3"><span className="font-bold">Note: </span>{inv.billingInstruction}</p>
              )}

              {/* Footer */}
              <div className="mt-4 text-xs">
                <div className="grid grid-cols-2 gap-4 border-t border-b border-black py-3">
                  <div>
                    <p className="font-bold">HAVE YOU DEPOSITED YOUR ROOM KEY?</p>
                    <div className="flex gap-4 mt-1">
                      <label><input type="checkbox" className="mr-1" />YES</label>
                      <label><input type="checkbox" className="mr-1" />NO</label>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">CHECK OUT TIME : 12:00</p>
                    <p>I AGREE THAT I AM RESPONSIBLE FOR THE FULL PAYMENT OF THIS BILL.</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 mt-3">
                  <p className="font-bold">FRONT OFFICE MANAGER</p>
                  <p className="font-bold text-center">CASHIER</p>
                  <p className="font-bold text-right">Guest Sign.</p>
                  <p className="text-gray-500">Subject to Gorakhpur Jurisdiction only.</p>
                  <p className="text-center text-gray-500">E. & O.E.</p>
                  <p></p>
                </div>
                <p className="mt-3 text-center text-base font-bold">Thank You, Visit Again</p>
              </div>
            </>
          )}

          {activeTab === 'Room Service' && <EmptyTab label="No Room Service orders found for this booking." />}
          {activeTab === 'Restaurant' && <EmptyTab label="No Restaurant orders found for this booking." />}
          {activeTab === 'Laundry' && <EmptyTab label="No Laundry orders found for this booking." />}
        </div>
      </div>
    </>
  );
}

function EmptyTab({ label }) {
  return (
    <div className="text-center py-16 text-gray-400 text-sm">{label}</div>
  );
}
