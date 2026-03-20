# 주간 코드 리뷰 리포트 — AI 인보이스 자동화 시스템
**날짜:** 2026-03-19
**리뷰어:** 자동화 분석 (Claude)
**대상 브랜치:** main
**최신 커밋:** `a5c004f` (.gitignore에 *.tsbuildinfo 추가)

---

## 요약 카운트

| 심각도 | 건수 |
|--------|------|
| 🔴 Critical | 3 |
| 🟡 Warning | 7 |
| 🔵 Info | 5 |

**이전 리포트:** 없음 (최초 리뷰)

---

## 1. 코드 품질 이슈

### 🔴 [Critical] `asyncio.run()` 패턴 — Celery 태스크 전반

**파일:** `backend/app/tasks/ocr_tasks.py` (L25, L34), `email_tasks.py` (L33), `notification_tasks.py` (L89), `scheduled_tasks.py` (L14, L66, L117)

**문제:**
Celery는 기본적으로 동기 워커(sync worker)에서 실행되며, 각 태스크에서 `asyncio.run()`을 호출하면 매 태스크 실행마다 새 이벤트 루프를 생성합니다. 이는 여러 심각한 문제를 야기합니다:

1. **이벤트 루프 오버헤드**: 태스크마다 새 루프 생성·종료 → CPU/메모리 낭비
2. **재진입 위험**: 중첩된 asyncio.run() 호출 시 `RuntimeError: This event loop is already running` 발생
3. **연결 풀 공유 불가**: 각 루프마다 DB 연결 풀이 독립적으로 생성됨
4. **예외 처리 위험**: `asyncio.run()` 내 미처리 예외가 태스크를 crash시킬 수 있음

```python
# 현재 (문제 있음)
def process_invoice_ocr(self, invoice_id: str, file_path: str):
    result = asyncio.run(_run_ocr(invoice_id, file_path))  # 매번 새 루프

# 권장: gevent/eventlet 기반 비동기 Celery 워커 사용
# celery_app.conf.update(CELERYD_POOL="gevent")
# 또는 celery-aio-pool 라이브러리 사용 고려

# 단기 해결책: 각 태스크에서 루프를 재사용
def process_invoice_ocr(self, invoice_id: str, file_path: str):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(_run_ocr(invoice_id, file_path))
    finally:
        loop.close()
```

---

### 🔴 [Critical] JWT 토큰 `localStorage` 저장 — XSS 취약점

**파일:** `frontend/lib/api.ts` (L13-18), `frontend/stores/auth.ts` (L18-19)

**문제:**
`access_token`과 `refresh_token` 모두 `localStorage`에 저장합니다. `localStorage`는 JavaScript로 접근 가능해 XSS 공격에 취약합니다. 공격자가 스크립트를 주입하면 두 토큰을 모두 탈취할 수 있으며, refresh token은 7일간 유효합니다.

```typescript
// 현재 (취약)
localStorage.setItem('access_token', tokens.access_token);
localStorage.setItem('refresh_token', tokens.refresh_token);

// 권장: HttpOnly 쿠키 사용 (서버에서 Set-Cookie 헤더로 설정)
// 백엔드에서:
response.set_cookie(
    key="refresh_token",
    value=tokens["refresh_token"],
    httponly=True,
    secure=True,  # HTTPS 강제
    samesite="lax",
    max_age=7 * 24 * 3600,
)
// 프론트엔드에서: credentials: 'include'로 쿠키 자동 첨부
```

---

### 🔴 [Critical] 로그아웃 시 Refresh Token 미폐기 — 토큰 재사용 공격 가능

**파일:** `backend/app/api/v1/endpoints/auth.py` (L35-39)

**문제:**
로그아웃 엔드포인트가 완전히 stateless하여 클라이언트가 로컬 토큰을 삭제해도, 서버 측에서 refresh token을 무효화하지 않습니다. 탈취된 refresh token은 만료(7일)까지 계속 사용 가능합니다.

