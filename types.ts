export interface LineItem {
  id: string;
  description: string;
  rate: number;
  quantity: number;
  total: number;
}

export interface Payment {
  id: string;
  method: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer';
  amount: number;
  reference?: string;
}

export interface CustomerDetails {
  name: string;
  mobile: string;
  vehicleName: string;
  vehicleNumber: string;
  address: string;
  gstin?: string;
}

export interface InvoiceData {
  invoiceNo: string;
  date: string;
  customer: CustomerDetails;
  items: LineItem[];
  payments: Payment[];
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  logo?: string; // Base64 string for the logo
}

export interface SavedInvoice {
  id: number;
  created_at: string;
  invoice_no: string;
  customer_name: string;
  mobile: string;
  total_amount: number;
  data: InvoiceData; // Storing full JSON for re-printing
}

export const COMPANY_DEFAULTS = {
  name: "TARGET Multi-brand Car Service",
  mobile: "84381 43591",
  address: "SRIRAM NAGAR, Veeranam Main Rd, Salem - 636003",
  logoPlaceholder: "https://picsum.photos/100/100?grayscale" // Fallback
};