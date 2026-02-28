# Algoway 팟 API 테스트 가이드

로컬 개발 환경에서 팟(Pod) API를 검증하는 절차를 기록합니다.  
Pods API(7개 엔드포인트)를 전수 테스트합니다.

> **사전 조건**: 인증 API 테스트(`docs/tests/01-auth.md`)를 완료하여  
> `ACCESS_TOKEN` 변수가 준비되어 있어야 합니다.

---

## 목차

0. [사전 준비](#0-사전-준비)
1. [환경 시작 / 토큰 발급](#1-환경-시작--토큰-발급)
2. [팟 생성](#2-팟-생성)
3. [팟 목록 조회 (위치 기반)](#3-팟-목록-조회-위치-기반)
4. [팟 검색](#4-팟-검색)
5. [팟 상세 조회](#5-팟-상세-조회)
6. [팟 참여](#6-팟-참여)
7. [팟 나가기](#7-팟-나가기)
8. [팟 상태 변경](#8-팟-상태-변경)
9. [에러 케이스 테스트](#9-에러-케이스-테스트)
10. [DB 상태 직접 확인](#10-db-상태-직접-확인)

---

## 0. 사전 준비

필요한 도구:

- Docker Desktop (실행 중)
- `curl` (macOS 기본 포함)
- `jq` (응답 JSON 포맷팅용) — `brew install jq`

**주요 특이사항:**
- 모든 팟 엔드포인트는 인증이 필요합니다. (`Authorization: Bearer <token>`)
- 팟 생성 시 DB 트리거가 자동으로 `chat_rooms` 레코드 + 방장을 `pod_participants`에 추가합니다.
- `GET /v1/pods/search`는 `GET /v1/pods/:podId`보다 우선 선언되어야 라우팅 충돌이 없습니다. ✅ (구현됨)

---

## 1. 환경 시작 / 토큰 발급

### 컨테이너 시작

```bash
cd /Users/cuz/Documents/Github/algoway

docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### 로그인하여 토큰 발급

```bash
TOKENS=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@university.ac.kr","password":"TestPass1!"}')

ACCESS_TOKEN=$(echo $TOKENS | jq -r '.data.accessToken')

echo "AccessToken: ${ACCESS_TOKEN:0:40}..."
```

---

## 2. 팟 생성

`POST /v1/pods` — 새로운 팟을 생성합니다.

```bash
CREATE_RESP=$(curl -s -X POST http://localhost:3000/v1/pods \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
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
    "memo": "빠른 출발 원해요"
  }')

echo $CREATE_RESP | jq .

POD_ID=$(echo $CREATE_RESP | jq -r '.data.podId')
echo "POD_ID: $POD_ID"
```

**기대 응답 (201 Created):**

```json
{
  "success": true,
  "message": "팟이 생성되었습니다.",
  "data": {
    "podId": "<uuid>",
    "departurePlace": { "name": "한양대학교", "latitude": 37.5554, "longitude": 127.0449 },
    "arrivalPlace": { "name": "강남역", "latitude": 37.4979, "longitude": 127.0276 },
    "departureTime": "2026-04-01T09:00:00.000Z",
    "maxParticipants": 3,
    "currentParticipants": 1,
    "vehicleType": "taxi",
    "estimatedCost": 15000,
    "costPerPerson": 5000,
    "memo": "빠른 출발 원해요",
    "status": "recruiting",
    "chatRoomId": "<uuid>",
    "creator": { "userId": "...", "nickname": "...", "profileImage": null, "verificationBadge": "...", "mannerScore": "5.00" },
    "participants": [{ "userId": "...", "nickname": "...", "joinedAt": "..." }],
    "createdAt": "..."
  }
}
```

> **확인 포인트:**
> - `status`가 `"recruiting"`인지
> - `chatRoomId`가 자동 생성되었는지 (DB 트리거 `on_pod_created` 동작)
> - `participants`에 방장 1명이 포함되는지
> - `costPerPerson = estimatedCost / maxParticipants` 자동 계산되는지

---

## 3. 팟 목록 조회 (위치 기반)

`GET /v1/pods` — 특정 위치 반경 내 팟을 거리순으로 조회합니다.

```bash
curl -s "http://localhost:3000/v1/pods?latitude=37.5554&longitude=127.0449&radius=5000&page=1&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

**주요 쿼리 파라미터:**

| 파라미터 | 필수 | 설명 |
|---|---|---|
| `latitude` | ✅ | 현재 위치 위도 (-90~90) |
| `longitude` | ✅ | 현재 위치 경도 (-180~180) |
| `radius` | ❌ | 검색 반경 m (100~20000, 기본 5000) |
| `status` | ❌ | 상태 필터 (`recruiting`, `full`, `in_progress`, `completed`) |
| `page` | ❌ | 페이지 번호 (기본 1) |
| `limit` | ❌ | 페이지 당 개수 (기본 10, 최대 100) |

**기대 응답 (200 OK):**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "podId": "...",
        "distance": 0,
        "status": "recruiting",
        ...
      }
    ],
    "pagination": {
      "total": 3,
      "page": 1,
      "limit": 10,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

> **확인 포인트:**
> - 정렬: `distance ASC → departureTime ASC`
> - `cancelled`, `completed` 상태는 기본 필터링으로 결과에서 제외
> - `distance` 단위: 미터 (정수로 반올림)

---

## 4. 팟 검색

`GET /v1/pods/search` — 출발지/도착지/시간/차종 등 다양한 필터로 검색합니다.

```bash
# 출발지 반경 1km 내 taxi 팟 검색
curl -s "http://localhost:3000/v1/pods/search?departureLat=37.5554&departureLng=127.0449&radius=1000&vehicleType=taxi" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

# 시간 범위 검색
curl -s "http://localhost:3000/v1/pods/search?departureTimeFrom=2026-03-01T00:00:00Z&departureTimeTo=2026-05-01T00:00:00Z" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

# 인증 유저만 방장인 팟 검색
curl -s "http://localhost:3000/v1/pods/search?verifiedOnly=true" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

**주요 쿼리 파라미터 (전부 선택):**

| 파라미터 | 설명 |
|---|---|
| `departureLat` / `departureLng` | 출발지 좌표 |
| `arrivalLat` / `arrivalLng` | 도착지 좌표 |
| `radius` | 좌표 검색 반경 m (100~20000, 기본 1000) |
| `departureTimeFrom` / `departureTimeTo` | 출발 시간 범위 (ISO 8601) |
| `verifiedOnly` | `true`이면 방장이 인증 유저인 팟만 |
| `vehicleType` | `taxi` 또는 `personal` |
| `page` / `limit` | 페이지네이션 |

> **확인 포인트:**
> - `departureLat/Lng`이 있으면 `distance` 필드가 응답에 포함
> - 파라미터 없이 호출 시 전체 활성 팟 반환

---

## 5. 팟 상세 조회

`GET /v1/pods/:podId` — 팟 상세 정보(참여자 목록, 채팅방 ID 포함)를 조회합니다.

```bash
curl -s "http://localhost:3000/v1/pods/$POD_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

**기대 응답 (200 OK):**

```json
{
  "success": true,
  "data": {
    "podId": "...",
    "chatRoomId": "...",
    "memo": "빠른 출발 원해요",
    "creator": {
      "userId": "...",
      "nickname": "...",
      "profileImage": null,
      "verificationBadge": "student",
      "mannerScore": "5.00"
    },
    "participants": [
      {
        "userId": "...",
        "nickname": "...",
        "profileImage": null,
        "verificationBadge": "student",
        "joinedAt": "..."
      }
    ],
    ...
  }
}
```

> **확인 포인트:**
> - `creator`에 `profileImage`, `mannerScore` 포함 (목록의 `PodCreatorInfo`보다 상세)
> - `participants` 배열 포함 (가입 순 정렬)
> - `chatRoomId` 포함

---

## 6. 팟 참여

`POST /v1/pods/:podId/join` — 팟에 참여합니다. (별도 계정 필요)

```bash
# 2번째 계정 로그인 필요
TOKENS2=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<2nd-user>@university.ac.kr","password":"TestPass1!"}')

ACCESS_TOKEN2=$(echo $TOKENS2 | jq -r '.data.accessToken')

curl -s -X POST "http://localhost:3000/v1/pods/$POD_ID/join" \
  -H "Authorization: Bearer $ACCESS_TOKEN2" | jq .
```

**기대 응답 (201 Created):**

```json
{
  "success": true,
  "message": "팟에 참여했습니다.",
  "data": {
    "podId": "...",
    "chatRoomId": "...",
    "currentParticipants": 2,
    "maxParticipants": 3
  }
}
```

> **확인 포인트:**
> - `currentParticipants`가 +1 증가하는지 (DB 트리거 `on_pod_participant_added`)
> - 최대 인원 도달 시 `status`가 자동으로 `full`로 변경되는지

---

## 7. 팟 나가기

`POST /v1/pods/:podId/leave` — 팟에서 나갑니다.

```bash
# 2번째 계정으로 나가기
curl -s -X POST "http://localhost:3000/v1/pods/$POD_ID/leave" \
  -H "Authorization: Bearer $ACCESS_TOKEN2" | jq .

# 방장은 나갈 수 없음 (에러 케이스)
curl -s -X POST "http://localhost:3000/v1/pods/$POD_ID/leave" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.error.code'
# 기대: "CREATOR_CANNOT_LEAVE"
```

**기대 응답 (200 OK):**

```json
{
  "success": true,
  "message": "팟에서 나갔습니다."
}
```

> **확인 포인트:**
> - `currentParticipants` 감소 (DB 트리거 `on_pod_participant_removed`)
> - `full` 상태이던 팟이 `recruiting`으로 자동 복귀하는지

---

## 8. 팟 상태 변경

`PATCH /v1/pods/:podId/status` — 방장만 상태를 변경할 수 있습니다.

```bash
# in_progress로 변경
curl -s -X PATCH "http://localhost:3000/v1/pods/$POD_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"status":"in_progress"}' | jq .

# cancelled로 변경
curl -s -X PATCH "http://localhost:3000/v1/pods/$POD_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"status":"cancelled"}' | jq .
```

**유효한 상태값:** `recruiting` | `full` | `in_progress` | `completed` | `cancelled`

**기대 응답 (200 OK):**

```json
{
  "success": true,
  "message": "팟 상태가 변경되었습니다.",
  "data": {
    "podId": "...",
    "status": "in_progress"
  }
}
```

> **확인 포인트:**
> - 비방장이 변경 시도 시 `FORBIDDEN` 에러
> - 이미 `cancelled` 또는 `completed`인 팟은 상태 변경 불가

---

## 9. 에러 케이스 테스트

### 9.1 인증 없이 요청

```bash
curl -s http://localhost:3000/v1/pods?latitude=37.5&longitude=127.0 | jq '.error.code'
# 기대: "UNAUTHORIZED"
```

### 9.2 유효성 검사 실패 (필수 파라미터 누락)

```bash
# latitude/longitude 없이 목록 조회
curl -s "http://localhost:3000/v1/pods" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.error.code'
# 기대: "VALIDATION_ERROR"
```

### 9.3 존재하지 않는 팟

```bash
curl -s "http://localhost:3000/v1/pods/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.error.code'
# 기대: "NOT_FOUND"
```

### 9.4 이미 참여 중인 팟에 재참여

```bash
curl -s -X POST "http://localhost:3000/v1/pods/$POD_ID/join" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.error.code'
# 기대: "ALREADY_JOINED"
```

### 9.5 방장의 나가기 시도

```bash
curl -s -X POST "http://localhost:3000/v1/pods/$POD_ID/leave" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.error.code'
# 기대: "CREATOR_CANNOT_LEAVE"
```

### 9.6 비방장의 상태 변경 시도

```bash
curl -s -X PATCH "http://localhost:3000/v1/pods/$POD_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN2" \
  -d '{"status":"cancelled"}' | jq '.error.code'
# 기대: "FORBIDDEN"
```

### 9.7 종료된 팟 참여 시도

```bash
# POD_ID를 cancelled 처리 후 참여 시도
curl -s -X POST "http://localhost:3000/v1/pods/$POD_ID/join" \
  -H "Authorization: Bearer $ACCESS_TOKEN2" | jq '.error.code'
# 기대: "FORBIDDEN" 또는 "POD_FULL"
```

---

## 10. DB 상태 직접 확인

```bash
# 팟 목록 확인
docker exec algoway-backend sh -c "
  PGPASSWORD=\$SUPABASE_DB_PASSWORD psql \
    -h \$SUPABASE_DB_HOST -p 5432 -U postgres -d postgres \
    -c 'SELECT pod_id, status, current_participants, max_participants FROM pods ORDER BY created_at DESC LIMIT 5;'
"

# 팟 참여자 확인
docker exec algoway-backend sh -c "
  PGPASSWORD=\$SUPABASE_DB_PASSWORD psql \
    -h \$SUPABASE_DB_HOST -p 5432 -U postgres -d postgres \
    -c 'SELECT pp.pod_id, u.nickname, pp.joined_at FROM pod_participants pp JOIN users u ON pp.user_id = u.user_id ORDER BY pp.joined_at DESC LIMIT 10;'
"

# 채팅방 확인 (on_pod_created 트리거)
docker exec algoway-backend sh -c "
  PGPASSWORD=\$SUPABASE_DB_PASSWORD psql \
    -h \$SUPABASE_DB_HOST -p 5432 -U postgres -d postgres \
    -c 'SELECT chat_room_id, pod_id, created_at FROM chat_rooms ORDER BY created_at DESC LIMIT 5;'
"
```
