# 알고타 (Algo-Way) 백엔드 아키텍처

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택 선정 근거](#2-기술-스택-선정-근거)
3. [전체 폴더 구조](#3-전체-폴더-구조)
4. [Docker 구성 전략](#4-docker-구성-전략)
5. [데이터베이스 설계](#5-데이터베이스-설계)
6. [인증 및 보안](#6-인증-및-보안)
7. [실시간 통신 구조](#7-실시간-통신-구조)
8. [외부 API 연동](#8-외부-api-연동)
9. [환경 변수 관리](#9-환경-변수-관리)
10. [개발 vs 운영 환경 분리](#10-개발-vs-운영-환경-분리)
11. [Git 브랜치 전략](#11-git-브랜치-전략)
12. [배포 전략](#12-배포-전략)

---

## 1. 프로젝트 개요

알고타(Algo-Way)는 대학생과 직장인을 위한 실시간 카풀 매칭 플랫폼이다.
이 레포지토리는 백엔드 API 서버를 담당하며, 프론트엔드는 별도 레포지토리로 관리한다.

### 핵심 기능
- 사용자 인증 (이메일 인증 기반)
- 실시간 카풀 팟 생성 및 매칭
- 지리 기반 검색 (PostGIS)
- 실시간 채팅 (WebSocket / Supabase Realtime)
- 매너 평가 시스템
- 알림 시스템

### 아키텍처 특징
- **모노리스 + 마이크로서비스 하이브리드**: 초기에는 모노리스로 빠른 개발, 향후 채팅 서버 분리 가능
- **Supabase 기반 BaaS**: PostgreSQL + Realtime + Auth + Storage를 통합 사용
- **Docker Compose**: 로컬 개발 환경 표준화
- **클라우드 네이티브**: Railway, Render 등 클라우드 플랫폼 배포 용이

---

## 2. 기술 스택 선정 근거

### 2-1. Node.js + Express.js vs FastAPI vs NestJS

| 항목 | Node.js + Express | FastAPI | NestJS |
|---|---|---|---|
| 개발 속도 | ★★★ 간결한 코드 | ★★☆ 타입 정의 | ★★★ 보일러플레이트 |
| WebSocket 통합 | ★★★ Socket.io 네이티브 | ★☆☆ ASGI 필요 | ★★★ ws 네이티브 |
| Supabase Realtime | ★★★ JS SDK 완벽 지원 | ★☆☆ Python SDK 제한적 | ★★★ JS SDK |
| 실시간 처리 | ★★★ Event-driven | ★★☆ 비동기 지원 | ★★★ RxJS |
| 생태계 | ★★★ npm 거대 | ★★☆ PyPI | ★★★ npm |
| 타입 안정성 | ★★☆ TypeScript 선택 | ★★★ 네이티브 | ★★★ TypeScript |

**결정: Node.js + Express.js**

선택 이유:
- Supabase JavaScript SDK가 가장 성숙하고 Realtime 기능 통합이 완벽
- Socket.io는 채팅 서버의 표준이며 WebSocket fallback 지원
- npm 생태계에서 지도 API, 이메일, 결제 등 다양한 라이브러리 풍부
- 카풀 매칭은 CPU 집약적이지 않아 Node.js 성능으로 충분
- 프론트엔드가 Next.js(JavaScript)면 같은 언어로 개발 효율 증가

재검토 조건:
- 머신러닝 기반 경로 최적화가 필요해지는 시점에 Python 마이크로서비스 추가 고려
- 수만 명 동시 접속 시 NestJS로 마이그레이션 검토 (확장성)

### 2-2. Supabase vs Firebase vs 자체 PostgreSQL

| 항목 | Supabase | Firebase | 자체 구축 |
|---|---|---|---|
| 데이터베이스 | PostgreSQL (SQL) | Firestore (NoSQL) | PostgreSQL |
| 지리 쿼리 | ★★★ PostGIS | ★★☆ GeoPoint | ★★★ PostGIS |
| 실시간 | ★★★ Realtime | ★★★ Realtime | ★☆☆ Socket.io |
| 인증 | ★★★ Auth + JWT | ★★★ Auth | ★★☆ 직접 구현 |
| 스토리지 | ★★★ Storage | ★★★ Storage | ★☆☆ S3 연동 |
| 비용 | $25/월~ | $25/월~ | $10/월~ + 개발 시간 |
| 복잡한 쿼리 | ★★★ SQL | ★☆☆ 제한적 | ★★★ SQL |

**결정: Supabase**

선택 이유:
- PostGIS가 기본 제공되어 지리 기반 검색이 간단
- SQL 기반이라 복잡한 조인, 집계 쿼리 가능
- Realtime이 Row Level Security와 통합되어 채팅방 권한 관리 용이
- Supabase Auth로 이메일 인증, JWT 자동 처리
- Storage로 프로필 사진, 인증 서류 업로드 처리 가능

### 2-3. Redis 역할

| 용도 | 설명 |
|---|---|
| 세션 캐시 | JWT Refresh Token 저장 |
| 쿼리 캐시 | 자주 조회되는 팟 목록 (5분 TTL) |
| 실시간 상태 | 채팅방 참여자 온라인 상태 |
| Rate Limiting | API 요청 제한 (DDoS 방어) |
| 큐잉 | 이메일 전송 큐 (BullMQ) |

---

## 3. 전체 폴더 구조

```
algoway/
│
├── docs/                           # 📄 프로젝트 문서
│   ├── ai-guidelines.md            # AI 협업 가이드라인
│   ├── api.md                      # REST API 명세
│   ├── chat.log                    # 주요 기술 의사결정 로그
│   ├── database-naming.md          # DB 네이밍 규칙 (snake_case ↔ camelCase)
│   ├── infra.md                    # 인프라 & 개발 운영 설계 (본 문서)
│   ├── page.md                     # 페이지 기획서 (프론트엔드용)
│   └── tests/                      # 수동 cURL 테스트 가이드
│       ├── 01-auth.md
│       ├── 02-users.md
│       └── 03-pods.md
│
├── src/
│   ├── config/                     # ⚙️ 설정 파일
│   │   ├── constants.ts            # 상수 정의 (Enum, 에러 코드 등)
│   │   ├── database.ts             # PostgreSQL Pool 연결 (camelCase 변환 포함)
│   │   └── redis.ts                # Redis 클라이언트
│   │
│   ├── controllers/                # 🎮 컨트롤러 (라우트 핸들러)
│   │   ├── authController.ts
│   │   ├── podController.ts
│   │   └── userController.ts
│   │
│   ├── middlewares/                # 🛡️ 미들웨어
│   │   ├── auth.ts                 # JWT 인증 (Bearer Token)
│   │   ├── errorHandler.ts         # 전역 에러 핸들러 + asyncHandler
│   │   └── validator.ts            # 입력 검증 (express-validator)
│   │
│   ├── repositories/               # 💾 DB CRUD 추상화 (미구현, 예정)
│   │
│   ├── routes/                     # 🛣️ 라우트 (도메인별 파일)
│   │   ├── auth.ts
│   │   ├── pods.ts
│   │   └── users.ts
│   │
│   ├── services/                   # 🧩 비즈니스 로직
│   │   ├── authService.ts          # 로그인, JWT 발급, 인증 코드
│   │   ├── emailService.ts         # 이메일 전송 (Nodemailer + Mailpit)
│   │   ├── podService.ts           # 팟 생성, 검색, 참여/나가기
│   │   └── userService.ts          # 프로필 조회/수정, 즐겨찾기, 탑승내역
│   │
│   ├── types/                      # 📐 TypeScript 타입 정의
│   │   ├── express.d.ts            # Express Request 확장 (req.user)
│   │   └── index.ts                # 공통 타입 (Auth, User, Pod 등)
│   │
│   ├── utils/                      # 🔧 유틸리티
│   │   ├── caseConverter.ts        # snake_case ↔ camelCase 변환
│   │   ├── jwt.ts                  # JWT 토큰 생성/검증
│   │   ├── logger.ts               # Winston 로거
│   │   └── response.ts             # API 응답 포맷 (successResponse 등)
│   │
│   ├── websocket/                  # 🔌 실시간 통신 (미구현, 예정)
│   │
│   └── app.ts                      # 📦 Express 앱 설정 (미들웨어, 라우트 등록)
│
├── scripts/                        # 📜 스크립트
│   └── init-db.sql                 # PostgreSQL 스키마 초기화
│
├── infra/                          # 🏗️ 인프라 설정
│   └── redis/
│       └── redis.conf              # Redis 설정
│
├── docker-compose.yml              # 🐳 Docker Compose (운영 공통)
├── docker-compose.dev.yml          # 개발 환경 오버라이드 (ts-node-dev)
│
├── Dockerfile                      # 운영용 이미지 (멀티스테이지, tsc 빌드)
├── Dockerfile.dev                  # 개발용 이미지 (ts-node-dev)
│
├── server.ts                       # 🚀 서버 진입점
├── tsconfig.json                   # TypeScript 컴파일러 설정
├── package.json
├── package-lock.json
├── .env.example                    # 환경 변수 예시
├── .env                            # 실제 환경 변수 (gitignore)
├── .gitignore
├── LICENSE
└── README.md
```

---

## 4. Docker 구성 전략

### 4-1. 로컬 개발 환경 (docker-compose.dev.yml)

로컬에서는 Docker Compose로 Redis + Backend만 실행한다.
**PostgreSQL은 Supabase 클라우드를 사용**하므로 Docker에 포함하지 않는다.

**docker-compose.yml (기본)**
```yaml
version: '3.9'

services:
  # Redis
  redis:
    image: redis:7-alpine
    container_name: algoway-redis
    ports:
      - "${REDIS_PORT:-6379}:6379"
    volumes:
      - redis_data:/data
      - ./infra/redis/redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    networks:
      - algoway-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # 백엔드 (개발 모드는 dev.yml에서 오버라이드)
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: algoway-backend
    env_file:
      - .env
    ports:
      - "${PORT:-3000}:3000"
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - algoway-network
    restart: unless-stopped

networks:
  algoway-network:
    driver: bridge

volumes:
  redis_data:
```

**docker-compose.dev.yml (개발 오버라이드)**
```yaml
version: '3.9'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - ./src:/app/src                    # Hot-reload를 위한 소스 마운트
      - ./server.js:/app/server.js
      - ./package.json:/app/package.json
      - /app/node_modules                 # node_modules는 컨테이너 내부 것 사용
    environment:
      NODE_ENV: development
    command: npm run dev                  # nodemon 실행
```

**실행 방법**
```bash
# 개발 환경 실행 (hot-reload 지원)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 백엔드 로그 확인
docker logs -f algoway-backend

# 전체 종료
docker compose down

# 볼륨 포함 전체 삭제
docker compose down -v
```

### 4-2. Dockerfile (운영용)

**Dockerfile (멀티스테이지 빌드)**
```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# 프로덕션 의존성 복사
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY server.js ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
```

**Dockerfile.dev (개발용)**
```dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

ENV NODE_ENV=development
EXPOSE 3000

CMD ["npm", "run", "dev"]
```

---

## 5. 데이터베이스 설계

### 5-1. 스키마 개요 (12개 테이블)

| 테이블 | 설명 | 주요 컬럼 |
|---|---|---|
| users | 사용자 계정 | email, password_hash, nickname, user_type, is_verified, manner_score |
| verification_codes | 이메일 인증 코드 | email, code, verification_type, expires_at |
| refresh_tokens | JWT 리프레시 토큰 | user_id, token, expires_at |
| pods | 카풀 팟 | creator_id, departure_location (GEOGRAPHY), arrival_location, departure_time, status |
| pod_participants | 팟 참여자 중간 테이블 | pod_id, user_id |
| chat_rooms | 채팅방 (팟당 1개) | pod_id |
| messages | 채팅 메시지 | chat_room_id, sender_id, message_type, content |
| ready_status | 참여자 준비 상태 | chat_room_id, user_id, is_ready |
| ratings | 매너 평가 | pod_id, reviewer_id, reviewee_id, rating, comment |
| favorite_routes | 즐겨찾는 경로 | user_id, departure_place, arrival_place |
| notifications | 알림 | user_id, notification_type, title, content, is_read |
| notification_settings | 알림 설정 | user_id, notification_type, is_enabled |

### 5-2. PostGIS 활용

**지리 데이터 타입**
- `GEOGRAPHY(POINT, 4326)`: WGS84 좌표계 (위경도)
- 거리 계산: `ST_Distance(location1, location2)` (단위: 미터)
- 반경 검색: `ST_DWithin(location, ST_MakePoint(lng, lat)::geography, 5000)` (5km 이내)

**예시 쿼리 (팟 검색)**
```sql
SELECT
  pod_id,
  departure_place_name,
  arrival_place_name,
  ST_Distance(
    departure_location,
    ST_MakePoint($1, $2)::geography
  ) AS distance_meters
FROM pods
WHERE
  status = 'recruiting'
  AND ST_DWithin(
    departure_location,
    ST_MakePoint($1, $2)::geography,
    5000  -- 5km
  )
ORDER BY distance_meters ASC
LIMIT 20;
```

### 5-3. 인덱스 전략

**지리 인덱스**
```sql
CREATE INDEX idx_pods_departure_location ON pods USING GIST (departure_location);
CREATE INDEX idx_pods_arrival_location ON pods USING GIST (arrival_location);
```

**복합 인덱스**
```sql
CREATE INDEX idx_pods_status_departure_time ON pods (status, departure_time);
CREATE INDEX idx_messages_chat_room_created ON messages (chat_room_id, created_at DESC);
```

### 5-4. 트리거

**팟 참여자 수 자동 업데이트**
```sql
CREATE OR REPLACE FUNCTION update_pod_participants_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE pods SET current_participants = current_participants + 1
    WHERE pod_id = NEW.pod_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE pods SET current_participants = current_participants - 1
    WHERE pod_id = OLD.pod_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pod_participants_count
AFTER INSERT OR DELETE ON pod_participants
FOR EACH ROW EXECUTE FUNCTION update_pod_participants_count();
```

**매너 점수 자동 계산**
```sql
CREATE OR REPLACE FUNCTION update_manner_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET manner_score = (
    SELECT COALESCE(AVG(rating), 5.0)
    FROM ratings
    WHERE reviewee_id = NEW.reviewee_id
  )
  WHERE user_id = NEW.reviewee_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_manner_score
AFTER INSERT ON ratings
FOR EACH ROW EXECUTE FUNCTION update_manner_score();
```

---

## 6. 인증 및 보안

### 6-1. JWT 기반 인증

**토큰 구조**
- **Access Token**: 1시간 유효, 메모리에만 저장
- **Refresh Token**: 7일 유효, DB에 저장

**발급 플로우**
```
1. 로그인 (POST /v1/auth/login)
   ├─ 비밀번호 검증 (bcrypt)
   ├─ Access Token 생성 (JWT)
   ├─ Refresh Token 생성 → DB 저장
   └─ 응답: { accessToken, refreshToken }

2. API 요청 (Authorization: Bearer {accessToken})
   ├─ auth.js 미들웨어에서 검증
   └─ req.user에 사용자 정보 주입

3. 토큰 갱신 (POST /v1/auth/refresh)
   ├─ Refresh Token 검증 (DB 조회)
   ├─ 새로운 Access Token + Refresh Token 발급
   └─ 기존 Refresh Token 삭제 (보안)
```

**JWT Payload**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "isVerified": true,
  "iat": 1709136000,
  "exp": 1709139600
}
```

### 6-2. 비밀번호 해싱

**bcrypt (Salt Rounds: 10)**
```javascript
const bcrypt = require('bcryptjs');
const passwordHash = await bcrypt.hash(password, 10);
const isMatch = await bcrypt.compare(password, passwordHash);
```

### 6-3. 이메일 인증

**플로우**
```
1. 인증 코드 발송 (POST /v1/auth/verify/send)
   ├─ 6자리 랜덤 숫자 생성
   ├─ expires_at = 현재 시간 + 10분
   ├─ DB 저장 (verification_codes)
   └─ Nodemailer로 이메일 전송

2. 인증 코드 확인 (POST /v1/auth/verify/confirm)
   ├─ DB에서 코드 조회
   ├─ 만료 시간 체크
   ├─ users.is_verified = true 업데이트
   └─ verification_badge 부여 (student/employee/others)
```

**이메일 도메인 검증**
- 학생 인증: `.ac.kr` 도메인
- 직장인 인증: 회사 이메일 (도메인 화이트리스트)
- 일반 인증: 모든 도메인

### 6-4. Rate Limiting

**Redis 기반 Token Bucket**
```javascript
// 10분에 10번 제한
const { RateLimiterRedis } = require('rate-limiter-flexible');
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  points: 10,
  duration: 600, // 초
});
```

**API 엔드포인트 제한**
- 일반 API: 10분에 100회
- 로그인: 10분에 5회 (브루트 포스 방어)
- 인증 코드 발송: 1시간에 3회

### 6-5. CORS 설정

**개발 환경**
```javascript
app.use(cors({
  origin: '*',
  credentials: true,
}));
```

**운영 환경**
```javascript
app.use(cors({
  origin: ['https://algoway.com', 'https://www.algoway.com'],
  credentials: true,
}));
```

---

## 7. 실시간 통신 구조

### 7-1. Socket.io vs Supabase Realtime

| 기능 | Socket.io | Supabase Realtime |
|---|---|---|
| 채팅 메시지 | ★★★ 양방향 통신 | ★★★ Broadcast |
| 온라인 상태 | ★★★ Presence | ★★☆ Row 업데이트 |
| 팟 참여자 변경 | ★★★ Room 기반 | ★★★ Table 구독 |
| 위치 공유 | ★★★ 실시간 emit | ★★☆ Insert 이벤트 |
| 커스텀 이벤트 | ★★★ 완전 자유 | ★☆☆ 제한적 |

**결정: Socket.io 사용**

이유:
- 채팅 메시지에 양방향 통신(타이핑 상태, 읽음 표시 등) 필요
- Supabase Realtime은 DB Insert/Update 이벤트만 전달 (커스텀 이벤트 불가)
- Socket.io는 프론트엔드와의 통합이 간단하고 Room 관리 용이

### 7-2. Socket.io 이벤트 설계

**인증**
```javascript
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  socket.userId = decoded.userId;
  next();
});
```

**채팅 이벤트**
```javascript
// 클라이언트 → 서버
socket.emit('chat:join', { chatRoomId: 'uuid' });
socket.emit('chat:message', { chatRoomId: 'uuid', content: 'hello' });
socket.emit('chat:typing', { chatRoomId: 'uuid' });

// 서버 → 클라이언트
socket.on('chat:new_message', (message) => { /* ... */ });
socket.on('chat:user_typing', ({ userId }) => { /* ... */ });
socket.on('chat:user_joined', ({ userId }) => { /* ... */ });
```

**팟 이벤트**
```javascript
// 팟 참여자 변경 알림
io.to(`pod:${podId}`).emit('pod:participant_joined', {
  podId,
  participant: { userId, nickname, profileImage }
});

// 팟 상태 변경
io.to(`pod:${podId}`).emit('pod:status_changed', {
  podId,
  status: 'in_progress'
});
```

### 7-3. Redis로 Socket.io 확장

**멀티 서버 환경에서 Socket.io Adapter 사용**
```javascript
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

---

## 8. 외부 API 연동

### 8-1. Kakao Map API

**사용 기능**
- 주소 검색 (Geocoding)
- 좌표 → 주소 변환 (Reverse Geocoding)
- 경로 계산 (Directions API)

**예시: 출발지/도착지 거리 계산**
```javascript
const axios = require('axios');

async function getDirections(origin, destination) {
  const response = await axios.get(
    'https://dapi.kakao.com/v2/local/geo/coord2address.json',
    {
      headers: {
        Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`
      },
      params: {
        origin: `${origin.lng},${origin.lat}`,
        destination: `${destination.lng},${destination.lat}`
      }
    }
  );
  return response.data;
}
```

### 8-2. 이메일 전송 (Nodemailer)

**SMTP 설정 (Gmail)**
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // Gmail 앱 비밀번호
  }
});

// 이메일 전송
await transporter.sendMail({
  from: '"알고타" <no-reply@algoway.com>',
  to: email,
  subject: '이메일 인증 코드',
  html: `<p>인증 코드: <strong>${code}</strong></p>`
});
```

**개발 환경: Ethereal Email**
```javascript
// 테스트 계정 자동 생성
const testAccount = await nodemailer.createTestAccount();
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: testAccount.user,
    pass: testAccount.pass,
  }
});

// 미리보기 URL 콘솔 출력
const info = await transporter.sendMail({ /* ... */ });
console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
```

---

## 9. 환경 변수 관리

### 9-1. .env 파일 구조

```env
# 서버 설정
NODE_ENV=development
PORT=3000

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
# Transaction Pooler (Port 6543) 권장
DATABASE_URL=postgresql://postgres:password@aws-0-region.pooler.supabase.com:6543/postgres

# JWT
JWT_ACCESS_SECRET=super-secret-access-key-change-in-production
JWT_REFRESH_SECRET=super-secret-refresh-key-change-in-production

# Redis
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=*

# Kakao Map API
KAKAO_REST_API_KEY=your-kakao-rest-api-key

# SMTP (운영)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# 로그 레벨
LOG_LEVEL=debug
```

### 9-2. 환경별 설정

| 환경 | NODE_ENV | DATABASE | REDIS | SMTP |
|---|---|---|---|---|
| 로컬 개발 | development | Docker PostgreSQL | Docker Redis | Ethereal Email |
| 클라우드 개발 | development | Supabase | Railway Redis | Ethereal Email |
| 운영 | production | Supabase | Upstash/Railway | Gmail SMTP |

---

## 10. 개발 vs 운영 환경 분리

### 10-1. package.json 스크립트

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint src/",
    "format": "prettier --write src/",
    "db:init": "psql $DATABASE_URL < scripts/init-db.sql",
    "db:seed": "node scripts/seed-db.js"
  }
}
```

### 10-2. 로거 설정 (Winston)

**개발 환경**
- Console 출력 (색상 포맷)
- 로그 레벨: debug

**운영 환경**
- JSON 형식 파일 저장 (logs/error.log, logs/combined.log)
- 로그 레벨: info
- 로그 로테이션 (1일 주기, 최대 14일 보관)

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

---

## 11. Git 브랜치 전략

### 11-1. GitHub Flow 채택

```
main (운영 배포 브랜치)
  ├─ dev (개발 통합 브랜치)
  │   ├─ feature/auth
  │   ├─ feature/pods
  │   ├─ feature/chat
  │   └─ hotfix/login-bug
