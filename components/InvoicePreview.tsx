import React, { forwardRef } from 'react';
import { InvoiceData, COMPANY_DEFAULTS } from '../types';

interface InvoicePreviewProps {
  data: InvoiceData;
  calculations: {
    subtotal: number;
    discountAmount: number;
    grandTotal: number;
  };
  targetId?: string;
}

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(({ data, calculations, targetId = "invoice-capture" }, ref) => {
  const { customer, items, invoiceNo, date, logo } = data;
  const { subtotal, discountAmount, grandTotal } = calculations;

  return (
    <div className="w-full overflow-x-auto flex justify-center bg-gray-200 py-4">
      <div
        ref={ref}
        id={targetId}
        className="bg-white text-black relative shadow-2xl flex-shrink-0"
        style={{
          width: `${A4_WIDTH_MM}mm`,
          height: `${A4_HEIGHT_MM}mm`,
          padding: '12mm 15mm',
          boxSizing: 'border-box',
          fontSize: '10pt',
          fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
          display: 'flex',
          flexDirection: 'column',
          lineHeight: '1.4'
        }}
      >
        {/* --- HEADER --- */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6 w-full">
            <div className="flex items-center gap-5">
                <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center border border-gray-100 bg-gray-50 rounded-md overflow-hidden shadow-sm">
                   {logo ? (
                     <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                   ) : (
                     <span className="text-[10px] text-gray-400 font-bold">NO LOGO</span>
                   )}
                </div>
                <div>
                   <h1 className="text-2xl font-black uppercase tracking-tight text-red-700 leading-none mb-1">
                     {COMPANY_DEFAULTS.name}
                   </h1>
                   <div className="text-[11px] text-slate-600 font-medium leading-relaxed">
                     <p>{COMPANY_DEFAULTS.address}</p>
                     <p>Ph: <span className="text-slate-900 font-bold">{COMPANY_DEFAULTS.mobile}</span></p>
                   </div>
                </div>
            </div>

            <div className="text-right">
               <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter opacity-10">INVOICE</h2>
               <div className="mt-2 space-y-0.5">
                  <div className="flex justify-end gap-2 text-[11px]">
                     <span className="text-slate-400 font-bold uppercase">No:</span>
                     <span className="font-bold font-mono text-slate-900">{invoiceNo}</span>
                  </div>
                  <div className="flex justify-end gap-2 text-[11px]">
                     <span className="text-slate-400 font-bold uppercase">Date:</span>
                     <span className="font-bold text-slate-900">{new Date(date).toLocaleDateString('en-GB')}</span>
                  </div>
               </div>
            </div>
        </div>

        {/* --- CUSTOMER & VEHICLE --- */}
        <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-slate-50 p-3 rounded-md border border-slate-200">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Customer Information</p>
                <p className="font-bold text-sm uppercase text-slate-900">{customer.name || 'Cash Customer'}</p>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{customer.address || 'Salem, Tamil Nadu'}</p>
                <p className="text-[11px] font-bold mt-1 text-slate-800">Mob: {customer.mobile || 'N/A'}</p>
            </div>
            <div className="w-[35%] bg-slate-900 text-white p-3 rounded-md">
                <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Vehicle Details</p>
                <p className="text-[11px] font-medium text-slate-300">{customer.vehicleName || 'N/A'}</p>
                <p className="text-lg font-black font-mono mt-1 tracking-tighter">{customer.vehicleNumber || '----------'}</p>
            </div>
        </div>

        {/* --- SERVICES TABLE --- */}
        <div className="flex-grow">
            <table className="w-full border-collapse text-[11px] table-fixed">
               <thead>
                  <tr className="bg-slate-100 text-slate-600 font-black uppercase text-[9px] border-y border-slate-200">
                     <th className="py-2 w-[8%] text-center">#</th>
                     <th className="py-2 w-[52%] px-2 text-left">Service Description</th>
                     <th className="py-2 w-[12%] text-right">Rate</th>
                     <th className="py-2 w-[8%] text-center">Qty</th>
                     <th className="py-2 w-[20%] text-right pr-2">Amount</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => (
                    <tr key={item.id} className="h-9">
                       <td className="text-center text-slate-400 font-mono">{index + 1}</td>
                       <td className="px-2 font-bold text-slate-800 truncate">{item.description}</td>
                       <td className="text-right text-slate-600">₹{item.rate.toFixed(2)}</td>
                       <td className="text-center text-slate-600">{item.quantity}</td>
                       <td className="text-right pr-2 font-bold text-slate-900 font-mono">₹{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                  {/* Fill empty space */}
                  {Array.from({ length: Math.max(0, 12 - items.length) }).map((_, i) => (
                      <tr key={`f-${i}`} className="h-9 border-none opacity-0">
                         <td colSpan={5}>&nbsp;</td>
                      </tr>
                  ))}
               </tbody>
            </table>
        </div>

        {/* --- SUMMARY SECTION --- */}
        <div className="flex justify-between items-start mt-4 pt-4 border-t-2 border-slate-100">
            <div className="w-[50%]">
                 {/* Empty left side for spacing */}
            </div>
            <div className="w-[40%] space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Sub Total</span>
                    <span className="font-bold text-slate-800">₹{subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                    <div className="flex justify-between text-[11px] text-red-600 font-bold">
                        <span>Discount</span>
                        <span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between items-center bg-slate-900 text-white p-2 rounded-md mt-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Grand Total</span>
                    <span className="text-xl font-black font-mono">₹{grandTotal}</span>
                </div>
                <p className="text-[8px] text-right text-slate-400 italic">Rounded off to nearest rupee</p>
            </div>
        </div>

        {/* --- FOOTER (STRICT ALIGNMENT) --- */}
        <div className="absolute bottom-0 left-0 right-0 h-[50mm] px-[15mm] pb-[10mm] flex justify-between items-end">
            
            {/* Payment & Terms (Left) */}
            <div className="w-[60%] h-full flex flex-col justify-between border-t border-slate-200 pt-3">
                <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Payment History</p>
                    <table className="w-full text-[9px] border border-slate-100 rounded overflow-hidden">
                        <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[8px]">
                            <tr>
                                <th className="text-left py-1 px-2">Method</th>
                                <th className="text-left py-1 px-2">Reference</th>
                                <th className="text-right py-1 px-2">Paid</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.payments.map((p, i) => (
                                <tr key={i} className="text-slate-600">
                                    <td className="py-1 px-2 font-bold uppercase">{p.method}</td>
                                    <td className="py-1 px-2 truncate max-w-[120px]">{p.reference || '-'}</td>
                                    <td className="py-1 px-2 text-right font-bold text-slate-900">₹{p.amount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4">
                    <p className="text-[8px] font-black text-slate-300 uppercase mb-1">Standard Terms</p>
                    <ul className="text-[8px] text-slate-400 leading-tight list-disc pl-3">
                        <li>Warranty only applies to parts listed above.</li>
                        <li>Not responsible for any valuables left in vehicle.</li>
                        <li>Payments must be cleared before vehicle delivery.</li>
                    </ul>
                </div>
            </div>

            {/* Signature (Right) */}
            <div className="w-[30%] h-full flex flex-col justify-end border-t border-slate-200 pt-3">
                <div className="text-center pb-2">
                    <p className="text-[10px] font-bold text-slate-900 uppercase">Target Car Care</p>
                    <div className="h-8"></div> {/* Space for stamp/sign */}
                    <div className="border-t border-slate-300 pt-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Auth. Signatory</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
});

InvoicePreview.displayName = "InvoicePreview";