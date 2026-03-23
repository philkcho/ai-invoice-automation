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

  return null;
}

export function getAllTopics(): { path: string; topic: HelpTopic }[] {
  return Object.entries(helpMap).map(([path, topic]) => ({ path, topic }));
}
