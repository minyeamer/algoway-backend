# 알고타 (Algo-Way)

> 같은 길, 같이 가자

## 1. 서비스 개요

|항목|내용|
|---|---|
|서비스명|알고타 (Algo-Way)|
|슬로건|같은 길, 같이 가자|
|서비스 유형|실시간 카풀 매칭 플랫폼|
|핵심 가치|이동 비용 절감 + 안전한 카풀 매칭|
|타겟|대학생 / 직장인|

대학생과 직장인이 매일 겪는 교통 문제(비싼 택시비, 불규칙한 대중교통)를 같은 방향의 사람들을 연결함으로써 해결하는 실시간 카풀 매칭 플랫폼입니다.

## 2. 문제 정의 & 솔루션

|문제|솔루션|
|---|---|
|심야/우천 시 택시비 급등|비용 분담으로 1인당 요금 절감|
|버스 배차 간격 30분 이상|실시간 팟 모집으로 즉시 출발 가능|
|카풀 플랫폼의 신뢰 부족|대학교/직장 인증으로 신원 확보|
|기존 앱의 복잡한 UX|출발지·도착지 입력만으로 즉시 매칭|

## 3. 타겟 사용자

1. 대학생
   - 캠퍼스 ↔ 지하철역, 학교 ↔ 집 이동이 잦음
   - 교통비 절감에 민감한 고정 지출 구간 보유
   - 스마트폰 친화적 / SNS 기반 정보 신뢰

2. 직장인
   - 출퇴근 고정 루트 보유로 반복 매칭 용이
   - 비용 절감 및 시간 효율 니즈 높음
   - 회사 이메일 인증으로 신뢰도 확보 가능

## 4. 핵심 기능 상세

1. 실시간 팟 모집
   - 출발 시간, 출발지, 목적지를 입력하면 조건이 비슷한 사용자를 자동 매칭합니다. 직접 모집글을 올리거나 기존 팟에 참여하는 방식 모두 지원합니다.

2. 경로 기반 필터링
   - Kakao Map API를 활용해 내 경로 반경 내의 팟만 노출합니다. 도보 이동 거리(예: 500m 이내 픽업 포인트)를 고려한 스마트 필터링을 제공합니다.

3. 실시간 채팅
   - 매칭 완료 후 그룹 채팅방이 자동 생성됩니다. 세부 픽업 장소, 시간 조율, 비용 협의가 가능하며 WebSocket 기반 실시간 통신을 지원합니다.

4. 인증 시스템
   - 대학생: 학교 이메일(.ac.kr) 인증 또는 학생증 업로드
   - 직장인: 회사 이메일 인증 또는 재직증명서 업로드
   - 인증 뱃지로 신뢰도 시각화

## 5. 기술 스택

|영역|기술|
|---|---|
|Frontend|Next.js + TailwindCSS|
|Backend|Node.js + Express / Supabase|
|실시간 채팅|Socket.io (WebSocket)|
|지도|Kakao Map API|
|인증|이메일 인증 (OTP) + JWT|
|배포|Vercel (프론트) + Railway (백엔드)|

## 6. 수익 모델 (향후)

- 프리미엄 인증 뱃지 (빠른 인증 처리)
- 자주 이용하는 루트 즐겨찾기 팟 알림 유료 구독
- 기업 직장인 단체 플랜 (B2B)

---

## 7. 백엔드 구현 현황

> 이 레포지토리는 알고타 백엔드 API 서버입니다.
> **Node.js 20 + Express 5 + TypeScript** 기반으로 구현되어 있습니다.

### 기술 스택 (백엔드)

| 분류 | 기술 |
|---|---|
| 런타임 | Node.js 20 |
| 프레임워크 | Express 5.x + TypeScript 5.x |
| 데이터베이스 | Supabase PostgreSQL + PostGIS |
| 캐시 / 세션 | Redis |
| 실시간 통신 | Socket.io |
| 인증 | JWT (Access Token + Refresh Token) |
| 이메일 | Nodemailer + Mailpit (개발) |
| 컨테이너 | Docker + Docker Compose |

### 구현된 API (v1.7.0)

| 버전 | 도메인 | 엔드포인트 수 | 주요 기능 |
|---|---|---|---|
| v1.1.0 | Auth | 10개 | 회원가입(OTP 인증), 로그인, 토큰 갱신, 비밀번호 변경 |
| v1.2.0 | Users | 7개 | 프로필 조회/수정, 탑승 내역, 즐겨찾는 경로 |
| v1.3.0 | Pods | 8개 | 팟 생성/조회/참여, PostGIS 반경 검색 |
| v1.4.0 | Chat REST | 5개 | 채팅방 목록, 메시지 이력, 준비 상태 |
| v1.4.1 | Chat WebSocket | 7 events | 실시간 메시지, 타이핑, 준비 완료, 입퇴장 |
| v1.5.0 | Rating | 5개 | 평가 제출, 받은/보낸 평가, 팟 평가 현황 |
| v1.7.0 | Notifications | 5개 | 알림 목록, 읽음처리, 알림 설정 |

**REST API 총 40개 엔드포인트 + WebSocket 7개 이벤트**

### WebSocket 이벤트 (Socket.io)

> 연결: `ws://localhost:3000` — `Authorization: Bearer <token>` 인증 필요

| 이벤트 (클라이언트 → 서버) | 설명 |
|---|---|
| `chat:join` | 채팅방 입장 |
| `chat:leave` | 채팅방 퇴장 |
| `chat:message` | 메시지 전송 (text / location) |
| `chat:typing` | 타이핑 시작 알림 |
| `chat:stop_typing` | 타이핑 중지 알림 |
| `chat:ready` | 준비 완료 상태 변경 |

| 이벤트 (서버 → 클라이언트) | 설명 |
|---|---|
| `chat:joined` | 입장 완료 응답 |
| `chat:user_joined` | 다른 사용자 입장 알림 |
| `chat:user_left` | 다른 사용자 퇴장 알림 |
| `chat:new_message` | 새 메시지 수신 |
| `chat:user_typing` | 다른 사용자 타이핑 중 |
| `chat:user_stop_typing` | 다른 사용자 타이핑 중지 |
| `chat:ready_update` | 준비 상태 변경 브로드캐스트 |
| `chat:user_disconnected` | 사용자 연결 끊김 알림 |
| `error:chat` | 채팅 관련 오류 응답 |

### 로컬 개발 환경 실행

```bash
# 환경 변수 설정
cp .env.example .env
# .env에 Supabase DATABASE_URL, JWT_SECRET 등 입력

# 컨테이너 실행 (Redis + Backend with hot-reload)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 로그 확인
docker logs -f algoway-backend

# 서버 상태 확인
curl http://localhost:3000/health
```

### 문서

| 문서 | 경로 |
|---|---|
| REST API 명세 | [docs/api.md](docs/api.md) |
| 인프라 설계 | [docs/infra.md](docs/infra.md) |
| DB 네이밍 규칙 | [docs/database-naming.md](docs/database-naming.md) |
| 테스트 가이드 | [docs/tests/](docs/tests/) |
| 서비스 기획서 | [docs/planning.md](docs/planning.md) |
| 페이지 기획서 | [docs/page.md](docs/page.md) |
| AI 협업 가이드라인 | [docs/ai-guidelines.md](docs/ai-guidelines.md) |
