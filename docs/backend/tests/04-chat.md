# Algoway 채팅 API 테스트 가이드

로컬 개발 환경에서 채팅(Chat) REST API를 검증하는 절차를 기록합니다.  
Chat API(5개 엔드포인트)를 전수 테스트합니다.

> **사전 조건**: 팟 API 테스트(`docs/tests/03-pods.md`)를 완료하여  
> `ACCESS_TOKEN`, `POD_ID` 변수가 준비되어 있어야 합니다.  
> 팟 생성 시 DB 트리거가 자동으로 `chat_rooms` 레코드를 생성합니다.

---

## 목차

0. [사전 준비](#0-사전-준비)
1. [환경 시작 / 토큰 발급](#1-환경-시작--토큰-발급)
2. [내 채팅방 목록 조회](#2-내-채팅방-목록-조회)
3. [메시지 전송 (텍스트)](#3-메시지-전송-텍스트)
4. [메시지 전송 (위치)](#4-메시지-전송-위치)
5. [메시지 조회](#5-메시지-조회)
6. [준비 상태 업데이트](#6-준비-상태-업데이트)
7. [참여자 + 준비 상태 조회](#7-참여자--준비-상태-조회)
8. [에러 케이스 테스트](#8-에러-케이스-테스트)
9. [DB 상태 직접 확인](#9-db-상태-직접-확인)

---

## 0. 사전 준비

필요한 도구:

- Docker Desktop (실행 중)
- `curl` (macOS 기본 포함)
- `jq` (응답 JSON 포맷팅용) — `brew install jq`

**주요 특이사항:**
- 모든 채팅 엔드포인트는 인증이 필요합니다. (`Authorization: Bearer <token>`)
- 채팅방은 팟 생성 시 DB 트리거에 의해 자동 생성됩니다. (별도 생성 API 없음)
- 채팅방 참여 여부는 `pod_participants` 테이블을 통해 확인합니다.
- 참여하지 않은 채팅방에 접근하면 `403 NOT_CHAT_PARTICIPANT` 에러가 발생합니다.

---

## 1. 환경 시작 / 토큰 발급

### 컨테이너 시작

```bash
cd /Users/cuz/Documents/Github/algoway

docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### 로그인하여 토큰 발급 (사용자 A — 팟 방장)

```bash
TOKENS_A=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@university.ac.kr","password":"TestPass1!"}')

TOKEN_A=$(echo $TOKENS_A | jq -r '.data.accessToken')
echo "TokenA: ${TOKEN_A:0:40}..."
```

### 팟 생성 (채팅방 자동 생성)

> 이미 팟이 있다면 건너뛰어도 됩니다.

```bash
CREATE_RESP=$(curl -s -X POST http://localhost:3000/v1/pods \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{
    "departurePlace": {
      "name": "한양대학교",
      "latitude": 37.5554,
      "longitude": 127.0449
    },
    "arrivalPlace": {
      "name": "강남역",
      "latitude": 37.4979,
      "longitude": 127.0276
    },
    "departureTime": "2026-04-01T09:00:00.000Z",
    "maxParticipants": 3,
    "vehicleType": "taxi",
    "estimatedCost": 15000,
    "memo": "채팅 테스트용 팟"
  }')

POD_ID=$(echo $CREATE_RESP | jq -r '.data.podId')
echo "POD_ID: $POD_ID"
```

### 두 번째 사용자 토큰 발급 + 팟 참여 (사용자 B)

```bash
TOKENS_B=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@university.ac.kr","password":"TestPass1!"}')

TOKEN_B=$(echo $TOKENS_B | jq -r '.data.accessToken')
echo "TokenB: ${TOKEN_B:0:40}..."

# 사용자 B가 팟에 참여
curl -s -X POST "http://localhost:3000/v1/pods/$POD_ID/join" \
  -H "Authorization: Bearer $TOKEN_B" | jq .
```

---

## 2. 내 채팅방 목록 조회

`GET /v1/chat/rooms` — 내가 참여 중인 채팅방 목록을 조회합니다.

```bash
curl -s http://localhost:3000/v1/chat/rooms \
  -H "Authorization: Bearer $TOKEN_A" | jq .
```

**기대 응답 (200 OK):**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "chatRoomId": "<uuid>",
        "pod": {
          "podId": "<uuid>",
          "departurePlace": "한양대학교",
          "arrivalPlace": "강남역",
          "departureTime": "2026-04-01T09:00:00.000Z",
          "status": "recruiting"
        },
        "lastMessage": null,
        "unreadCount": 0,
        "createdAt": "..."
      }
    ]
  }
}
```

> **확인 포인트:**
> - `chatRoomId`가 팟 생성 시 자동 생성된 UUID인지
> - `pod` 필드에 출발지/도착지/시간/상태가 포함되는지
> - `lastMessage`가 메시지 전송 전이라 `null`인지

```bash
# 채팅방 ID 저장
CHAT_ROOM_ID=$(curl -s http://localhost:3000/v1/chat/rooms \
  -H "Authorization: Bearer $TOKEN_A" | jq -r '.data.items[0].chatRoomId')
echo "CHAT_ROOM_ID: $CHAT_ROOM_ID"
```

---

## 3. 메시지 전송 (텍스트)

`POST /v1/chat/rooms/:chatRoomId/messages` — 텍스트 메시지를 전송합니다.

```bash
# 사용자 A가 메시지 전송
MSG_RESP=$(curl -s -X POST "http://localhost:3000/v1/chat/rooms/$CHAT_ROOM_ID/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{
    "messageType": "text",
    "content": "안녕하세요! 내일 9시에 출발할게요."
  }')

echo $MSG_RESP | jq .
```

**기대 응답 (201 Created):**

```json
{
  "success": true,
  "data": {
    "messageId": "<uuid>",
    "chatRoomId": "<uuid>",
    "content": "안녕하세요! 내일 9시에 출발할게요.",
    "messageType": "text",
    "location": null,
    "sender": {
      "userId": "<uuid>",
      "nickname": "alice",
      "profileImage": null
    },
    "createdAt": "..."
  }
}
```

> **확인 포인트:**
> - `messageType`이 `"text"`인지
> - `sender`에 보낸 사용자 정보가 포함되는지
> - `location`이 `null`인지 (텍스트 메시지)

```bash
# 사용자 B도 메시지 전송
curl -s -X POST "http://localhost:3000/v1/chat/rooms/$CHAT_ROOM_ID/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_B" \
  -d '{
    "messageType": "text",
    "content": "네, 알겠습니다! 어디서 만날까요?"
  }' | jq .
```

---

## 4. 메시지 전송 (위치)

`POST /v1/chat/rooms/:chatRoomId/messages` — 위치 정보 메시지를 전송합니다.

```bash
curl -s -X POST "http://localhost:3000/v1/chat/rooms/$CHAT_ROOM_ID/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{
    "messageType": "location",
    "location": {
      "latitude": 37.5554,
      "longitude": 127.0449,
      "address": "한양대학교 정문 앞"
    }
  }' | jq .
```

**기대 응답 (201 Created):**

```json
{
  "success": true,
  "data": {
    "messageId": "<uuid>",
    "chatRoomId": "<uuid>",
    "content": null,
    "messageType": "location",
    "location": {
      "latitude": 37.5554,
      "longitude": 127.0449,
      "address": "한양대학교 정문 앞"
    },
    "sender": {
      "userId": "<uuid>",
      "nickname": "alice",
      "profileImage": null
    },
    "createdAt": "..."
  }
}
```

> **확인 포인트:**
> - `messageType`이 `"location"`인지
> - `location` 객체에 `latitude`, `longitude`, `address`가 포함되는지
> - `content`가 `null`인지 (위치 메시지)

---

## 5. 메시지 조회

`GET /v1/chat/rooms/:chatRoomId/messages` — 채팅방 메시지를 페이지네이션으로 조회합니다.

### 기본 조회

```bash
curl -s "http://localhost:3000/v1/chat/rooms/$CHAT_ROOM_ID/messages" \
  -H "Authorization: Bearer $TOKEN_A" | jq .
```

**기대 응답 (200 OK):**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "messageId": "<uuid>",
        "chatRoomId": "<uuid>",
        "content": "안녕하세요! 내일 9시에 출발할게요.",
        "messageType": "text",
        "location": null,
        "sender": { "userId": "...", "nickname": "alice", "profileImage": null },
        "createdAt": "..."
      }
    ],
    "pagination": {
      "total": 3,
      "page": 1,
      "limit": 50,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### 페이지네이션 테스트

```bash
# 페이지 크기 제한
curl -s "http://localhost:3000/v1/chat/rooms/$CHAT_ROOM_ID/messages?limit=2&page=1" \
  -H "Authorization: Bearer $TOKEN_A" | jq .

# 2페이지 조회
curl -s "http://localhost:3000/v1/chat/rooms/$CHAT_ROOM_ID/messages?limit=2&page=2" \
  -H "Authorization: Bearer $TOKEN_A" | jq .
```

### 커서 기반 조회 (before)

```bash
# 첫 번째 메시지 ID 추출
FIRST_MSG_ID=$(curl -s "http://localhost:3000/v1/chat/rooms/$CHAT_ROOM_ID/messages?limit=1" \
  -H "Authorization: Bearer $TOKEN_A" | jq -r '.data.items[0].messageId')

# 해당 메시지 이전 메시지 조회
curl -s "http://localhost:3000/v1/chat/rooms/$CHAT_ROOM_ID/messages?before=$FIRST_MSG_ID" \
  -H "Authorization: Bearer $TOKEN_A" | jq .
```

> **확인 포인트:**
> - 기본 limit가 50인지 (CHAT.DEFAULT_MESSAGE_LIMIT)
> - 메시지가 `created_at DESC` 순으로 정렬되는지 (최신순)
> - `before` 파라미터 사용 시 해당 메시지 이전 것만 반환되는지
> - `pagination` 객체의 total/page/limit/totalPages/hasNext/hasPrev가 정확한지

---

## 6. 준비 상태 업데이트

`POST /v1/chat/rooms/:chatRoomId/ready` — 출발 준비 상태를 토글합니다.

### 준비 완료로 변경

```bash
# 사용자 A 준비 완료
curl -s -X POST "http://localhost:3000/v1/chat/rooms/$CHAT_ROOM_ID/ready" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"isReady": true}' | jq .

# 사용자 B 준비 완료
curl -s -X POST "http://localhost:3000/v1/chat/rooms/$CHAT_ROOM_ID/ready" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_B" \
  -d '{"isReady": true}' | jq .
```

**기대 응답 (200 OK):**

```json
{
  "success": true,
  "message": "준비 완료 상태가 업데이트되었습니다.",
  "data": {
    "userId": "<uuid>",
    "isReady": true
  }
}
```

### 준비 취소

```bash
curl -s -X POST "http://localhost:3000/v1/chat/rooms/$CHAT_ROOM_ID/ready" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"isReady": false}' | jq .
```

> **확인 포인트:**
> - UPSERT 동작 확인: 첫 호출 시 INSERT, 이후 호출 시 UPDATE
> - `isReady`를 `true` → `false`로 토글 가능한지

---

## 7. 참여자 + 준비 상태 조회

`GET /v1/chat/rooms/:chatRoomId/participants` — 채팅방 참여자와 각각의 준비 상태를 조회합니다.

```bash
curl -s "http://localhost:3000/v1/chat/rooms/$CHAT_ROOM_ID/participants" \
  -H "Authorization: Bearer $TOKEN_A" | jq .
```

**기대 응답 (200 OK):**

```json
{
  "success": true,
  "data": {
    "participants": [
      {
        "userId": "<uuid>",
        "nickname": "alice",
        "profileImage": null,
        "isReady": false
      },
      {
        "userId": "<uuid>",
        "nickname": "bob",
        "profileImage": null,
        "isReady": true
      }
    ],
    "allReady": false
  }
}
```

> **확인 포인트:**
> - 참여자 수가 팟 참여자와 일치하는지
> - 준비 상태를 변경하지 않은 사용자의 `isReady`가 `false`(기본값)인지
> - `allReady`는 모든 참여자가 준비 완료일 때만 `true`인지
> - 모든 참여자를 준비 완료로 변경한 후 `allReady: true` 확인

### 전원 준비 완료 시

```bash
# 사용자 A도 준비 완료
curl -s -X POST "http://localhost:3000/v1/chat/rooms/$CHAT_ROOM_ID/ready" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"isReady": true}' | jq .

# 참여자 조회 → allReady: true 확인
curl -s "http://localhost:3000/v1/chat/rooms/$CHAT_ROOM_ID/participants" \
  -H "Authorization: Bearer $TOKEN_A" | jq .allReady
# 기대 결과: true
```

---

## 8. 에러 케이스 테스트

### 8-1. 인증 없이 채팅방 조회

```bash
curl -s http://localhost:3000/v1/chat/rooms | jq .
# 기대: 401 UNAUTHORIZED
```

### 8-2. 잘못된 UUID 형식

```bash
curl -s "http://localhost:3000/v1/chat/rooms/invalid-uuid/messages" \
  -H "Authorization: Bearer $TOKEN_A" | jq .
# 기대: 400 VALIDATION_ERROR
```

### 8-3. 존재하지 않는 채팅방

```bash
curl -s "http://localhost:3000/v1/chat/rooms/00000000-0000-0000-0000-000000000000/messages" \
  -H "Authorization: Bearer $TOKEN_A" | jq .
# 기대: 404 CHAT_ROOM_NOT_FOUND
```

### 8-4. 참여하지 않은 채팅방 접근

> 사용자 C (팟에 참여하지 않은 사용자)로 접근 시도

```bash
# 참여하지 않은 사용자로 로그인
TOKENS_C=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"charlie@university.ac.kr","password":"TestPass1!"}')

TOKEN_C=$(echo $TOKENS_C | jq -r '.data.accessToken')

# 채팅방 메시지 조회 시도
curl -s "http://localhost:3000/v1/chat/rooms/$CHAT_ROOM_ID/messages" \
  -H "Authorization: Bearer $TOKEN_C" | jq .
# 기대: 403 NOT_CHAT_PARTICIPANT
```

### 8-5. 빈 텍스트 메시지

```bash
curl -s -X POST "http://localhost:3000/v1/chat/rooms/$CHAT_ROOM_ID/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"messageType": "text", "content": ""}' | jq .
# 기대: 400 VALIDATION_ERROR
```

### 8-6. 위치 메시지에 좌표 누락

```bash
curl -s -X POST "http://localhost:3000/v1/chat/rooms/$CHAT_ROOM_ID/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"messageType": "location"}' | jq .
# 기대: 400 VALIDATION_ERROR
```

### 8-7. 잘못된 messageType

```bash
curl -s -X POST "http://localhost:3000/v1/chat/rooms/$CHAT_ROOM_ID/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"messageType": "video", "content": "test"}' | jq .
# 기대: 400 VALIDATION_ERROR
```

### 8-8. 1000자 초과 메시지

```bash
LONG_MSG=$(python3 -c "print('가' * 1001)")
curl -s -X POST "http://localhost:3000/v1/chat/rooms/$CHAT_ROOM_ID/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"messageType\": \"text\", \"content\": \"$LONG_MSG\"}" | jq .
# 기대: 400 VALIDATION_ERROR
```

### 8-9. isReady에 문자열 전달

```bash
curl -s -X POST "http://localhost:3000/v1/chat/rooms/$CHAT_ROOM_ID/ready" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"isReady": "yes"}' | jq .
# 기대: 400 VALIDATION_ERROR
```

---

## 9. DB 상태 직접 확인

Docker 컨테이너 내 PostgreSQL에서 직접 데이터를 확인합니다.

```bash
docker exec -it algoway-db psql -U algoway_user -d algoway -c "
  -- 채팅방 목록
  SELECT cr.chat_room_id, cr.pod_id, p.departure_place->>'name' AS departure
  FROM chat_rooms cr
  JOIN pods p ON cr.pod_id = p.pod_id
  ORDER BY cr.created_at DESC
  LIMIT 5;
"
```

```bash
docker exec -it algoway-db psql -U algoway_user -d algoway -c "
  -- 메시지 목록
  SELECT m.message_id, m.message_type, m.content, u.nickname AS sender,
         m.created_at
  FROM messages m
  JOIN users u ON m.sender_id = u.user_id
  WHERE m.chat_room_id = '$CHAT_ROOM_ID'
  ORDER BY m.created_at DESC
  LIMIT 10;
"
```

```bash
docker exec -it algoway-db psql -U algoway_user -d algoway -c "
  -- 준비 상태
  SELECT rs.user_id, u.nickname, rs.is_ready, rs.updated_at
  FROM ready_status rs
  JOIN users u ON rs.user_id = u.user_id
  WHERE rs.chat_room_id = '$CHAT_ROOM_ID';
"
```

```bash
docker exec -it algoway-db psql -U algoway_user -d algoway -c "
  -- 채팅방 참여자 확인 (pod_participants 기반)
  SELECT pp.user_id, u.nickname, pp.joined_at
  FROM pod_participants pp
  JOIN users u ON pp.user_id = u.user_id
  JOIN chat_rooms cr ON cr.pod_id = pp.pod_id
  WHERE cr.chat_room_id = '$CHAT_ROOM_ID';
"
```

> **확인 포인트:**
> - `chat_rooms` 레코드가 팟 생성 시 자동으로 존재하는지
> - `messages` 테이블에 전송한 메시지가 올바르게 저장되었는지
> - `ready_status`의 UPSERT가 정상 동작했는지 (중복 레코드 없음)
> - `pod_participants`가 채팅 참여자 기준으로 올바른지
