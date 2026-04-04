import { useEffect, useRef, useState } from 'react';
import { getInvoiceByBooking } from '../../api/billing';

export default function InvoiceModal({ booking, onClose }) {
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const printRef = useRef();

  useEffect(() => {
    getInvoiceByBooking(booking._id)
      .then((r) => setInv(r.data))
      .catch((e) => setError(e.response?.data?.message || 'Failed to load invoice'))
      .finally(() => setLoading(false));
  }, [booking._id]);

  const handlePrint = () => window.print();

  // Calculations (mirrors Havana logic)
  const calcRoomAmount = () =>
    inv?.items?.filter((i) => i.particulars?.toLowerCase().includes('room') || i.particulars?.toLowerCase().includes('extra bed'))
      .reduce((s, i) => s + (i.amount || 0), 0) || 0;

  const calcTaxable = () => inv?.summary?.taxableAmount || 0;
  const cgstAmt = () => inv?.summary?.cgstAmount || 0;
  const sgstAmt = () => inv?.summary?.sgstAmount || 0;
  const netAmount = () => calcTaxable() + cgstAmt() + sgstAmt();
  const roundOff = () => Math.round(netAmount()) - netAmount();
  const grandTotal = () => inv?.summary?.grandTotal || Math.round(netAmount());
  const totalAdvance = () => inv?.summary?.totalAdvance || 0;
  const balanceDue = () => Math.max(0, grandTotal() - totalAdvance());

  return (
    <>
      <style>{`
        @media print {
          * { visibility: hidden; }
          #buddha-invoice, #buddha-invoice * { visibility: visible !important; }
          #buddha-invoice {
            position: fixed; top: 0; left: 0; width: 100%;
            background: white !important;
            padding: 10px;
            box-sizing: border-box;
          }
          .no-print { display: none !important; }
          @page { margin: 0.2in; size: A4; }
          body { margin: 0; padding: 0; background: white !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          table { border-collapse: collapse !important; }
          table, th, td { border: 1px solid black !important; }
        }
      `}</style>

      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto py-6 no-print" onClick={onClose}>
        <div className="bg-white w-full max-w-4xl mx-4 rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>

          {/* Toolbar */}
          <div className="no-print flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl">
            <span className="font-semibold text-[#3d2e10]">Tax Invoice</span>
            <div className="flex gap-2">
              <button onClick={handlePrint} className="px-4 py-1.5 rounded text-sm font-semibold bg-green-600 hover:bg-green-700 text-white">Print</button>
              <button onClick={onClose} className="px-4 py-1.5 rounded text-sm font-semibold bg-gray-200 hover:bg-gray-300 text-gray-700">Close</button>
            </div>
          </div>

          {/* Invoice Body */}
          <div id="buddha-invoice" className="p-4 sm:p-6 border-2 border-black relative"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='60' viewBox='0 0 200 60'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='36' font-weight='bold' fill='%23C9A84C' opacity='0.08'%3EBUDDHA%3C/text%3E%3C/svg%3E")`, backgroundSize: '50%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>

            {loading && <p className="text-center py-16 text-gray-400">Loading invoice...</p>}
            {error && <p className="text-center py-16 text-red-500">{error}</p>}

            {inv && (
              <>
                {/* Hotel Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                  <div className="flex items-start gap-4">
                    <div className="text-xs">
                      <p className="font-bold text-base">BUDDHA HOTEL</p>
                      <p>Gorakhpur, Uttar Pradesh</p>
                      <p>Website: buddhahotel.in</p>
                      <p>contact@buddhahotel.in</p>
                      <p className="font-semibold">GSTIN: —</p>
                    </div>
                  </div>
                  <div className="text-xs text-right mt-2 sm:mt-0 space-y-1">
                    <p>📞 +91-XXXXXXXXXX</p>
                    <p>✉ contact@buddhahotel.in</p>
                  </div>
                </div>

                {/* Title */}
                <p className="text-center font-bold text-base mb-3">TAX INVOICE</p>

                {/* Client + Invoice Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 text-xs border border-black mb-3">
                  {/* Left: Guest */}
                  <div className="border-r border-black p-2">
                    <div className="grid grid-cols-3 gap-x-1 gap-y-0.5">
                      <p>Name</p><p className="col-span-2">: {inv.guestDetails?.name || '—'}</p>
                      <p>Address</p><p className="col-span-2">: {inv.guestDetails?.address || '—'}</p>
                      <p>City</p><p className="col-span-2">: {inv.guestDetails?.city || '—'}</p>
                      <p>Mobile No.</p><p className="col-span-2">: {inv.guestDetails?.phone || '—'}</p>
                    </div>
                  </div>
                  {/* Right: Booking */}
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
                      {/* Sub Total Row */}
                      <tr className="border border-black bg-gray-100">
                        <td colSpan={2} className="p-1 border border-black text-right font-bold">SUB TOTAL :</td>
                        <td className="p-1 border border-black text-right font-bold">₹{calcRoomAmount().toFixed(2)}</td>
                        <td className="p-1 border border-black text-right font-bold">₹{calcTaxable().toFixed(2)}</td>
                        <td className="p-1 border border-black"></td>
                        <td className="p-1 border border-black text-right font-bold">₹{calcTaxable().toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Tax Before + Net Amount Summary — side by side like Havana */}
                <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-3 text-xs">
                  {/* Tax Before */}
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
                          <td className="p-0.5 border border-black text-right">{calcTaxable().toFixed(2)}</td>
                          <td className="p-0.5 border border-black text-center uppercase">{inv.invoiceDetails?.paymentMode || ''}</td>
                          <td className="p-0.5 border border-black text-right">{totalAdvance().toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="p-0.5 border border-black text-right font-bold">Total</td>
                          <td className="p-0.5 border border-black text-right font-bold">{totalAdvance().toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Net Amount Summary */}
                  <div className="w-full sm:w-2/5">
                    <p className="font-bold mb-1">Net Amount Summary</p>
                    <table className="w-full border-collapse border border-black">
                      <tbody>
                        <tr>
                          <td className="p-0.5 text-right font-medium">Room Amount:</td>
                          <td className="p-0.5 border-l border-black text-right">₹{calcRoomAmount().toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="p-0.5 text-right font-medium">Room After Discount:</td>
                          <td className="p-0.5 border-l border-black text-right">₹{(calcRoomAmount() - (inv.summary?.discount || 0)).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="p-0.5 text-right font-medium">Total Taxable Amount:</td>
                          <td className="p-0.5 border-l border-black text-right">₹{calcTaxable().toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="p-0.5 text-right font-medium">SGST ({inv.taxes?.sgstRate || 0}%):</td>
                          <td className="p-0.5 border-l border-black text-right">₹{sgstAmt().toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="p-0.5 text-right font-medium">CGST ({inv.taxes?.cgstRate || 0}%):</td>
                          <td className="p-0.5 border-l border-black text-right">₹{cgstAmt().toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="p-0.5 text-right font-medium">Round Off:</td>
                          <td className="p-0.5 border-l border-black text-right">{roundOff() >= 0 ? '+' : ''}{roundOff().toFixed(2)}</td>
                        </tr>
                        <tr className="bg-gray-200">
                          <td className="p-0.5 text-right font-bold">NET AMOUNT:</td>
                          <td className="p-0.5 border-l border-black text-right font-bold">₹{Math.round(netAmount())}</td>
                        </tr>
                        {totalAdvance() > 0 && (
                          <tr>
                            <td className="p-0.5 text-right font-medium">Advance Payment:</td>
                            <td className="p-0.5 border-l border-black text-right">-₹{totalAdvance().toFixed(2)}</td>
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

                {/* Advance Payments Detail */}
                {inv.advancePayments?.length > 0 && (
                  <div className="mb-3 text-xs">
                    <p className="font-bold mb-1">Advance Payment Details ({inv.advancePayments.length} payment(s)):</p>
                    <table className="w-full border-collapse border border-black">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="p-1 border border-black">#</th>
                          <th className="p-1 border border-black">Amount</th>
                          <th className="p-1 border border-black">Mode</th>
                          <th className="p-1 border border-black">Date</th>
                          <th className="p-1 border border-black">Note</th>
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
                          <td colSpan={1} className="p-1 border border-black font-bold text-right">Total:</td>
                          <td className="p-1 border border-black text-right font-bold">₹{totalAdvance().toFixed(2)}</td>
                          <td colSpan={3} className="p-1 border border-black"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Billing Instruction */}
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
                    <p className="text-xs text-gray-500">Subject to Gorakhpur Jurisdiction only.</p>
                    <p className="text-xs text-center text-gray-500">E. & O.E.</p>
                    <p></p>
                  </div>
                  <p className="mt-3 text-center text-base font-bold">Thank You, Visit Again</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
