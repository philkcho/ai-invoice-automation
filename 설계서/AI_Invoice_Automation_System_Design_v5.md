# AI Invoice Automation System — Project Design Document
**Version 5.0 | March 2026**

---

## 1. Project Overview

| Item | Details |
|------|---------|
| Project Name | AI Invoice Automation System |
| Purpose | Automate invoice intake, OCR parsing, data storage, compliance validation, approval workflow, payment tracking, and dashboard reporting |
| Target Region | United States |
| Default Language | English |
| Default Currency | USD |
| Multi-Company | Supported (Row-level isolation via company_id) |

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11 + FastAPI |
| Frontend | Next.js 14 + Tailwind CSS |
| Database | PostgreSQL 15 |
| OCR / AI | Claude API (Anthropic) |
| PDF Parsing | pdfplumber, pdf2image |
| ORM | SQLAlchemy + Alembic |
| Authentication | JWT (FastAPI Security) |
| Email Integration | Gmail API + Microsoft Graph API (Outlook) |
| File Storage | AWS S3 (production) / Local (development) |
| Exchange Rate API | Open Exchange Rates API (auto) / Manual fallback |
| Notifications | Email (SMTP) + In-app |
| Charts | Recharts (Next.js) |
| Export | ReportLab (PDF) + openpyxl (Excel) |
| Encryption | cryptography library (AES-256 for sensitive fields) |
| Deployment | Docker + Docker Compose |

---

## 3. Multi-Company Architecture

### Data Isolation Strategy

| Table | Isolation | Description |
|-------|----------|-------------|
| companies | — | Company master |
| users | company_id (required) | Per-company, Super Admin can move |
| invoices | company_id (required) | Fully isolated |
| invoice_approvals | company_id (required) | Fully isolated |
| invoice_payments | company_id (required) | Fully isolated |
| vendor_contracts | company_id (required) | Fully isolated |
| validation_results | company_id (required) | Fully isolated |
| audit_logs | company_id (required) | Fully isolated |
| notifications | company_id (required) | Fully isolated |
| email_configurations | company_id (required) | Fully isolated |
| vendors | company_id (nullable) | NULL = shared pool |
| global_validation_rules | company_id (nullable) | NULL = system template |
| type_rule_sets | company_id (nullable) | NULL = system template |
| invoice_types | company_id (nullable) | NULL = system default |
| exchange_rates | — | System-wide shared |

### User Role Hierarchy

```
┌─────────────────────────────────────────────────────┐
│  Super Admin                                        │
│  - Manage all companies                             │
│  - Move users between companies                     │
│  - Manage system-wide rule templates                │
│  - Manage shared vendor pool                        │
│  - View cross-company dashboard                     │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   Company A       Company B       Company C
        │
        ├── Company Admin
        │     - Full access within own company
        │     - Invite / manage users
        │     - Configure rules & contracts
        │     - Configure email accounts
        │
        ├── Accountant
        │     - Upload & submit invoices
        │     - View invoices & reports
        │
        ├── Approver
        │     - Review & approve/reject invoices
        │     - View assigned invoices
        │
        └── Viewer
              - Read-only access
```

---

## 4. Invoice Input Channels

| Channel | Format | Process |
|---------|--------|---------|
| 📬 Mail (Physical) | Photo (JPG/PNG) | Manual upload → Claude OCR |
| 📧 Gmail | Body + PDF/Image (mixed) | Gmail API auto-polling → Claude OCR |
| 📧 Outlook | Body + PDF/Image (mixed) | MS Graph API auto-polling → Claude OCR |

---

## 5. Invoice Types

6 default types, expandable per company from UI.

| Type Code | Type Name | Key Validation Focus |
|-----------|-----------|----------------------|
| PO | Purchase Order | PO# match, qty/price verify |
| FREIGHT | Freight / Logistics | Route, rate check |
| SERVICE | Service Contract | Contracted rate, deliverables |
| RECURRING | Recurring | Fixed amount, billing cycle |
| UTILITY | Utility | Prior month variance |
| PROFESSIONAL | Professional Service | Hourly rate, approver required |

