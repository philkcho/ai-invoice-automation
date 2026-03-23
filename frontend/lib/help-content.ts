export interface HelpTopic {
  titleEn: string;
  titleKo: string;
  descEn: string;
  descKo: string;
  features: { en: string; ko: string }[];
  tipEn?: string;
  tipKo?: string;
}

const helpMap: Record<string, HelpTopic> = {
  '/': {
    titleEn: 'Dashboard',
    titleKo: '대시보드',
    descEn: 'Your command center showing real-time invoice processing status.',
    descKo: '실시간 인보이스 처리 현황을 보여주는 컨트롤 센터입니다.',
    features: [
      { en: 'KPI Cards — This month\'s invoices, unpaid, overdue, and paid amounts', ko: 'KPI 카드 — 이번 달 인보이스, 미결제, 연체, 결제 완료 금액' },
      { en: 'Processing Pipeline — Visual breakdown of invoices by status stage', ko: '처리 파이프라인 — 상태별 인보이스 시각적 분류' },
      { en: 'Monthly Spend Trend — 12-month bar chart with month-over-month comparison', ko: '월별 지출 추세 — 12개월 바 차트 및 전월 대비' },
      { en: 'Action Required — Overdue payments, pending approvals, and validation issues', ko: '조치 필요 — 연체 결제, 승인 대기, 검증 문제' },
    ],
    tipEn: 'Click on any pipeline stage or action item to jump directly to that invoice.',
    tipKo: '파이프라인 단계나 조치 항목을 클릭하면 해당 인보이스로 바로 이동합니다.',
  },
  '/invoices': {
    titleEn: 'Invoice List',
    titleKo: '인보이스 목록',
    descEn: 'View, search, and manage all invoices in your company.',
    descKo: '회사의 모든 인보이스를 조회, 검색, 관리합니다.',
    features: [
      { en: 'Search by invoice number or PO number', ko: '인보이스 번호 또는 PO 번호로 검색' },
      { en: 'Filter by status (Received, Pending, Approved, Paid, etc.)', ko: '상태별 필터 (수신, 대기, 승인, 결제 등)' },
      { en: 'Click any row to view invoice details', ko: '행 클릭 시 인보이스 상세 보기' },
      { en: 'Validation status shown as Pass/Fail/Warning badges', ko: '검증 상태가 Pass/Fail/Warning 배지로 표시' },
    ],
    tipEn: 'Use the status filter to quickly find invoices needing your attention.',
    tipKo: '상태 필터를 사용하면 주의가 필요한 인보이스를 빠르게 찾을 수 있습니다.',
  },
  '/invoices/upload': {
    titleEn: 'Upload Invoice',
    titleKo: '인보이스 업로드',
    descEn: 'Upload a PDF or image file and let AI extract all invoice data automatically.',
    descKo: 'PDF 또는 이미지 파일을 업로드하면 AI가 자동으로 모든 인보이스 데이터를 추출합니다.',
    features: [
      { en: 'Drag & drop or click to browse — supports PDF, JPG, PNG (max 20MB)', ko: '드래그 & 드롭 또는 파일 찾기 — PDF, JPG, PNG 지원 (최대 20MB)' },
      { en: 'AI extracts: vendor, invoice #, dates, line items, amounts', ko: 'AI 추출 항목: 거래처, 인보이스 번호, 날짜, 항목, 금액' },
      { en: 'Review and correct extracted data before creating', ko: '생성 전 추출 데이터 검토 및 수정' },
      { en: 'Duplicate invoice detection warns you automatically', ko: '중복 인보이스 자동 감지 경고' },
    ],
    tipEn: 'For best OCR results, ensure the invoice image is clear and well-lit.',
    tipKo: '최적의 OCR 결과를 위해 인보이스 이미지가 선명하게 촬영되었는지 확인하세요.',
  },
  '/invoices/[id]': {
    titleEn: 'Invoice Detail',
    titleKo: '인보이스 상세',
    descEn: 'View and edit invoice data, run validation, and submit for approval.',
    descKo: '인보이스 데이터를 조회/편집하고, 검증을 실행하고, 승인에 제출합니다.',
    features: [
      { en: 'Edit invoice fields (vendor, dates, amounts, line items)', ko: '인보이스 필드 편집 (거래처, 날짜, 금액, 항목)' },
      { en: 'View validation results — each rule shows Pass/Fail with reason', ko: '검증 결과 확인 — 각 규칙의 Pass/Fail 및 사유 표시' },
      { en: 'Submit for approval when all validations pass', ko: '모든 검증 통과 시 승인 제출' },
      { en: 'View original uploaded file', ko: '원본 업로드 파일 보기' },
    ],
  },
  '/approvals': {
    titleEn: 'Approvals',
    titleKo: '승인',
    descEn: 'Review and approve or reject invoices assigned to you.',
    descKo: '본인에게 배정된 인보이스를 검토하고 승인 또는 거절합니다.',
    features: [
      { en: 'Filter by status: Pending, Approved, Rejected', ko: '상태별 필터: 대기, 승인, 거절' },
      { en: 'Approve with one click or reject with a reason', ko: '원클릭 승인 또는 사유와 함께 거절' },
      { en: 'Add comments to communicate with the team', ko: '코멘트 추가로 팀과 소통' },
      { en: 'Multi-level approval — invoices may require multiple approvers', ko: '다단계 승인 — 여러 승인자가 필요할 수 있음' },
    ],
  },
  '/payments': {
    titleEn: 'Payments',
    titleKo: '결제',
    descEn: 'Schedule and track payments for approved invoices.',
    descKo: '승인된 인보이스의 결제를 예약하고 추적합니다.',
    features: [
      { en: 'Awaiting Payment tab — approved invoices ready for payment', ko: '결제 대기 탭 — 결제 준비된 승인 인보이스' },
      { en: 'Payment Records tab — history of all payments', ko: '결제 기록 탭 — 모든 결제 이력' },
      { en: 'Payment methods: ACH, Wire, Check, Credit Card', ko: '결제 방법: ACH, 송금, 수표, 신용카드' },
      { en: 'Track status: Scheduled → Processing → Paid', ko: '상태 추적: 예약 → 처리 중 → 결제 완료' },
    ],
  },
  '/vendors': {
    titleEn: 'Vendor Management',
    titleKo: '거래처 관리',
    descEn: 'Manage your vendor master data, contacts, and compliance documents.',
    descKo: '거래처 마스터 데이터, 연락처, 컴플라이언스 문서를 관리합니다.',
    features: [
      { en: 'Add vendors with EIN, address, contact info', ko: 'EIN, 주소, 연락처로 거래처 추가' },
      { en: 'Track W9 submission and 1099 requirements', ko: 'W9 제출 및 1099 요구사항 추적' },
      { en: 'Set payment terms and bank info (ACH)', ko: '결제 조건 및 은행 정보(ACH) 설정' },
      { en: 'Filter by status: Active / Inactive', ko: '상태 필터: 활성 / 비활성' },
    ],
  },
  '/settings/approval-settings': {
    titleEn: 'Approval Rules',
    titleKo: '승인 규칙',
    descEn: 'Configure multi-level approval workflows for your company.',
    descKo: '회사의 다단계 승인 워크플로우를 설정합니다.',
    features: [
      { en: 'Set approval steps with role-based approvers', ko: '역할 기반 승인자로 승인 단계 설정' },
      { en: 'Configure amount thresholds for different approval levels', ko: '금액 기준별 승인 레벨 설정' },
      { en: 'Enable/disable approval requirement', ko: '승인 요구사항 활성화/비활성화' },
    ],
  },
  '/settings/email-digest': {
    titleEn: 'Email Digest',
    titleKo: '이메일 다이제스트',
    descEn: 'Receive periodic email summaries of your invoice processing status.',
    descKo: '인보이스 처리 현황에 대한 정기 이메일 요약을 받습니다.',
    features: [
      { en: 'Choose frequency: Daily, Weekly, or Both', ko: '빈도 선택: 매일, 매주, 또는 둘 다' },
      { en: 'Set custom SMTP for your company (optional)', ko: '회사 전용 SMTP 설정 (선택)' },
      { en: 'Add system users or external email recipients', ko: '시스템 사용자 또는 외부 이메일 수신자 추가' },
      { en: 'Send test email to verify configuration', ko: '설정 확인용 테스트 이메일 발송' },
    ],
  },
  '/settings/email': {
    titleEn: 'Email Integration',
    titleKo: '이메일 연동',
    descEn: 'Connect Gmail or Outlook to automatically collect invoices from email.',
    descKo: 'Gmail 또는 Outlook을 연결하여 이메일에서 자동으로 인보이스를 수집합니다.',
    features: [
      { en: 'Connect Gmail via OAuth (one-click setup)', ko: 'OAuth를 통한 Gmail 연결 (원클릭 설정)' },
      { en: 'Connect Outlook via Microsoft Graph API', ko: 'Microsoft Graph API를 통한 Outlook 연결' },
      { en: 'Set keyword and sender filters', ko: '키워드 및 발신자 필터 설정' },
      { en: 'System polls for new invoices every 5 minutes', ko: '시스템이 5분마다 새 인보이스를 확인' },
    ],
  },
  '/invoices/new': {
    titleEn: 'Create Invoice',
    titleKo: '인보이스 생성',
    descEn: 'Manually create a new invoice with vendor, line items, and amounts.',
    descKo: '거래처, 항목, 금액을 수동으로 입력하여 새 인보이스를 생성합니다.',
    features: [
      { en: 'Select vendor and invoice type', ko: '거래처 및 인보이스 타입 선택' },
      { en: 'Add line items with description, quantity, and unit price', ko: '항목별 설명, 수량, 단가 입력' },
      { en: 'Attach original file (PDF, JPG, PNG)', ko: '원본 파일 첨부 (PDF, JPG, PNG)' },
      { en: 'Link to PO, contract, or recurring amount if applicable', ko: '해당 시 PO, 계약, 고정금액 연결' },
    ],
    tipEn: 'Use Upload or Batch File if you have a PDF — AI will extract data automatically.',
    tipKo: 'PDF가 있다면 업로드 또는 일괄 파일 기능을 사용하면 AI가 자동으로 데이터를 추출합니다.',
  },
  '/invoices/email': {
    titleEn: 'Email Invoice Collection',
    titleKo: '이메일 인보이스 수집',
    descEn: 'View connected email accounts and manually trigger invoice polling.',
    descKo: '연결된 이메일 계정을 확인하고 수동으로 인보이스 폴링을 실행합니다.',
    features: [
      { en: 'View all connected email configurations', ko: '연결된 모든 이메일 설정 확인' },
      { en: 'Manually poll individual or all accounts', ko: '개별 또는 전체 계정 수동 폴링' },
      { en: 'See poll results: emails fetched, invoices created, errors', ko: '폴링 결과 확인: 가져온 이메일, 생성된 인보이스, 오류' },
      { en: 'Check last polled time and error status', ko: '마지막 폴링 시간 및 오류 상태 확인' },
    ],
    tipEn: 'The system automatically polls every 5 minutes. Use manual poll for immediate collection.',
    tipKo: '시스템이 5분마다 자동 폴링합니다. 즉시 수집이 필요하면 수동 폴링을 사용하세요.',
  },
  '/invoices/file': {
    titleEn: 'Batch File Upload',
    titleKo: '일괄 파일 업로드',
    descEn: 'Upload multiple invoice files at once for batch AI processing.',
    descKo: '여러 인보이스 파일을 한번에 업로드하여 일괄 AI 처리합니다.',
    features: [
      { en: 'Drag & drop multiple files (PDF, JPG, PNG)', ko: '여러 파일 드래그 & 드롭 (PDF, JPG, PNG)' },
      { en: 'Pre-select vendor and invoice type for all files', ko: '전체 파일에 거래처 및 인보이스 타입 사전 선택' },
      { en: 'Track processing status per file: pending, extracting, created, error', ko: '파일별 처리 상태 추적: 대기, 추출 중, 생성, 오류' },
      { en: 'Duplicate detection for each file', ko: '파일별 중복 감지' },
    ],
    tipEn: 'Select vendor and invoice type before processing to speed up batch creation.',
    tipKo: '처리 전에 거래처와 인보이스 타입을 선택하면 일괄 생성이 빨라집니다.',
  },
  '/purchase-orders': {
    titleEn: 'Purchase Orders',
    titleKo: '구매주문서',
    descEn: 'View and manage purchase orders for invoice matching.',
    descKo: '인보이스 매칭을 위한 구매주문서를 조회하고 관리합니다.',
    features: [
      { en: 'Search by PO number', ko: 'PO 번호로 검색' },
      { en: 'Filter by status: Open, Partially Invoiced, Fully Invoiced, Closed, Cancelled', ko: '상태별 필터: 미결, 부분 청구, 전액 청구, 마감, 취소' },
      { en: 'View total, invoiced, and remaining amounts', ko: '총액, 청구 금액, 잔여 금액 조회' },
      { en: 'Click to view PO detail or create new PO', ko: 'PO 상세 보기 또는 새 PO 생성' },
    ],
  },
  '/purchase-orders/new': {
    titleEn: 'Create Purchase Order',
    titleKo: '구매주문서 생성',
    descEn: 'Create a new purchase order with vendor, line items, and categories.',
    descKo: '거래처, 항목, 카테고리를 지정하여 새 구매주문서를 생성합니다.',
    features: [
      { en: 'Select vendor and enter PO number', ko: '거래처 선택 및 PO 번호 입력' },
      { en: 'Add line items with description, quantity, unit price, and category', ko: '항목별 설명, 수량, 단가, 카테고리 입력' },
      { en: 'Auto-calculated total amount', ko: '자동 합계 계산' },
      { en: 'Add notes and description', ko: '메모 및 설명 추가' },
    ],
  },
  '/users': {
    titleEn: 'User Management',
    titleKo: '사용자 관리',
    descEn: 'Manage user accounts, roles, and permissions.',
    descKo: '사용자 계정, 역할, 권한을 관리합니다.',
    features: [
      { en: 'Search users by name or email', ko: '이름 또는 이메일로 사용자 검색' },
      { en: 'Filter by role (Super Admin, Company Admin, Accountant, Approver, Viewer)', ko: '역할별 필터 (슈퍼 관리자, 회사 관리자, 회계사, 승인자, 뷰어)' },
      { en: 'Activate or deactivate user accounts', ko: '사용자 계정 활성화/비활성화' },
      { en: 'Delete users (cannot delete yourself)', ko: '사용자 삭제 (본인 삭제 불가)' },
    ],
  },
  '/users/new': {
    titleEn: 'Create User',
    titleKo: '사용자 생성',
    descEn: 'Add a new user to the system with role and company assignment.',
    descKo: '역할과 회사를 지정하여 새 사용자를 추가합니다.',
    features: [
      { en: 'Set email, name, and password', ko: '이메일, 이름, 비밀번호 설정' },
      { en: 'Assign role (Admin, Accountant, Approver, Viewer)', ko: '역할 지정 (관리자, 회계사, 승인자, 뷰어)' },
      { en: 'Assign to a company', ko: '회사 배정' },
      { en: 'Enable email notifications', ko: '이메일 알림 활성화' },
    ],
  },
  '/users/[id]': {
    titleEn: 'Edit User',
    titleKo: '사용자 편집',
    descEn: 'Update user profile, role, company, and notification settings.',
    descKo: '사용자 프로필, 역할, 회사, 알림 설정을 수정합니다.',
    features: [
      { en: 'Change user name and role', ko: '사용자 이름 및 역할 변경' },
      { en: 'Reassign to a different company', ko: '다른 회사로 재배정' },
      { en: 'Set approval level for multi-level workflows', ko: '다단계 워크플로우용 승인 레벨 설정' },
      { en: 'Toggle active status and email notifications', ko: '활성 상태 및 이메일 알림 토글' },
    ],
  },
  '/vendors/new': {
    titleEn: 'Add Vendor',
    titleKo: '거래처 추가',
    descEn: 'Register a new vendor with contact, billing, and bank information.',
    descKo: '연락처, 청구, 은행 정보를 포함하여 새 거래처를 등록합니다.',
    features: [
      { en: 'Enter vendor code, company name, and EIN', ko: '거래처 코드, 회사명, EIN 입력' },
      { en: 'Set billing address and contact details', ko: '청구 주소 및 연락처 설정' },
      { en: 'Configure payment terms and ACH bank info', ko: '결제 조건 및 ACH 은행 정보 설정' },
      { en: 'Duplicate vendor detection warns automatically', ko: '중복 거래처 자동 감지 경고' },
    ],
  },
  '/vendors/[id]': {
    titleEn: 'Vendor Detail',
    titleKo: '거래처 상세',
    descEn: 'View and edit vendor information, contacts, and status.',
    descKo: '거래처 정보, 연락처, 상태를 조회하고 편집합니다.',
    features: [
      { en: 'Edit vendor details (name, EIN, category, contact)', ko: '거래처 정보 편집 (이름, EIN, 카테고리, 연락처)' },
      { en: 'Update billing address and payment terms', ko: '청구 주소 및 결제 조건 수정' },
      { en: 'Toggle vendor status: Active / Inactive', ko: '거래처 상태 전환: 활성 / 비활성' },
      { en: 'Add notes for internal reference', ko: '내부 참조용 메모 추가' },
    ],
  },
  '/companies': {
    titleEn: 'Company Management',
    titleKo: '회사 관리',
    descEn: 'Manage companies (tenants) in the multi-tenant system.',
    descKo: '멀티테넌트 시스템의 회사(테넌트)를 관리합니다.',
    features: [
      { en: 'Search companies by name', ko: '이름으로 회사 검색' },
      { en: 'Filter by status: Active / Inactive', ko: '상태 필터: 활성 / 비활성' },
      { en: 'Activate or deactivate companies', ko: '회사 활성화/비활성화' },
      { en: 'Delete companies (only if no users exist)', ko: '회사 삭제 (사용자가 없는 경우만)' },
    ],
  },
  '/companies/new': {
    titleEn: 'Create Company',
    titleKo: '회사 생성',
    descEn: 'Register a new company with code, EIN, address, and default currency.',
    descKo: '코드, EIN, 주소, 기본 통화를 지정하여 새 회사를 등록합니다.',
    features: [
      { en: 'Set company code and name', ko: '회사 코드 및 이름 설정' },
      { en: 'Enter EIN, address, and contact info', ko: 'EIN, 주소, 연락처 입력' },
      { en: 'Choose default currency (10 currencies supported)', ko: '기본 통화 선택 (10개 통화 지원)' },
      { en: 'Set established date', ko: '설립일 설정' },
    ],
  },
  '/companies/[id]': {
    titleEn: 'Company Detail',
    titleKo: '회사 상세',
    descEn: 'View and edit company profile, address, and settings.',
    descKo: '회사 프로필, 주소, 설정을 조회하고 편집합니다.',
    features: [
      { en: 'Edit company name, EIN, address, and contact', ko: '회사명, EIN, 주소, 연락처 편집' },
      { en: 'Change default currency', ko: '기본 통화 변경' },
      { en: 'Toggle company status: Active / Inactive', ko: '회사 상태 전환: 활성 / 비활성' },
      { en: 'View established date and last update time', ko: '설립일 및 최종 수정 시간 확인' },
    ],
  },
  '/profile': {
    titleEn: 'My Profile',
    titleKo: '내 프로필',
    descEn: 'Update your name, notification preferences, and password.',
    descKo: '이름, 알림 설정, 비밀번호를 변경합니다.',
    features: [
      { en: 'Edit your display name', ko: '표시 이름 변경' },
      { en: 'Toggle email notification preference', ko: '이메일 알림 설정 토글' },
      { en: 'Change password (requires current password)', ko: '비밀번호 변경 (현재 비밀번호 필요)' },
      { en: 'View your role and company info', ko: '역할 및 회사 정보 확인' },
    ],
  },
  '/settings/tax-rates': {
    titleEn: 'Tax Rates',
    titleKo: '세율 관리',
    descEn: 'Configure tax rates for invoice validation and calculation.',
    descKo: '인보이스 검증 및 계산을 위한 세율을 설정합니다.',
    features: [
      { en: 'Add Federal, State Sales, State Use, or Exempt tax rates', ko: '연방세, 주 판매세, 주 사용세, 면세 세율 추가' },
      { en: 'Set rate percentage, effective date, and expiry date', ko: '세율, 시행일, 만료일 설정' },
      { en: 'Filter by state code', ko: '주 코드로 필터' },
      { en: 'Tax rates are used for automatic invoice validation', ko: '세율은 자동 인보이스 검증에 사용됨' },
    ],
  },
  '/settings/invoice-types': {
    titleEn: 'Invoice Types',
    titleKo: '인보이스 타입',
    descEn: 'Define invoice categories and configure linkage settings per type.',
    descKo: '인보이스 카테고리를 정의하고 타입별 연결 설정을 구성합니다.',
    features: [
      { en: 'View all invoice types (PO, Service, Recurring, etc.)', ko: '모든 인보이스 타입 조회 (PO, 서비스, 고정금액 등)' },
      { en: 'Enable/disable linkage per type for your company', ko: '회사별 타입 연결 활성화/비활성화' },
      { en: 'Configure whether PO or approver is required', ko: 'PO 또는 승인자 필요 여부 설정' },
      { en: 'Manage linkage details (PO, contracts, recurring amounts)', ko: '연결 상세 관리 (PO, 계약, 고정금액)' },
    ],
  },
  '/settings/company-policies': {
    titleEn: 'Company Policies',
    titleKo: '회사 정책',
    descEn: 'Define company-level policies for approval, validation, and payments.',
    descKo: '승인, 검증, 결제에 대한 회사 수준 정책을 정의합니다.',
    features: [
      { en: 'Create policies by category: Approval, Validation, Payment, General', ko: '카테고리별 정책 생성: 승인, 검증, 결제, 일반' },
      { en: 'Write policy text that guides invoice processing', ko: '인보이스 처리를 안내하는 정책 텍스트 작성' },
      { en: 'Activate or deactivate policies', ko: '정책 활성화/비활성화' },
      { en: 'Edit or delete existing policies', ko: '기존 정책 편집 또는 삭제' },
    ],
  },
  '/settings/billing': {
    titleEn: 'Billing & Subscription',
    titleKo: '결제 & 구독',
    descEn: 'Manage your subscription plan and monitor usage limits.',
    descKo: '구독 플랜을 관리하고 사용량 한도를 모니터링합니다.',
    features: [
      { en: 'View current plan, billing period, and next payment date', ko: '현재 플랜, 결제 주기, 다음 결제일 확인' },
      { en: 'Monitor usage: invoices, OCR pages, AI queries, users, storage', ko: '사용량 모니터링: 인보이스, OCR 페이지, AI 쿼리, 사용자, 스토리지' },
      { en: 'Upgrade or change subscription plan', ko: '구독 플랜 업그레이드 또는 변경' },
      { en: 'Access Stripe billing portal for payment management', ko: 'Stripe 결제 포탈에서 결제 관리' },
    ],
  },
  '/settings/type-linkage': {
    titleEn: 'Type Linkage Settings',
    titleKo: '타입 연결 설정',
    descEn: 'Enable or disable linkage for each invoice type and manage linked data.',
    descKo: '각 인보이스 타입의 연결을 활성화/비활성화하고 연결 데이터를 관리합니다.',
    features: [
      { en: 'Toggle linkage on/off per invoice type', ko: '인보이스 타입별 연결 활성/비활성' },
      { en: 'Navigate to PO data, contract, or recurring amount management', ko: 'PO 데이터, 계약, 고정금액 관리로 이동' },
      { en: 'Auto-initialize settings when first accessed', ko: '최초 접근 시 설정 자동 초기화' },
    ],
  },
  '/settings/type-linkage/po': {
    titleEn: 'PO Linkage Data',
    titleKo: 'PO 연결 데이터',
    descEn: 'Manage purchase orders linked to PO-type invoices.',
    descKo: 'PO 타입 인보이스에 연결된 구매주문서를 관리합니다.',
    features: [
      { en: 'View all POs with invoiced and remaining amounts', ko: '모든 PO의 청구 및 잔여 금액 조회' },
      { en: 'Create new POs with line items', ko: '항목 포함 새 PO 생성' },
      { en: 'Track PO status: Open, Partially Invoiced, Fully Invoiced', ko: 'PO 상태 추적: 미결, 부분 청구, 전액 청구' },
      { en: 'Filter by status', ko: '상태별 필터' },
    ],
  },
  '/settings/type-linkage/contract': {
    titleEn: 'Contract Linkage Data',
    titleKo: '계약 연결 데이터',
    descEn: 'Manage vendor contracts linked to service-type invoices.',
    descKo: '서비스 타입 인보이스에 연결된 거래처 계약을 관리합니다.',
    features: [
      { en: 'View all vendor contracts with effective and expiry dates', ko: '모든 거래처 계약의 유효 및 만료일 조회' },
      { en: 'Create new contracts with max amount and price tolerance', ko: '최대 금액 및 가격 허용 범위 포함 새 계약 생성' },
      { en: 'Track active/inactive contract status', ko: '활성/비활성 계약 상태 추적' },
      { en: 'Set contracted prices and tolerance percentages', ko: '계약 가격 및 허용 비율 설정' },
    ],
  },
  '/settings/type-linkage/recurring': {
    titleEn: 'Recurring Amount Data',
    titleKo: '고정금액 데이터',
    descEn: 'Manage recurring fixed amounts linked to recurring-type invoices.',
    descKo: '고정금액 타입 인보이스에 연결된 반복 고정금액을 관리합니다.',
    features: [
      { en: 'View all recurring amounts with vendor and monthly amount', ko: '모든 고정금액의 거래처 및 월 금액 조회' },
      { en: 'Create or edit recurring amounts with effective date range', ko: '유효 기간 포함 고정금액 생성 또는 편집' },
      { en: 'Set currency and attach notes', ko: '통화 설정 및 메모 첨부' },
      { en: 'Toggle active/inactive status', ko: '활성/비활성 상태 전환' },
    ],
  },
  '/help': {
    titleEn: 'Help Center',
    titleKo: '도움말 센터',
    descEn: 'Browse help articles organized by category and search for specific topics.',
    descKo: '카테고리별로 정리된 도움말 문서를 탐색하고 특정 주제를 검색합니다.',
    features: [
      { en: '5 categories: Getting Started, Invoices, Workflow, Settings, Vendors', ko: '5개 카테고리: 시작하기, 인보이스, 워크플로우, 설정, 거래처' },
      { en: 'Search across all help topics', ko: '모든 도움말 주제 검색' },
      { en: 'Each topic shows features and tips', ko: '각 주제별 기능 및 팁 표시' },
      { en: 'Bilingual support (English / Korean)', ko: '이중 언어 지원 (영어 / 한국어)' },
    ],
  },
};

