# AI Invoice Automation System — Project Design Document
**Version 4.0 | March 2026**

---

## 1. Project Overview

| Item | Details |
|------|---------|
| Project Name | AI Invoice Automation System |
| Purpose | Automate invoice intake, OCR parsing, data storage, compliance validation, and dashboard reporting |
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
| Charts | Recharts (Next.js) |
| Deployment | Docker + Docker Compose |

---

## 3. Multi-Company Architecture

### 데이터 분리 전략

| Table | 분리 방식 | 설명 |
|-------|----------|------|
| companies | — | 컴퍼니 마스터 |
| users | company_id (필수) | 컴퍼니별 독립, Super Admin은 이동 가능 |
| invoices | company_id (필수) | 완전 독립 |
| vendor_contracts | company_id (필수) | 완전 독립 |
| validation_results | company_id (필수) | 완전 독립 |
| vendors | company_id (nullable) | NULL = 공용 vendor, 값 있으면 전용 vendor |
| global_validation_rules | company_id (nullable) | NULL = 시스템 공용 템플릿 |
| type_rule_sets | company_id (nullable) | NULL = 시스템 공용 템플릿 |
| invoice_types | company_id (nullable) | NULL = 시스템 공용 |

### 사용자 권한 구조

```
┌─────────────────────────────────────────────────────┐
│  Super Admin                                        │
│  - 모든 Company 조회/관리                            │
│  - User 컴퍼니 간 이동                               │
│  - 시스템 공용 Rule 템플릿 관리                       │
│  - 공용 Vendor Pool 관리                             │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   Company A       Company B       Company C
   Admin/Users     Admin/Users     Admin/Users
        │
        ├── Company Admin
        │     - 자사 전체 관리
        │     - User 초대/관리
        │     - Rule 설정 (공용 템플릿 상속 or 독립)
        │     - Vendor 공용 풀 사용 or 전용 추가
        │
        └── Company User (역할별)
              - Accountant: 인보이스 입력/조회
              - Approver:   인보이스 승인
              - Viewer:     조회만 가능
```

---

## 4. Invoice Input Channels

| Channel | Format | Process |
|---------|--------|---------|
| 📬 Mail (Physical) | Photo (JPG/PNG) | Manual upload via web UI → Claude OCR |
| 📧 Gmail | Body + PDF/Image attachment (mixed) | Gmail API auto-polling → Claude OCR |
| 📧 Outlook | Body + PDF/Image attachment (mixed) | MS Graph API auto-polling → Claude OCR |

---

## 5. Invoice Types

총 6가지 기본 타입 제공, 화면에서 컴퍼니별 추가 가능.

| Type Code | Type Name | Key Validation Focus |
|-----------|-----------|----------------------|
| PO | Purchase Order | PO Number 매칭, 수량/단가 검증 |
| FREIGHT | Freight / Logistics | 운송 구간, 요율 검증 |
| SERVICE | Service Contract | 계약 단가, 작업 내역 검증 |
| RECURRING | Recurring | 고정금액, 청구 주기 검증 |
| UTILITY | Utility | 전월 대비 변동률 검증 |
| PROFESSIONAL | Professional Service | 시간당 단가, 승인자 검증 |

---

## 6. System Architecture

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
                       ▼
               Identify Company
               (from user session / email config)
                       ▼
                 PostgreSQL DB
                 (company_id 기반 저장)
                       ▼
          ┌────────────────────────────┐
          │     Validation Engine      │
          │  Layer 1: Global Rules     │
          │  (공용 템플릿 + 회사 커스텀) │
          │  Layer 2: Type Rules       │
          │  (공용 템플릿 + 회사 커스텀) │
          │  Layer 3: Contract Rules   │
          │  (회사별 계약 조건)          │
          └────────────────────────────┘
                       ▼
             Next.js Dashboard
             (Company 컨텍스트 기반)