---

## 6. Invoice Lifecycle

```
                    ┌─────────────┐
                    │   RECEIVED  │  ← OCR parsed (email/upload)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   PENDING   │  ← Saved to DB, validation running
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       Validation PASS           Validation FAIL
              │                         │
              ▼                         ▼
       ┌────────────┐           ┌──────────────┐
       │ SUBMITTED  │           │ REVIEW_NEEDED│ ← Manual review
       └─────┬──────┘           └──────┬───────┘
             │                         │
             ▼                         │
       ┌────────────┐                  │
       │ IN_APPROVAL│ ←────────────────┘
       └─────┬──────┘
             │
     ┌───────┴────────┐
     ▼                ▼
┌─────────┐     ┌──────────┐
│APPROVED │     │ REJECTED │ → Reason + resubmit option
└────┬────┘     └──────────┘
     │
     ▼
┌─────────────┐
│  SCHEDULED  │  ← Payment scheduled
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    PAID     │  ← Payment confirmed
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    VOID     │  ← Cancelled after approval
└─────────────┘
```

---

## 7. System Architecture

```
📬 Mail Photo     📧 Gmail         📧 Outlook
      │                │                │
      ▼                ▼                ▼
  Web Upload      Gmail API       MS Graph API
  (+ Company)     (Auto Poll)     (Auto Poll)
      │                │                │
      └────────────────┼────────────────┘
                       ▼
              Claude API Processing
              ① OCR + JSON Extraction
              ② Invoice Type Detection
              ③ USD Normalization
              ④ Exchange Rate Applied
                       ▼
               Identify Company
               (session / email config)
                       ▼
              ┌─────────────────┐
              │   AWS S3        │ ← File stored
              └────────┬────────┘
                       │
                 PostgreSQL DB
                 (company_id 기반)
                       ▼
          ┌────────────────────────────┐
          │     Validation Engine      │
          │  Layer 1: Global Rules     │
          │  Layer 2: Type Rules       │
          │  Layer 3: Contract Rules   │
          └────────────┬───────────────┘
                       │
                       ▼
          ┌────────────────────────────┐
          │    Approval Workflow       │
          │  Submit → Review → Approve │
          └────────────┬───────────────┘
                       │
                       ▼
          ┌────────────────────────────┐
          │    Payment Tracking        │
          │  Approved → Scheduled →    │
          │  Paid → Void               │
          └────────────┬───────────────┘
                       │
                       ▼
          ┌────────────────────────────┐
          │    Notification Service    │
          │  Email + In-app alerts     │
          └────────────┬───────────────┘
                       │
                       ▼
             Next.js Dashboard
```

---

## 8. Database Design

### Table: companies

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_code | VARCHAR(20) | Unique code |
| company_name | VARCHAR(255) | Legal name |
| ein | VARCHAR(20) | Company EIN |
| address | TEXT | |
| city | VARCHAR(100) | |
| state | VARCHAR(50) | |
| zip | VARCHAR(20) | |
| contact_name | VARCHAR(255) | |
| contact_email | VARCHAR(255) | |
| contact_phone | VARCHAR(50) | |
| fiscal_year_start | VARCHAR(5) | e.g. "01-01" |
| default_currency | VARCHAR(10) | Default: USD |
| s3_bucket_prefix | VARCHAR(100) | Company file prefix in S3 |
| status | ENUM | ACTIVE / INACTIVE |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### Table: users

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_id | UUID | FK → companies (null = Super Admin) |
| email | VARCHAR(255) | Unique login email |
| full_name | VARCHAR(255) | |
| role | ENUM | SUPER_ADMIN / COMPANY_ADMIN / ACCOUNTANT / APPROVER / VIEWER |
| password_hash | VARCHAR | Hashed password |
| is_active | BOOLEAN | |
| last_login | TIMESTAMP | |
| notification_email | BOOLEAN | Receive email notifications |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### Table: invoice_types
*company_id = NULL → system default*

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_id | UUID | FK → companies (nullable) |
| type_code | VARCHAR(50) | |
| type_name | VARCHAR(255) | |
| description | TEXT | |
| requires_po | BOOLEAN | PO# required flag |
| requires_approver | BOOLEAN | Approver required flag |
| is_active | BOOLEAN | |
| sort_order | INTEGER | |
| created_at | TIMESTAMP | |

