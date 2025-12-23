import { createClient } from '@supabase/supabase-js';
import { InvoiceData, SavedInvoice } from '../types';

// 1. FOR DEPLOYMENT (Vercel/Vite): 
//    Add VITE_SUPABASE_URL and VITE_SUPABASE_KEY in your Vercel Project Settings > Environment Variables.
// 2. FOR LOCAL TESTING:
//    You can paste your string values directly into the strings below if not using a .env file.

const getEnv = (key: string) => {
  // Check for Vite environment variables
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[key];
  }
  // Check for standard Node process.env (legacy/other builds)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key.replace('VITE_', '')] || process.env[key];
  }
  return '';
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || 'https://qpvdizfkgtrxwcnacevr.supabase.co'; // <--- PASTE YOUR URL HERE IF LOCAL
const SUPABASE_KEY = getEnv('VITE_SUPABASE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdmRpemZrZ3RyeHdjbmFjZXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODAyMTAsImV4cCI6MjA4MjA1NjIxMH0.1NH2R_mLc695C4iR9KP6SfrPs9KzgCJbhldYVYTehVo';         // <--- PASTE YOUR KEY HERE IF LOCAL

// Initialize the client.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const saveInvoice = async (invoice: InvoiceData, grandTotal: number) => {
  if (SUPABASE_URL === 'https://xyz.supabase.co') {
    console.warn("Supabase credentials missing. Mocking save. Update services/supabase.ts");
    // Mock success for UI testing
    return { error: null, data: { id: Date.now() } };
  }

  const { data, error } = await supabase
    .from('invoices')
    .insert([
      {
        invoice_no: invoice.invoiceNo,
        customer_name: invoice.customer.name,
        mobile: invoice.customer.mobile,
        total_amount: grandTotal,
        data: invoice // Save full JSON to reconstruct the UI
      }
    ])
    .select()
    .single();

  return { data, error };
};

export const searchInvoices = async (term: string): Promise<SavedInvoice[]> => {
  if (!term) return [];
  if (SUPABASE_URL === 'https://xyz.supabase.co') {
     console.warn("Supabase credentials missing. Mocking search. Update services/supabase.ts");
     return [];
  }

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .or(`invoice_no.eq.${term},mobile.eq.${term}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Search error:", error);
    return [];
  }
  return data as SavedInvoice[];
};