```

---

## 7. Database Design

### Table: companies

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_code | VARCHAR(20) | Unique company code |
| company_name | VARCHAR(255) | Company name |
| ein | VARCHAR(20) | Company EIN |
| address | TEXT | |
| city | VARCHAR(100) | |
| state | VARCHAR(50) | |
| zip | VARCHAR(20) | |
| contact_name | VARCHAR(255) | Admin contact |
| contact_email | VARCHAR(255) | |
| contact_phone | VARCHAR(50) | |
| fiscal_year_start | VARCHAR(5) | e.g. "01-01" |
| default_currency | VARCHAR(10) | Default: USD |
| status | ENUM | ACTIVE / INACTIVE |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### Table: users

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_id | UUID | FK → companies (null = Super Admin) |
| email | VARCHAR(255) | Login email (unique) |
| full_name | VARCHAR(255) | |
| role | ENUM | SUPER_ADMIN / COMPANY_ADMIN / ACCOUNTANT / APPROVER / VIEWER |
| is_active | BOOLEAN | |
| last_login | TIMESTAMP | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### Table: invoice_types
*company_id = NULL → 시스템 공용 / 값 있으면 회사 전용*

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_id | UUID | FK → companies (nullable) |
| type_code | VARCHAR(50) | Unique per company |
| type_name | VARCHAR(255) | |
| description | TEXT | |
| is_active | BOOLEAN | |
| sort_order | INTEGER | |
| created_at | TIMESTAMP | |

---

### Table: vendors
*company_id = NULL → 공용 Vendor Pool / 값 있으면 회사 전용*

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_id | UUID | FK → companies (nullable) |
| vendor_code | VARCHAR(20) | |
| company_name | VARCHAR(255) | |
| dba | VARCHAR(255) | |
| ein | VARCHAR(20) | |
| w9_submitted | BOOLEAN | |
| w9_file_path | VARCHAR | |
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
| ach_routing | VARCHAR(20) | |
| ach_account | VARCHAR(50) | |
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
| currency_original | VARCHAR(10) | |
| amount_original | DECIMAL(15,2) | |
| exchange_rate | DECIMAL(10,4) | |
| po_number | VARCHAR(100) | For PO type |
| source_channel | ENUM | UPLOAD / GMAIL / OUTLOOK |
| source_email | VARCHAR(255) | |
| file_path | VARCHAR | |
| raw_text | TEXT | |
| ocr_status | ENUM | PENDING / COMPLETED / FAILED |
| validation_status | ENUM | PENDING / PASS / FAIL / WARNING |
| approved_by | VARCHAR(255) | |
| approved_at | TIMESTAMP | |
| notes | TEXT | |
| created_by | UUID | FK → users |
| created_at | TIMESTAMP | |

---

### Table: invoice_line_items

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| invoice_id | UUID | FK → invoices |
| description | TEXT | |
| quantity | DECIMAL(10,2) | |
| unit_price | DECIMAL(12,2) | USD |
| amount | DECIMAL(12,2) | USD |
| category | VARCHAR(100) | |
| matched_contract_price | DECIMAL(12,2) | |
| price_variance_pct | DECIMAL(5,2) | |

---

### Table: global_validation_rules
*company_id = NULL → 시스템 공용 템플릿*
*company_id 있으면 → 해당 회사 전용 (또는 공용 복사본)*

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_id | UUID | FK → companies (nullable) |
| parent_rule_id | UUID | FK → self (공용 템플릿 상속 시) |
| rule_name | VARCHAR(255) | |
| rule_type | ENUM | MAX_AMOUNT / PAYMENT_TERMS / REQUIRED_DOC / DUPLICATE_CHECK / DUE_DATE / ANNUAL_LIMIT |
| severity | ENUM | FAIL / WARNING |
| max_invoice_amount | DECIMAL(12,2) | |
| annual_spend_limit | DECIMAL(12,2) | |
| allowed_payment_terms | VARCHAR(255) | |
| required_documents | VARCHAR(255) | |
| due_date_grace_days | INTEGER | |
| apply_to_category | VARCHAR(100) | |
| is_active | BOOLEAN | |
| description | TEXT | |
| created_by | UUID | FK → users |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### Table: type_rule_sets
*company_id = NULL → 공용 템플릿*

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_id | UUID | FK → companies (nullable) |
| invoice_type_id | UUID | FK → invoice_types |
| parent_rule_set_id | UUID | FK → self (상속 시) |
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
| condition_type | ENUM | Type-specific condition |
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
| company_id | UUID | FK → companies (required) |
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
| file_path | VARCHAR | |
| is_active | BOOLEAN | |
| created_by | UUID | FK → users |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### Table: validation_results

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_id | UUID | FK → companies (required) |
| invoice_id | UUID | FK → invoices |
| layer | ENUM | GLOBAL / TYPE / CONTRACT |
| rule_id | UUID | FK to relevant rule |
| rule_name | VARCHAR(255) | Snapshot |
| condition_name | VARCHAR(255) | Snapshot |
| result | ENUM | PASS / FAIL / WARNING |
| reason | TEXT | |
| checked_at | TIMESTAMP | |

---

### Table: email_configurations
*컴퍼니별 이메일 계정 설정*

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| company_id | UUID | FK → companies (required) |
| email_provider | ENUM | GMAIL / OUTLOOK |
| email_address | VARCHAR(255) | Monitored email |
| credentials | JSONB | OAuth tokens (encrypted) |
| filter_keywords | TEXT | Subject filter keywords |
| is_active | BOOLEAN | |
| last_polled_at | TIMESTAMP | |
| created_at | TIMESTAMP | |

---

## 8. User Roles & Permissions

| Action | Super Admin | Company Admin | Accountant | Approver | Viewer |
|--------|:-----------:|:-------------:|:----------:|:--------:|:------:|
| Manage Companies | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ✅ (own co.) | ❌ | ❌ | ❌ |
| Move Users between Companies | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Global Rule Templates | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Company Rules | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Vendors (shared pool) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Vendors (own company) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Upload / Create Invoices | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve Invoices | ✅ | ✅ | ❌ | ✅ | ❌ |
| View Invoices | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage Contracts | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 9. Validation Engine (3-Layer)

```
Invoice 저장 (company_id 포함)
      │
      ▼
