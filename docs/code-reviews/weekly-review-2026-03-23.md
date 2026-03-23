# 주간 코드 리뷰 — 2026-03-23

**리뷰어:** 자동화 분석 (Claude)
**대상 브랜치:** main
**최신 커밋:** `01909c7` (배포 가이드 보완)
**이전 리포트:** [2026-03-19](../../code-review-reports/weekly-review-2026-03-19.md)

---

## 요약

🔴 Critical: 1건 | 🟡 Warning: 8건 | 🔵 Info: 5건

### 이번 주 주요 발견사항

1. **🔴 토큰 블랙리스트 충돌 위험** — Redis 키를 JWT 앞 32자로만 설정해 충돌 가능성 존재 (`auth_service.py`)
2. **🟡 CI 파이프라인 DB명 불일치** — 서비스 생성 DB는 `invoice_db_test`이나 `DATABASE_URL`은 `invoice_db`를 참조해 CI 테스트 실패 가능
3. **🟡 감사 로그 DB 미영속화** — Phase 7 완료 표기에도 불구하고 감사 로그는 여전히 logger에만 출력 (재시작 시 소실)
4. **🟡 미디어 서빙 경로 순회 방지 미흡** — `invoices.py` 미디어 엔드포인트에 `os.path.realpath()` 검증 없음
5. **🔵 Claude 모델명 하드코딩** — `chat_service.py`, `ocr_service.py` 총 5곳에 `"claude-sonnet-4-20250514"` 직접 삽입

### 해결된 이슈 (이전 리포트 2026-03-19 대비)

| 이전 이슈 | 상태 | 비고 |
|---------|------|------|
| 🔴 JWT access/refresh token을 `localStorage`에 저장 (XSS 취약점) | ✅ 해결 | access token → `sessionStorage`, refresh token → HttpOnly 쿠키로 전환 완료 (`token-store.ts`) |
| 🔴 로그아웃 시 Refresh Token 미폐기 | ✅ 해결 | `blacklist_refresh_token()` + Redis TTL 기반 블랙리스트 구현 완료 |
| 🔴 `email_tasks.py` 내 `print()` 3개 | ✅ 해결 | 모두 `logger.*` 호출로 교체됨 |
| 🟡 테스트 커버리지 0% | ⚠️ 개선됨 | 백엔드 70개, 프론트엔드 16개 추가 — 그러나 커버리지 범위 여전히 부족 |
| 🟡 OCR 파일 경로 순회 공격 | ✅ 해결 | `ocr_service.py`에 `_safe_resolve_path()` 함수 추가 |
| 🟡 `Key/` 과거 커밋 노출 우려 | ✅ 확인 필요 | `.gitignore`에 추가됨. 과거 커밋에 실제 키가 포함되었는지 `git log --all -- Key/` 로 수동 확인 권장 |

---

## 1. 코드 품질 이슈

### 🟡 [Warning] ⚠️ 반복 — `asyncio.new_event_loop()` 패턴 — Celery 태스크 전반

**파일:** `backend/app/tasks/ocr_tasks.py`, `email_tasks.py`, `scheduled_tasks.py`, `backup_tasks.py`

이전 보고서에서 `asyncio.run()` → `asyncio.new_event_loop()` 패턴으로 개선되었으나 매 태스크 실행마다 새 이벤트 루프를 생성하는 근본 문제는 동일합니다. 루프 생성·종료 오버헤드와 DB 연결 풀 공유 불가 문제가 지속됩니다.

```python
# 현재 패턴 (4개 모듈 공통)
def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()

# 권장: celery[gevent] 또는 celery-aio-pool 사용
# celery_app.conf.update(worker_pool="gevent")
# 또는 celery-aio-pool 패키지로 네이티브 asyncio 지원
```

---

### 🔵 [Info] Claude 모델명 하드코딩

**파일:** `backend/app/services/chat_service.py` (L169, L181, L195, L247), `ocr_service.py` (L214)

`"claude-sonnet-4-20250514"` 가 5곳에 직접 삽입되어 있습니다. 모델 버전 변경 시 5개 파일을 모두 수정해야 합니다.