---

### Table: vendors
*company_id = NULL → shared pool*

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_id | UUID | FK → companies (nullable) |
| vendor_code | VARCHAR(20) | |
| company_name | VARCHAR(255) | |
| dba | VARCHAR(255) | |
| ein | VARCHAR(20) | |
| w9_submitted | BOOLEAN | |
| w9_file_path | VARCHAR | S3 path |
| is_1099_required | BOOLEAN | |
| website | VARCHAR(255) | |
| vendor_category | ENUM | SERVICE / PRODUCT / BOTH |
| status | ENUM | ACTIVE / INACTIVE |
| billing_address | TEXT | |
| billing_city | VARCHAR(100) | |
| billing_state | VARCHAR(50) | |
| billing_zip | VARCHAR(20) | |
| shipping_address | TEXT | |
| shipping_city | VARCHAR(100) | |
| shipping_state | VARCHAR(50) | |
| shipping_zip | VARCHAR(20) | |
| contact_name | VARCHAR(255) | |
| contact_phone | VARCHAR(50) | |
| contact_email | VARCHAR(255) | |
| payment_terms | VARCHAR(50) | |
| bank_name | VARCHAR(255) | |
| ach_routing | VARCHAR(20) | Encrypted (AES-256) |
| ach_account | VARCHAR(100) | Encrypted (AES-256) |
| contract_start | DATE | |
| contract_end | DATE | |
| internal_buyer | VARCHAR(255) | |
| approved_by | VARCHAR(255) | |
| notes | TEXT | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### Table: invoices

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_id | UUID | FK → companies (required) |
| vendor_id | UUID | FK → vendors |
| invoice_type_id | UUID | FK → invoice_types |
| invoice_number | VARCHAR(100) | |
| invoice_date | DATE | |
| due_date | DATE | |
| amount_subtotal | DECIMAL(12,2) | USD |
| amount_tax | DECIMAL(12,2) | USD |
| amount_total | DECIMAL(12,2) | USD |
| currency_original | VARCHAR(10) | Original currency |
| amount_original | DECIMAL(15,2) | Original amount |
| exchange_rate_id | UUID | FK → exchange_rates |
| po_number | VARCHAR(100) | For PO type |
| source_channel | ENUM | UPLOAD / GMAIL / OUTLOOK |
| source_email | VARCHAR(255) | |
| file_path | VARCHAR | S3 path |
| raw_text | TEXT | OCR extracted |
| ocr_status | ENUM | PENDING / COMPLETED / FAILED |
| status | ENUM | RECEIVED / PENDING / SUBMITTED / IN_APPROVAL / APPROVED / REJECTED / SCHEDULED / PAID / VOID |
| validation_status | ENUM | PENDING / PASS / FAIL / WARNING |
| rejection_reason | TEXT | If rejected |
| payment_id | UUID | FK → invoice_payments |
| notes | TEXT | |
| created_by | UUID | FK → users |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### Table: invoice_line_items

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| invoice_id | UUID | FK → invoices |
| line_number | INTEGER | Line sequence |
| description | TEXT | |
| quantity | DECIMAL(10,2) | |
| unit_price | DECIMAL(12,2) | USD |
| amount | DECIMAL(12,2) | USD |
| category | VARCHAR(100) | |
| matched_contract_price | DECIMAL(12,2) | |
| price_variance_pct | DECIMAL(5,2) | |

---

### Table: invoice_approvals
*승인 워크플로우 이력*

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_id | UUID | FK → companies |
| invoice_id | UUID | FK → invoices |
| step | INTEGER | Approval step (1, 2, 3...) |
| approver_id | UUID | FK → users |
| status | ENUM | PENDING / APPROVED / REJECTED |
| action_at | TIMESTAMP | When action was taken |
| comments | TEXT | Approver comments |
| rejection_reason | TEXT | If rejected |
| created_at | TIMESTAMP | |

