// ── Auth ─────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AccessTokenResponse {
  access_token: string;
  token_type: string;
}

// ── User ─────────────────────────────────────────────
export type UserRole =
  | 'SUPER_ADMIN'
  | 'COMPANY_ADMIN'
  | 'ACCOUNTANT'
  | 'APPROVER'
  | 'VIEWER';

export interface User {
  id: string;
  company_id: string | null;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login: string | null;
  notification_email: boolean;
  created_at: string;
  updated_at: string;
}

// ── Company ──────────────────────────────────────────
export interface Company {
  id: string;
  company_code: string;
  company_name: string;
  ein: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  fiscal_year_start: string;
  default_currency: string;
  s3_bucket_prefix: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface CompanyListResponse {
  items: Company[];
  total: number;
}

// ── Vendor ───────────────────────────────────────────
export interface Vendor {
  id: string;
  company_id: string | null;
  vendor_code: string;
  company_name: string;
  dba: string | null;
  ein: string | null;
  w9_submitted: boolean;
  is_1099_required: boolean;
  is_tax_exempt: boolean;
  tax_exempt_expiry_date: string | null;
  website: string | null;
  vendor_category: 'SERVICE' | 'PRODUCT' | 'BOTH' | null;
  status: 'ACTIVE' | 'INACTIVE';
  billing_address: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zip: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  payment_terms: string | null;
  bank_name: string | null;
  ach_routing_masked: string | null;
  ach_account_masked: string | null;
  internal_buyer: string | null;
  approved_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorListResponse {
  items: Vendor[];
  total: number;
}

export interface DuplicateWarning {
  type: string;
  message: string;
  existing_vendor_id: string;
  existing_vendor_name: string;
  score: number | null;
}

export interface VendorCreateResponse {
  vendor: Vendor;
  warnings: DuplicateWarning[];
}

// ── Invoice ──────────────────────────────────────────
export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  line_number: number;
  description: string | null;
  quantity: number;
  unit_price: number;
  amount: number;
  category: string | null;
  tax_amount: number;
}

export interface Invoice {
  id: string;
  company_id: string;
  vendor_id: string;
  invoice_type_id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  amount_subtotal: number;
  amount_tax: number;
  amount_total: number;
  currency_original: string;
  source_channel: string;
  ocr_status: string | null;
  status: string;
  validation_status: string | null;
  file_path: string | null;
  po_number: string | null;
  notes: string | null;
  created_at: string;
  line_items: InvoiceLineItem[];
}

export interface InvoiceListItem {
  id: string;
  company_id: string;
  vendor_id: string;
  invoice_type_id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  amount_total: number;
  currency_original: string;
  source_channel: string;
  ocr_status: string | null;
  status: string;
  validation_status: string | null;
  created_at: string;
}

export interface InvoiceListResponse {
  items: InvoiceListItem[];
  total: number;
}
