
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, Download, Search, RefreshCw, Upload, Image as ImageIcon, Database, Printer, Share2, XCircle, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { InvoiceData, LineItem, Payment, COMPANY_DEFAULTS, SavedInvoice } from './types';
import { InvoicePreview } from './components/InvoicePreview';
import { saveInvoice, searchInvoices, deleteInvoice } from './services/supabase';
import html2canvas from 'html2canvas';

const generateInvoiceNo = () => `TCC${Math.floor(1000 + Math.random() * 9000)}`;

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

type NotificationType = {
  message: string;
  type: 'success' | 'error' | 'info';
  id: number;
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'search'>('create');
  const [invoice, setInvoice] = useState<InvoiceData>(INITIAL_INVOICE);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchResults, setSearchResults] = useState<SavedInvoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  
  const printRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedLogo = localStorage.getItem('companyLogo');
    if (savedLogo) {
      setInvoice(prev => ({ ...prev, logo: savedLogo }));
    }
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { message, type, id }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4500);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // --- Calculations ---
  const subtotal = invoice.items.reduce((sum, item) => sum + item.total, 0);
  let discountAmount = 0;
  if (invoice.discountType === 'PERCENT') {
    discountAmount = subtotal * (invoice.discountValue / 100);
  } else {
    discountAmount = invoice.discountValue;
  }
  discountAmount = Math.min(discountAmount, subtotal);
  const grandTotal = Math.round(subtotal - discountAmount);

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
     const currentAllocated = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
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
      if (file.size > 2 * 1024 * 1024) {
        showNotification("Logo must be under 2MB.", 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setInvoice(prev => ({ ...prev, logo: base64String }));
        localStorage.setItem('companyLogo', base64String);
        showNotification("Logo updated and saved locally.", 'success');
      };
      reader.onerror = () => showNotification("Failed to read logo file.", 'error');
      reader.readAsDataURL(file);
    }
  };

  const handleSaveToDB = async (silent = false) => {
    if (!invoice.customer.name.trim()) {
        showNotification("Please enter customer name before saving.", 'error');
        return false;
    }

    setIsSaving(true);
    try {
      const { error } = await saveInvoice(invoice, grandTotal);
      if (error) {
        if (error.code === '23505') {
             showNotification(`Duplicate Invoice No '${invoice.invoiceNo}'. Updating to a new one...`, 'info');
             setInvoice(p => ({ ...p, invoiceNo: generateInvoiceNo() }));
        } else {
             showNotification(`Database Error: ${error.message}`, 'error');
        }
        return false;
      } else {
        if (!silent) showNotification("Invoice archived in database.", 'success');
        return true;
      }
    } catch (e: any) {
      showNotification("Network error while connecting to Supabase.", 'error');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const captureInvoice = async () => {
    let element = document.getElementById('invoice-capture-desktop');
    if (!element || element.offsetParent === null) {
        element = document.getElementById('invoice-capture-mobile');
    }
    if (!element) throw new Error("Preview element not found");

    const originalShadow = element.style.boxShadow;
    element.style.boxShadow = 'none';
    
    // Tiny delay to ensure styles apply
    await new Promise(r => setTimeout(r, 150));

    try {
        const canvas = await html2canvas(element, {
            scale: 3, 
            useCORS: true, 
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff'
        });
        return canvas;
    } finally {
        element.style.boxShadow = originalShadow;
    }
  };

  const handleShare = async () => {
    setIsExporting(true);
    try {
      const canvas = await captureInvoice();
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error("Canvas to Blob failed");
        const file = new File([blob], `INV_${invoice.invoiceNo}.png`, { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Invoice ${invoice.invoiceNo}`,
            text: `Invoice from Target Car Care for ${invoice.customer.name}`
          });
          showNotification("Shared successfully.", 'success');
        } else {
          // Fallback
          const link = document.createElement('a');
          link.download = `INV_${invoice.invoiceNo}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
          showNotification("Direct share not available. File downloaded.", 'info');
        }
      }, 'image/png');
    } catch (err: any) {
      showNotification(`Export failed: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadImage = async () => {
    setIsExporting(true);
    try {
      const canvas = await captureInvoice();
      const link = document.createElement('a');
      link.download = `INV_${invoice.invoiceNo}.png`;
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification("Invoice image downloaded.", 'success');
    } catch (err: any) {
      showNotification(`Download failed: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveAndShare = async () => {
      const saved = await handleSaveToDB(true);
      if (saved) await handleShare();
  };

  const handleSearch = async () => {
    const term = searchTerm.trim();
    if (!term) {
        showNotification("Please enter invoice no or mobile.", 'info');
        return;
    }
    try {
        const results = await searchInvoices(term);
        if (results.length === 0) showNotification("No matching records found.", 'info');
        setSearchResults(results);
    } catch (e) {
        showNotification("Database search failed.", 'error');
    }
  };

  // Fix: Added missing handleDelete function to handle invoice deletion from archive
  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) return;
    
    try {
      const { error } = await deleteInvoice(id);
      if (error) {
        showNotification(`Delete Error: ${error.message}`, 'error');
      } else {
        showNotification("Invoice removed from archive.", 'success');
        setSearchResults(prev => prev.filter(inv => inv.id !== id));
      }
    } catch (e) {
      showNotification("Failed to communicate with database.", 'error');
    }
  };

  const handleNewInvoice = () => {
    if (window.confirm("Clear all fields and start a new bill?")) {
      const savedLogo = localStorage.getItem('companyLogo');
      setInvoice({ ...INITIAL_INVOICE, invoiceNo: generateInvoiceNo(), logo: savedLogo || undefined });
      showNotification("Editor reset.", 'info');
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-slate-50 selection:bg-brand-blue selection:text-white">
      
      {/* PROFESSIONAL TOAST NOTIFICATIONS */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none w-full max-w-sm">
        {notifications.map((n) => (
          <div 
            key={n.id} 
            className={`pointer-events-auto flex items-start gap-4 p-4 rounded-xl shadow-2xl border-l-4 transform transition-all duration-300 translate-x-0 bg-white ${
              n.type === 'error' ? 'border-red-600' : 
              n.type === 'success' ? 'border-green-600' : 'border-slate-800'
            }`}
          >
            <div className={`mt-0.5 ${n.type === 'error' ? 'text-red-600' : n.type === 'success' ? 'text-green-600' : 'text-slate-800'}`}>
                {n.type === 'success' && <CheckCircle size={20} />}
                {n.type === 'error' && <AlertCircle size={20} />}
                {n.type === 'info' && <Database size={20} />}
            </div>
            <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">{n.message}</p>
            </div>
            <button onClick={() => removeNotification(n.id)} className="text-slate-300 hover:text-slate-900 transition">
               <XCircle size={18} />
            </button>
          </div>
        ))}
      </div>

      {/* NAVBAR */}
      <nav className="bg-slate-900 text-white p-5 shadow-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center px-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center font-black text-2xl shadow-lg ring-4 ring-slate-800">T</div>
            <div className="flex flex-col">
              <span className="font-black text-2xl tracking-tighter leading-none">TARGET</span>
              <span className="text-slate-400 text-[10px] font-black tracking-[0.2em] uppercase">Multi-Brand Car Care</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('create')}
              className={`px-6 py-2.5 rounded-lg transition-all font-bold text-sm flex items-center gap-2 ${activeTab === 'create' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
            >
              <Plus size={18} /> CREATE BILL
            </button>
            <button 
              onClick={() => setActiveTab('search')}
              className={`px-6 py-2.5 rounded-lg transition-all font-bold text-sm flex items-center gap-2 ${activeTab === 'search' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
            >
              <Database size={18} /> ARCHIVE
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="flex-grow p-6 lg:p-12 max-w-[1600px] mx-auto w-full">
        
        {activeTab === 'search' ? (
          <div className="bg-white p-10 rounded-2xl shadow-2xl border border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Invoice Archive</h2>
                    <p className="text-slate-500 font-medium">Search and manage previous service bills</p>
                </div>
                <div className="flex w-full md:w-auto gap-2">
                  <div className="relative flex-grow min-w-[300px]">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                    <input 
                      type="text" 
                      placeholder="Invoice ID or Mobile..." 
                      className="w-full pl-12 p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition font-medium"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <button onClick={handleSearch} className="bg-slate-900 text-white px-8 rounded-xl font-bold hover:bg-black transition shadow-lg">SEARCH</button>
                </div>
            </div>
            
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50">
                  <tr className="text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                    <th className="p-5">Date</th>
                    <th className="p-5">ID</th>
                    <th className="p-5">Customer</th>
                    <th className="p-5 text-right">Grand Total</th>
                    <th className="p-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {searchResults.length > 0 ? searchResults.map(inv => (
                    <tr key={inv.id} className="hover:bg-blue-50/50 transition-colors group">
                      <td className="p-5 text-sm font-bold text-slate-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                      <td className="p-5 font-mono font-bold text-blue-600">{inv.invoice_no}</td>
                      <td className="p-5 font-bold text-slate-800">{inv.customer_name}</td>
                      <td className="p-5 text-right font-black text-slate-900">₹{inv.total_amount}</td>
                      <td className="p-5 flex items-center justify-center gap-4">
                        <button onClick={() => { setInvoice(inv.data); setActiveTab('create'); }} className="text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-black transition">EDIT/VIEW</button>
                        <button onClick={() => { setInvoice(inv.data); setTimeout(handleDownloadImage, 500); }} className="text-slate-400 hover:text-slate-900 transition"><Download size={20}/></button>
                        <button onClick={() => handleDelete(inv.id)} className="text-red-200 hover:text-red-600 transition"><Trash2 size={20}/></button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="p-20 text-center">
                         <Database className="mx-auto text-slate-100 mb-4" size={60} />
                         <p className="text-slate-300 font-bold uppercase tracking-widest">No Records Found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col xl:flex-row gap-12 items-start">
            
            {/* EDITOR SECTION */}
            <div className="flex-1 space-y-8 w-full">
              
              {/* HEADER INFO */}
              <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-red-600"></div>
                <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                  <div>
                    <h3 className="font-black text-2xl text-slate-900 tracking-tight">Invoice Details</h3>
                    <p className="text-slate-500 font-medium">Setup customer and vehicle information</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                     <span className="bg-slate-100 text-slate-900 px-4 py-2 rounded-xl font-mono font-black text-lg border border-slate-200">{invoice.invoiceNo}</span>
                     <input type="date" className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600" value={invoice.date} onChange={(e) => setInvoice({...invoice, date: e.target.value})} />
                  </div>
                </div>

                 <div className="mb-10 flex items-center gap-6 p-5 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 group hover:border-blue-300 transition-colors">
                    <div className="w-20 h-20 bg-white rounded-xl border-2 border-slate-100 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
                       {invoice.logo ? <img src={invoice.logo} alt="Logo" className="w-full h-full object-contain" /> : <ImageIcon className="text-slate-200" size={32} />}
                    </div>
                    <div>
                       <p className="font-black text-slate-900 uppercase text-xs tracking-widest mb-1">Company Branding</p>
                       <p className="text-xs text-slate-500 mb-3 font-medium">Recommended: Transparent PNG (500x500px)</p>
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                       <button onClick={() => fileInputRef.current?.click()} className="text-xs bg-white border border-slate-200 px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition">UPLOAD LOGO</button>
                    </div>
                 </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Name</label>
                     <input className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition font-bold" value={invoice.customer.name} onChange={e => handleCustomerChange('name', e.target.value)} placeholder="Enter full name" />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile Number</label>
                     <input className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition font-bold" value={invoice.customer.mobile} onChange={e => handleCustomerChange('mobile', e.target.value)} placeholder="10-digit number" />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehicle Model</label>
                     <input className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition font-bold" value={invoice.customer.vehicleName} onChange={e => handleCustomerChange('vehicleName', e.target.value)} placeholder="e.g. BMW X5" />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehicle Plate No</label>
                     <input className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition font-black font-mono uppercase" value={invoice.customer.vehicleNumber} onChange={e => handleCustomerChange('vehicleNumber', e.target.value)} placeholder="TN-XX-XX-XXXX" />
                  </div>
                </div>
              </div>

              {/* SERVICES LIST */}
              <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 relative">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="font-black text-2xl text-slate-900 tracking-tight">Services & Spares</h3>
                    <p className="text-slate-500 font-medium">Manage billable line items</p>
                  </div>
                  <button onClick={addItem} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition shadow-lg shadow-green-200 flex items-center gap-2">
                    <Plus size={20} /> ADD ITEM
                  </button>
                </div>
                
                <div className="space-y-4">
                  {invoice.items.map((item, idx) => (
                    <div key={item.id} className="flex gap-4 items-center group bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="font-black text-slate-300 w-6 text-center">{idx + 1}</span>
                      <input placeholder="Description" className="flex-grow p-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold text-sm" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} />
                      <div className="w-32"><input type="number" placeholder="Rate" className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-right font-black focus:ring-2 focus:ring-blue-600 outline-none" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)} /></div>
                      <div className="w-20"><input type="number" placeholder="Qty" className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-center font-bold focus:ring-2 focus:ring-blue-600 outline-none" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} /></div>
                      <div className="w-28 text-right font-black text-slate-900">₹{item.total.toFixed(2)}</div>
                      <button onClick={() => removeItem(item.id)} className="p-2 text-slate-200 hover:text-red-600 transition"><Trash2 size={20} /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* TOTALS & PAYMENT */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                    <h3 className="font-black text-xl text-slate-900 mb-6">Grand Summary</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between font-bold text-slate-500"><span>Subtotal</span><span className="font-black text-slate-900">₹{subtotal.toFixed(2)}</span></div>
                        <div className="flex items-center justify-between gap-4 py-4 border-y border-slate-100">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-400 uppercase">Discount</span>
                                <select className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold outline-none" value={invoice.discountType} onChange={(e) => setInvoice({...invoice, discountType: e.target.value as any})}>
                                    <option value="FIXED">Flat ₹</option>
                                    <option value="PERCENT">% Off</option>
                                </select>
                            </div>
                            <input type="number" className="w-28 border border-slate-200 rounded-xl p-2 text-right font-black outline-none focus:ring-2 focus:ring-blue-600" value={invoice.discountValue} onChange={(e) => setInvoice({...invoice, discountValue: parseFloat(e.target.value) || 0})} />
                        </div>
                        <div className="flex justify-between items-end pt-2">
                            <span className="font-black text-slate-900 uppercase tracking-widest text-sm">Amount Due</span>
                            <span className="text-5xl font-black text-blue-600 tracking-tighter">₹{grandTotal}</span>
                        </div>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                       <h3 className="font-black text-xl text-slate-900">Payment Modes</h3>
                       <button onClick={addPayment} className="text-xs font-black text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-xl transition underline">SPLIT PAYMENT</button>
                    </div>
                    <div className="space-y-3">
                      {invoice.payments.map((p) => (
                        <div key={p.id} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <select className="border border-slate-200 rounded-lg p-2 text-xs font-bold bg-white outline-none w-28" value={p.method} onChange={(e) => updatePayment(p.id, 'method', e.target.value)}>
                            <option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option>
                          </select>
                          <input className="border border-slate-200 rounded-lg p-2 w-28 text-xs font-black text-right outline-none" type="number" placeholder="Amt" value={p.amount} onChange={(e) => updatePayment(p.id, 'amount', parseFloat(e.target.value) || 0)} />
                          <input className="border border-slate-200 rounded-lg p-2 flex-grow text-xs font-bold outline-none" type="text" placeholder="Ref No." value={p.reference || ''} onChange={(e) => updatePayment(p.id, 'reference', e.target.value)} />
                          <button onClick={() => removePayment(p.id)} className="text-slate-300 hover:text-red-600"><Trash2 size={16}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
              </div>

              {/* ACTION TOOLBAR */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sticky bottom-8 z-40 bg-slate-900/95 p-5 backdrop-blur-xl shadow-2xl rounded-2xl border border-slate-800">
                <button onClick={handleNewInvoice} className="flex items-center justify-center gap-2 p-4 rounded-xl font-black text-slate-300 bg-slate-800 hover:bg-slate-700 transition">
                  <RefreshCw size={20} /> RESET
                </button>
                <button onClick={() => handleSaveToDB(false)} disabled={isSaving} className="flex items-center justify-center gap-2 p-4 rounded-xl font-black text-white bg-blue-700 hover:bg-blue-600 disabled:opacity-50 transition shadow-lg shadow-blue-900/50">
                   {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} />} SAVE DB
                </button>
                <button onClick={handleShare} disabled={isExporting} className="flex items-center justify-center gap-2 p-4 rounded-xl font-black text-white bg-green-600 hover:bg-green-500 transition shadow-lg shadow-green-900/50">
                   {isExporting ? <Loader2 className="animate-spin" size={20}/> : <Share2 size={20} />} SHARE
                </button>
                <button onClick={handleSaveAndShare} disabled={isSaving || isExporting} className="flex items-center justify-center gap-2 p-4 rounded-xl font-black text-white bg-red-600 hover:bg-red-500 transition shadow-lg shadow-red-900/50">
                   <Upload size={20} /> SAVE & SHARE
                </button>
              </div>
            </div>

            {/* A4 PREVIEW COLUMN */}
            <div className="hidden xl:flex flex-col items-center w-[240mm] flex-shrink-0 bg-slate-200/50 p-8 rounded-3xl border-4 border-dashed border-slate-200 sticky top-32">
              <div className="mb-6 flex items-center gap-3 text-slate-400 font-black uppercase text-xs tracking-[0.3em]">
                  <Printer size={16} /> Digital Copy Preview
              </div>
              <InvoicePreview ref={printRef} targetId="invoice-capture-desktop" data={invoice} calculations={{ subtotal, discountAmount, grandTotal }} />
            </div>

            {/* MOBILE PREVIEW */}
            <div className="block xl:hidden mt-12 w-full">
               <h3 className="font-black text-slate-900 mb-6 text-center tracking-tighter text-2xl uppercase">Live Preview</h3>
               <InvoicePreview ref={printRef} targetId="invoice-capture-mobile" data={invoice} calculations={{ subtotal, discountAmount, grandTotal }} />
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default App;