---

### Table: invoice_payments
*지불 처리 추적*

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_id | UUID | FK → companies |
| invoice_id | UUID | FK → invoices |
| payment_method | ENUM | ACH / CHECK / WIRE / CREDIT_CARD |
| payment_status | ENUM | SCHEDULED / PROCESSING / PAID / FAILED / VOID |
| scheduled_date | DATE | Planned payment date |
| paid_date | DATE | Actual payment date |
| amount_paid | DECIMAL(12,2) | USD |
| transaction_ref | VARCHAR(100) | Bank transaction ref |
| bank_name | VARCHAR(255) | |
| notes | TEXT | |
| created_by | UUID | FK → users |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### Table: exchange_rates
*시스템 공용 환율 테이블*

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| from_currency | VARCHAR(10) | e.g. KRW |
| to_currency | VARCHAR(10) | e.g. USD |
| rate | DECIMAL(15,6) | Exchange rate |
| rate_date | DATE | Rate effective date |
| source | ENUM | AUTO_API / MANUAL |
| created_at | TIMESTAMP | |

---

### Table: global_validation_rules
*company_id = NULL → system template*

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_id | UUID | FK → companies (nullable) |
| parent_rule_id | UUID | FK → self (inherited) |
| rule_name | VARCHAR(255) | |
| rule_type | ENUM | MAX_AMOUNT / PAYMENT_TERMS / REQUIRED_DOC / DUPLICATE_CHECK / DUE_DATE / ANNUAL_LIMIT |
| severity | ENUM | FAIL / WARNING |
| max_invoice_amount | DECIMAL(12,2) | |
| annual_spend_limit | DECIMAL(12,2) | |
| allowed_payment_terms | VARCHAR(255) | |
| required_documents | VARCHAR(255) | |
| due_date_grace_days | INTEGER | |
| apply_to_category | VARCHAR(100) | null = all |
| is_active | BOOLEAN | |
| description | TEXT | |
| created_by | UUID | FK → users |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### Table: type_rule_sets
*company_id = NULL → system template*

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_id | UUID | FK → companies (nullable) |
| invoice_type_id | UUID | FK → invoice_types |
| parent_rule_set_id | UUID | FK → self (inherited) |
| rule_set_name | VARCHAR(255) | |
| description | TEXT | |
| is_active | BOOLEAN | |
| created_by | UUID | FK → users |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### Table: type_rule_conditions

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| rule_set_id | UUID | FK → type_rule_sets |
| condition_name | VARCHAR(255) | |
| condition_type | ENUM | Type-specific |
| severity | ENUM | FAIL / WARNING |
| operator | ENUM | EQ / NEQ / GT / LT / GTE / LTE / IN / BETWEEN / PCT_VARIANCE |
| threshold_value | VARCHAR(255) | |
| threshold_value2 | VARCHAR(255) | For BETWEEN |
| field_target | VARCHAR(100) | |
| description | TEXT | |
| is_active | BOOLEAN | |
| sort_order | INTEGER | |
| created_at | TIMESTAMP | |

---

### Table: vendor_contracts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_id | UUID | FK → companies |
| vendor_id | UUID | FK → vendors |
| invoice_type_id | UUID | FK → invoice_types (null = all) |
| contract_name | VARCHAR(255) | |
| contract_number | VARCHAR(100) | |
| effective_date | DATE | |
| expiry_date | DATE | |
| expiry_warning_days | INTEGER | |
| max_order_amount | DECIMAL(12,2) | |
| allowed_categories | TEXT | |
| contracted_prices | JSONB | Item → unit price |
| price_tolerance_pct | DECIMAL(5,2) | |
| notes | TEXT | |
| file_path | VARCHAR | S3 path |
| is_active | BOOLEAN | |
| created_by | UUID | FK → users |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### Table: validation_results

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_id | UUID | FK → companies |
| invoice_id | UUID | FK → invoices |
| layer | ENUM | GLOBAL / TYPE / CONTRACT |
| rule_id | UUID | FK to rule |
| rule_name | VARCHAR(255) | Snapshot |
| condition_name | VARCHAR(255) | Snapshot |
| result | ENUM | PASS / FAIL / WARNING |
| reason | TEXT | |
| checked_at | TIMESTAMP | |