```python
# 현재 (chat_service.py:169)
model="claude-sonnet-4-20250514",

# 권장: config.py에 추가
ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"

# 사용처에서
model=settings.ANTHROPIC_MODEL,
```

---

### 🟡 [Warning] 감사 로그 DB 미영속화 — Phase 7 완료 불일치

**파일:** `backend/app/middleware/audit_middleware.py` (L56)

CLAUDE.md의 로드맵에는 Phase 7 (승인 워크플로우 & 결제 추적)이 ✅ 완료로 표기되어 있으나, `audit_middleware.py`의 주석은 여전히 `# TODO: Phase 7에서 audit_logs 테이블 생성 후 DB 기록으로 전환`이며 코드는 logger 출력만 합니다. 감사 로그는 서버 재시작 시 소실되며, 컴플라이언스·보안 감사 요건을 충족하지 못합니다.

```python
# 현재 (중요한 감사 이벤트가 로그에만 기록됨)
logger.info("AUDIT | method=%s path=%s ...", ...)
# TODO: Phase 7에서 audit_logs 테이블 생성 후 DB 기록으로 전환

# 권장: audit_logs 테이블 생성 및 DB 저장 즉시 구현
# alembic revision --autogenerate -m "add audit_logs table"
```

---

### 🔵 [Info] `payment_terms` 필드 미연결 — ⚠️ 반복

**파일:** `backend/app/services/invoice_service.py` (L347)

```python
"payment_terms": None,  # TODO: vendor의 payment_terms 연결
```

이전 보고서에서도 보고된 항목으로 미수정 상태입니다. 결제 기한 자동 계산 기능에 영향을 줍니다.

---

### 🔵 [Info] i18n 유틸리티 `any` 타입 사용

**파일:** `frontend/lib/i18n/index.ts` (L33)

```typescript
let value: any = dict;  // eslint-disable-next-line @typescript-eslint/no-explicit-any
```

중첩 키 순회를 위해 `any`를 사용하고 있습니다. `unknown` + 타입 가드로 대체 가능합니다.

```typescript
// 권장
let value: unknown = dict as unknown;
for (const k of keys) {
  if (typeof value === 'object' && value !== null && k in value) {
    value = (value as Record<string, unknown>)[k];
  } else {
    return key;
  }
}
```

---

## 2. 보안 취약점

### 🔴 [Critical] 토큰 블랙리스트 Redis 키 충돌 위험

**파일:** `backend/app/services/auth_service.py` (L311, L323)

JWT의 앞 32자를 Redis 키로 사용합니다:

```python
await redis.setex(f"token_blacklist:{refresh_token[:32]}", ttl, "1")
```

JWT 헤더 부분(`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.`)이 모든 토큰에서 동일하게 32자를 넘기 때문에, 서로 다른 사용자의 refresh token이 동일한 블랙리스트 키를 공유할 수 있습니다. 이로 인해:
- 한 사용자 로그아웃 시 다른 사용자의 토큰이 무효화되는 서비스 거부(DoS)
- 또는 역으로, 블랙리스트된 토큰이 우회될 가능성

```python
# 현재 (위험)
await redis.setex(f"token_blacklist:{refresh_token[:32]}", ttl, "1")

# 권장: 전체 토큰의 SHA-256 해시 사용
import hashlib
token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
await redis.setex(f"token_blacklist:{token_hash}", ttl, "1")
```

---

### 🟡 [Warning] 미디어 서빙 엔드포인트 — 경로 순회 방지 미흡

**파일:** `backend/app/api/v1/endpoints/invoices.py` (L27-38)

`ocr_service.py`에는 `_safe_resolve_path()`가 구현되어 있지만, `/media/{file_path:path}` 서빙 엔드포인트에는 `os.path.realpath()` 검증이 없습니다. 개발 환경에서만 동작하지만, 개발/스테이징 환경에서 `../../etc/passwd` 형태의 경로 순회 공격에 노출됩니다.

