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

// Fixed dimensions for A4 compliance (210mm x 297mm)
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(({ data, calculations }, ref) => {
  const { customer, items, invoiceNo, date, logo } = data;
  const { subtotal, discountAmount, grandTotal } = calculations;

  return (
    <div className="w-full overflow-x-auto flex justify-center">
      <div
        ref={ref}
        id="invoice-capture"
        className="bg-white text-black relative shadow-2xl flex-shrink-0"
        style={{
          width: `${A4_WIDTH_MM}mm`,
          height: `${A4_HEIGHT_MM}mm`,
          padding: '12mm 15mm', // Padding for visual display
          boxSizing: 'border-box',
          fontSize: '10pt',
          fontFamily: '"Times New Roman", serif',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* --- HEADER SECTION --- */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6 w-full">
            {/* Left: Logo & Company Name */}
            <div className="flex items-center gap-4">
                <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center border border-gray-100 bg-gray-50 rounded-sm">
                   {logo ? (
                     <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                   ) : (
                     <span className="text-xs text-gray-400 text-center leading-tight">NO LOGO</span>
                   )}
                </div>
                <div>
                   <h1 className="text-2xl font-bold uppercase tracking-wide text-red-700 leading-none mb-1">
                     {COMPANY_DEFAULTS.name}
                   </h1>
                   <div className="text-sm text-gray-800 leading-snug">
                     <p>{COMPANY_DEFAULTS.address}</p>
                     <p className="mt-0.5">Mobile: <span className="font-bold">{COMPANY_DEFAULTS.mobile}</span></p>
                   </div>
                </div>
            </div>

            {/* Right: Invoice Label & Meta */}
            <div className="text-right flex flex-col items-end">
               <h2 className="text-3xl font-bold text-gray-800 uppercase tracking-widest leading-none opacity-80">INVOICE</h2>
               <div className="mt-4 text-right space-y-1 text-sm">
                  <div className="flex items-center justify-end gap-2">
                     <span className="font-semibold text-gray-600">Invoice No:</span>
                     <span className="font-bold font-mono text-base text-black">{invoiceNo}</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                     <span className="font-semibold text-gray-600">Date:</span>
                     <span className="font-medium">{new Date(date).toLocaleDateString('en-GB')}</span>
                  </div>
               </div>
            </div>
        </div>

        {/* --- BILLING & VEHICLE INFO --- */}
        <div className="flex gap-6 mb-8 w-full items-stretch">
            
            {/* Billing To */}
            <div className="flex-1 border border-gray-300 rounded-sm p-3 relative pt-4">
                <div className="absolute -top-2.5 left-2 bg-white px-2 text-xs font-bold text-blue-800 uppercase tracking-wider border border-gray-200 rounded-sm shadow-sm">
                    Bill To
                </div>
                <div className="mt-1">
                   <p className="font-bold text-base uppercase mb-1">{customer.name || 'Walk-in Customer'}</p>
                   <p className="text-sm text-gray-700 whitespace-pre-line leading-tight min-h-[2.5em]">
                      {customer.address || 'N/A'}
                   </p>
                   <div className="mt-2 pt-2 border-t border-dashed border-gray-300 flex flex-wrap justify-between text-sm gap-2">
                      <span>Ph: <span className="font-semibold font-mono">{customer.mobile}</span></span>
                      {customer.gstin && <span>GSTIN: <span className="font-mono">{customer.gstin}</span></span>}
                   </div>
                </div>
            </div>

            {/* Vehicle Details */}
            <div className="w-[40%] border border-gray-300 rounded-sm p-3 relative pt-4">
                 <div className="absolute -top-2.5 left-2 bg-white px-2 text-xs font-bold text-blue-800 uppercase tracking-wider border border-gray-200 rounded-sm shadow-sm">
                    Vehicle Details
                </div>
                <div className="mt-1 space-y-2 text-sm">
                   <div className="flex justify-between items-center border-b border-gray-100 pb-1">
                      <span className="text-gray-600">Model:</span>
                      <span className="font-semibold uppercase">{customer.vehicleName || '-'}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-gray-600">Vehicle No:</span>
                      <span className="font-mono font-bold text-base bg-yellow-50 px-2 border border-yellow-100 rounded text-black">
                         {customer.vehicleNumber || '-'}
                      </span>
                   </div>
                </div>
            </div>
        </div>

        {/* --- ITEMS TABLE --- */}
        <div className="flex-grow w-full">
            <table className="w-full border-collapse border border-gray-800 text-sm">
               <thead className="bg-gray-100 text-black font-bold uppercase text-[11px] tracking-wider">
                  <tr>
                     <th className="border border-gray-800 py-2 w-12 text-center">S.No</th>
                     <th className="border border-gray-800 py-2 px-3 text-left">Description</th>
                     <th className="border border-gray-800 py-2 w-24 text-right px-2">Rate</th>
                     <th className="border border-gray-800 py-2 w-16 text-center">Qty</th>
                     <th className="border border-gray-800 py-2 w-28 text-right px-2">Total</th>
                  </tr>
               </thead>
               <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id} className="h-8 border-b border-gray-300 last:border-b-0">
                       <td className="border-x border-gray-800 text-center align-middle">{index + 1}</td>
                       <td className="border-x border-gray-800 px-3 align-middle font-medium text-gray-800">{item.description}</td>
                       <td className="border-x border-gray-800 px-2 text-right align-middle font-mono">{item.rate.toFixed(2)}</td>
                       <td className="border-x border-gray-800 text-center align-middle">{item.quantity}</td>
                       <td className="border-x border-gray-800 px-2 text-right align-middle font-mono font-bold">{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                  {/* Filler rows to push footer down visually and maintain vertical lines */}
                   {Array.from({ length: Math.max(0, 14 - items.length) }).map((_, i) => (
                      <tr key={`empty-${i}`} className="h-8 border-b border-gray-100">
                         <td className="border-x border-gray-800"></td>
                         <td className="border-x border-gray-800"></td>
                         <td className="border-x border-gray-800"></td>
                         <td className="border-x border-gray-800"></td>
                         <td className="border-x border-gray-800"></td>
                      </tr>
                   ))}
                   {/* Final bottom border for table body */}
                   <tr className="h-0">
                       <td colSpan={5} className="border-t border-gray-800"></td>
                   </tr>
               </tbody>
            </table>
        </div>

        {/* --- TOTALS SECTION --- */}
        <div className="flex justify-end mt-4 mb-24"> 
             <div className="w-[45%] flex flex-col">
                 
                 {/* Subtotal */}
                 <div className="flex justify-between items-center py-1 px-2 border-x border-b border-gray-200">
                    <span className="font-semibold text-gray-600 text-sm">Sub Total</span>
                    <span className="font-mono font-medium">₹ {subtotal.toFixed(2)}</span>
                 </div>
                 
                 {/* Discount */}
                 {discountAmount > 0 && (
                    <div className="flex justify-between items-center py-1 px-2 border-x border-b border-gray-200 bg-red-50 text-red-700">
                        <span className="font-semibold text-xs uppercase">Discount</span>
                        <span className="font-mono font-medium">- ₹ {discountAmount.toFixed(2)}</span>
                    </div>
                 )}

                 {/* Grand Total */}
                 <div className="flex justify-between items-center py-2 px-2 border border-gray-800 bg-gray-800 text-white mt-[-1px] shadow-sm">
                    <span className="font-bold uppercase tracking-wide text-sm">Grand Total</span>
                    <span className="font-mono font-bold text-xl">₹ {grandTotal.toFixed(0)}</span>
                 </div>
                 <div className="text-right text-[10px] text-gray-500 mt-1 italic">
                    (Rounded to nearest integer)
                 </div>
             </div>
        </div>


        {/* --- ABSOLUTE FOOTER --- */}
        <div className="absolute bottom-0 left-0 right-0 h-[35mm] px-[15mm] pb-[12mm]">
             <div className="h-full border-t-2 border-gray-800 flex justify-between items-end pt-2">
                
                {/* Left: Payment Info & Terms */}
                <div className="w-[60%] text-xs text-gray-700 space-y-2">
                     <div>
                        <p className="font-bold text-black uppercase text-[11px] mb-1">Payment Mode:</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                             {data.payments.length > 0 ? (
                                data.payments.map((p, i) => (
                                    <div key={i} className="flex gap-1 items-center bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                        <span className="font-semibold text-[10px] uppercase">{p.method}:</span>
                                        <span className="font-mono font-bold">₹{p.amount}</span>
                                    </div>
                                ))
                             ) : <span>Cash</span>}
                        </div>
                     </div>
                     <div className="pt-2">
                        <p className="font-bold text-[10px] uppercase mb-0.5">Terms & Conditions:</p>
                        <ul className="list-disc list-inside text-[9px] leading-tight text-gray-500">
                           <li>Goods once sold cannot be taken back.</li>
                           <li>Subject to Salem jurisdiction.</li>
                        </ul>
                     </div>
                </div>

                {/* Right: Signature */}
                <div className="text-center w-[35%] flex flex-col items-center justify-end pb-1">
                     {/* Digital Signature Placeholder */}
                     <div className="h-10 w-full mb-1"></div> 
                     <p className="font-bold text-sm border-t border-gray-400 w-full pt-1 text-center">Authorized Signatory</p>
                     <p className="text-[9px] text-gray-500 uppercase tracking-wider">{COMPANY_DEFAULTS.name}</p>
                </div>

             </div>
        </div>

      </div>
    </div>
  );
});

InvoicePreview.displayName = "InvoicePreview";