---

### Table: audit_logs
*모든 데이터 변경 이력 기록*

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_id | UUID | FK → companies |
| user_id | UUID | FK → users |
| action | ENUM | CREATE / UPDATE / DELETE / APPROVE / REJECT / SUBMIT / PAY / VOID / LOGIN / EXPORT |
| entity_type | VARCHAR(50) | e.g. "invoice", "vendor" |
| entity_id | UUID | Target record ID |
| old_values | JSONB | Before snapshot |
| new_values | JSONB | After snapshot |
| ip_address | VARCHAR(50) | User IP |
| user_agent | TEXT | Browser info |
| created_at | TIMESTAMP | |

---

### Table: notifications

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_id | UUID | FK → companies |
| user_id | UUID | FK → users (target) |
| type | ENUM | APPROVAL_REQUEST / INVOICE_APPROVED / INVOICE_REJECTED / VALIDATION_FAIL / CONTRACT_EXPIRY / PAYMENT_DUE / EMAIL_RECEIVED |
| title | VARCHAR(255) | |
| message | TEXT | |
| entity_type | VARCHAR(50) | Related entity |
| entity_id | UUID | Related record ID |
| is_read | BOOLEAN | |
| email_sent | BOOLEAN | |
| created_at | TIMESTAMP | |

---

### Table: email_configurations

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_id | UUID | FK → companies |
| email_provider | ENUM | GMAIL / OUTLOOK |
| email_address | VARCHAR(255) | |
| credentials | JSONB | OAuth tokens (encrypted) |
| filter_keywords | TEXT | Subject keywords |
| filter_senders | TEXT | Allowed sender domains |
| is_active | BOOLEAN | |
| last_polled_at | TIMESTAMP | |
| created_at | TIMESTAMP | |

---

## 9. User Roles & Permissions

| Action | Super Admin | Company Admin | Accountant | Approver | Viewer |
|--------|:-----------:|:-------------:|:----------:|:--------:|:------:|
| Manage Companies | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ✅ own | ❌ | ❌ | ❌ |
| Move Users between Companies | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage System Rule Templates | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Company Rules | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Vendors (shared pool) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Vendors (own company) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Upload / Create Invoices | ✅ | ✅ | ✅ | ❌ | ❌ |
| Submit Invoices for Approval | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve / Reject Invoices | ✅ | ✅ | ❌ | ✅ | ❌ |
| Schedule / Record Payment | ✅ | ✅ | ❌ | ❌ | ❌ |
| Void Invoice | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Contracts | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Exchange Rates | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export Reports | ✅ | ✅ | ✅ | ❌ | ✅ |
| View Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Audit Logs | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 10. Validation Engine (3-Layer)

```
Invoice Saved (with company_id)
      │
      ▼
Layer 1: Global Rules
  → System templates + company custom rules
  ✔ Max Invoice Amount
  ✔ Allowed Payment Terms
  ✔ Required Documents (W-9 etc.)
  ✔ Duplicate Invoice Check
  ✔ Due Date Overdue Check
  ✔ Annual Spend Limit
      │
      ▼
Layer 2: Type-based Rules
  → System templates + company custom conditions
  PO          → PO# match, qty/price verify
  FREIGHT     → rate, route check
  SERVICE     → contracted rate, deliverable
  RECURRING   → fixed amount, billing cycle
  UTILITY     → prior month variance
  PROFESSIONAL→ hourly rate, approver required
      │
      ▼
Layer 3: Contract Rules
  → Per vendor contract conditions
  ✔ Contracted price match (± tolerance %)
  ✔ Max order amount per invoice
  ✔ Allowed item categories
  ✔ Contract period / expiry warning
      │
      ▼
Aggregate Result → Save to validation_results
  ALL PASS  → ✅ PASS  → Auto-submit for approval
  ANY WARN  → ⚠️ WARNING → Submit with warnings
  ANY FAIL  → ❌ FAIL  → REVIEW_NEEDED
```