```python
# 현재 (미흡)
full_path = os.path.join("/app/media", file_path)
if not os.path.exists(full_path):
    raise HTTPException(status_code=404, detail="File not found")

# 권장
base_dir = os.path.realpath("/app/media")
full_path = os.path.realpath(os.path.join(base_dir, file_path))
if not full_path.startswith(base_dir + os.sep):
    raise HTTPException(status_code=400, detail="Invalid path")
if not os.path.exists(full_path):
    raise HTTPException(status_code=404, detail="File not found")
```

---

### 🟡 [Warning] ⚠️ 반복 — CORS `allow_methods=["*"]`, `allow_headers=["*"]`

**파일:** `backend/app/main.py` (L131-132)

이전 보고서에서 보고됐으나 수정되지 않았습니다.

```python
# 현재 (과도함)
allow_methods=["*"],
allow_headers=["*"],

# 권장
allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
allow_headers=["Content-Type", "Authorization", "X-Requested-With", "stripe-signature"],
```

---

### 🟡 [Warning] ⚠️ 반복 — `python-jose` 유지보수 중단

**파일:** `backend/requirements.txt`

`python-jose[cryptography]==3.3.0` — 마지막 업데이트 2021년, 알고리즘 혼용 취약점에 대한 패치 불완전. 이전 보고서 이후에도 미교체 상태입니다.

```
# 권장 교체
PyJWT==2.9.0
cryptography==42.0.7  # 기존 유지
```

---

### 🟡 [Warning] ⚠️ 반복 — Content-Disposition 헤더 파일명 미인용

**파일:** `backend/app/api/v1/endpoints/reports.py` (L36, L57, L78, L100)

```python
# 현재 (잠재적 브라우저 호환성 이슈)
headers={"Content-Disposition": f"attachment; filename={filename}"}

# 권장 (RFC 6266 준수)
headers={"Content-Disposition": f'attachment; filename="{filename}"'}
```

---

### 🔵 [Info] Stripe 웹훅 이중 처리 방지 미구현

**파일:** `backend/app/services/billing_service.py` (`handle_stripe_webhook`)

Stripe 이벤트를 처리할 때 멱등성(idempotency) 보장이 없습니다. 네트워크 재시도로 동일 이벤트가 두 번 수신되면 구독 상태가 중복 처리될 수 있습니다.

```python
# 권장: 처리된 Stripe 이벤트 ID를 DB에 기록
async def handle_stripe_webhook(db, payload, sig_header):
    event = stripe.Webhook.construct_event(...)

    # 중복 처리 방지
    if await _is_event_processed(db, event["id"]):
        return
    await _mark_event_processed(db, event["id"])

    # 실제 처리 로직
    ...
```

---

## 3. 아키텍처 개선

### 🟡 [Warning] CI 파이프라인 DB명 불일치 — 테스트 실패 원인

**파일:** `.github/workflows/ci.yml` (L21 vs L61)

PostgreSQL 서비스는 `POSTGRES_DB: invoice_db_test`로 생성하지만, 테스트 실행 시 `DATABASE_URL`은 `invoice_db`를 참조합니다:

```yaml
# L21 — 서비스 생성
POSTGRES_DB: invoice_db_test
# L25 — health check
--health-cmd "pg_isready -U invoice_user -d invoice_db_test"

# L61 — 테스트 실행 환경변수 (불일치!)
DATABASE_URL: postgresql+asyncpg://invoice_user:invoice_password_test@localhost:5432/invoice_db
#                                                                                   ^^^^^^^^^^
```

`invoice_db` 데이터베이스가 존재하지 않으므로 CI 백엔드 테스트가 연결 오류로 실패합니다.

```yaml
# 즉시 수정
DATABASE_URL: postgresql+asyncpg://invoice_user:invoice_password_test@localhost:5432/invoice_db_test
```

---

### 🟡 [Warning] ⚠️ 반복 — Celery 스케줄 태스크 분산 락 미구현

**파일:** `backend/app/tasks/scheduled_tasks.py`

`send_payment_due_reminders`, `check_contract_expiry`, `check_tax_exempt_expiry` 태스크에 Redis 분산 락이 없습니다. 멀티 워커 환경 또는 Celery Beat 재시작 시 중복 알림 발송 위험이 있습니다.

