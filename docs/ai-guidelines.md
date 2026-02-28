# AI 협업 가이드라인

GitHub Copilot과의 협업 시 적용되는 규칙과 워크플로우를 정의합니다.
프로젝트 진행 중 결정된 사항들을 이 문서에 누적 관리합니다.

---

## 버전 관리 규칙

`package.json`의 `version` 필드를 [Semantic Versioning](https://semver.org) 기준으로 관리한다.

| 상황 | 버전 변경 | 예시 |
|---|---|---|
| feature 브랜치 내 커밋 (기능 변경, 버그 수정, 문서 수정 등) | **patch** +1 | 1.2.0 → 1.2.1 |
| feature 완료 후 **main 브랜치에 release** | **minor** +1 | 1.2.x → 1.3.0 |
| 메이저 버전 변경 | **사용자 판단** — AI가 임의로 올리지 않는다 | x.0.0 |

### 규칙

- 버전 변경은 **chat.log 업데이트, 코드 변경과 같은 커밋**에 포함한다
- release 커밋(main 반영) 시 minor를 올리고 patch는 0으로 초기화한다
- 현재 버전 기준: `1.2.0` (auth=1.1, users=1.2)

---

## 커밋 & 푸시 규칙

- **커밋 전에 반드시 chat.log를 먼저 업데이트**한다
  - 코드 변경사항과 의사결정 내용을 chat.log에 기록한 뒤 같은 커밋에 포함
  - chat.log 업데이트 없이 코드만 먼저 커밋하지 않는다
- 커밋 후 push까지 자동으로 수행 (별도 지시 불필요)
- 사용 브랜치: 현재 작업 브랜치 (보통 `feature/*` 또는 `dev`)
- 원격 브랜치가 없으면 `--set-upstream`으로 자동 생성

---

## 커밋 메시지 규칙

형식: [Conventional Commits](https://www.conventionalcommits.org)

```
<type>(<scope>): <short summary>

- <bullet points for key changes>
```

### 타입

| 타입 | 설명 |
|---|---|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 변경 |
| `chore` | 빌드, 설정, 기타 유지보수 |
| `refactor` | 리팩터링 (기능 변경 없음) |
| `test` | 테스트 추가/수정 |

### 규칙

- 반드시 **영어**로 작성
- summary는 한 줄, 명령형 동사로 시작 (Add, Fix, Update ...)
- 불릿 항목은 변경 이유나 핵심 내용만 기재 (**파일 목록 나열 금지**)
- 불필요한 설명, 특수기호 사용 금지

### 예시

올바름:
```
feat(auth): implement authentication API with case conversion

- Implement 6 endpoints: signup, login, verify/send, verify/confirm, refresh, logout
- Add automatic snake_case to camelCase conversion layer
- Add JWT middleware, input validation, and email service
```

잘못됨:
```
feat(auth): 인증 API 구현 완료         ← 한글 사용
feat: add src/routes/auth.js, ...     ← 파일 목록 나열
feat(auth): implement↔auth            ← 특수기호 사용
```

---

## Git 브랜치 전략

### 브랜치 구조

| 브랜치 | 역할 |
|---|---|
| `main` | 운영 브랜치 (항상 배포 가능한 상태 유지) |
| `dev` | 개발 통합 브랜치 (기능 브랜치들이 여기에 병합) |
| `feature/*` | 기능 개발 브랜치 (dev에서 분기) |

### 작업 순서

1. `dev`에서 `feature/xxx` 브랜치 생성
2. 기능 개발 및 커밋 (chat.log 포함)
3. `feature/xxx` → `dev` merge (`--no-ff`)
4. `dev` → `origin/dev` push
5. 다음 기능으로 넘어갈 때 feature 브랜치 삭제
6. feature 브랜치 삭제 시점에 `dev` → `main` merge 및 push

### 기능 브랜치 운영 원칙

- 해당 기능이 완전히 끝날 때까지 브랜치 유지 (작업 도중 삭제 금지)
- 브랜치 삭제와 main 반영은 항상 함께 수행

### 병합 명령어

```bash
git checkout main
git merge dev --no-ff -m "chore(release): merge <feature> to main"
git push origin main
git branch -d feature/xxx
git push origin --delete feature/xxx
git checkout dev
```

---

## 문서 작성 규칙

### chat.log

- 모든 주요 작업 완료 후 **커밋 전에** 업데이트
- 형식: 날짜 + 제목 + 배경 + 작업 내용 + 설계 결정 + 다음 단계
- indent 2칸 단위로 작성

### testing/

- 각 API 도메인별 테스팅 가이드 작성 필수
  - `docs/tests/01-auth.md`, `02-users.md`, `03-pods.md` ... (순번-도메인 형식)
- lookflex/docs/testing.md 형식 참고

### 기타

- 요청하지 않은 요약/정리 마크다운 파일 생성 금지
  - 변경사항은 기존 문서(chat.log, api.md 등)에만 반영
- indent 기준: 2칸 (스페이스)

---

## 기타 규칙

- **응답 언어**: 한국어 (커밋 메시지만 영어)
- **구현 우선**: 제안만 하지 않고 실제로 파일 생성/수정까지 진행
- **병렬 편집**: 독립적인 파일 수정은 `multi_replace_string_in_file`로 동시 처리
- **파일 수정은 에디터 도구 사용**: 터미널(`echo >>`, `sed`, `cat >` 등)로 파일을 수정하지 않는다
  - VS Code 환경에서는 에디터 도구로 수정한 내용이 Undo로 되돌리기 쉬움
  - 터미널 수정은 히스토리에 남지 않아 실수 시 복구가 어려움
  - 중요하지 않은 파일은 별도 허락 없이 직접 수정한다