```python
# 현재 (문제 있음)
@router.post("/logout", status_code=204)
async def logout():
    return None  # 아무 것도 안 함

# 권장: Redis에 토큰 블랙리스트 또는 토큰 버전 관리
@router.post("/logout", status_code=204)
async def logout(
    data: LogoutRequest,  # refresh_token 포함
    db: AsyncSession = Depends(get_db),
):
    # 1. Redis 블랙리스트에 refresh token 추가 (남은 TTL 만큼)
    payload = decode_token(data.refresh_token)
    ttl = int(payload["exp"]) - int(datetime.now().timestamp())
    if ttl > 0:
        await redis.setex(f"blacklist:{data.refresh_token[:32]}", ttl, "1")
```

---

### 🟡 [Warning] `print()` 디버그 코드 프로덕션 잔존

**파일:** `backend/app/tasks/email_tasks.py` (L158, L160, L280)

**문제:**
이메일 폴링 태스크에 `print()` 구문 3개가 `flush=True`와 함께 남아 있습니다. 이는 개발 중 디버깅 흔적으로 보이며, 프로덕션에서 stdout에 민감한 이메일 주소·메시지 ID를 출력하게 됩니다.

```python
# 현재 (제거 필요)
print(f"*** POLL {config.email_address}: {len(parsed_messages)} fetched ...", flush=True)
print(f"*** MSG {pm.get('message_id')}: subject='{pm.get('subject')}' ...", flush=True)
print(f"No default vendor or invoice type found, skipping", flush=True)

# 수정
logger.debug("Email poll %s: %d fetched, %d new", config.email_address, ...)
logger.warning("No default vendor or invoice type found, skipping")
```

---

### 🟡 [Warning] Claude API 모델명 하드코딩

**파일:** `backend/app/services/ocr_service.py` (L200)

**문제:**
`"claude-sonnet-4-20250514"` 모델명이 코드에 직접 박혀 있습니다. 모델 업데이트 시 코드 수정·배포 없이 변경할 수 없습니다.

```python
# 현재
model="claude-sonnet-4-20250514",

# 권장: config에 추가
# core/config.py
CLAUDE_OCR_MODEL: str = "claude-sonnet-4-20250514"

# 사용
model=settings.CLAUDE_OCR_MODEL,
```

---

### 🟡 [Warning] 감사 로그(Audit Log) DB 미영속화

**파일:** `backend/app/middleware/audit_middleware.py` (L56)

**문제:**
현재 감사 로그는 텍스트 로그(logger)로만 기록되고 DB에는 저장되지 않습니다. Phase 7 완료로 표시되어 있으나 TODO 주석이 남아 있고, 이 기능이 미완료 상태입니다. 컴플라이언스 및 감사(Audit Trail) 요구사항 대응이 불가합니다.

```python
# TODO: Phase 7에서 audit_logs 테이블 생성 후 DB 기록으로 전환
# audit_logs 테이블 생성 및 DB 저장 로직 구현 필요
```

**수정 우선순위:** 재무 시스템에서 감사 추적은 규제 요건임.

---

### 🟡 [Warning] 인보이스 Validation 시 `payment_terms` 미연결

**파일:** `backend/app/services/invoice_service.py` (L326)

**문제:**
`_run_and_save_validation()` 함수에서 `payment_terms`가 항상 `None`으로 전달됩니다. Layer 1 글로벌 규칙인 `PAYMENT_TERMS` 검증이 실제로 동작하지 않습니다.

```python
# 현재
invoice_data = {
    "payment_terms": None,  # TODO: vendor의 payment_terms 연결
    ...
}

# 수정: Vendor 모델의 payment_terms 필드 참조
vendor_result = await db.execute(select(Vendor).where(Vendor.id == invoice.vendor_id))
vendor = vendor_result.scalar_one_or_none()
invoice_data = {
    "payment_terms": vendor.payment_terms if vendor else None,
    ...
}
```

---

### 🟡 [Warning] S3 파일 URL 생성 시 동기 boto3 사용

**파일:** `backend/app/utils/file_handler.py` (L94-104)

**문제:**
`get_file_url()` 함수가 동기 `boto3` 클라이언트를 사용해 presigned URL을 생성합니다. 이 함수는 async 컨텍스트(FastAPI 요청 처리 중)에서 호출되므로 이벤트 루프를 블로킹합니다.

```python
# 현재 (동기 블로킹)
s3 = boto3.client("s3", ...)
return s3.generate_presigned_url(...)

# 권장: aioboto3 또는 run_in_executor 사용
import asyncio
loop = asyncio.get_event_loop()
return await loop.run_in_executor(None, lambda: s3.generate_presigned_url(...))
```

