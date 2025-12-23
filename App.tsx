import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Save, Download, Search, RefreshCw, Printer } from 'lucide-react';
import { InvoiceData, LineItem, Payment, COMPANY_DEFAULTS, SavedInvoice } from './types';
import { InvoicePreview } from './components/InvoicePreview';
import { saveInvoice, searchInvoices } from './services/supabase';

declare global {
  interface Window {
    html2canvas: any;
  }
}

// Helper to generate Invoice ID
const generateInvoiceNo = () => `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

// Initial State
const INITIAL_INVOICE: InvoiceData = {
  invoiceNo: generateInvoiceNo(),
  date: new Date().toISOString().split('T')[0],
  customer: {
    name: '',
    mobile: '',
    vehicleName: '',
    vehicleNumber: '',
    address: '',
    gstin: ''
  },
  items: [
    { id: '1', description: 'General Service', rate: 0, quantity: 1, total: 0 }
  ],
  payments: [
    { id: '1', method: 'Cash', amount: 0 }
  ],
  discountType: 'FIXED',
  discountValue: 0
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'search'>('create');
  const [invoice, setInvoice] = useState<InvoiceData>(INITIAL_INVOICE);
  const [isSaving, setIsSaving] = useState(false);
  const [searchResults, setSearchResults] = useState<SavedInvoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const printRef = useRef<HTMLDivElement>(null);

  // --- Calculations ---
  const subtotal = invoice.items.reduce((sum, item) => sum + item.total, 0);
  
  let discountAmount = 0;
  if (invoice.discountType === 'PERCENT') {
    discountAmount = subtotal * (invoice.discountValue / 100);
  } else {
    discountAmount = invoice.discountValue;
  }
  
  // Ensure discount doesn't exceed subtotal
  discountAmount = Math.min(discountAmount, subtotal);
  
  const totalAfterDiscount = subtotal - discountAmount;
  const grandTotal = Math.round(totalAfterDiscount);

  // --- Handlers ---

  const handleCustomerChange = (field: keyof typeof invoice.customer, value: string) => {
    setInvoice(prev => ({
      ...prev,
      customer: { ...prev.customer, [field]: value }
    }));
  };

  const updateItem = (id: string, field: keyof LineItem, value: number | string) => {
    setInvoice(prev => {
      const newItems = prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'rate' || field === 'quantity') {
            updatedItem.total = Number(updatedItem.rate) * Number(updatedItem.quantity);
          }
          return updatedItem;
        }
        return item;
      });
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      description: '',
      rate: 0,
      quantity: 1,
      total: 0
    };
    setInvoice(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const removeItem = (id: string) => {
    if (invoice.items.length === 1) return;
    setInvoice(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
  };

  const updatePayment = (id: string, field: keyof Payment, value: string | number) => {
     setInvoice(prev => ({
       ...prev,
       payments: prev.payments.map(p => p.id === id ? { ...p, [field]: value } : p)
     }));
  };

  const addPayment = () => {
     // Calculate already allocated amount
     const currentAllocated = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
     // The new payment should cover the remaining balance
     const remaining = Math.max(0, grandTotal - currentAllocated);

     setInvoice(prev => ({
       ...prev,
       payments: [...prev.payments, { id: Date.now().toString(), method: 'Cash', amount: remaining }]
     }));
  };

  const removePayment = (id: string) => {
    if (invoice.payments.length === 1) return;
    setInvoice(prev => ({ ...prev, payments: prev.payments.filter(p => p.id !== id) }));
  };

  const handleSaveToDB = async () => {
    setIsSaving(true);
    try {
      const { error } = await saveInvoice(invoice, grandTotal);
      if (error) {
        alert("Failed to save invoice: " + error.message);
      } else {
        alert("Invoice saved successfully!");
      }
    } catch (e) {
      console.error(e);
      alert("An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadJPEG = async () => {
    if (!printRef.current || !window.html2canvas) return;
    try {
      const canvas = await window.html2canvas(printRef.current, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false
      });
      const link = document.createElement('a');
      link.download = `${invoice.invoiceNo}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export JPEG");
    }
  };

  const handleSearch = async () => {
    if (!searchTerm) return;
    const results = await searchInvoices(searchTerm);
    setSearchResults(results);
  };

  const loadInvoice = (saved: SavedInvoice) => {
    setInvoice(saved.data);
    setActiveTab('create');
  };

  const handleNewInvoice = () => {
    if (window.confirm("Start new invoice? Unsaved changes will be lost.")) {
      setInvoice({ ...INITIAL_INVOICE, invoiceNo: generateInvoiceNo() });
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800">
      {/* Navbar */}
      <nav className="bg-brand-dark text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-red rounded flex items-center justify-center font-bold">T</div>
            <span className="font-bold text-xl tracking-wide">TARGET <span className="text-gray-400 text-sm font-normal">Car Care ERP</span></span>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 rounded-md transition ${activeTab === 'create' ? 'bg-brand-blue text-white' : 'hover:bg-gray-700'}`}
            >
              New Invoice
            </button>
            <button 
              onClick={() => setActiveTab('search')}
              className={`px-4 py-2 rounded-md transition ${activeTab === 'search' ? 'bg-brand-blue text-white' : 'hover:bg-gray-700'}`}
            >
              History / Search
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
        
        {activeTab === 'search' ? (
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-brand-dark border-b pb-2">Invoice History</h2>
            <div className="flex gap-4 mb-6">
              <input 
                type="text" 
                placeholder="Enter Invoice No or Mobile..." 
                className="flex-grow p-3 border rounded-lg focus:ring-2 focus:ring-brand-blue outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button 
                onClick={handleSearch}
                className="bg-brand-blue text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
              >
                <Search size={20} /> Search
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 uppercase text-sm">
                    <th className="p-3">Date</th>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Mobile</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.length > 0 ? searchResults.map(inv => (
                    <tr key={inv.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{new Date(inv.created_at).toLocaleDateString()}</td>
                      <td className="p-3 font-mono">{inv.invoice_no}</td>
                      <td className="p-3">{inv.customer_name}</td>
                      <td className="p-3">{inv.mobile}</td>
                      <td className="p-3 text-right font-bold">₹{inv.total_amount}</td>
                      <td className="p-3 text-center">
                        <button onClick={() => loadInvoice(inv)} className="text-brand-blue hover:underline">View</button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">No records found. Try searching.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col xl:flex-row gap-8">
            
            {/* LEFT COLUMN: EDITOR */}
            <div className="flex-1 space-y-6">
              
              {/* Card: Invoice Meta & Customer */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h3 className="font-bold text-gray-700">Customer Details</h3>
                  <div className="flex gap-2">
                    <div className="bg-gray-100 px-3 py-1 rounded text-sm font-mono">
                      Inv: {invoice.invoiceNo}
                    </div>
                    <input 
                      type="date" 
                      className="bg-gray-100 px-2 py-1 rounded text-sm"
                      value={invoice.date}
                      onChange={(e) => setInvoice({...invoice, date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input placeholder="Customer Name" className="p-2 border rounded" value={invoice.customer.name} onChange={e => handleCustomerChange('name', e.target.value)} />
                  <input placeholder="Mobile Number" className="p-2 border rounded" value={invoice.customer.mobile} onChange={e => handleCustomerChange('mobile', e.target.value)} />
                  <input placeholder="Vehicle Model (e.g. Swift Dzire)" className="p-2 border rounded" value={invoice.customer.vehicleName} onChange={e => handleCustomerChange('vehicleName', e.target.value)} />
                  <input placeholder="Vehicle Number (TN-XX-XX-XXXX)" className="p-2 border rounded uppercase" value={invoice.customer.vehicleNumber} onChange={e => handleCustomerChange('vehicleNumber', e.target.value)} />
                  <input placeholder="Address" className="p-2 border rounded md:col-span-2" value={invoice.customer.address} onChange={e => handleCustomerChange('address', e.target.value)} />
                  <input placeholder="GSTIN (Optional)" className="p-2 border rounded" value={invoice.customer.gstin || ''} onChange={e => handleCustomerChange('gstin', e.target.value)} />
                </div>
              </div>

              {/* Card: Items */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-700">Service / Parts</h3>
                  <button onClick={addItem} className="flex items-center gap-1 text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                    <Plus size={16} /> Add Row
                  </button>
                </div>
                
                <div className="space-y-3">
                  {invoice.items.map((item, idx) => (
                    <div key={item.id} className="flex gap-2 items-start">
                      <span className="pt-2 text-xs text-gray-400 w-4">{idx + 1}.</span>
                      <input 
                        placeholder="Description" 
                        className="flex-grow p-2 border rounded" 
                        value={item.description} 
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      />
                      <div className="w-24">
                        <input 
                          type="number" placeholder="Rate" 
                          className="w-full p-2 border rounded text-right" 
                          value={item.rate} 
                          onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="w-16">
                        <input 
                          type="number" placeholder="Qty" 
                          className="w-full p-2 border rounded text-center" 
                          value={item.quantity} 
                          onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="w-24 pt-2 text-right font-mono font-medium text-gray-700">
                        {item.total.toFixed(2)}
                      </div>
                      <button onClick={() => removeItem(item.id)} className="p-2 text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card: Payments & Discounts */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Payments */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                       <h3 className="font-bold text-gray-700 text-sm uppercase">Payment Methods</h3>
                       <button onClick={addPayment} className="text-xs text-blue-600 font-bold">+ Split Payment</button>
                    </div>
                    <div className="space-y-2">
                      {invoice.payments.map((p) => (
                        <div key={p.id} className="flex gap-2">
                          <select 
                            className="border rounded p-2 text-sm bg-white"
                            value={p.method}
                            onChange={(e) => updatePayment(p.id, 'method', e.target.value)}
                          >
                            <option>Cash</option>
                            <option>UPI</option>
                            <option>Card</option>
                            <option>Bank Transfer</option>
                          </select>
                          <input 
                            className="border rounded p-2 w-24 text-sm"
                            type="number"
                            placeholder="Amount"
                            value={p.amount}
                            onChange={(e) => updatePayment(p.id, 'amount', parseFloat(e.target.value) || 0)}
                          />
                           <input 
                            className="border rounded p-2 flex-grow text-sm"
                            type="text"
                            placeholder="Ref ID (Optional)"
                            value={p.reference || ''}
                            onChange={(e) => updatePayment(p.id, 'reference', e.target.value)}
                          />
                          <button onClick={() => removePayment(p.id)} className="text-red-400"><Trash2 size={14}/></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary & Discount */}
                  <div className="bg-gray-50 p-4 rounded border">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-bold">₹ {subtotal.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <select 
                        className="bg-white border rounded text-sm p-1"
                        value={invoice.discountType}
                        onChange={(e) => setInvoice({...invoice, discountType: e.target.value as any})}
                      >
                        <option value="FIXED">Discount (₹)</option>
                        <option value="PERCENT">Discount (%)</option>
                      </select>
                      <input 
                        type="number" 
                        className="w-20 border rounded p-1 text-right text-sm"
                        value={invoice.discountValue}
                        onChange={(e) => setInvoice({...invoice, discountValue: parseFloat(e.target.value) || 0})}
                      />
                    </div>

                    <div className="border-t pt-2 mt-2 flex justify-between items-end">
                      <span className="text-lg font-bold text-gray-800">Grand Total</span>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-brand-blue">₹ {grandTotal}</span>
                        <p className="text-xs text-gray-500">Rounded</p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Action Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sticky bottom-4 z-40 bg-white/90 p-4 backdrop-blur shadow-lg rounded-xl border border-gray-200">
                <button 
                  onClick={handleNewInvoice}
                  className="flex items-center justify-center gap-2 p-3 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200"
                >
                  <RefreshCw size={20} /> Reset
                </button>
                <button 
                  onClick={handleSaveToDB}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 p-3 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                   <Save size={20} /> {isSaving ? 'Saving...' : 'Save DB'}
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 p-3 rounded-lg font-semibold text-white bg-gray-700 hover:bg-gray-800"
                >
                   <Printer size={20} /> Print PDF
                </button>
                 <button 
                  onClick={handleDownloadJPEG}
                  className="flex items-center justify-center gap-2 p-3 rounded-lg font-semibold text-white bg-brand-blue hover:bg-blue-600"
                >
                   <Download size={20} /> Export JPG
                </button>
              </div>

            </div>

            {/* RIGHT COLUMN: PREVIEW */}
            <div className="hidden xl:block w-[240mm]">
              <div className="sticky top-24">
                <h3 className="font-bold text-gray-500 mb-2 uppercase text-xs tracking-wider">Live A4 Preview</h3>
                <InvoicePreview 
                  ref={printRef} 
                  data={invoice} 
                  calculations={{ subtotal, discountAmount, grandTotal }} 
                />
              </div>
            </div>

            {/* Mobile Preview Toggle (Simple workaround for complex layouts) */}
            <div className="block xl:hidden mt-8">
               <h3 className="font-bold text-gray-800 mb-4 text-center">Invoice Preview</h3>
               <InvoicePreview 
                  ref={printRef} 
                  data={invoice} 
                  calculations={{ subtotal, discountAmount, grandTotal }} 
                />
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default App;