Layer 1: Global Rules
  → 시스템 공용 템플릿 적용
  → 해당 company 커스텀 룰 추가 적용
      │
      ▼
Layer 2: Type-based Rules
  → 시스템 공용 타입 룰 적용
  → 해당 company 커스텀 타입 룰 추가 적용
      │
      ▼
Layer 3: Contract Rules
  → 해당 company + vendor 계약 조건 적용
      │
      ▼
결과 저장 (validation_results, company_id 포함)
```

---

## 10. Folder Structure

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
│   │   ├── global_validation_rule.py
│   │   ├── type_rule_set.py
│   │   ├── type_rule_condition.py
│   │   ├── vendor_contract.py
│   │   ├── validation_result.py
│   │   └── email_configuration.py
│   │
│   ├── schemas/
│   │   ├── company.py
│   │   ├── user.py
│   │   ├── invoice_type.py
│   │   ├── vendor.py
│   │   ├── invoice.py
│   │   ├── global_rule.py
│   │   ├── type_rule.py
│   │   └── vendor_contract.py
│   │
│   ├── api/v1/
│   │   ├── auth.py                  # Login / JWT
│   │   ├── companies.py             # Company CRUD (Super Admin)
│   │   ├── users.py                 # User management
│   │   ├── invoice_types.py
│   │   ├── vendors.py
│   │   ├── invoices.py
│   │   ├── global_rules.py
│   │   ├── type_rules.py
│   │   ├── vendor_contracts.py
│   │   ├── validations.py
│   │   └── dashboard.py
│   │
│   ├── middleware/
│   │   └── company_context.py       # company_id 자동 주입
│   │
│   ├── services/
│   │   ├── ocr_service.py
│   │   ├── email_service.py
│   │   ├── validation_service.py
│   │   ├── vendor_service.py
│   │   └── invoice_service.py
│   │
│   └── utils/
│       ├── pdf_parser.py
│       └── file_handler.py
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
│   │   ├── companies/page.tsx       # Company list
│   │   └── rules/templates/page.tsx # System-wide rule templates
│   ├── (company)/
│   │   ├── page.tsx                 # Dashboard
│   │   ├── vendors/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/contracts/page.tsx
│   │   ├── invoices/
│   │   │   ├── page.tsx
│   │   │   ├── upload/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── rules/
│   │   │   ├── global/page.tsx
│   │   │   └── types/page.tsx
│   │   └── settings/
│   │       ├── users/page.tsx
│   │       └── email/page.tsx       # Email config
│   └── layout.tsx
│
├── components/
│   ├── dashboard/
│   ├── vendors/
│   ├── invoices/
│   ├── rules/
│   └── common/
│       ├── CompanySwitcher.tsx      # Super Admin용 컴퍼니 전환
│       └── StatusBadge.tsx
│
└── lib/
    ├── api.ts
    └── auth.ts
```

---

## 11. Development Roadmap

### Phase 1 — Foundation (Week 1–2)
- [ ] Docker + PostgreSQL setup
- [ ] FastAPI base structure + JWT auth
- [ ] All DB models & Alembic migrations
- [ ] Company context middleware
- [ ] Next.js + Tailwind + auth setup

### Phase 2 — Company & User Management (Week 2–3)
- [ ] Company CRUD (Super Admin)
- [ ] User management + role-based access
- [ ] Company switcher (Super Admin UI)

### Phase 3 — Vendor Master (Week 3–4)
- [ ] Vendor API (shared pool + company-specific)
- [ ] Vendor registration & list UI

### Phase 4 — Invoice Type & Rule Engine (Week 4–6)
- [ ] Invoice type master
- [ ] Global rules (system templates + company custom)
- [ ] Type rule sets + conditions
- [ ] Vendor contract rules
- [ ] 3-layer validation engine

### Phase 5 — Invoice Upload & OCR (Week 6–8)
- [ ] File upload API
- [ ] Claude API OCR + type auto-detection
- [ ] Invoice + line item save
- [ ] Upload UI (drag & drop)
- [ ] Auto-run validation

### Phase 6 — Email Integration (Week 8–9)
- [ ] Email config per company (Gmail + Outlook)
- [ ] Auto polling + parsing
- [ ] Auto vendor + type matching

### Phase 7 — Dashboard (Week 9–10)
- [ ] Per-company dashboard
- [ ] Super Admin cross-company overview
- [ ] Invoice trends, vendor spend, validation status
- [ ] Contract expiry alerts

### Phase 8 — Polish & Deploy (Week 10–11)
- [ ] Role-based UI restrictions
- [ ] Docker Compose full setup
- [ ] Testing & bug fixes
- [ ] Production deployment

---

*Document will be updated as the project progresses.*
