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
