import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Save, Download, Search, RefreshCw, Printer, Upload, Image as ImageIcon } from 'lucide-react';
import { InvoiceData, LineItem, Payment, COMPANY_DEFAULTS, SavedInvoice } from './types';
import { InvoicePreview } from './components/InvoicePreview';
import { saveInvoice, searchInvoices } from './services/supabase';
import html2canvas from 'html2canvas';

// Helper to generate Invoice ID (TCC + 4 digits)
const generateInvoiceNo = () => `TCC${Math.floor(1000 + Math.random() * 9000)}`;

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load persistent logo on mount if available
  useEffect(() => {
    const savedLogo = localStorage.getItem('companyLogo');
    if (savedLogo) {
      setInvoice(prev => ({ ...prev, logo: savedLogo }));
    }
  }, []);

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

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setInvoice(prev => ({ ...prev, logo: base64String }));
        localStorage.setItem('companyLogo', base64String); // Persist for future
      };
      reader.readAsDataURL(file);
    }
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
    const element = document.getElementById('invoice-capture');
    if (!element) {
      alert("Could not find invoice preview to capture.");
      return;
    }

    try {
      // Wait for fonts/images
      await document.fonts.ready;
      
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        useCORS: true, // Allow cross-origin images (like external logos)
        logging: false,
        backgroundColor: '#ffffff', // Ensure white background
        windowWidth: 210 * 3.7795, // Simulate A4 width in pixels (~794px)
        windowHeight: 297 * 3.7795, // Simulate A4 height in pixels (~1123px)
        x: 0,
        y: 0
      });
      
      const link = document.createElement('a');
      link.download = `${invoice.invoiceNo}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export JPEG. Please check console for details.");
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
      const savedLogo = localStorage.getItem('companyLogo');
      setInvoice({ 
        ...INITIAL_INVOICE, 
        invoiceNo: generateInvoiceNo(),
        logo: savedLogo || undefined 
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-gray-50">
      {/* Navbar */}
      <nav className="bg-brand-dark text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-red rounded-lg flex items-center justify-center font-bold text-lg shadow-inner">T</div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-wide leading-tight">TARGET</span>
              <span className="text-gray-400 text-xs font-medium tracking-wider">CAR CARE ERP</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('create')}
              className={`px-5 py-2.5 rounded-lg transition font-medium text-sm ${activeTab === 'create' ? 'bg-brand-blue text-white shadow-lg shadow-blue-900/50' : 'hover:bg-gray-700 text-gray-300'}`}
            >
              New Invoice
            </button>
            <button 
              onClick={() => setActiveTab('search')}
              className={`px-5 py-2.5 rounded-lg transition font-medium text-sm ${activeTab === 'search' ? 'bg-brand-blue text-white shadow-lg shadow-blue-900/50' : 'hover:bg-gray-700 text-gray-300'}`}
            >
              History
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow p-6 md:p-10 max-w-[1600px] mx-auto w-full gap-10 layout-container">
        
        {activeTab === 'search' ? (
          <div className="bg-white p-8 rounded-xl shadow-xl border border-gray-100">
            <h2 className="text-2xl font-bold mb-8 text-brand-dark border-b pb-4">Invoice History</h2>
            <div className="flex gap-4 mb-8 max-w-2xl">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Search Invoice No or Mobile..." 
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue outline-none transition"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <button 
                onClick={handleSearch}
                className="bg-brand-dark text-white px-8 py-3 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition shadow-lg"
              >
                Search
              </button>
            </div>
            
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50">
                  <tr className="text-gray-600 uppercase text-xs font-semibold tracking-wider">
                    <th className="p-4">Date</th>
                    <th className="p-4">Invoice #</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Mobile</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {searchResults.length > 0 ? searchResults.map(inv => (
                    <tr key={inv.id} className="hover:bg-blue-50 transition-colors">
                      <td className="p-4 text-sm text-gray-600">{new Date(inv.created_at).toLocaleDateString()}</td>
                      <td className="p-4 font-mono font-medium text-brand-dark">{inv.invoice_no}</td>
                      <td className="p-4 font-medium">{inv.customer_name}</td>
                      <td className="p-4 text-gray-600">{inv.mobile}</td>
                      <td className="p-4 text-right font-bold text-brand-dark">₹{inv.total_amount}</td>
                      <td className="p-4 text-center">
                        <button onClick={() => loadInvoice(inv)} className="text-brand-blue hover:text-blue-700 font-medium text-sm">Open</button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-gray-400 italic">No records found. Try searching.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col xl:flex-row gap-12 items-start">
            
            {/* LEFT COLUMN: EDITOR */}
            <div className="flex-1 space-y-8 w-full layout-editor">
              
              {/* Card: Invoice Meta & Customer */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-brand-red"></div>
                
                <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">Invoice Details</h3>
                    <p className="text-sm text-gray-500">Enter customer and vehicle information</p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                     <div className="flex items-center gap-2">
                         <span className="text-sm font-semibold text-gray-500">Invoice No:</span>
                         <span className="bg-gray-100 text-brand-dark px-3 py-1 rounded-md font-mono font-bold border border-gray-200">
                            {invoice.invoiceNo}
                        </span>
                     </div>
                     <input 
                      type="date" 
                      className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-md text-sm outline-none focus:border-brand-blue"
                      value={invoice.date}
                      onChange={(e) => setInvoice({...invoice, date: e.target.value})}
                    />
                  </div>
                </div>

                {/* Logo Upload Section */}
                 <div className="mb-6 flex items-center gap-4 bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
                    <div className="w-16 h-16 bg-white rounded border flex items-center justify-center overflow-hidden">
                       {invoice.logo ? (
                         <img src={invoice.logo} alt="Logo" className="w-full h-full object-contain" />
                       ) : (
                         <ImageIcon className="text-gray-300" />
                       )}
                    </div>
                    <div>
                       <p className="text-sm font-semibold text-gray-700">Company Logo</p>
                       <p className="text-xs text-gray-500 mb-2">Upload to display on invoice</p>
                       <input 
                          type="file" 
                          ref={fileInputRef}
                          className="hidden" 
                          accept="image/*"
                          onChange={handleLogoUpload}
                        />
                       <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs bg-white border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-50 flex items-center gap-2 transition"
                       >
                         <Upload size={14} /> Upload Logo
                       </button>
                    </div>
                 </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                     <label className="text-xs font-semibold text-gray-500 uppercase">Customer Name</label>
                     <input className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-blue focus:border-brand-blue outline-none transition" value={invoice.customer.name} onChange={e => handleCustomerChange('name', e.target.value)} placeholder="Full Name" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-semibold text-gray-500 uppercase">Mobile Number</label>
                     <input className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-blue focus:border-brand-blue outline-none transition" value={invoice.customer.mobile} onChange={e => handleCustomerChange('mobile', e.target.value)} placeholder="10-digit Mobile" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-semibold text-gray-500 uppercase">Vehicle Model</label>
                     <input className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-blue focus:border-brand-blue outline-none transition" value={invoice.customer.vehicleName} onChange={e => handleCustomerChange('vehicleName', e.target.value)} placeholder="e.g. Swift Dzire" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-semibold text-gray-500 uppercase">Vehicle Number</label>
                     <input className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-blue focus:border-brand-blue outline-none transition uppercase font-mono" value={invoice.customer.vehicleNumber} onChange={e => handleCustomerChange('vehicleNumber', e.target.value)} placeholder="TN-XX-XX-XXXX" />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                     <label className="text-xs font-semibold text-gray-500 uppercase">Address</label>
                     <input className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-blue focus:border-brand-blue outline-none transition" value={invoice.customer.address} onChange={e => handleCustomerChange('address', e.target.value)} placeholder="Full Address" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-semibold text-gray-500 uppercase">GSTIN (Optional)</label>
                     <input className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-blue focus:border-brand-blue outline-none transition" value={invoice.customer.gstin || ''} onChange={e => handleCustomerChange('gstin', e.target.value)} placeholder="GST Number" />
                  </div>
                </div>
              </div>

              {/* Card: Items */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">Services & Parts</h3>
                    <p className="text-sm text-gray-500">List all services provided</p>
                  </div>
                  <button onClick={addItem} className="flex items-center gap-2 text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-md transition font-medium">
                    <Plus size={16} /> Add Item
                  </button>
                </div>
                
                <div className="space-y-3">
                  {invoice.items.map((item, idx) => (
                    <div key={item.id} className="flex gap-3 items-start group">
                      <span className="pt-3 text-xs text-gray-400 w-6 font-mono">{idx + 1}.</span>
                      <div className="flex-grow">
                        <input 
                          placeholder="Description of Service / Part" 
                          className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-blue focus:border-brand-blue outline-none transition" 
                          value={item.description} 
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        />
                      </div>
                      <div className="w-28">
                        <input 
                          type="number" placeholder="Rate" 
                          className="w-full p-2.5 border border-gray-300 rounded-lg text-right focus:ring-1 focus:ring-brand-blue focus:border-brand-blue outline-none transition" 
                          value={item.rate} 
                          onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="w-20">
                        <input 
                          type="number" placeholder="Qty" 
                          className="w-full p-2.5 border border-gray-300 rounded-lg text-center focus:ring-1 focus:ring-brand-blue focus:border-brand-blue outline-none transition" 
                          value={item.quantity} 
                          onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="w-28 pt-3 text-right font-mono font-bold text-gray-700">
                        {item.total.toFixed(2)}
                      </div>
                      <button onClick={() => removeItem(item.id)} className="p-3 text-gray-300 hover:text-red-500 transition group-hover:text-red-400">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card: Calculation & Payment - Reordered */}
              <div className="space-y-6">
                
                {/* 1. Grand Total & Summary (MOVED UPPER) */}
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-brand-dark"></div>
                    <h3 className="font-bold text-lg text-gray-800 mb-4">Payment Summary</h3>
                    
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                      <div className="flex justify-between mb-3 text-gray-600">
                        <span className="font-medium">Subtotal</span>
                        <span className="font-bold text-gray-800 font-mono text-lg">₹ {subtotal.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between mb-4 gap-4 py-3 border-y border-dashed border-gray-200">
                        <div className="flex items-center gap-2">
                           <span className="text-sm font-medium text-gray-500">Discount:</span>
                            <select 
                              className="bg-white border border-gray-300 rounded text-sm p-1.5 focus:border-brand-blue outline-none"
                              value={invoice.discountType}
                              onChange={(e) => setInvoice({...invoice, discountType: e.target.value as any})}
                            >
                              <option value="FIXED">Flat (₹)</option>
                              <option value="PERCENT">Percent (%)</option>
                            </select>
                        </div>
                        <input 
                          type="number" 
                          className="w-24 border border-gray-300 rounded p-1.5 text-right text-sm font-medium outline-none focus:border-brand-blue"
                          value={invoice.discountValue}
                          onChange={(e) => setInvoice({...invoice, discountValue: parseFloat(e.target.value) || 0})}
                        />
                      </div>

                      <div className="flex justify-between items-end">
                        <span className="text-xl font-bold text-brand-dark">Grand Total</span>
                        <div className="text-right">
                          <span className="text-4xl font-extrabold text-brand-blue tracking-tight">₹ {grandTotal}</span>
                          <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-wide">Rounded Amount</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Payment Methods (MOVED LOWER) */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                    <div className="flex justify-between items-center mb-4">
                       <div>
                          <h3 className="font-bold text-lg text-gray-800">Payment Modes</h3>
                          <p className="text-sm text-gray-500">Split payment across multiple methods</p>
                       </div>
                       <button onClick={addPayment} className="text-sm font-bold text-brand-blue hover:bg-blue-50 px-3 py-1.5 rounded transition">
                         + Split Payment
                       </button>
                    </div>
                    
                    <div className="space-y-3">
                      {invoice.payments.map((p) => (
                        <div key={p.id} className="flex gap-3 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                          <select 
                            className="border border-gray-300 rounded-md p-2 text-sm bg-white focus:border-brand-blue outline-none w-32"
                            value={p.method}
                            onChange={(e) => updatePayment(p.id, 'method', e.target.value)}
                          >
                            <option>Cash</option>
                            <option>UPI</option>
                            <option>Card</option>
                            <option>Bank Transfer</option>
                          </select>
                          <input 
                            className="border border-gray-300 rounded-md p-2 w-32 text-sm font-mono text-right focus:border-brand-blue outline-none"
                            type="number"
                            placeholder="Amount"
                            value={p.amount}
                            onChange={(e) => updatePayment(p.id, 'amount', parseFloat(e.target.value) || 0)}
                          />
                           <input 
                            className="border border-gray-300 rounded-md p-2 flex-grow text-sm focus:border-brand-blue outline-none"
                            type="text"
                            placeholder="Reference ID (Optional)"
                            value={p.reference || ''}
                            onChange={(e) => updatePayment(p.id, 'reference', e.target.value)}
                          />
                          <button onClick={() => removePayment(p.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                        </div>
                      ))}
                    </div>
                  </div>

              </div>

              {/* Action Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sticky bottom-6 z-40 bg-white/90 p-4 backdrop-blur-md shadow-2xl rounded-xl border border-gray-200 action-bar">
                <button 
                  onClick={handleNewInvoice}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-lg font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
                >
                  <RefreshCw size={18} /> Reset
                </button>
                <button 
                  onClick={handleSaveToDB}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition shadow-lg shadow-green-600/20"
                >
                   <Save size={18} /> {isSaving ? 'Saving...' : 'Save DB'}
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-lg font-bold text-white bg-gray-700 hover:bg-gray-800 transition shadow-lg shadow-gray-700/20"
                >
                   <Printer size={18} /> Print PDF
                </button>
                 <button 
                  onClick={handleDownloadJPEG}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-lg font-bold text-white bg-brand-blue hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
                >
                   <Download size={18} /> Export JPG
                </button>
              </div>

            </div>

            {/* RIGHT COLUMN: PREVIEW */}
            <div className="hidden xl:flex flex-col items-center w-[250mm] flex-shrink-0 bg-gray-200/50 p-8 rounded-xl border-dashed border-2 border-gray-300 sticky top-24">
              <div className="mb-4 flex items-center gap-2 text-gray-500 font-semibold uppercase text-xs tracking-wider">
                  <Printer size={14} /> Live A4 Preview
              </div>
              <InvoicePreview 
                ref={printRef} 
                data={invoice} 
                calculations={{ subtotal, discountAmount, grandTotal }} 
              />
            </div>

            {/* Mobile Preview Toggle */}
            <div className="block xl:hidden mt-8 w-full mobile-preview-header">
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