```

**브랜치 규칙**
- `main`: 운영 배포 전용 (태그로 버전 관리)
- `dev`: 개발 통합 브랜치 (모든 feature 머지 대상)
- `feature/*`: 기능 개발 (Jira 티켓 번호 포함 권장, 예: `feature/ALG-123-auth`)
- `hotfix/*`: 긴급 버그 수정 (main에서 분기 → main + dev 머지)

**커밋 메시지 규칙 (Conventional Commits)**
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드, 설정 파일 수정
```

예시:
```
feat(auth): implement email verification
fix(pods): resolve PostGIS query timeout
docs: update API documentation for chat endpoints
```

---

## 12. 배포 전략

### 12-1. 클라우드 플랫폼 선택

| 플랫폼 | 비용 | 성능 | 배포 난이도 | WebSocket |
|---|---|---|---|---|
| Railway | $5/월~ | ★★★ | ★★★ 간단 | ★★★ 지원 |
| Render | $7/월~ | ★★☆ | ★★★ 간단 | ★★★ 지원 |
| Vercel | 프론트엔드 전용 | - | ★★★ | ★☆☆ Serverless 제한 |
| AWS EC2 | $10/월~ | ★★★ | ★☆☆ 복잡 | ★★★ 지원 |

**추천: Railway (초기) → AWS ECS (확장 시)**

Railway 장점:
- GitHub 연동 자동 배포
- 환경 변수 관리 UI
- PostgreSQL, Redis 내장 제공
- WebSocket 기본 지원
- 무료 크레딧 $5/월

### 12-2. 배포 플로우

```
1. 로컬 개발
   ├─ feature 브랜치 생성
   ├─ 커밋 & 푸시
   └─ PR 생성 (dev 대상)

2. CI/CD (GitHub Actions)
   ├─ 린트 검사 (ESLint)
   ├─ 테스트 실행 (Jest)
   └─ 통과 시 dev 브랜치 머지

3. 스테이징 배포
   ├─ dev → staging 브랜치 머지
   └─ Railway 자동 배포 (staging 환경)

4. 운영 배포
   ├─ dev → main 브랜치 PR
   ├─ 코드 리뷰 승인
   ├─ 머지 후 태그 생성 (v1.0.0)
   └─ Railway 자동 배포 (production 환경)
```

### 12-3. 무중단 배포 (Blue-Green)

**Railway 설정**
- Health Check 엔드포인트: `GET /health`
- 새 버전 배포 시 기존 인스턴스 유지
- Health Check 성공 후 트래픽 전환
- 구 버전 인스턴스 종료

**Health Check 예시**
```javascript
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
```

---

## 부록: 트러블슈팅

### A-1. Supabase IPv4 연결 오류

**문제**
```
getaddrinfo ENOTFOUND db.xxxxx.supabase.co
```

**해결**
- Direct Connection (Port 5432) 대신 Transaction Pooler (Port 6543) 사용
- Supabase Dashboard → Connect → Transaction Pooler 연결 문자열 복사

### A-2. bcrypt 설치 오류 (M1 Mac)

**문제**
```
gyp ERR! build error
```

**해결**
```bash
# node-gyp 재설치
npm install -g node-gyp

# bcryptjs 대신 bcrypt 사용 (네이티브 바인딩)
npm install bcrypt
```

### A-3. Socket.io CORS 오류

**문제**
```
Access to XMLHttpRequest has been blocked by CORS policy
```

**해결**
```javascript
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }
});
```

---

## 문서 버전

- **작성일**: 2026-02-28
- **작성자**: GitHub Copilot
- **버전**: 1.0.0
