// ── Auth ─────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  company_name: string;
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

export interface MessageResponse {
  message: string;
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
  company_name: string | null;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  email_verified: boolean;
  last_login: string | null;
  notification_email: boolean;
  approval_level: number;
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
  established_date: string | null;
  default_currency: string;
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
  po_line_id: string | null;
  matched_contract_price: number | null;
  price_variance_pct: number | null;
  tax_rate_id: string | null;
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
  amount_original: number | null;
  exchange_rate_id: string | null;
  po_number: string | null;
  po_id: string | null;
  source_channel: string;
  source_email: string | null;
  file_path: string | null;
  ocr_status: string | null;
  status: string;
  validation_status: string | null;
  rejection_reason: string | null;
  submission_round: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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

// ── Billing / Subscription ─────────────────────────
export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  monthly_price: number;
  max_invoices_per_month: number;
  max_users: number;
  max_ocr_per_month: number;
  features: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Subscription {
  id: string;
  company_id: string;
  plan_id: string;
  plan: SubscriptionPlan | null;
  status: string;
  stripe_customer_id: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageInfo {
  year_month: string;
  invoice_count: number;
  ocr_count: number;
  user_count: number;
  max_invoices: number;
  max_ocr: number;
  max_users: number;
}

export interface BillingSummary {
  subscription: Subscription | null;
  usage: UsageInfo | null;
  stripe_publishable_key: string | null;
}

export interface CheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
}