```python
# 권장: Redis 분산 락 패턴
import contextlib

@contextlib.contextmanager
def celery_task_lock(task_name: str, timeout: int = 3600):
    from app.main import redis_client
    lock = redis_client.lock(f"celery_lock:{task_name}", timeout=timeout)
    acquired = lock.acquire(blocking=False)
    try:
        yield acquired
    finally:
        if acquired and lock.owned():
            lock.release()

@celery_app.task(name="...")
def send_payment_due_reminders():
    with celery_task_lock("send_payment_due_reminders") as acquired:
        if not acquired:
            logger.info("Task already running, skipping")
            return
        _run_async(_send_payment_due_reminders_async())
```

---

### 🟡 [Warning] ⚠️ 반복 — 이메일 폴링 처리 ID 상한선 500개

**파일:** `backend/app/tasks/email_tasks.py` (L23)

```python
MAX_PROCESSED_IDS = 500  # FIFO 최대 보관 수
```

대용량 트래픽 환경에서 500개 초과 시 오래된 ID가 제거되어 이미 처리된 이메일이 재처리됩니다. 3주 연속 미해결 상태입니다.

```python
# 권장: 별도 email_processed_messages 테이블로 분리
# CREATE TABLE email_processed_messages (
#   message_id VARCHAR(255) PRIMARY KEY,
#   config_id UUID REFERENCES email_configurations(id),
#   processed_at TIMESTAMPTZ DEFAULT NOW()
# );
# CREATE INDEX idx_epm_config_id ON email_processed_messages(config_id);
```

---

### 🟡 [Warning] 테스트 커버리지 — 핵심 도메인 미커버

**파일:** `backend/tests/`, `frontend/__tests__/`

이전 보고서 대비 크게 개선(0 → 70개 백엔드 테스트, 16개 프론트엔드 테스트)되었으나 중요 도메인이 누락되어 있습니다.

| 테스트 파일 | 존재 여부 |
|------------|---------|
| `test_invoices.py` | ✅ (119줄) |
| `test_auth.py` | ✅ (60줄) |
| `test_approvals.py` | ✅ (117줄) |
| `test_validation_engine.py` | ❌ 없음 |
| `test_ocr_tasks.py` | ❌ 없음 |
| `test_company_isolation.py` | ❌ 없음 |
| `test_billing.py` | ❌ 없음 |
| 프론트엔드 invoices/approvals 페이지 | ❌ 없음 |

특히 **멀티테넌트 데이터 격리 테스트**가 없는 것이 가장 큰 위험입니다.

---

### 🔵 [Info] 대시보드 쿼리 순차 실행 — 성능 최적화 여지

**파일:** `backend/app/services/dashboard_service.py`

`get_company_summary()` 함수에서 독립적인 DB 쿼리 10여 개가 순차적으로 실행됩니다. `asyncio.gather()`로 병렬화하면 응답 시간을 크게 단축할 수 있습니다.

```python
# 현재 (순차, ~10 쿼리 × DB RTT)
inv_stats = await db.execute(...)
status_stats = await db.execute(...)
pending_approvals = await db.execute(...)
...

# 권장 (병렬)
inv_stats, status_stats, pending_approvals = await asyncio.gather(
    db.execute(inv_query),
    db.execute(status_query),
    db.execute(pending_query),
)
```

---

## 4. 긍정적 발견사항

### ✅ JWT HttpOnly 쿠키 전환 — 우수한 보안 개선

`token-store.ts`의 설계가 전면 개편되었습니다. access token은 메모리(`sessionStorage` fallback)에, refresh token은 서버가 `HttpOnly + Secure + SameSite=Lax` 쿠키로 관리합니다. `withCredentials: true` 설정으로 쿠키 자동 전송도 올바르게 구현되었습니다. 이전 보고서의 Critical 취약점을 모범적으로 해결했습니다.

### ✅ GitHub Actions CI 파이프라인 추가

백엔드(pytest) + 프론트엔드(jest) 이중 테스트, PostgreSQL·Redis 헬스체크, npm 캐시 최적화가 올바르게 구성되어 있습니다. DB명 불일치 버그(위 3.1)만 수정하면 즉시 실효성 있는 CI가 됩니다.