---

## 11. Approval Workflow

```
Invoice SUBMITTED
      │
      ▼
Approver(s) notified (email + in-app)
      │
      ▼
Approver reviews invoice + validation results
      │
      ├── APPROVE → Invoice status: APPROVED
      │             Next approver notified (if multi-step)
      │             Payment scheduling enabled
      │
      └── REJECT  → Rejection reason required
                    Invoice status: REJECTED
                    Accountant notified
                    Resubmit option available
```

---

## 12. Payment Tracking

```
APPROVED
   │
   ▼
Company Admin schedules payment
   │ (method: ACH / Check / Wire / Credit Card)
   ▼
SCHEDULED (scheduled_date set)
   │
   ▼
Payment processed
   │
   ├── SUCCESS → PAID (paid_date + transaction_ref recorded)
   │
   └── FAILURE → notification sent, retry option
```

---

## 13. Notification Events

| Event | Recipients | Channel |
|-------|-----------|---------|
| Invoice received (email) | Accountant | In-app |
| Validation FAIL | Accountant, Company Admin | Email + In-app |
| Approval requested | Approver | Email + In-app |
| Invoice approved | Accountant | Email + In-app |
| Invoice rejected | Accountant | Email + In-app |
| Payment due soon | Company Admin | Email + In-app |
| Payment recorded | Accountant | In-app |
| Contract expiring | Company Admin | Email + In-app |
| Annual spend limit warning | Company Admin | Email + In-app |

---

## 14. File Storage Strategy (AWS S3)

```
S3 Bucket Structure:
invoice-management-files/
├── {company_code}/
│   ├── invoices/
│   │   └── {year}/{month}/{invoice_id}.pdf
│   ├── vendors/
│   │   └── w9/{vendor_id}_w9.pdf
│   └── contracts/
│       └── {contract_id}.pdf
└── shared/
    └── vendors/
        └── w9/{vendor_id}_w9.pdf
```

- Files stored in S3 with pre-signed URLs for secure access
- Local filesystem used in development (Docker volume)
- File size limit: 20MB per file
- Allowed types: PDF, JPG, JPEG, PNG

---

## 15. Exchange Rate Management

```
Daily Auto-fetch (Open Exchange Rates API)
      │
      ▼
exchange_rates table updated
      │
      ▼
Invoice OCR → currency detected
      │
      ├── USD → no conversion needed
      │
      └── Other (KRW, EUR, etc.)
            │
            ▼
          Lookup rate for invoice_date
          (fallback: latest available rate)
            │
            ▼
          amount_original × rate = USD amount
          exchange_rate_id saved on invoice
```

- Rates fetched daily at midnight UTC
- Manual override available (Company Admin)
- Rate used = rate on invoice date (or nearest prior date)

---

## 16. Security

| Area | Approach |
|------|---------|
| Authentication | JWT (access token 1hr + refresh token 7d) |
| Password | bcrypt hashing |
| Sensitive fields | AES-256 encryption (ACH routing/account) |
| File access | AWS S3 pre-signed URLs (15 min expiry) |
| API security | HTTPS enforced, CORS configured |
| Rate limiting | 100 req/min per IP, 1000 req/min per company |
| SQL injection | SQLAlchemy ORM (parameterized queries) |
| Audit trail | All changes logged to audit_logs |
| Data isolation | company_id middleware on every API request |

---

## 17. Report & Export