---

### 🟡 [Warning] `useEffect` 의존성 배열 불완전 — 검색어 누락

**파일:** `frontend/app/invoices/page.tsx` (L36)

**문제:**
`useEffect`의 의존성 배열에 `statusFilter`만 있고 `fetchInvoices` 함수 자체가 없습니다. 또한 검색창에서 텍스트를 입력하고 Enter 없이 상태 필터를 변경하면 이전 검색어가 서버에 전송됩니다. ESLint `exhaustive-deps` 경고가 발생할 것입니다.

```typescript
// 현재
useEffect(() => { fetchInvoices(); }, [statusFilter]);

// 권장
const fetchInvoices = useCallback(async () => { ... }, [search, statusFilter]);
useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
```

---

### 🔵 [Info] 미사용 Celery Beat 스케줄 주석 처리 (환율 업데이트)

**파일:** `backend/app/tasks/celery_app.py` (L32-36)

**문제:**
환율 업데이트 태스크(`exchange-rate-update`)가 주석 처리되어 있으며, CLAUDE.md의 Celery 예약 작업 목록에는 포함되어 있습니다. `exchange_rate_tasks.py` 모듈 자체가 없어 `include` 목록에서도 주석 처리되어 있습니다. 외화 인보이스가 있다면 환율 데이터 없이 환산 불가.

---

### 🔵 [Info] `dashboard_service.get_company_summary()` — 6회 순차 DB 쿼리

**파일:** `backend/app/services/dashboard_service.py` (L29-86)

**문제:**
대시보드 요약 API가 6개의 개별 SELECT 쿼리를 순차적으로 실행합니다. PostgreSQL의 경우 단일 복잡 쿼리나 병렬 실행(`asyncio.gather`)으로 성능을 개선할 수 있습니다.

```python
# 권장: asyncio.gather로 병렬 실행
inv_stats, status_stats, pending_approvals, validation_stats, overdue, vendor_count = \
    await asyncio.gather(
        db.execute(inv_query),
        db.execute(status_query),
        db.execute(pending_query),
        db.execute(validation_query),
        db.execute(overdue_query),
        db.execute(vendor_query),
    )
```

---

### 🔵 [Info] OCR 태스크에서 PO 금액 업데이트 누락

**파일:** `backend/app/tasks/ocr_tasks.py` (L56-77)

**문제:**
OCR 완료 후 PO 번호가 추출되어 invoice에 저장되지만, 수동 입력 경로(`create_invoice()`)와 달리 PO 오브젝트의 `amount_invoiced`와 `amount_remaining`이 업데이트되지 않습니다. 데이터 불일치가 발생합니다.

---

### 🔵 [Info] `notification_service.create_role_notifications()` — 개별 flush 비효율

**파일:** `backend/app/services/notification_service.py` (L38-66)

**문제:**
회사 내 모든 대상 역할 사용자에게 개별 알림 객체를 생성한 후 마지막에 한 번에 flush합니다. 이는 올바른 패턴이지만, 대규모 사용자 수 시 단일 `INSERT ... VALUES (...), (...)` 벌크 INSERT가 더 효율적입니다.

```python
# 권장 (대규모 사용자 시)
await db.execute(insert(Notification), [
    {
        "company_id": company_id,
        "user_id": user.id,
        "type": type,
        "title": title,
        "message": message,
    }
    for user in users
])
```

---

### 🔵 [Info] `anthropic` SDK 버전 0.26.0 — 구버전

**파일:** `backend/requirements.txt`

**문제:**
`anthropic==0.26.0` (2024년 4월 기준)이 pinned되어 있습니다. 현재 최신 버전은 0.49.x로, 여러 API 개선사항과 보안 패치가 포함되어 있습니다. 특히 OCR 서비스에서 사용하는 Document 타입 API에 개선이 있었습니다.

---

## 2. 보안 취약점

### 🔴 [이미 위에서 보고] JWT localStorage 저장 (XSS)
### 🔴 [이미 위에서 보고] Refresh Token 미폐기

### 🟡 [Warning] CORS `allow_methods=["*"]`, `allow_headers=["*"]` — 과도한 허용