### ✅ Stripe 웹훅 서명 검증 — 올바른 구현

`billing_service.py`에서 `stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)`를 사용해 HMAC 서명 검증을 수행하고, `SignatureVerificationError` 예외를 적절히 처리합니다.

### ✅ 백업 태스크 완성도

`backup_tasks.py`에서 일별·주별·월별 DB 백업, 미디어 파일 백업, 설정 백업, 디스크 모니터링이 하나의 Celery 태스크 체계로 구현되어 있습니다. Telegram 알림 연동, 백업 검증(`pg_restore --list`) 등 운영 편의성도 높습니다.

---

## 5. 최근 변경사항 분석 (커밋 2026-03-19 이후)

| 커밋 | 내용 | 리스크 |
|------|------|--------|
| `01909c7` | 배포 가이드 보완 (Stripe/Telegram 복원, health check) | 낮음 |
| `eb5bc64` | 배포 가이드 수정 (COOKIE_SECURE 환경변수 추가) | 낮음 |
| `2245e91` | 프로덕션 배포 가이드 추가 (Oracle Cloud + Supabase + Caddy) | 낮음 |
| `75d81f0` | 프로덕션 배포 준비 (S3 제거, Docker Prod 설정) | 중간 — 구성 변경 |
| `76562ca` | i18n 다국어 지원 추가 (영어/한국어) | 낮음 |
| `b328d2c` | **GitHub Actions CI 파이프라인 추가** | 중간 — DB명 불일치 버그 포함 |
| `05c0cb0` | Stripe Sandbox 테스트 환경 설정 | 중간 — 결제 연동 |
| `99d50fc` | 프론트엔드 테스트 16개 추가 | 낮음 — 긍정적 |
| `bff8a6f` | 백엔드 테스트 12→70개 확장 | 낮음 — 긍정적 |
| `7079dbc` | 회원가입/로그인/랜딩/가격/이메일인증 페이지 + 구독/결제 구현 | 높음 — 신규 인증 플로우 |

---

## 6. 권장 조치 우선순위

| 우선순위 | 항목 | 파일 | 심각도 |
|---------|------|------|--------|
| 1 | **CI DB명 불일치 즉시 수정** | `.github/workflows/ci.yml:61` | 🟡 Warning |
| 2 | **토큰 블랙리스트 키를 SHA-256 해시로 변경** | `auth_service.py:311,323` | 🔴 Critical |
| 3 | **미디어 서빙 경로 순회 방지 추가** | `invoices.py:30-38` | 🟡 Warning |
| 4 | **감사 로그 DB 테이블 생성 및 영속화** | `audit_middleware.py:56` | 🟡 Warning |
| 5 | **CORS 메서드·헤더 명시적 제한** | `main.py:131-132` | 🟡 Warning |
| 6 | **`python-jose` → `PyJWT` 마이그레이션** | `requirements.txt` | 🟡 Warning |
| 7 | **멀티테넌트 격리 테스트 추가** | `tests/test_api/` | 🟡 Warning |
| 8 | **Celery 스케줄 태스크 분산 락 구현** | `scheduled_tasks.py` | 🟡 Warning |
| 9 | **Content-Disposition 파일명 인용 처리** | `reports.py` | 🟡 Warning |
| 10 | **이메일 처리 ID 별도 테이블 분리** | `email_tasks.py:23` | 🟡 Warning |
| 11 | **Claude 모델명 config 이전** | `chat_service.py`, `ocr_service.py` | 🔵 Info |
| 12 | **대시보드 쿼리 `asyncio.gather()` 병렬화** | `dashboard_service.py` | 🔵 Info |
| 13 | **`payment_terms` 필드 vendor 연결** | `invoice_service.py:347` | 🔵 Info |
| 14 | **Stripe 웹훅 이중 처리 방지** | `billing_service.py` | 🔵 Info |

---

*이 리포트는 자동 코드 분석에 의해 생성되었습니다. 2026-03-23 기준.*
