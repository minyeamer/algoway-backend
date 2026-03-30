# Algoway 실시간 채팅 (WebSocket) 테스트 가이드

Socket.io 기반 실시간 채팅 기능을 검증하는 절차를 기록합니다.

> **사전 조건**: 채팅 REST API 테스트(`docs/tests/04-chat.md`)를 완료하여  
> 팟과 채팅방이 생성되어 있어야 합니다. 두 명 이상의 사용자가 동일한 팟에 참여 중이어야 합니다.

---

## 목차

0. [사전 준비](#0-사전-준비)
1. [환경 시작 / 토큰 발급](#1-환경-시작--토큰-발급)
2. [Socket.io 연결 테스트](#2-socketio-연결-테스트)
3. [채팅방 입장 (chat:join)](#3-채팅방-입장-chatjoin)
4. [메시지 전송 (chat:message)](#4-메시지-전송-chatmessage)
5. [타이핑 상태 (chat:typing)](#5-타이핑-상태-chattyping)
6. [준비 상태 (chat:ready)](#6-준비-상태-chatready)
7. [채팅방 퇴장 (chat:leave)](#7-채팅방-퇴장-chatleave)
8. [에러 케이스 테스트](#8-에러-케이스-테스트)
9. [테스트 UI 사용법](#9-테스트-ui-사용법)

---

## 0. 사전 준비

필요한 도구:

- Docker Desktop (실행 중)
- 웹 브라우저 (테스트 UI용)
- 또는 Node.js (스크립트 테스트용)

**Socket.io 이벤트 요약:**

| 방향 | 이벤트 | 설명 |
|---|---|---|
| Client → Server | `chat:join` | 채팅방 입장 (Room 참여) |
| Client → Server | `chat:leave` | 채팅방 퇴장 (Room에서만 나감) |
| Client → Server | `chat:message` | 메시지 전송 (DB 저장 + 브로드캐스트) |
| Client → Server | `chat:typing` | 타이핑 시작 알림 |
| Client → Server | `chat:stop_typing` | 타이핑 중지 알림 |
| Client → Server | `chat:ready` | 준비 상태 변경 |
| Server → Client | `chat:joined` | 입장 완료 응답 |
| Server → Client | `chat:left` | 퇴장 완료 응답 |
| Server → Client | `chat:new_message` | 새 메시지 수신 |
| Server → Client | `chat:user_joined` | 다른 사용자 입장 알림 |
| Server → Client | `chat:user_left` | 다른 사용자 퇴장 알림 |
| Server → Client | `chat:user_typing` | 다른 사용자 타이핑 중 |
| Server → Client | `chat:user_stop_typing` | 다른 사용자 타이핑 중지 |
| Server → Client | `chat:ready_update` | 준비 상태 변경 + 전체 상태 |
| Server → Client | `chat:user_disconnected` | 사용자 연결 해제 |
| Server → Client | `error:chat` | 에러 응답 |

---

## 1. 환경 시작 / 토큰 발급

### 컨테이너 시작

```bash
cd /Users/cuz/Documents/Github/algoway
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### 토큰 발급

```bash
# 사용자 A
TOKEN_A=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@university.ac.kr","password":"TestPass1!"}' | jq -r '.data.accessToken')

# 사용자 B
TOKEN_B=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@university.ac.kr","password":"TestPass1!"}' | jq -r '.data.accessToken')

# 채팅방 ID
CHAT_ROOM_ID=$(curl -s http://localhost:3000/v1/chat/rooms \
  -H "Authorization: Bearer $TOKEN_A" | jq -r '.data.items[0].chatRoomId')

echo "TOKEN_A: ${TOKEN_A:0:40}..."
echo "TOKEN_B: ${TOKEN_B:0:40}..."
echo "CHAT_ROOM_ID: $CHAT_ROOM_ID"
```

---

## 2. Socket.io 연결 테스트

### Node.js 스크립트

```bash
# socket.io-client 설치 (일회성)
npm install -g socket.io-client
# 또는 프로젝트 내
npx socket.io-client
```

```javascript
// test-socket.mjs
import { io } from "socket.io-client";

const TOKEN = "여기에_TOKEN_A_입력";

const socket = io("http://localhost:3000", {
  auth: { token: TOKEN },
});

socket.on("connect", () => {
  console.log("✅ Connected:", socket.id);
});

socket.on("connect_error", (err) => {
  console.log("❌ Connection error:", err.message);
});

socket.on("disconnect", (reason) => {
  console.log("🔌 Disconnected:", reason);
});

// 5초 후 연결 해제
setTimeout(() => socket.disconnect(), 5000);
```

```bash
node test-socket.mjs
# 기대: ✅ Connected: <socket_id>
```

> **확인 포인트:**
> - 유효한 토큰으로 연결 성공
> - 서버 로그에 "Socket connected: <userId> (<nickname>)" 출력

### 인증 실패 테스트

```javascript
const socket = io("http://localhost:3000", {
  auth: { token: "invalid_token" },
});

socket.on("connect_error", (err) => {
  console.log("❌ Expected error:", err.message);
  // 기대: "유효하지 않은 토큰입니다."
});
```

---

## 3. 채팅방 입장 (chat:join)

```javascript
// 사용자 A가 채팅방에 입장
socket.emit("chat:join", { chatRoomId: "여기에_CHAT_ROOM_ID" });

socket.on("chat:joined", (data) => {
  console.log("✅ Joined:", data);
  // { chatRoomId: "...", message: "... 채팅방에 입장했습니다." }
});

// 사용자 B의 소켓에서는 이 이벤트를 수신
socket.on("chat:user_joined", (data) => {
  console.log("👤 User joined:", data);
  // { chatRoomId, userId, nickname, timestamp }
});
```

> **확인 포인트:**
> - `chat:joined` 이벤트가 본인에게 발생
> - `chat:user_joined` 이벤트가 다른 참여자에게 발생
> - 참여하지 않은 채팅방 입장 시 `error:chat` 발생

---

## 4. 메시지 전송 (chat:message)

### 텍스트 메시지

```javascript
socket.emit("chat:message", {
  chatRoomId: "여기에_CHAT_ROOM_ID",
  messageType: "text",
  content: "Socket.io로 보낸 메시지입니다!",
});

// 모든 참여자(본인 포함)가 수신
socket.on("chat:new_message", (message) => {
  console.log("💬 New message:", message);
  // { messageId, chatRoomId, content, messageType, location, sender: {...}, createdAt }
});
```

### 위치 메시지

```javascript
socket.emit("chat:message", {
  chatRoomId: "여기에_CHAT_ROOM_ID",
  messageType: "location",
  location: {
    latitude: 37.5554,
    longitude: 127.0449,
    address: "한양대학교 정문 앞",
  },
});
```

> **확인 포인트:**
> - 메시지가 DB에 저장되는지 (REST API `GET /messages`로 확인)
> - `chat:new_message`가 Room의 모든 소켓에 전달되는지
> - REST API로 보낸 것과 동일한 메시지 포맷인지

---

## 5. 타이핑 상태 (chat:typing)

```javascript
// 타이핑 시작
socket.emit("chat:typing", { chatRoomId: "여기에_CHAT_ROOM_ID" });

// 타이핑 중지
socket.emit("chat:stop_typing", { chatRoomId: "여기에_CHAT_ROOM_ID" });

// 다른 사용자가 수신
socket.on("chat:user_typing", (data) => {
  console.log("⌨️ Typing:", data.nickname);
});

socket.on("chat:user_stop_typing", (data) => {
  console.log("⌨️ Stop typing:", data.nickname);
});
```

> **확인 포인트:**
> - 타이핑 이벤트는 DB에 저장되지 않음 (실시간만)
> - 본인에게는 전송되지 않고 Room의 다른 소켓에만 전달

---

## 6. 준비 상태 (chat:ready)

```javascript
socket.emit("chat:ready", {
  chatRoomId: "여기에_CHAT_ROOM_ID",
  isReady: true,
});

// 모든 참여자가 수신
socket.on("chat:ready_update", (data) => {
  console.log("🟢 Ready update:", data);
  // { chatRoomId, userId, nickname, isReady, participants: [...], allReady, timestamp }
});
```

> **확인 포인트:**
> - DB의 `ready_status` 테이블이 업데이트되는지
> - `participants` 배열에 모든 참여자의 준비 상태가 포함되는지
> - 전원 준비 시 `allReady: true`

---

## 7. 채팅방 퇴장 (chat:leave)

```javascript
socket.emit("chat:leave", { chatRoomId: "여기에_CHAT_ROOM_ID" });

socket.on("chat:left", (data) => {
  console.log("👋 Left:", data);
});

// 다른 사용자가 수신
socket.on("chat:user_left", (data) => {
  console.log("👋 User left:", data.nickname);
});
```

> **확인 포인트:**
> - Room에서만 나가고, `pod_participants`에는 영향 없음
> - 퇴장 후 해당 Room의 메시지 브로드캐스트를 수신하지 않음

---

## 8. 에러 케이스 테스트

### 8-1. 인증 없이 연결

```javascript
const socket = io("http://localhost:3000");
socket.on("connect_error", (err) => {
  console.log("❌", err.message);
  // 기대: "인증 토큰이 필요합니다."
});
```

### 8-2. 만료된 토큰

```javascript
const socket = io("http://localhost:3000", {
  auth: { token: "expired_token_here" },
});
socket.on("connect_error", (err) => {
  console.log("❌", err.message);
  // 기대: "유효하지 않은 토큰입니다." 또는 "토큰이 만료되었습니다."
});
```

### 8-3. 잘못된 chatRoomId

```javascript
socket.emit("chat:join", { chatRoomId: "not-a-uuid" });
socket.on("error:chat", (err) => {
  console.log("❌", err);
  // 기대: { event: "chat:join", code: "VALIDATION_ERROR", message: "..." }
});
```

### 8-4. 참여하지 않은 채팅방

```javascript
socket.emit("chat:message", {
  chatRoomId: "00000000-0000-0000-0000-000000000000",
  messageType: "text",
  content: "test",
});
socket.on("error:chat", (err) => {
  console.log("❌", err);
  // 기대: { event: "chat:message", code: "CHAT_ROOM_NOT_FOUND" or "NOT_CHAT_PARTICIPANT" }
});
```

### 8-5. 빈 메시지 전송

```javascript
socket.emit("chat:message", {
  chatRoomId: CHAT_ROOM_ID,
  messageType: "text",
  content: "",
});
socket.on("error:chat", (err) => {
  console.log("❌", err);
  // 기대: { event: "chat:message", code: "VALIDATION_ERROR" }
});
```

---

## 9. 테스트 UI 사용법

브라우저에서 직접 Socket.io 이벤트를 테스트할 수 있는 UI를 제공합니다.

### 접속 방법

```
http://localhost:3000/test/chat
```

### 사용 순서

1. **토큰 입력**: REST API로 받은 Access Token을 입력
2. **연결**: "Connect" 버튼 클릭 → 연결 상태 표시
3. **채팅방 입장**: Chat Room ID 입력 후 "Join" 클릭
4. **메시지 전송**: 텍스트 입력 후 Enter 또는 Send 클릭
5. **타이핑**: 메시지 입력 중 자동으로 typing 이벤트 전송
6. **준비 상태**: Ready 토글 버튼으로 준비 상태 변경

### 멀티 유저 테스트

- 브라우저 탭 2개를 열어 각각 다른 토큰으로 연결
- 한 탭에서 메시지 전송 → 다른 탭에서 실시간 수신 확인
- 타이핑 인디케이터, 준비 상태 동기화 확인

> **주의**: 테스트 UI는 개발 환경 전용입니다. NODE_ENV가 `development`일 때만 라우트가 활성화됩니다.