| Report | Format | Description |
|--------|--------|-------------|
| Invoice List | Excel / PDF | Filtered by date, vendor, type, status |
| Vendor Spend Summary | Excel / PDF | Spend per vendor with YTD totals |
| Validation Report | Excel / PDF | PASS/FAIL/WARNING breakdown |
| Payment Report | Excel / PDF | Paid/scheduled/overdue |
| Audit Log Export | Excel | Change history |
| 1099 Prep Report | Excel | Vendors requiring 1099 with annual totals |

---

## 18. Dashboard KPIs

### Company Dashboard
- Total invoices this month / YTD
- Pending approval count
- Validation FAIL / WARNING count
- Total spend this month / YTD (by vendor, by type)
- Overdue payments
- Contract expiry alerts (next 30/60 days)
- Invoice trend chart (monthly)
- Spend by invoice type (pie chart)
- Top 10 vendors by spend

### Super Admin Dashboard
- Active companies count
- Total invoices across all companies
- Cross-company spend summary
- System-wide validation failure rate

---

## 19. Backup Strategy

| Item | Frequency | Retention | Method |
|------|-----------|-----------|--------|
| PostgreSQL DB | Daily | 30 days | pg_dump → S3 |
| PostgreSQL DB | Weekly | 1 year | pg_dump → S3 |
| S3 Files | Continuous | Permanent | S3 versioning |
| Audit Logs | Permanent | Permanent | Never deleted |

---

## 20. Folder Structure

### Backend (FastAPI)

```
backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   │
│   ├── models/
│   │   ├── company.py
│   │   ├── user.py
│   │   ├── invoice_type.py
│   │   ├── vendor.py
│   │   ├── invoice.py
│   │   ├── invoice_line.py
│   │   ├── invoice_approval.py
│   │   ├── invoice_payment.py
│   │   ├── exchange_rate.py
│   │   ├── global_validation_rule.py
│   │   ├── type_rule_set.py
│   │   ├── type_rule_condition.py
│   │   ├── vendor_contract.py
│   │   ├── validation_result.py
│   │   ├── audit_log.py
│   │   ├── notification.py
│   │   └── email_configuration.py
│   │
│   ├── schemas/
│   │   ├── company.py
│   │   ├── user.py
│   │   ├── invoice_type.py
│   │   ├── vendor.py
│   │   ├── invoice.py
│   │   ├── approval.py
│   │   ├── payment.py
│   │   ├── exchange_rate.py
│   │   ├── global_rule.py
│   │   ├── type_rule.py
│   │   └── vendor_contract.py
│   │
│   ├── api/v1/
│   │   ├── auth.py
│   │   ├── companies.py
│   │   ├── users.py
│   │   ├── invoice_types.py
│   │   ├── vendors.py
│   │   ├── invoices.py
│   │   ├── approvals.py
│   │   ├── payments.py
│   │   ├── exchange_rates.py
│   │   ├── global_rules.py
│   │   ├── type_rules.py
│   │   ├── vendor_contracts.py
│   │   ├── validations.py
│   │   ├── reports.py
│   │   ├── audit_logs.py
│   │   └── dashboard.py
│   │
│   ├── middleware/
│   │   ├── company_context.py
│   │   ├── rate_limiter.py
│   │   └── audit_middleware.py
│   │
│   ├── services/
│   │   ├── ocr_service.py
│   │   ├── email_service.py
│   │   ├── validation_service.py
│   │   ├── approval_service.py
│   │   ├── payment_service.py
│   │   ├── notification_service.py
│   │   ├── exchange_rate_service.py
│   │   ├── export_service.py
│   │   ├── vendor_service.py
│   │   └── invoice_service.py
│   │
│   └── utils/
│       ├── pdf_parser.py
│       ├── file_handler.py
│       ├── s3_client.py
│       └── encryption.py
│
├── alembic/
├── tests/
├── requirements.txt
└── Dockerfile
```

### Frontend (Next.js)