**파일:** `backend/app/main.py` (L127-134)

**문제:**
모든 HTTP 메서드와 헤더를 허용합니다. 실제로 필요한 것만 명시하는 것이 보안 원칙입니다.

```python
# 현재 (과도함)
allow_methods=["*"],
allow_headers=["*"],

# 권장
allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
```

---

### 🟡 [Warning] 미디어 파일 서빙 엔드포인트 — 인증 없음

**파일:** `backend/app/api/v1/endpoints/invoices.py` (L22-32)

**문제:**
개발 환경에서 `/api/v1/invoices/media/{file_path:path}` 엔드포인트는 인증 없이 로컬 파일시스템의 모든 파일을 서빙합니다. 경로 트래버설 공격에 취약합니다.

```python
# 현재 (인증 없음)
@router.get("/media/{file_path:path}")
async def serve_media(file_path: str):
    full_path = os.path.join("/app/media", file_path)
    ...

# 수정: 인증 추가 + 경로 트래버설 방지 강화
@router.get("/media/{file_path:path}")
async def serve_media(
    file_path: str,
    current_user: dict = Depends(require_any),  # 인증 추가
):
    # 경로 정규화 후 MEDIA_ROOT 범위 내인지 확인
    full_path = os.path.realpath(os.path.join("/app/media", file_path))
    if not full_path.startswith(os.path.realpath("/app/media")):
        raise HTTPException(status_code=400, detail="Invalid path")
    ...
```

---

### 🟡 [Warning] Content-Disposition 헤더 파일명 미인용

**파일:** `backend/app/api/v1/endpoints/reports.py` (L27, L47, L65)

**문제:**
파일명에 공백이나 특수문자가 포함된 경우 RFC 6266 위반 및 일부 브라우저에서 다운로드 실패 가능성이 있습니다.

```python
# 현재 (잠재적 문제)
headers={"Content-Disposition": f"attachment; filename={filename}"}

# 수정
headers={"Content-Disposition": f'attachment; filename="{filename}"'}
```

---

### 🟡 [Warning] `python-jose` — 알려진 보안 이슈

**파일:** `backend/requirements.txt`

**문제:**
`python-jose[cryptography]==3.3.0`은 마지막 업데이트가 2021년으로 유지보수가 중단된 상태입니다. `PyJWT` 또는 `authlib`으로의 마이그레이션이 권장됩니다. python-jose는 알고리즘 혼용(algorithm confusion) 취약점에 대한 패치가 불완전합니다.

```
# 권장 대안
PyJWT==2.9.0  # 활발히 유지보수됨
cryptography==42.0.7  # 기존 유지
```

---

## 3. 아키텍처 개선

### 🟡 [Warning] 테스트 커버리지 0% — Phase 10 전 해결 필요

**파일:** `backend/tests/`, `frontend/`

**문제:**
CLAUDE.md에 "Phase 2부터 pytest + jest 추가 예정"으로 명시되어 있으나 Phase 9 완료 시점까지 테스트 코드가 전혀 없습니다. Phase 10 프로덕션 배포 전에 최소한 핵심 경로(인보이스 생성, 검증, 승인 플로우)에 대한 테스트가 필요합니다.

**우선 구현 권장 테스트:**
1. `test_invoice_create_duplicate_check` — 중복 Invoice # 체크
2. `test_validation_engine_layer1` — Global Rule 검증
3. `test_approval_workflow` — 승인 시작 및 다단계 처리
4. `test_company_isolation` — 타 회사 데이터 접근 차단
5. `test_ocr_task_retry` — OCR 실패 시 재시도 로직

---

### 🟡 [Warning] 이메일 폴링 `MAX_PROCESSED_IDS=500` — 고볼륨 중복 위험

**파일:** `backend/app/tasks/email_tasks.py` (L23)

**문제:**
처리된 이메일 ID를 DB 컬럼(`processed_message_ids`)에 JSON으로 저장하며, 최대 500개만 유지합니다. 대용량 트래픽 환경에서 500개를 초과하면 오래된 ID가 FIFO 방식으로 제거되어 **이미 처리된 이메일이 재처리**될 수 있습니다.

**권장 해결책:**
- `processed_message_ids`를 별도 테이블(`email_processed_messages`)로 분리
- 인덱스 기반 빠른 중복 조회
- TTL 기반 자동 정리

