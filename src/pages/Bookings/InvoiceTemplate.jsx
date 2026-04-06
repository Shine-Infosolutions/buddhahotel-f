export default function InvoiceTemplate({ inv, booking }) {
  if (!inv || !booking) return null;

  const calcRoomAmt = () => inv.items?.filter(i => i.particulars?.toLowerCase().includes('room rent')).reduce((s, i) => s + (i.amount || 0), 0) || 0;
  const calcExtraBedAmt = () => inv.summary?.extraBedAmount || 0;
  const calcDeclaredTotal = () => inv.items?.reduce((s, i) => s + (i.declaredRate || 0), 0) || 0;
  const taxable = () => inv.summary?.taxableAmount || 0;
  const cgst = () => inv.summary?.cgstAmount || 0;
  const sgst = () => inv.summary?.sgstAmount || 0;
  const netAmt = () => taxable() + cgst() + sgst();
  const roundOff = () => Math.round(netAmt()) - netAmt();
  const totalAdv = () => inv.summary?.totalAdvance || 0;
  const grandTotal = () => inv.summary?.grandTotal || Math.round(netAmt());
  const balanceDue = () => Math.max(0, grandTotal() - totalAdv());

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '750px', margin: '0 auto', border: '2px solid black', padding: '16px', background: 'white' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
          <p style={{ fontWeight: 'bold', fontSize: '16px', margin: '0' }}>BUDDHA HOTEL</p>
          <p style={{ margin: '2px 0' }}>Gorakhpur, Uttar Pradesh</p>
          <p style={{ margin: '2px 0' }}>Website: buddhahotel.in</p>
          <p style={{ margin: '2px 0' }}>contact@buddhahotel.in</p>
          <p style={{ margin: '2px 0', fontWeight: 'bold' }}>GSTIN: —</p>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginBottom: '10px' }}>TAX INVOICE</p>

      {/* Guest + Invoice Details */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '10px' }}>
        <tbody>
          <tr>
            <td style={{ border: '1px solid black', padding: '6px', width: '50%', verticalAlign: 'top' }}>
              <div><b>Name:</b> {inv.guestDetails?.name || '—'}</div>
              <div><b>Address:</b> {inv.guestDetails?.address || '—'}</div>
              <div><b>City:</b> {inv.guestDetails?.city || '—'}</div>
              <div><b>Mobile No.:</b> {inv.guestDetails?.phone || '—'}</div>
            </td>
            <td style={{ border: '1px solid black', padding: '6px', verticalAlign: 'top' }}>
              <div><b>Invoice No. &amp; Date:</b> {inv.invoiceDetails?.invoiceNumber || '—'} {inv.invoiceDetails?.invoiceDate}</div>
              <div><b>GRC No.:</b> {inv.invoiceDetails?.grcNumber || '—'}</div>
              <div><b>Room No.:</b> {inv.invoiceDetails?.roomNumber || '—'}</div>
              <div><b>Room Type:</b> {inv.invoiceDetails?.roomType?.toUpperCase() || '—'}</div>
              <div><b>Check-In:</b> {inv.invoiceDetails?.checkIn} at {inv.invoiceDetails?.checkInTime}</div>
              <div><b>Check-Out:</b> {inv.invoiceDetails?.checkOut} at {inv.invoiceDetails?.checkOutTime}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '10px' }}>
        <thead>
          <tr style={{ background: '#e5e5e5' }}>
            <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left', width: '90px' }}>Date</th>
            <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left' }}>Particulars</th>
            <th style={{ border: '1px solid black', padding: '4px', textAlign: 'right' }}>Room Rate</th>
            <th style={{ border: '1px solid black', padding: '4px', textAlign: 'right' }}>Declared Rate</th>
            <th style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>HSN/SAC</th>
            <th style={{ border: '1px solid black', padding: '4px', textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {inv.items?.map((item, i) => (
            <tr key={i}>
              <td style={{ border: '1px solid black', padding: '4px' }}>{item.date}</td>
              <td style={{ border: '1px solid black', padding: '4px' }}>{item.particulars}</td>
              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right' }}>&#8377;{(item.roomRate || 0).toFixed(2)}</td>
              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right' }}>{item.declaredRate != null ? `₹${item.declaredRate.toFixed(2)}` : ''}</td>
              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>{item.hsn || ''}</td>
              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>{item.amount != null ? `₹${item.amount.toFixed(2)}` : ''}</td>
            </tr>
          ))}
          <tr style={{ background: '#f0f0f0' }}>
            <td colSpan={2} style={{ border: '1px solid black', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>SUB TOTAL :</td>
            <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>&#8377;{calcDeclaredTotal().toFixed(2)}</td>
            <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>&#8377;{calcDeclaredTotal().toFixed(2)}</td>
            <td style={{ border: '1px solid black', padding: '4px' }}></td>
            <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>&#8377;{taxable().toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {/* Tax Before + Net Amount Summary */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', fontSize: '11px' }}>
        <div style={{ flex: '3' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>Tax Before</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black' }}>
            <thead>
              <tr style={{ background: '#e5e5e5' }}>
                <th style={{ border: '1px solid black', padding: '3px' }}>Tax%</th>
                <th style={{ border: '1px solid black', padding: '3px' }}>Txb.Amt</th>
                <th style={{ border: '1px solid black', padding: '3px' }}>PayType</th>
                <th style={{ border: '1px solid black', padding: '3px' }}>Rec.Amt</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid black', padding: '3px 6px', textAlign: 'center' }}>{(inv.taxes?.cgstRate || 0) + (inv.taxes?.sgstRate || 0)}</td>
                <td style={{ border: '1px solid black', padding: '3px 6px', textAlign: 'right' }}>{taxable().toFixed(2)}</td>
                <td style={{ border: '1px solid black', padding: '3px 6px', textAlign: 'center', textTransform: 'uppercase' }}>{inv.invoiceDetails?.paymentMode || ''}</td>
                <td style={{ border: '1px solid black', padding: '3px 6px', textAlign: 'right' }}>{totalAdv().toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan={3} style={{ border: '1px solid black', padding: '3px 6px', textAlign: 'right', fontWeight: 'bold' }}>Total</td>
                <td style={{ border: '1px solid black', padding: '3px 6px', textAlign: 'right', fontWeight: 'bold' }}>{totalAdv().toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ flex: '2' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>Net Amount Summary</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black' }}>
            <tbody>
              {[
                ['Room Amount:', `₹${calcRoomAmt().toFixed(2)}`],
                ...(calcExtraBedAmt() > 0 ? [['Extra Bed Charge:', `₹${calcExtraBedAmt().toFixed(2)}`]] : []),
                ['Total Taxable Amount:', `₹${taxable().toFixed(2)}`],
                [`SGST (${inv.taxes?.sgstRate || 0}%):`, `₹${sgst().toFixed(2)}`],
                [`CGST (${inv.taxes?.cgstRate || 0}%):`, `₹${cgst().toFixed(2)}`],
                ...(inv.summary?.discount > 0 ? [['Discount:', `-₹${inv.summary.discount.toFixed(2)}`]] : []),
                ['Round Off:', `${roundOff() >= 0 ? '+' : ''}${roundOff().toFixed(2)}`],
              ].map(([label, val]) => (
                <tr key={label}>
                  <td style={{ padding: '5px 8px', textAlign: 'right', border: '1px solid black' }}>{label}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid black', textAlign: 'right' }}>{val}</td>
                </tr>
              ))}
              <tr style={{ background: '#e5e5e5' }}>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 'bold', border: '1px solid black' }}>NET AMOUNT:</td>
                <td style={{ padding: '5px 8px', border: '1px solid black', textAlign: 'right', fontWeight: 'bold' }}>&#8377;{Math.round(netAmt() - (inv.summary?.discount || 0))}</td>
              </tr>
              {totalAdv() > 0 && (
                <tr>
                  <td style={{ padding: '5px 8px', textAlign: 'right', border: '1px solid black' }}>Advance Payment:</td>
                  <td style={{ padding: '5px 8px', border: '1px solid black', textAlign: 'right' }}>-&#8377;{totalAdv().toFixed(2)}</td>
                </tr>
              )}
              <tr style={{ background: '#fef9c3' }}>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 'bold', border: '1px solid black' }}>GRAND TOTAL:</td>
                <td style={{ padding: '5px 8px', border: '1px solid black', textAlign: 'right', fontWeight: 'bold' }}>&#8377;{balanceDue().toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Advance Payments */}
      {inv.advancePayments?.length > 0 && (
        <div style={{ marginBottom: '10px', fontSize: '11px' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>Advance Payment Details ({inv.advancePayments.length} payment(s)):</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black' }}>
            <thead>
              <tr style={{ background: '#e5e5e5' }}>
                {['#', 'Amount', 'Mode', 'Date', 'Note'].map(h => <th key={h} style={{ border: '1px solid black', padding: '4px' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {inv.advancePayments.map((ap, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>{i + 1}</td>
                  <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>&#8377;{ap.amount}</td>
                  <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', textTransform: 'uppercase' }}>{ap.method || '—'}</td>
                  <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>{ap.date?.slice(0, 10)}</td>
                  <td style={{ border: '1px solid black', padding: '4px' }}>{ap.note || '—'}</td>
                </tr>
              ))}
              <tr style={{ background: '#e5e5e5' }}>
                <td style={{ border: '1px solid black', padding: '4px', fontWeight: 'bold', textAlign: 'right' }}>Total:</td>
                <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>&#8377;{totalAdv().toFixed(2)}</td>
                <td colSpan={3} style={{ border: '1px solid black', padding: '4px' }}></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {inv.billingInstruction && (
        <p style={{ fontSize: '11px', marginBottom: '10px' }}><b>Note: </b>{inv.billingInstruction}</p>
      )}

      {/* Footer */}
      <div style={{ marginTop: '16px', fontSize: '11px', borderTop: '1px solid black', paddingTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontWeight: 'bold' }}>HAVE YOU DEPOSITED YOUR ROOM KEY?</p>
            <p>☐ YES &nbsp;&nbsp; ☐ NO</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontWeight: 'bold' }}>CHECK OUT TIME : 12:00</p>
            <p>I AGREE THAT I AM RESPONSIBLE FOR THE FULL PAYMENT OF THIS BILL.</p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
          <p style={{ fontWeight: 'bold' }}>FRONT OFFICE MANAGER</p>
          <p style={{ fontWeight: 'bold' }}>CASHIER</p>
          <p style={{ fontWeight: 'bold' }}>Guest Sign.</p>
        </div>
        <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', marginTop: '12px' }}>Thank You, Visit Again</p>
      </div>
    </div>
  );
}