```
frontend/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (super-admin)/
│   │   ├── companies/page.tsx
│   │   ├── exchange-rates/page.tsx
│   │   └── rules/templates/page.tsx
│   ├── (company)/
│   │   ├── page.tsx                      # Dashboard
│   │   ├── vendors/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── contracts/page.tsx
│   │   ├── invoices/
│   │   │   ├── page.tsx
│   │   │   ├── upload/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── approvals/page.tsx            # Approval queue
│   │   ├── payments/page.tsx             # Payment tracking
│   │   ├── rules/
│   │   │   ├── global/page.tsx
│   │   │   └── types/page.tsx
│   │   ├── reports/page.tsx              # Export reports
│   │   ├── audit/page.tsx                # Audit logs
│   │   └── settings/
│   │       ├── users/page.tsx
│   │       ├── email/page.tsx
│   │       └── notifications/page.tsx
│   └── layout.tsx
│
├── components/
│   ├── dashboard/
│   │   ├── SummaryCards.tsx
│   │   ├── InvoiceChart.tsx
│   │   ├── SpendByTypeChart.tsx
│   │   ├── TopVendorsTable.tsx
│   │   └── AlertsPanel.tsx
│   ├── vendors/
│   │   ├── VendorForm.tsx
│   │   └── ContractRuleForm.tsx
│   ├── invoices/
│   │   ├── DropZone.tsx
│   │   ├── InvoiceDetail.tsx
│   │   └── ValidationResultPanel.tsx
│   ├── approvals/
│   │   └── ApprovalActionPanel.tsx
│   ├── payments/
│   │   └── PaymentForm.tsx
│   ├── rules/
│   │   ├── GlobalRuleForm.tsx
│   │   ├── TypeRulePanel.tsx
│   │   └── ConditionForm.tsx
│   └── common/
│       ├── CompanySwitcher.tsx
│       ├── StatusBadge.tsx
│       ├── NotificationBell.tsx
│       └── AuditLogTable.tsx
│
└── lib/
    ├── api.ts
    ├── auth.ts
    └── utils.ts
```

---

## 21. Development Roadmap

### Phase 1 — Foundation (Week 1–2)
- [ ] Docker + PostgreSQL + AWS S3 (local mock) setup
- [ ] FastAPI base + JWT auth + HTTPS
- [ ] All DB models & Alembic migrations
- [ ] Company context + audit + rate limit middleware
- [ ] Next.js + Tailwind + auth setup

### Phase 2 — Company & User Management (Week 2–3)
- [ ] Company CRUD (Super Admin)
- [ ] User management + role-based access
- [ ] Company switcher UI

### Phase 3 — Vendor Master (Week 3–4)
- [ ] Vendor API (shared pool + company-specific)
- [ ] Vendor registration & list UI
- [ ] ACH encryption

### Phase 4 — Invoice Type & Rule Engine (Week 4–6)
- [ ] Invoice type master
- [ ] Global rules management
- [ ] Type rule sets + conditions
- [ ] Vendor contract rules
- [ ] 3-layer validation engine

### Phase 5 — Invoice Upload & OCR (Week 6–8)
- [ ] S3 file upload
- [ ] Claude API OCR + type auto-detection
- [ ] Exchange rate integration
- [ ] Invoice + line item save
- [ ] Upload UI + drag & drop
- [ ] Auto-run validation

### Phase 6 — Approval & Payment Workflow (Week 8–9)
- [ ] Approval workflow API + UI
- [ ] Payment tracking API + UI
- [ ] Notification service (email + in-app)

### Phase 7 — Email Integration (Week 9–10)
- [ ] Gmail API polling per company
- [ ] Outlook MS Graph API polling
- [ ] Auto vendor + type matching

### Phase 8 — Dashboard & Reports (Week 10–11)
- [ ] Per-company dashboard + KPIs
- [ ] Super Admin cross-company view
- [ ] Excel / PDF export
- [ ] 1099 prep report
- [ ] Audit log viewer

### Phase 9 — Polish & Deploy (Week 11–12)
- [ ] Role-based UI restrictions
- [ ] Backup strategy (pg_dump + S3)
- [ ] Docker Compose production setup
- [ ] Security audit + penetration test prep
- [ ] Testing & bug fixes
- [ ] Production deployment

---

*Document will be updated as the project progresses.*