---

### 🔵 [Info] Celery Beat 중복 실행 방지 미구현

**파일:** `backend/app/tasks/scheduled_tasks.py`

**문제:**
`check_contract_expiry`, `check_tax_exempt_expiry`, `send_payment_due_reminders` 태스크에 분산 락(distributed lock)이 없습니다. Celery Beat 인스턴스가 여러 개 실행되거나 이전 실행이 지연된 경우 같은 태스크가 중복 실행될 수 있습니다.

```python
# 권장: celery-redbeat 또는 수동 Redis 락 사용
from redis import Redis
from contextlib import contextmanager

@contextmanager
def redis_lock(lock_name: str, timeout: int = 3600):
    r = Redis.from_url(settings.REDIS_URL)
    lock = r.lock(lock_name, timeout=timeout)
    acquired = lock.acquire(blocking=False)
    try:
        yield acquired
    finally:
        if acquired:
            lock.release()
```

---

## 4. 긍정적 발견사항

### ✅ 멀티테넌트 데이터 격리 — 우수한 구현

`backend/app/utils/company_access.py`의 `verify_company_access()` / `verify_company_modify()` 유틸리티가 모든 엔드포인트에서 일관되게 적용되고 있습니다. ContextVar 기반 회사 컨텍스트 주입 패턴도 잘 구현되어 있습니다.

### ✅ 이메일 오류 정보 보안 처리 — 우수

`email_tasks.py`의 `_sanitize_error()` 함수에서 OAuth 토큰, access_token, refresh_token 등 민감 정보를 정규식으로 마스킹하는 처리가 잘 구현되어 있습니다.

### ✅ Rate Limiting — Redis 슬라이딩 윈도우 올바른 구현

`middleware/rate_limiter.py`에서 IP 기반(100 req/min)과 회사 기반(1000 req/min) 이중 제한이 Redis sorted set을 사용한 슬라이딩 윈도우 방식으로 정확하게 구현되어 있습니다.

---

## 5. 최근 변경사항 분석 (최근 5 커밋)

| 커밋 | 내용 | 리스크 |
|------|------|--------|
| `a5c004f` | .gitignore *.tsbuildinfo 추가 | 낮음 |
| `8213aae` | Key/ 디렉토리 .gitignore 추가 | 낮음 — 필수 조치 |
| `68ed936` | 사용설명서 업데이트 | 낮음 |
| `6983414` | 컨설턴트 평가 PPT 추가, package-lock 포함 | 낮음 |
| `f2f69bd` | 인보이스 Edit 드롭다운 개선 | 중간 — UI 변경 |

> **Note:** `Key/` 디렉토리가 `.gitignore`에 추가된 커밋(`8213aae`)은 이미 서비스 계정 키가 리포지터리에 커밋되었을 가능성을 시사합니다. `git log --all -- Key/` 명령으로 과거 커밋에 키가 포함되었는지 즉시 확인하고, 만약 그렇다면 해당 키를 즉시 폐기해야 합니다.

---

## 6. 권장 조치 우선순위

### 즉시 (이번 주)
1. 🔴 `Key/` 디렉토리 과거 커밋 확인 → 키 노출 시 폐기
2. 🔴 `email_tasks.py` `print()` 3개 → `logger` 교체
3. 🔴 Refresh Token 폐기 로직 구현 (Redis 블랙리스트)

### 단기 (2주 이내)
4. 🟡 JWT 저장 방식 → HttpOnly 쿠키로 전환
5. 🟡 `ocr_service.py` 모델명 하드코딩 → config 이동
6. 🟡 `invoice_service.py` payment_terms 연결
7. 🟡 미디어 파일 서빙 엔드포인트 인증 추가

### 중기 (Phase 10 전)
8. 🟡 테스트 커버리지 핵심 경로 구현
9. 🟡 감사 로그 DB 영속화
10. 🟡 python-jose → PyJWT 마이그레이션
11. 🟡 이메일 처리 ID 저장 방식 개선
12. 🔵 asyncio.gather로 대시보드 쿼리 병렬화

---

*이 리포트는 자동 코드 분석에 의해 생성되었습니다. 2026-03-19 기준.*
