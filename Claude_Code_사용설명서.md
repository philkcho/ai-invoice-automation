# Claude Code 사용설명서 (초보자용)

> Claude Code는 터미널에서 동작하는 AI 코딩 어시스턴트입니다.
> 코드를 읽고, 수정하고, 명령어를 실행하고, Git/GitHub까지 자동으로 처리합니다.

---

## 목차

1. [설치 및 시작](#1-설치-및-시작)
2. [기본 사용법](#2-기본-사용법)
3. [CLAUDE.md — 프로젝트 설명서](#3-claudemd--프로젝트-설명서)
4. [슬래시 명령어 (Slash Commands)](#4-슬래시-명령어)
5. [키보드 단축키](#5-키보드-단축키)
6. [권한 모드 (Permissions)](#6-권한-모드)
7. [커스텀 스킬 만들기](#7-커스텀-스킬-만들기)
8. [MCP 서버 — 외부 서비스 연동](#8-mcp-서버--외부-서비스-연동)
9. [Hooks — 자동화 트리거](#9-hooks--자동화-트리거)
10. [설정 파일 구조](#10-설정-파일-구조)
11. [메모리 시스템](#11-메모리-시스템)
12. [컨텍스트 관리](#12-컨텍스트-관리)
13. [Git 연동](#13-git-연동)
14. [IDE 연동 (VS Code / JetBrains)](#14-ide-연동)
15. [실전 팁 & 자주 하는 실수](#15-실전-팁--자주-하는-실수)

---

## 1. 설치 및 시작

### 설치

```bash
# macOS / Linux / WSL
curl -fsSL https://claude.ai/install.sh | bash

# Windows PowerShell
irm https://claude.ai/install.ps1 | iex

# Windows CMD
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd

# Homebrew (macOS)
brew install --cask claude-code

# WinGet (Windows)
winget install Anthropic.ClaudeCode
```

> **Windows 필수:** Git for Windows (https://git-scm.com/downloads/win) 가 설치되어 있어야 합니다.

### 첫 실행

```bash
claude --version    # 설치 확인
claude              # 프로젝트 폴더에서 실행 → 대화 시작
```

처음 실행하면 로그인을 요구합니다. 브라우저가 열리고 Anthropic 계정으로 인증하면 됩니다.

### 시스템 요구사항

- **OS:** macOS 13.0+, Windows 10+, Ubuntu 20.04+
- **RAM:** 4GB 이상
- **네트워크:** 인터넷 연결 필수
- **셸:** Bash, Zsh, PowerShell, CMD

---

## 2. 기본 사용법

### 대화하듯 요청하기

```
> 이 프로젝트 구조 설명해줘
> src/auth.ts에 있는 로그인 로직에 버그가 있어. 수정해줘
> 테스트 코드 작성해줘
> 이 함수 리팩토링 해줘
```

### 파일 참조하기 (@멘션)

```
> @src/auth.ts 이 파일 설명해줘
> @src/components/ 이 폴더 구조 보여줘
> @src/auth.ts#5-20 이 부분만 설명해줘        (5~20번 줄)
```

### 멀티라인 입력

- **`Shift + Enter`** — 줄바꿈 (전송하지 않음)
- **`Enter`** — 전송

### 중간에 멈추기

- **`Esc`** — Claude의 작업을 즉시 중단
- **`Ctrl + C`** — 인터럽트/취소

---

## 3. CLAUDE.md — 프로젝트 설명서

**CLAUDE.md**는 Claude에게 프로젝트에 대한 지시사항을 전달하는 파일입니다.
매 세션 시작 시 자동으로 읽습니다.

### 어디에 놓을까?

| 위치 | 범위 | Git 공유 |
|------|------|----------|
| `./CLAUDE.md` (프로젝트 루트) | 이 프로젝트 | O |
| `./.claude/CLAUDE.md` | 이 프로젝트 | O |
| `~/.claude/CLAUDE.md` | 모든 프로젝트 (개인용) | X |
| 상위 디렉토리 | 모노레포에서 하위로 상속 | O |

### 뭘 적어야 할까?

```markdown
# 빌드 & 테스트
- 테스트: npm test
- 빌드: npm run build
- 타입체크: npm run type-check

# 코드 스타일
- ES modules (import/export) 사용, CommonJS 금지
- 인덴트: 2스페이스
- 커밋 메시지: 한국어

# 주의사항
- .env 파일 절대 커밋 금지
- API 키는 환경변수로 관리
```

### 적지 말아야 할 것

- Claude가 코드를 읽으면 알 수 있는 것
- 너무 긴 설명 (200줄 이하 권장)
- 자주 바뀌는 정보

### 자동 생성

```
/init
```

프로젝트를 분석해서 CLAUDE.md 초안을 자동으로 만들어줍니다.

### 다른 파일 가져오기 (@import)

```markdown
프로젝트 개요는 @README.md 참조

# Git 규칙
@docs/git-instructions.md
```

### 규칙 파일로 분리하기

프로젝트가 커지면 `.claude/rules/` 폴더로 분리:

```
.claude/
├── CLAUDE.md
└── rules/
    ├── code-style.md
    ├── testing.md
    └── api-design.md
```

특정 경로에만 적용하는 규칙도 가능:

```yaml
---
paths:
  - "src/api/**/*.ts"
---

# API 개발 규칙
- 모든 엔드포인트에 입력 검증 필수
```

---

## 4. 슬래시 명령어

`/`를 입력하면 사용 가능한 명령어 목록이 나타납니다.

### 필수 명령어

| 명령어 | 설명 |
|--------|------|
| `/help` | 도움말 |
| `/clear` | 대화 초기화 (새 작업 시작 시 필수!) |
| `/compact` | 컨텍스트 압축 (메모리 부족 시) |
| `/compact API 관련 유지` | 특정 내용 유지하며 압축 |
| `/init` | CLAUDE.md 자동 생성 |
| `/cost` | 토큰 사용량/비용 확인 |
| `/model` | 모델 변경 |
| `/fast` | 빠른 모드 토글 (같은 모델, 빠른 출력) |

### 세션 관리

| 명령어 | 설명 |
|--------|------|
| `/status` | 세션 상태 확인 |
| `/resume` | 이전 세션 이어하기 |
| `/rename 이름` | 현재 세션 이름 변경 |
| `/rewind` | 이전 상태로 되돌리기 |
| `/context` | 컨텍스트 사용량 확인 |

### 설정 & 진단

| 명령어 | 설명 |
|--------|------|
| `/config` | 설정 열기 |
| `/doctor` | 설치/설정 문제 진단 |
| `/memory` | 메모리 파일 확인/편집 |
| `/permissions` | 권한 규칙 관리 |
| `/login` / `/logout` | 로그인/로그아웃 |
| `/hooks` | Hook 확인 |
| `/mcp` | MCP 서버 관리 |

### 고급 명령어

| 명령어 | 설명 |
|--------|------|
| `/batch 지시사항` | 대규모 병렬 변경 (코드베이스 전체) |
| `/simplify` | 최근 변경 코드 리뷰 & 개선 |
| `/loop 5m /save` | 5분마다 반복 실행 |
| `/btw 질문` | 사이드 질문 (대화 기록에 남지 않음) |
| `/debug 설명` | 세션 디버깅 |
| `/effort` | 추론 깊이 설정 |

---

## 5. 키보드 단축키

### 기본 조작

| 단축키 | 기능 |
|--------|------|
| `Enter` | 메시지 전송 |
| `Shift + Enter` | 줄바꿈 |
| `Esc` | 작업 중단 |
| `Ctrl + C` | 인터럽트/취소 |
| `Ctrl + D` | Claude Code 종료 |
| `Shift + Tab` | 권한 모드 순환 |
| `Ctrl + R` | 명령 히스토리 검색 |
| `Ctrl + T` | 태스크 목록 토글 |
| `Ctrl + G` | 외부 에디터로 입력 |
| `Alt + T` | 확장 사고(thinking) 토글 |
| `Esc Esc` | 되돌리기(Rewind) 메뉴 |

### VS Code 전용

| 단축키 | 기능 |
|--------|------|
| `Cmd/Ctrl + Esc` | 에디터 ↔ Claude 포커스 전환 |
| `Cmd/Ctrl + Shift + Esc` | 새 대화 탭 열기 |
| `Option/Alt + K` | @멘션 삽입 (파일+줄 번호) |

### 커스터마이징

`/keybindings` 실행 후 `~/.claude/keybindings.json` 편집:

```json
{
  "bindings": [
    {
      "context": "Chat",
      "bindings": {
        "ctrl+e": "chat:externalEditor",
        "ctrl+s": null
      }
    }
  ]
}
```

- `null` = 기존 단축키 해제
- `ctrl+k ctrl+s` = 코드(chord) 키 조합 가능
- `Ctrl+C`, `Ctrl+D`는 변경 불가

---

## 6. 권한 모드

Claude가 어떤 동작을 자동으로 할 수 있는지 제어합니다.
**`Shift + Tab`**으로 순환 전환 가능.

### 모드 종류

| 모드 | Bash 명령 | 파일 수정 | 설명 |
|------|-----------|-----------|------|
| `default` | 매번 물어봄 | 매번 물어봄 | 가장 안전 (기본값) |
| `acceptEdits` | 매번 물어봄 | 자동 허용 | 파일 수정은 자유, 명령은 확인 |
| `plan` | 차단 | 읽기만 | 분석/계획 전용 모드 |
| `dontAsk` | 자동 거부 | 자동 거부 | 미승인 도구 자동 거부 |
| `bypassPermissions` | 전부 허용 | 전부 허용 | 위험! 모두 자동 실행 |

### 허용/차단 규칙 설정

`/permissions` 또는 설정 파일에서:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(git commit *)",
      "Edit(src/**/*.ts)"
    ],
    "deny": [
      "Bash(git push --force *)",
      "Edit(.env)"
    ]
  }
}
```

> **패턴 문법:** `*`는 와일드카드. `Bash(npm run *)` = npm run으로 시작하는 모든 명령 허용

### 우선순위

**deny > ask > allow** — deny가 항상 우선.

---

## 7. 커스텀 스킬 만들기

반복하는 작업을 `/명령어`로 만들어 재사용할 수 있습니다.

### 스킬 생성

```
프로젝트용:  .claude/skills/스킬이름/SKILL.md
개인용:      ~/.claude/skills/스킬이름/SKILL.md
```

### SKILL.md 구조

```yaml
---
name: deploy
description: 프로덕션 배포를 수행한다
argument-hint: "[환경: staging|prod]"
allowed-tools: Bash, Read
---

# 배포 절차

1. 테스트 실행: `npm test`
2. 빌드: `npm run build`
3. $ARGUMENTS 환경으로 배포
4. 배포 확인
```

### 프론트매터 옵션

| 필드 | 설명 |
|------|------|
| `name` | 스킬 이름 (소문자, 하이픈, 최대 64자) |
| `description` | 설명 (Claude가 자동 호출 시 참고) |
| `argument-hint` | 인자 힌트 (자동완성에 표시) |
| `allowed-tools` | 허용할 도구 목록 |
| `disable-model-invocation` | `true`면 수동 호출만 가능 |
| `user-invocable` | `false`면 `/` 메뉴에서 숨김 (배경 지식용) |
| `context` | `fork`이면 별도 서브에이전트에서 실행 |
| `model` | 사용할 모델 지정 |

### 인자 사용

```yaml
---
name: fix-issue
description: GitHub 이슈를 수정한다
---

GitHub 이슈 #$ARGUMENTS 를 수정하라.
```

실행: `/fix-issue 42` → `$ARGUMENTS`가 `42`로 치환됨

- `$0`, `$1` — 개별 인자 접근
- `$ARGUMENTS` — 전체 인자

### 쉘 명령어 전처리 (`` !`command` ``)

```yaml
---
name: pr-review
description: PR 리뷰
---

## PR 정보
- 변경 파일: !`gh pr diff --name-only`
- 코멘트: !`gh pr view --comments`

위 내용을 기반으로 코드 리뷰를 수행하라.
```

`` !`명령어` `` 는 스킬 실행 전에 먼저 실행되어 결과로 치환됩니다.

### 보조 파일

```
my-skill/
├── SKILL.md          (필수)
├── reference.md      (상세 문서)
├── examples.md       (예시)
└── scripts/
    └── validate.sh   (스크립트)
```

SKILL.md에서 참조:
```markdown
상세 내용은 [reference.md](reference.md) 참고.
```

---

## 8. MCP 서버 — 외부 서비스 연동

**MCP (Model Context Protocol)** 는 Claude를 외부 서비스(Jira, Slack, DB 등)에 연결하는 표준입니다.

### 서버 추가

```bash
# HTTP (권장)
claude mcp add --transport http notion https://mcp.notion.com/mcp

# 인증 헤더 포함
claude mcp add --transport http github https://mcp.github.com \
  --header "Authorization: Bearer YOUR_TOKEN"

# 로컬 프로세스 (stdio)
claude mcp add --transport stdio airtable \
  --env AIRTABLE_API_KEY=YOUR_KEY -- npx -y airtable-mcp-server
```

### 서버 관리

```bash
claude mcp list              # 목록 보기
claude mcp get 서버이름       # 상세 보기
claude mcp remove 서버이름    # 삭제
```

세션 내에서: `/mcp` 로 상태 확인 및 인증

### 설치 범위

| 범위 | 명령어 | 접근 |
|------|--------|------|
| **로컬** (기본) | `claude mcp add ...` | 나만, 이 프로젝트만 |
| **프로젝트** | `claude mcp add --scope project ...` | 팀 전체 (git 커밋) |
| **유저** | `claude mcp add --scope user ...` | 나, 모든 프로젝트 |

### 프로젝트 공유 (.mcp.json)

프로젝트 루트에 `.mcp.json` 생성:

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://mcp.github.com",
      "headers": {
        "Authorization": "Bearer ${GITHUB_TOKEN}"
      }
    }
  }
}
```

`${변수명}` 으로 환경변수 참조 가능. `${VAR:-기본값}` 도 지원.

### 활용 예시

```
> JIRA 이슈 ENG-4521 읽어서 구현해줘
> Sentry에서 최근 에러 확인해줘
> PostgreSQL에서 사용자 테이블 스키마 보여줘
> Slack 채널에서 피드백 정리해줘
```

---

## 9. Hooks — 자동화 트리거

특정 이벤트 발생 시 자동으로 쉘 명령어를 실행합니다.

### 설정 위치

- `~/.claude/settings.json` — 모든 프로젝트
- `.claude/settings.json` — 이 프로젝트 (팀 공유)
- `.claude/settings.local.json` — 이 프로젝트 (개인용)

### 이벤트 종류

| 이벤트 | 발생 시점 |
|--------|-----------|
| `PreToolUse` | 도구 실행 전 (차단 가능) |
| `PostToolUse` | 도구 실행 후 |
| `UserPromptSubmit` | 사용자가 메시지 전송 시 |
| `Notification` | Claude가 알림 보낼 때 |
| `SessionStart` | 세션 시작/재개 시 |
| `Stop` | Claude 응답 완료 시 |

### 예시: 파일 수정 후 자동 포맷

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write"
          }
        ]
      }
    ]
  }
}
```

### 예시: 보호 파일 수정 차단

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/protect-files.sh"
          }
        ]
      }
    ]
  }
}
```

### 예시: 알림 (Windows)

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "powershell.exe -Command \"[System.Windows.Forms.MessageBox]::Show('Claude Code 확인 필요')\""
          }
        ]
      }
    ]
  }
}
```

### Exit 코드

- `0` — 허용 (계속 진행)
- `2` — 차단 (stderr 메시지가 Claude에게 전달됨)

---

## 10. 설정 파일 구조

### 파일 위치 (우선순위 순)

| 우선순위 | 위치 | 범위 |
|----------|------|------|
| 1 (최고) | 시스템 관리 디렉토리 | 조직 전체 |
| 2 | CLI 플래그 | 현재 세션 |
| 3 | `.claude/settings.local.json` | 프로젝트 (개인) |
| 4 | `.claude/settings.json` | 프로젝트 (팀) |
| 5 (최저) | `~/.claude/settings.json` | 유저 전체 |

### 주요 설정 항목

```json
{
  "permissions": {
    "defaultMode": "default",
    "allow": ["Bash(npm run *)"],
    "deny": ["Bash(rm -rf *)"]
  },
  "model": "default",
  "effort": "medium",
  "autoMemoryEnabled": true,
  "autoCompactAt": 0.85,
  "env": {
    "NODE_ENV": "development"
  },
  "hooks": { }
}
```

### 확인 방법

```
/config       # 설정 UI 열기
/doctor       # 설정 문제 진단
```

---

## 11. 메모리 시스템

Claude는 대화 간에 정보를 기억할 수 있습니다. 두 가지 메모리가 있습니다.

### CLAUDE.md (수동 메모리)

- **누가 작성:** 사용자
- **언제 로드:** 매 세션 시작
- **용도:** 프로젝트 규칙, 빌드 명령, 코드 스타일

### Auto Memory (자동 메모리)

- **누가 작성:** Claude가 자동으로
- **저장 위치:** `~/.claude/projects/<프로젝트>/memory/`
- **언제 로드:** 매 세션 시작 (MEMORY.md 첫 200줄)
- **용도:** 대화에서 학습한 사용자 선호도, 프로젝트 특이사항

```
~/.claude/projects/<project>/memory/
├── MEMORY.md           # 인덱스 (200줄까지 자동 로드)
├── user_role.md        # 사용자 정보
├── feedback_style.md   # 피드백/선호도
└── project_auth.md     # 프로젝트 메모
```

### 메모리 관리

```
/memory              # 메모리 파일 확인/편집
"이거 기억해줘"       # Claude에게 직접 요청 → 자동 저장
"기억한 거 삭제해줘"  # 삭제 요청
```

### 비활성화

```json
{
  "autoMemoryEnabled": false
}
```

---

## 12. 컨텍스트 관리

**컨텍스트 윈도우**는 Claude가 한 번에 기억할 수 있는 대화/파일 내용의 총량입니다.

### 컨텍스트가 차는 원인

- 읽은 파일 내용
- 명령어 실행 결과
- 대화 히스토리
- CLAUDE.md, 스킬, MCP 서버 정의

### 컨텍스트 관리법

| 상황 | 해결 |
|------|------|
| 새 작업 시작 | `/clear` (완전 초기화) |
| 컨텍스트 부족 경고 | `/compact` (압축) |
| 특정 내용 유지하며 압축 | `/compact API 로직 유지` |
| 사용량 확인 | `/context` |
| 관련 없는 질문 | `/btw 질문` (기록에 안 남음) |

### 자동 압축

컨텍스트가 85% 차면 자동으로 압축됩니다 (`autoCompactAt: 0.85`).

### 핵심 원칙

> **작업이 바뀌면 `/clear` 하세요.** 이것만 지켜도 80%의 컨텍스트 문제를 예방합니다.

---

## 13. Git 연동

### 기본 Git 작업

```
> 변경사항 커밋해줘
> "로그인 버그 수정" 메시지로 커밋해줘
> PR 만들어줘
> feature-auth 브랜치 만들어줘
> main 브랜치 머지해줘
```

### Git Worktree (병렬 작업)

```bash
claude --worktree feature-auth     # 독립된 작업 공간 생성
claude --worktree bugfix-123       # 또 다른 독립 공간
```

- 각 worktree는 별도의 파일과 브랜치를 가짐
- 여러 기능을 동시에 개발할 때 유용
- 변경 없이 종료하면 자동 정리

### 세션과 PR 연결

```bash
claude --from-pr 123    # PR #123에 연결된 세션 이어하기
```

### CLI에서 비대화형 실행

```bash
claude -p "README.md 오타 수정해줘"    # 한 번 실행하고 종료
```

CI/CD나 스크립트에서 활용 가능.

---

## 14. IDE 연동

### VS Code

1. Extensions (`Ctrl+Shift+X`) → "Claude Code" 검색 → Install
2. 에디터 우상단 Spark 아이콘 클릭 또는 상태바 "Claude Code" 클릭

**주요 기능:**
- 인라인 diff 뷰어
- `Option/Alt + K`로 파일+줄 번호 @멘션 삽입
- `Cmd/Ctrl + Esc`로 에디터 ↔ Claude 전환
- 대화 히스토리 사이드바

### JetBrains (IntelliJ, WebStorm 등)

1. Settings → Plugins → Marketplace → "Claude Code" → Install → 재시작
2. `Ctrl + Esc`로 Claude 열기

**팁:** Settings → Tools → Terminal → "Move focus to Editor with Escape" 체크 해제 (ESC 충돌 방지)

---

## 15. 실전 팁 & 자주 하는 실수

### 효과적으로 사용하는 법

**1. 구체적으로 요청하기**

```
# 나쁨
> 로그인 버그 고쳐줘

# 좋음
> 세션 타임아웃 후 로그인 실패하는 버그가 있어.
> src/auth/token-refresh.ts 확인해줘.
> 실패 케이스 테스트 먼저 작성하고 수정해줘.
```

**2. 검증 기준 제시하기**

```
> validateEmail 함수 작성해줘.
> user@example.com → true, invalid → false, user@.com → false
> 작성 후 테스트 실행해줘.
```

**3. 계획 먼저, 실행은 나중에**

```
> [Shift+Tab으로 Plan 모드 전환]
> src/auth 읽고 OAuth 추가 계획 세워줘
> [계획 확인 후 일반 모드로 전환]
> 이 계획대로 구현해줘
```

**4. 작업 전환 시 `/clear`**

```
> [인증 기능 완료]
/clear
> [이제 대시보드 작업 시작]
```

### 자주 하는 실수

| 실수 | 해결 |
|------|------|
| 한 세션에서 여러 주제 섞기 | `/clear`로 분리 |
| 수정 요청 2번 이상 반복 | `/clear` 후 더 구체적으로 재요청 |
| CLAUDE.md가 너무 길음 | 200줄 이하로 유지, rules/ 분리 |
| 테스트 없이 구현만 요청 | 항상 검증 기준 함께 제시 |
| 범위 없는 조사 요청 | "이 폴더만" 등 범위 지정 |

### 자주 쓰는 워크플로우 요약

```
/init                    # 프로젝트 시작 시 CLAUDE.md 생성
/clear                   # 새 작업 전 초기화
/compact                 # 컨텍스트 부족 시 압축
/save                    # 검증 + 커밋 + 푸시 (커스텀 스킬)
/cost                    # 비용 확인
Shift+Tab                # 권한 모드 전환
Esc                      # 작업 중단
Esc Esc                  # 되돌리기 메뉴
```

---

## 빠른 시작 체크리스트

- [ ] `claude` 설치 및 로그인
- [ ] 프로젝트 폴더에서 `claude` 실행
- [ ] `/init`으로 CLAUDE.md 생성
- [ ] `/permissions`에서 자주 쓰는 명령어 허용
- [ ] 자주 하는 작업은 커스텀 스킬로 만들기
- [ ] 작업 전환 시 `/clear` 습관 들이기