/**
 * Get help topic for a given pathname.
 * Handles dynamic routes like /invoices/[id] by checking prefix matches.
 */
export function getHelpTopic(pathname: string): HelpTopic | null {
  // Exact match first
  if (helpMap[pathname]) return helpMap[pathname];

  // Dynamic route: /invoices/[id]
  if (/^\/invoices\/[^/]+$/.test(pathname) && pathname !== '/invoices/upload' && pathname !== '/invoices/new' && pathname !== '/invoices/email' && pathname !== '/invoices/file') {
    return helpMap['/invoices/[id]'] || null;
  }

  // Dynamic route: /vendors/[id]
  if (/^\/vendors\/[^/]+$/.test(pathname) && pathname !== '/vendors/new') {
    return helpMap['/vendors/[id]'] || null;
  }

  // Dynamic route: /users/[id]
  if (/^\/users\/[^/]+$/.test(pathname) && pathname !== '/users/new') {
    return helpMap['/users/[id]'] || null;
  }

  // Dynamic route: /companies/[id]
  if (/^\/companies\/[^/]+$/.test(pathname) && pathname !== '/companies/new') {
    return helpMap['/companies/[id]'] || null;
  }

  return null;
}

export function getAllTopics(): { path: string; topic: HelpTopic }[] {
  return Object.entries(helpMap).map(([path, topic]) => ({ path, topic }));
}
