---
name: save
description: 프로젝트 검증 후 git add, commit, push를 자동으로 수행한다. 사용자가 /save 또는 저장/커밋/푸시를 요청할 때 사용.
argument-hint: "[커밋 메시지 (선택)]"
allowed-tools: Bash, Read, Glob, Grep
---

# Save — Validate, Commit, Push

아래 단계를 순서대로 수행하라. 각 단계에서 오류가 발생하면 즉시 멈추고 사용자에게 보고하라.

## 1단계: 변경 사항 확인

```bash
git status
git diff --stat
```

변경 사항이 없으면 "변경 사항 없음"을 알리고 종료하라.

## 2단계: Validate

아래 검증을 **병렬로** 수행하라. 해당 파일이 존재하지 않으면 건너뛴다.

### 2-1. 보안 검사
- `.env`, `credentials.json`, `*.pem`, `*.key` 등 민감한 파일이 스테이징 대상에 포함되어 있는지 확인
- 포함되어 있으면 **경고**하고 해당 파일을 제외한 뒤 계속 진행

### 2-2. Docker Compose 검증
```bash
docker compose config --quiet 2>&1 || docker-compose config --quiet 2>&1
```

### 2-3. Python 문법 검사
변경된 `.py` 파일에 대해:
```bash
python -c "import py_compile; py_compile.compile('파일경로', doraise=True)"
```

### 2-4. TypeScript 검사
`frontend/tsconfig.json`이 존재하면:
```bash
cd frontend && npx tsc --noEmit 2>&1
```

### 2-5. Frontend 린트
`frontend/package.json`에 lint 스크립트가 있으면:
```bash
cd frontend && npm run lint 2>&1
```

**검증 결과 요약을 표로 출력하라:**
| 항목 | 결과 |
|------|------|
| 보안 검사 | PASS / WARN |
| Docker Compose | PASS / SKIP / FAIL |
| Python 문법 | PASS / SKIP / FAIL |
| TypeScript | PASS / SKIP / FAIL |
| Lint | PASS / SKIP / FAIL |

FAIL이 있으면 사용자에게 수정 여부를 물어보라. WARN/PASS/SKIP만 있으면 다음 단계로 진행.

## 3단계: Git Add

- 민감한 파일(`.env`, `*.key`, `*.pem`, `credentials*`)은 제외
- 나머지 변경/추가 파일을 `git add`
- `git diff --cached --stat`으로 스테이징된 내용 확인

## 4단계: Git Commit

- `$ARGUMENTS`가 있으면 그것을 커밋 메시지로 사용
- 없으면 변경 내용을 분석하여 한국어로 간결한 커밋 메시지를 자동 생성
- 커밋 메시지 끝에 항상 다음을 추가:

```
Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

- HEREDOC 형식으로 커밋:
```bash
git commit -m "$(cat <<'EOF'
커밋 메시지

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

## 5단계: Git Push

```bash
git push
```

push 실패 시 원인을 분석하여 보고하라 (인증 문제, remote 불일치 등).

## 6단계: 결과 보고

최종 결과를 간결하게 보고:
- 검증 결과 요약
- 커밋 해시 & 메시지
- push 성공 여부
