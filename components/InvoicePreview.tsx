import React, { forwardRef } from 'react';
import { InvoiceData, COMPANY_DEFAULTS } from '../types';

interface InvoicePreviewProps {
  data: InvoiceData;
  calculations: {
    subtotal: number;
    discountAmount: number;
    grandTotal: number;
  };
}

// Fixed dimensions for A4 compliance
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(({ data, calculations }, ref) => {
  const { customer, items, invoiceNo, date } = data;
  const { subtotal, discountAmount, grandTotal } = calculations;

  return (
    <div className="w-full overflow-x-auto flex justify-center bg-gray-500/20 p-4 rounded-lg border border-gray-300">
      <div
        ref={ref}
        id="invoice-capture"
        className="bg-white text-black relative shadow-2xl flex-shrink-0"
        style={{
          width: `${A4_WIDTH_MM}mm`,
          height: `${A4_HEIGHT_MM}mm`,
          padding: '15mm', // Standard print margin
          boxSizing: 'border-box',
          fontSize: '10pt', // Professional font size
          fontFamily: 'Times New Roman, serif' // Or a clean sans-serif like Inter
        }}
      >
        {/* HEADER */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 border border-gray-400 flex items-center justify-center font-bold text-xs text-gray-500">
               LOGO
            </div>
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wider text-red-700">{COMPANY_DEFAULTS.name}</h1>
              <p className="text-sm font-semibold">{COMPANY_DEFAULTS.address}</p>
              <p className="text-sm">Mobile: <span className="font-mono font-bold">{COMPANY_DEFAULTS.mobile}</span></p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase text-gray-800">Tax Invoice</h2>
            <div className="mt-2 text-sm">
              <p><span className="font-semibold">Invoice No:</span> {invoiceNo}</p>
              <p><span className="font-semibold">Date:</span> {date}</p>
            </div>
          </div>
        </div>

        {/* CUSTOMER INFO */}
        <div className="flex justify-between mb-6">
          <div className="w-[55%] border p-2 text-sm">
            <h3 className="font-bold border-b border-gray-300 mb-1 pb-1 text-blue-800">Bill To:</h3>
            <p className="font-bold uppercase">{customer.name}</p>
            <p>{customer.address}</p>
            <p>Ph: {customer.mobile}</p>
            {customer.gstin && <p>GSTIN: {customer.gstin}</p>}
          </div>
          <div className="w-[40%] border p-2 text-sm">
            <h3 className="font-bold border-b border-gray-300 mb-1 pb-1 text-blue-800">Vehicle Details:</h3>
            <p><span className="font-semibold">Model:</span> {customer.vehicleName}</p>
            <p><span className="font-semibold">Veh. No:</span> <span className="uppercase font-mono">{customer.vehicleNumber}</span></p>
          </div>
        </div>

        {/* TABLE */}
        <div className="flex-grow">
          <table className="w-full border-collapse border border-black text-sm">
            <thead className="bg-gray-100 text-black font-bold uppercase text-xs">
              <tr>
                <th className="border border-black p-2 w-12 text-center">S.No</th>
                <th className="border border-black p-2 text-left">Description</th>
                <th className="border border-black p-2 w-24 text-right">Rate</th>
                <th className="border border-black p-2 w-16 text-center">Qty</th>
                <th className="border border-black p-2 w-28 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="h-8">
                  <td className="border-x border-black px-2 text-center">{index + 1}</td>
                  <td className="border-x border-black px-2">{item.description}</td>
                  <td className="border-x border-black px-2 text-right">{item.rate.toFixed(2)}</td>
                  <td className="border-x border-black px-2 text-center">{item.quantity}</td>
                  <td className="border-x border-black px-2 text-right">{item.total.toFixed(2)}</td>
                </tr>
              ))}
              {/* Fill empty rows to maintain A4 structure if needed, or allow whitespace */}
              {Array.from({ length: Math.max(0, 12 - items.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-8">
                  <td className="border-x border-black"></td>
                  <td className="border-x border-black"></td>
                  <td className="border-x border-black"></td>
                  <td className="border-x border-black"></td>
                  <td className="border-x border-black"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTALS & FOOTER - Fixed at bottom of content area, but before absolute footer */}
        <div className="mt-2 flex justify-end">
          <div className="w-64">
            <div className="flex justify-between py-1 border-b border-gray-300 text-sm">
              <span>Sub Total:</span>
              <span>₹ {subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between py-1 border-b border-gray-300 text-sm text-red-600">
                <span>Discount:</span>
                <span>- ₹ {discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b-2 border-black font-bold text-lg bg-gray-100 px-1 mt-1">
              <span>Grand Total:</span>
              <span>₹ {grandTotal.toFixed(0)}</span>
            </div>
            <p className="text-[10px] text-gray-500 text-right mt-1">* Rounded to nearest whole number</p>
          </div>
        </div>

        {/* ABSOLUTE FOOTER */}
        <div className="absolute bottom-[15mm] left-[15mm] right-[15mm] h-[30mm]">
           <div className="flex justify-between items-end h-full">
              <div className="text-xs text-gray-500 max-w-[50%]">
                 <p className="font-bold text-black">Payment Details:</p>
                 {data.payments.length > 0 ? (
                   data.payments.map((p, i) => (
                     <p key={i}>{p.method}: ₹{p.amount} {p.reference ? `(Ref: ${p.reference})` : ''}</p>
                   ))
                 ) : <p>Cash</p>}
              </div>

              <div className="text-center">
                 <div className="h-16 w-40 border-b border-black mb-2"></div>
                 <p className="font-bold text-sm">Authority Signature</p>
                 <p className="text-[10px] text-gray-500">For Target Car Care</p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
});

InvoicePreview.displayName = "InvoicePreview";