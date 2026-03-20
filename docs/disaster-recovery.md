# Disaster Recovery Plan

> AI Invoice Automation System — 장애 복구 대책
>
> 최종 수정: 2026-03-20 | 담당: 시스템 관리자

---

## 목차

1. [개요](#1-개요)
2. [전체 아키텍처](#2-전체-아키텍처)
3. [데이터 보호 (Phase A)](#3-데이터-보호-phase-a)
4. [모니터링 (Phase B)](#4-모니터링-phase-b)
5. [복구 절차 (Phase C)](#5-복구-절차-phase-c)
6. [운영 안정화 (Phase D)](#6-운영-안정화-phase-d)
7. [스케줄 총정리](#7-스케줄-총정리)
8. [초기 설정 가이드](#8-초기-설정-가이드)
9. [장애 시나리오별 대응](#9-장애-시나리오별-대응)
10. [변경 이력](#10-변경-이력)

---

## 1. 개요

### 목적

Windows 10 데스크탑에서 Docker Compose로 운영하는 인보이스 시스템의 **데이터 보호**, **장애 감지/알림**, **복구 자동화**를 구현하여 서비스 중단과 데이터 손실을 최소화한다.

### 범위

| 구분 | 포함 항목 |
|------|-----------|
| 데이터 보호 | PostgreSQL 백업, Redis 영속성, 미디어/설정 백업, 로그 로테이션 |
| 모니터링 | 헬스체크 API, Docker healthcheck, 텔레그램 알림, 디스크 감시 |
| 복구 자동화 | DB 복원, 미디어 복원, 전체 시스템 원클릭 복원 |
| 운영 안정화 | 리소스 제한, Graceful Shutdown, Windows 스케줄러, Celery 장애 알림 |

### 파일 구조

```
scripts/
├── backup/
│   ├── backup-db.sh            # PostgreSQL 백업
│   ├── backup-media.sh         # 미디어 파일 백업
│   ├── backup-config.sh        # 환경설정 암호화 백업
│   ├── backup-all.sh           # 전체 백업 통합
│   └── rotate-backups.sh       # 오래된 백업 삭제
├── monitoring/
│   ├── alert.sh                # 텔레그램 알림 발송
│   ├── health-check.sh         # 서비스 상태 점검
│   └── disk-monitor.sh         # 디스크 용량 감시
├── restore/
│   ├── restore-db.sh           # DB 복원
│   ├── restore-media.sh        # 미디어 복원
│   └── restore-all.sh          # 전체 시스템 복원
└── setup/
    └── setup-scheduled-tasks.ps1  # Windows 스케줄러 등록

docker/
└── redis.conf                  # Redis RDB 영속성 설정
```

---

## 2. 전체 아키텍처

### 시스템 구성도

```mermaid
graph TB
    subgraph External["외부"]
        TG["📱 Telegram\n모바일 알림"]
        SENTRY["Sentry\n에러 추적"]
    end

    subgraph Windows["Windows 10 Host"]
        SCHED["⏰ Task Scheduler\n예약 작업 6개"]
        BACKUP_DIR["💾 invoice-backups/\nDB · Media · Config"]

        subgraph Docker["Docker Compose"]
            FE["frontend\n:3000"]
            BE["backend\n:8000"]
            CW["celery_worker"]
            CB["celery_beat"]
            FL["flower\n:5555"]
            DB[(PostgreSQL\n:5432)]
            RD[(Redis\n:6379)]
        end
    end

    SCHED -->|03:00 backup-db.sh| DB
    SCHED -->|03:30 backup-media.sh| Docker
    SCHED -->|5min health-check.sh| BE
    SCHED -->|1hr disk-monitor.sh| Windows

    DB -->|pg_dump| BACKUP_DIR
    Docker -->|tar.gz| BACKUP_DIR

    BE -->|장애 감지| TG
    CW -->|task_failure| TG
    CW -->|exception| SENTRY
    BE --> DB
    BE --> RD
    CW --> DB
    CW --> RD
    CB --> RD
    FE --> BE
```

### 데이터 흐름 — 백업 & 복원

```mermaid
graph LR
    subgraph 백업["매일 자동 백업"]
        direction TB
        B1["03:00\nbackup-db.sh"]
        B2["03:30\nbackup-media.sh"]
        B3["04:00\nrotate-backups.sh"]
        B1 --> B2 --> B3
    end

    subgraph 저장["invoice-backups/"]
        direction TB
        D1["db/daily/ — 7개"]
        D2["db/weekly/ — 4개"]
        D3["db/monthly/ — 3개"]
        D4["media/ — 7개"]
        D5["config/ — 5개"]
    end

    subgraph 복원["장애 시 복원"]
        direction TB
        R1["restore-db.sh"]
        R2["restore-media.sh"]
        R3["restore-all.sh\n전체 복원"]
    end

    백업 --> 저장 --> 복원
```

---

## 3. 데이터 보호 (Phase A)

### 3-1. PostgreSQL 자동 백업

```mermaid
flowchart TD
    START([매일 03:00 실행]) --> CHK{컨테이너\n실행 중?}
    CHK -->|No| ALERT_FAIL["🔴 CRITICAL 알림\n백업 실패"]
    CHK -->|Yes| DUMP["pg_dump --format=custom"]
    DUMP --> VERIFY{pg_restore --list\n유효성 검증}
    VERIFY -->|Pass| WEEKDAY{일요일?}
    VERIFY -->|Fail| ALERT_WARN["🟡 WARNING 알림\n검증 실패"]
    ALERT_WARN --> WEEKDAY
    WEEKDAY -->|Yes| WEEKLY["주간 백업 복사"]
    WEEKDAY -->|No| MONTH{매월 1일?}
    WEEKLY --> MONTH
    MONTH -->|Yes| MONTHLY["월간 백업 복사"]
    MONTH -->|No| DONE(["🟢 완료 알림"])
    MONTHLY --> DONE
```

| 항목 | 설정 |
|------|------|
| 스크립트 | `scripts/backup/backup-db.sh` |
| 실행 주기 | 매일 03:00 (Windows Task Scheduler) |
| 백업 방식 | `pg_dump --format=custom` (압축, 선택적 복원 가능) |
| 검증 | `pg_restore --list`로 백업 파일 무결성 확인 |
| 저장 위치 | `C:/Users/philk/Documents/invoice-backups/db/` |

**보관 정책:**

| 주기 | 보관 개수 | 최대 기간 |
|------|----------|-----------|
| 일간 | 7개 | ~1주 |
| 주간 (일요일) | 4개 | ~1개월 |
| 월간 (1일) | 3개 | ~3개월 |

### 3-2. Redis 영속성

| 항목 | 이전 (위험) | 이후 (안전) |
|------|:---:|:---:|
| 저장 방식 | 메모리만 | RDB 스냅샷 + 디스크 |
| Docker volume | 없음 | `redis_data:/data` |
| 컨테이너 재시작 | **데이터 전체 소실** | 자동 복구 |

**RDB 스냅샷 규칙** (`docker/redis.conf`):

| 조건 | 의미 |
|------|------|
| `save 900 1` | 15분 내 1건 이상 변경 시 저장 |
| `save 300 10` | 5분 내 10건 이상 변경 시 저장 |
| `save 60 10000` | 1분 내 10,000건 이상 변경 시 저장 |

### 3-3. 로그 로테이션

모든 Docker 서비스에 적용:

```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"    # 파일당 최대 10MB
    max-file: "5"      # 최대 5개 파일 유지
```

| 서비스 (7개) | 서비스당 최대 | 전체 최대 |
|-------------|:---:|:---:|
| db, redis, backend, celery_worker, celery_beat, flower, frontend | 50MB | **~350MB** |

### 3-4. 백업 로테이션

| 스크립트 | `scripts/backup/rotate-backups.sh` |
|----------|-----------------------------------|
| 실행 주기 | 매일 04:00 |
| 동작 | 보관 기한 초과 파일을 오래된 순서대로 삭제 |

---

## 4. 모니터링 (Phase B)

### 4-1. Health API

```mermaid
flowchart LR
    subgraph 경량["GET /health"]
        H1["DB 연결 확인"]
        H2["Redis 연결 확인"]
    end

    subgraph 상세["GET /health/detail"]
        D1["DB 레이턴시 (ms)"]
        D2["Redis 레이턴시 (ms)"]
        D3["Celery 워커 수"]
        D4["디스크 잔여 용량"]
    end

    DOCKER["Docker\nhealthcheck"] -->|30초마다| 경량
    SCRIPT["health-check.sh"] -->|5분마다| 경량
    ADMIN["관리자"] --> 상세
```

**`GET /health`** — Docker healthcheck용 (인증 불필요)

```json
{
  "status": "healthy | degraded | unhealthy",
  "environment": "development",
  "checks": {
    "database": "connected",
    "redis": "connected"
  }
}
```

**`GET /health/detail`** — 관리자 상세 진단

```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "connected", "latency_ms": 2.1 },
    "redis":    { "status": "connected", "latency_ms": 0.8 },
    "celery":   { "status": "active",    "workers": 1 },
    "disk":     { "status": "ok",        "free_gb": 45.2, "usage_percent": 72.3 }
  }
}
```

### 4-2. Docker Healthcheck

| 서비스 | 방식 | 주기 | 시작 유예 |
|--------|------|:---:|:---:|
| db | `pg_isready` | 10초 | — |
| redis | `redis-cli ping` | 10초 | — |
| backend | `urllib → /health` | 30초 | 30초 |
| celery_worker | `celery inspect ping` | 60초 | 30초 |
| celery_beat | schedule 파일 수정시간 확인 (<5분) | 60초 | 30초 |

### 4-3. 텔레그램 알림

```mermaid
flowchart LR
    SRC1["health-check.sh"] --> ALERT["alert.sh"]
    SRC2["disk-monitor.sh"] --> ALERT
    SRC3["backup-*.sh"] --> ALERT
    SRC4["celery task_failure"] --> TG_API["Telegram Bot API"]
    ALERT --> TG_API
    TG_API --> PHONE["📱 모바일 즉시 수신"]
```

| 레벨 | 아이콘 | 의미 | 예시 |
|------|:---:|------|------|
| CRITICAL | 🔴 | 즉시 대응 필요 | DB 다운, 백업 실패, 컨테이너 비정상 |
| WARNING | 🟡 | 주의 관찰 | 디스크 85%, 백업 검증 실패 |
| INFO | 🟢 | 정상 보고 | 백업 완료, 복원 완료 |

**알림 설정:**

```bash
# .env.dev에 추가
TELEGRAM_BOT_TOKEN=your-bot-token    # BotFather에서 발급
TELEGRAM_CHAT_ID=your-chat-id        # @userinfobot으로 확인
```

### 4-4. 외부 헬스체크 (`health-check.sh`)

5분마다 실행하며 아래 항목을 점검:

| 점검 | 방법 |
|------|------|
| API 응답 | `curl /health` → HTTP 200 확인 |
| 컨테이너 6개 | `docker inspect` → running + healthy 확인 |

비정상 감지 시 → `alert.sh` → 텔레그램 CRITICAL 알림

### 4-5. 디스크 모니터링 (`disk-monitor.sh`)

| 사용률 | 레벨 | 동작 |
|:---:|------|------|
| < 85% | 정상 | 로그만 기록 |
| 85~94% | 🟡 WARNING | 텔레그램 경고 |
| ≥ 95% | 🔴 CRITICAL | 텔레그램 긴급 알림 |

---

## 5. 복구 절차 (Phase C)

### 5-1. DB 복원

```mermaid
flowchart TD
    START([restore-db.sh 실행]) --> INPUT["백업 파일 선택\n미지정 시 목록 출력"]
    INPUT --> CONFIRM{"사용자 확인\n⚠️ DB가 삭제됩니다"}
    CONFIRM -->|No| CANCEL([취소])
    CONFIRM -->|Yes| STOP["앱 서비스 중지\nbackend, celery, flower"]
    STOP --> TERM["기존 DB 연결 종료\npg_terminate_backend"]
    TERM --> DROP["DROP DATABASE\nCREATE DATABASE"]
    DROP --> RESTORE["pg_restore\n--no-owner --no-privileges"]
    RESTORE --> STAMP["alembic stamp head\n마이그레이션 동기화"]
    STAMP --> RESTART["앱 서비스 재시작"]
    RESTART --> DONE(["✅ 복원 완료 알림"])
```

```bash
# 사용법
bash scripts/restore/restore-db.sh                              # 백업 목록 표시
bash scripts/restore/restore-db.sh /path/to/invoice_db.dump     # 지정 파일로 복원
```

### 5-2. 미디어 복원

```bash
bash scripts/restore/restore-media.sh                           # 백업 목록 표시
bash scripts/restore/restore-media.sh /path/to/media.tar.gz     # 지정 파일로 복원
```

### 5-3. 전체 시스템 복원 (원클릭)

**시스템이 완전히 망가졌을 때** 사용하는 전체 복구 스크립트:

```mermaid
flowchart TD
    START([restore-all.sh 실행]) --> D_CHK{Docker\n설치/실행 확인}
    D_CHK -->|실패| D_ERR([❌ Docker 설치 필요])
    D_CHK -->|OK| ENV{.env.dev\n존재?}
    ENV -->|No| CFG_BACKUP{"설정 백업\n있음?"}
    CFG_BACKUP -->|No| ENV_ERR([❌ 환경 설정 필요])
    CFG_BACKUP -->|Yes| CFG_RESTORE["설정 복원"]
    CFG_RESTORE --> FIND
    ENV -->|Yes| FIND["최신 백업 자동 검색\nDB + Media"]
    FIND --> CONFIRM{"사용자 확인"}
    CONFIRM -->|No| CANCEL([취소])
    CONFIRM -->|Yes| BUILD["docker compose build"]
    BUILD --> DB_UP["DB + Redis 시작"]
    DB_UP --> WAIT["DB 준비 대기\n최대 60초"]
    WAIT --> DB_RESTORE["DB 복원\npg_restore"]
    DB_RESTORE --> MEDIA{"미디어 백업\n있음?"}
    MEDIA -->|Yes| MEDIA_RESTORE["미디어 복원"]
    MEDIA -->|No| ALL_UP
    MEDIA_RESTORE --> ALL_UP["전체 서비스 시작\ndocker compose up -d"]
    ALL_UP --> HEALTH["헬스체크 대기\n최대 60초"]
    HEALTH --> DONE(["✅ 전체 복원 완료\nlocalhost:3000 접속 가능"])
```

```bash
# 자동 검색 (최신 백업 사용)
bash scripts/restore/restore-all.sh

# 수동 지정
bash scripts/restore/restore-all.sh /path/to/db.dump /path/to/media.tar.gz
```

### 5-4. 환경설정 백업 (`backup-config.sh`)

수집 대상:

| 파일/디렉토리 | 내용 |
|---------------|------|
| `.env*` | 환경변수 (DB 비밀번호, API 키 등) |
| `docker-compose.yml` | 서비스 구성 |
| `docker/redis.conf` | Redis 설정 |
| `backend/credentials/` | Google 서비스 계정 키 등 |

```bash
# 암호화 백업 (AES-256)
CONFIG_BACKUP_PASSWORD=my-secret bash scripts/backup/backup-config.sh

# 복호화
openssl enc -aes-256-cbc -d -pbkdf2 \
  -in config_20260320.tar.gz.enc \
  -out config_20260320.tar.gz
```

---

## 6. 운영 안정화 (Phase D)

### 6-1. 컨테이너 리소스 제한

```mermaid
pie title 전체 리소스 할당 (메모리)
    "celery_worker (2G)" : 2048
    "backend (1G)" : 1024
    "db (1G)" : 1024
    "frontend (512M)" : 512
    "redis (256M)" : 256
    "flower (256M)" : 256
    "celery_beat (256M)" : 256
```

| 서비스 | CPU | 메모리 | 비고 |
|--------|:---:|:---:|------|
| backend | 2 | 1GB | API 서버 |
| celery_worker | 2 | 2GB | OCR 처리 (메모리 집약) |
| db | 1 | 1GB | PostgreSQL |
| frontend | 1 | 512MB | Next.js |
| redis | 0.5 | 256MB | 캐시/큐 |
| flower | 0.5 | 256MB | 모니터링 UI |
| celery_beat | 0.5 | 256MB | 스케줄러 |
| **합계** | **7.5** | **4.25GB** | |

### 6-2. Graceful Shutdown

| 서비스 | 종료 대기 | 이유 |
|--------|:---:|------|
| backend | 30초 | 진행 중인 HTTP 요청 완료 대기 |
| celery_worker | **120초** | OCR 등 장시간 작업 완료 대기 |
| celery_beat | 10초 | 스케줄러 (빠른 종료 가능) |

### 6-3. Celery 작업 실패 알림

```mermaid
flowchart LR
    FAIL["Celery Task 실패"] --> SIGNAL["task_failure 시그널"]
    SIGNAL --> LOG["로그 기록"]
    SIGNAL --> SENTRY["Sentry 전송"]
    SIGNAL --> TG["텔레그램 알림\n🔴 task명 + 에러 내용"]
```

---

## 7. 스케줄 총정리

### 시간대별 일과표

```mermaid
gantt
    title 일일 자동화 스케줄
    dateFormat HH:mm
    axisFormat %H:%M

    section 백업
    DB 백업           :b1, 03:00, 15min
    미디어 백업       :b2, 03:30, 15min
    백업 로테이션     :b3, 04:00, 5min

    section 모니터링
    헬스체크 (5분 주기)    :m1, 00:00, 24h
    디스크 감시 (1시간 주기) :m2, 00:00, 24h
```

### Windows 작업 스케줄러 등록 목록

| 작업명 | 스크립트 | 스케줄 | 타임아웃 |
|--------|----------|--------|:---:|
| DB-Backup | `backup-db.sh` | 매일 03:00 | 30분 |
| Media-Backup | `backup-media.sh` | 매일 03:30 | 30분 |
| Backup-Rotation | `rotate-backups.sh` | 매일 04:00 | 10분 |
| Health-Check | `health-check.sh` | 5분마다 | 5분 |
| Disk-Monitor | `disk-monitor.sh` | 1시간마다 | 5분 |
| Docker-Startup | `docker compose up -d` | 로그온 시 | 10분 |

---

## 8. 초기 설정 가이드

### Step 1. 텔레그램 봇 설정

1. Telegram에서 [@BotFather](https://t.me/BotFather)에게 `/newbot` 명령
2. 봇 토큰 발급 (예: `123456789:ABCdefGhIjKlMnOpQrStUvWxYz`)
3. 생성된 봇에게 아무 메시지 전송
4. [@userinfobot](https://t.me/userinfobot)에게 메시지 보내서 Chat ID 확인
5. `.env.dev`에 설정:

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIjKlMnOpQrStUvWxYz
TELEGRAM_CHAT_ID=987654321
```

### Step 2. 서비스 재시작

```bash
docker compose up -d
```

### Step 3. Windows 스케줄러 등록

```powershell
# 관리자 PowerShell에서 실행
PowerShell -ExecutionPolicy Bypass -File scripts/setup/setup-scheduled-tasks.ps1
```

### Step 4. 동작 확인

```bash
# 텔레그램 알림 테스트
bash scripts/monitoring/alert.sh INFO "Test alert - system OK"

# 헬스체크 테스트
curl http://localhost:8000/health/detail

# 백업 테스트
bash scripts/backup/backup-db.sh

# 복원 테스트 (개발 환경에서만!)
bash scripts/restore/restore-db.sh /path/to/backup.dump
```

---

## 9. 장애 시나리오별 대응

### 시나리오 판단 흐름도

```mermaid
flowchart TD
    ALERT(["🔴 알림 수신"]) --> TYPE{"어떤 장애?"}

    TYPE -->|"컨테이너 다운"| C_CHK["docker ps로 확인"]
    C_CHK --> C_AUTO{"자동 재시작\n됐는가?"}
    C_AUTO -->|Yes| C_LOG["로그 확인\ndocker logs 컨테이너명"]
    C_AUTO -->|No| C_MANUAL["수동 재시작\ndocker compose up -d"]
    C_MANUAL --> C_LOG

    TYPE -->|"DB 장애"| DB_CHK["DB 접속 시도"]
    DB_CHK --> DB_CONN{"접속 가능?"}
    DB_CONN -->|Yes| DB_SLOW["쿼리/인덱스 점검"]
    DB_CONN -->|No| DB_RESTORE["restore-db.sh\nDB 복원"]

    TYPE -->|"디스크 부족"| DISK_CHK["du -sh 로 확인"]
    DISK_CHK --> DISK_LOG["Docker 로그 정리\ndocker system prune"]
    DISK_LOG --> DISK_BACKUP["오래된 백업 수동 삭제"]

    TYPE -->|"전체 시스템 장애"| FULL["restore-all.sh\n전체 복원"]
```

### 시나리오별 상세 대응

#### A. 단일 컨테이너 장애

| 단계 | 명령어 |
|------|--------|
| 1. 상태 확인 | `docker ps -a` |
| 2. 로그 확인 | `docker logs --tail 100 invoice_backend` |
| 3. 재시작 | `docker compose restart backend` |
| 4. 전체 재시작 | `docker compose down && docker compose up -d` |

> `restart: unless-stopped` 설정으로 대부분 자동 복구됩니다.

#### B. DB 데이터 손상/손실

| 단계 | 명령어 |
|------|--------|
| 1. 서비스 확인 | `docker exec invoice_db pg_isready` |
| 2. 백업 목록 확인 | `ls -la ~/Documents/invoice-backups/db/daily/` |
| 3. 복원 실행 | `bash scripts/restore/restore-db.sh <백업파일>` |

**예상 복구 시간**: ~5분 (데이터 크기에 따라 변동)
**최대 데이터 손실**: 24시간분 (일간 백업 기준)

#### C. 디스크 공간 부족

```bash
# 1. 상황 파악
df -h
du -sh ~/Documents/invoice-backups/*

# 2. Docker 정리
docker system prune -f
docker volume prune -f

# 3. 로그 정리 (필요 시)
docker compose down
docker compose up -d   # 로그 로테이션이 자동 적용됨
```

#### D. 전체 시스템 복구 (OS 재설치 후)

| 단계 | 설명 |
|------|------|
| 1 | Docker Desktop 설치 |
| 2 | Git으로 프로젝트 클론 |
| 3 | 설정 백업 복원 또는 `.env.dev` 수동 생성 |
| 4 | `bash scripts/restore/restore-all.sh` 실행 |
| 5 | Windows 스케줄러 재등록 |

**예상 복구 시간**: ~30분

---

## 10. 변경 이력

| 날짜 | 내용 | 담당 |
|------|------|------|
| 2026-03-20 | 초기 작성 — Phase A~D 전체 구현 | - |
