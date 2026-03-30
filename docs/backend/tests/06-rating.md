# Algoway 평가 API 테스트 가이드

로컬 개발 환경에서 평가(Rating) API를 검증하는 절차를 기록합니다.  
5개 엔드포인트와 주요 에러 케이스를 전수 테스트합니다.

> **사전 조건**: 팟 API 테스트(`docs/tests/03-pods.md`)를 완료하여  
> `TOKEN_A`, `TOKEN_B`, `USER_A`, `USER_B` 변수가 준비되어 있어야 합니다.  
> 평가는 `status = 'completed'` 상태인 팟에서만 가능합니다.

---

## 목차

0. [사전 준비](#0-사전-준비)
1. [환경 시작 / 토큰 발급](#1-환경-시작--토큰-발급)
2. [테스트 팟 준비 (completed 상태)](#2-테스트-팟-준비-completed-상태)
3. [팟 평가 현황 조회](#3-팟-평가-현황-조회)
4. [평가 제출](#4-평가-제출)
5. [내가 받은 평가 목록](#5-내가-받은-평가-목록)
6. [내가 보낸 평가 목록](#6-내가-보낸-평가-목록)
7. [사용자 공개 평가 조회](#7-사용자-공개-평가-조회)
8. [에러 케이스 테스트](#8-에러-케이스-테스트)
9. [DB 상태 직접 확인](#9-db-상태-직접-확인)

---

## 0. 사전 준비

필요한 도구:

- Docker Desktop (실행 중)
- `curl` (macOS 기본 포함)
- `jq` (응답 JSON 포맷팅용) — `brew install jq`
- `psql` — `brew install postgresql@16` (DB 상태 변경 및 직접 확인용)

**평가 시스템 주요 특징:**
- 팟이 `completed` 상태일 때만 평가 가능합니다.
- 동일 팟에서 동일 대상에게 중복 평가 불가합니다. (DB UNIQUE 제약)
- 평가 저장 시 DB 트리거(`on_rating_added`)가 `users.manner_score`를 자동 갱신합니다.
- 평가 태그는 7종 고정값만 허용합니다: `punctual`, `friendly`, `safe_driving`, `clean`, `good_conversation`, `quiet_ride`, `helpful`

---

## 1. 환경 시작 / 토큰 발급

### 컨테이너 시작

```bash
cd /Users/cuz/Documents/Github/algoway

docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### 로그인 — 사용자 A (Alice, 팟 생성자 역할)

```bash
TOKEN_A=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@university.ac.kr","password":"TestPass1!"}' \
  | jq -r '.data.accessToken')

USER_A=$(curl -s http://localhost:3000/v1/users/me \
  -H "Authorization: Bearer $TOKEN_A" \
  | jq -r '.data.userId')

echo "USER_A: $USER_A"
```

### 로그인 — 사용자 B (Bob, 팟 참여자 역할)

```bash
TOKEN_B=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@university.ac.kr","password":"TestPass1!"}' \
  | jq -r '.data.accessToken')

USER_B=$(curl -s http://localhost:3000/v1/users/me \
  -H "Authorization: Bearer $TOKEN_B" \
  | jq -r '.data.userId')

echo "USER_B: $USER_B"
```

---

## 2. 테스트 팟 준비 (completed 상태)

평가 API는 `completed` 팟이 필요합니다. 팟 생성 → Bob 참여 → DB에서 상태 변경 순으로 진행합니다.

### 팟 생성 (Alice)

```bash
POD_ID=$(curl -s -X POST http://localhost:3000/v1/pods \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{
    "departurePlace": {"name": "한양대학교", "latitude": 37.5554, "longitude": 127.0449},
    "arrivalPlace":   {"name": "강남역",      "latitude": 37.4979, "longitude": 127.0276},
    "departureTime":  "2026-03-20T09:00:00.000Z",
    "maxParticipants": 3,
    "vehicleType": "taxi",
    "estimatedCost": 15000
  }' \
  | jq -r '.data.podId')

echo "POD_ID: $POD_ID"
```

### Bob 팟 참여

```bash
curl -s -X POST "http://localhost:3000/v1/pods/$POD_ID/join" \
  -H "Authorization: Bearer $TOKEN_B" | jq '{success, data}'
```

**예상 응답:**
```json
{
  "success": true,
  "data": {
    "podId": "...",
    "chatRoomId": "...",
    "currentParticipants": 2,
    "maxParticipants": 3
  }
}
```

### 팟 상태를 completed로 변경 (DB 직접 수정)

> ℹ️ 현재 버전에서는 팟 상태 변경 API가 없으므로 DB에서 직접 변경합니다.

```bash
# psql PATH 설정 (처음 한 번만)
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

DB_URL=$(grep "^DATABASE_URL=" .env | cut -d= -f2-)

psql "$DB_URL" -c \
  "UPDATE pods SET status='completed' WHERE pod_id='$POD_ID' RETURNING pod_id, status;"
```

**예상 결과:**
```
                pod_id               |  status
-------------------------------------+-----------
 xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | completed
(1 row)
```

---

## 3. 팟 평가 현황 조회

`GET /v1/ratings/pods/:podId` — 팟에서 내가 평가할 수 있는 참여자 목록과 평가 완료 여부를 반환합니다.

```bash
curl -s "http://localhost:3000/v1/ratings/pods/$POD_ID" \
  -H "Authorization: Bearer $TOKEN_A" | jq .
```

**예상 응답 (Alice 기준):**
```json
{
  "success": true,
  "data": {
    "podId": "...",
    "departurePlaceName": "한양대학교",
    "arrivalPlaceName": "강남역",
    "departureTime": "2026-03-20T09:00:00.000Z",
    "participants": [
      {
        "userId": "...",
        "nickname": "Bob",
        "profileImage": null,
        "verificationBadge": "학생 인증",
        "alreadyRated": false
      }
    ]
  }
}
```

> `alreadyRated: false` — Alice가 아직 Bob을 평가하지 않은 상태입니다.

---

## 4. 평가 제출

`POST /v1/ratings` — 팟 참여자에 대한 평가를 제출합니다.

### Alice → Bob 평가

```bash
cat > /tmp/rate_ab.json << 'EOF'
{
  "podId": "PLACEHOLDER_POD",
  "revieweeId": "PLACEHOLDER_USER_B",
  "rating": 5,
  "tags": ["punctual", "friendly", "good_conversation"],
  "comment": "시간도 잘 지키고 정말 좋은 여행이었어요"
}
EOF
sed -i '' "s/PLACEHOLDER_POD/$POD_ID/" /tmp/rate_ab.json
sed -i '' "s/PLACEHOLDER_USER_B/$USER_B/" /tmp/rate_ab.json

curl -s -X POST http://localhost:3000/v1/ratings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d @/tmp/rate_ab.json | jq .
```

**예상 응답 (201 Created):**
```json
{
  "success": true,
  "data": {
    "ratingId": "...",
    "podId": "...",
    "rating": 5,
    "tags": ["punctual", "friendly", "good_conversation"],
    "comment": "시간도 잘 지키고 정말 좋은 여행이었어요",
    "createdAt": "...",
    "reviewer": {
      "userId": "...",
      "nickname": "Alice",
      "profileImage": null,
      "verificationBadge": "학생 인증"
    },
    "reviewee": {
      "userId": "...",
      "nickname": "Bob",
      "profileImage": null
    },
    "pod": {
      "podId": "...",
      "departurePlaceName": "한양대학교",
      "arrivalPlaceName": "강남역",
      "departureTime": "2026-03-20T09:00:00.000Z"
    }
  },
  "message": "평가가 제출되었습니다."
}
```

### 평가 후 현황 재조회 — alreadyRated 확인

```bash
curl -s "http://localhost:3000/v1/ratings/pods/$POD_ID" \
  -H "Authorization: Bearer $TOKEN_A" | jq '.data.participants'
```

**예상 결과:** `alreadyRated: true`

---

## 5. 내가 받은 평가 목록

`GET /v1/ratings/received` — 자신이 받은 모든 평가를 페이지네이션으로 반환합니다.

```bash
curl -s "http://localhost:3000/v1/ratings/received" \
  -H "Authorization: Bearer $TOKEN_B" | jq .
```

**예상 응답:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "ratingId": "...",
        "rating": 5,
        "tags": ["punctual", "friendly", "good_conversation"],
        "comment": "...",
        "reviewer": { "nickname": "Alice", ... },
        "reviewee": { "nickname": "Bob", ... },
        "pod": { "departurePlaceName": "한양대학교", ... }
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### 페이지네이션 파라미터

```bash
curl -s "http://localhost:3000/v1/ratings/received?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN_B" | jq '.data.pagination'
```

---

## 6. 내가 보낸 평가 목록

`GET /v1/ratings/sent` — 자신이 제출한 모든 평가를 페이지네이션으로 반환합니다.

```bash
curl -s "http://localhost:3000/v1/ratings/sent" \
  -H "Authorization: Bearer $TOKEN_A" | jq .
```

**예상 응답:** `received`와 동일한 구조, `reviewer`가 Alice, `reviewee`가 Bob

---

## 7. 사용자 공개 평가 조회

`GET /v1/users/:userId/ratings` — 특정 사용자의 공개 평가 목록과 평균 평점을 반환합니다.

```bash
curl -s "http://localhost:3000/v1/users/$USER_B/ratings" \
  -H "Authorization: Bearer $TOKEN_A" | jq .
```

**예상 응답:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": { "total": 1, ... },
    "averageRating": 5.0
  }
}
```

> `averageRating` — 해당 사용자가 받은 평가의 평균 점수 (소수 2자리).  
> 평가가 없을 경우 `null`을 반환합니다.

---

## 8. 에러 케이스 테스트

### 8-1. 자기 자신 평가 불가 (400 CANNOT_RATE_SELF)

```bash
cat > /tmp/self_rate.json << 'EOF'
{"podId": "PLACEHOLDER", "revieweeId": "PLACEHOLDER_SELF", "rating": 5}
EOF
sed -i '' "s/PLACEHOLDER/$POD_ID/" /tmp/self_rate.json
sed -i '' "s/PLACEHOLDER_SELF/$USER_A/" /tmp/self_rate.json

curl -s -X POST http://localhost:3000/v1/ratings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d @/tmp/self_rate.json | jq '{success, error}'
```

**예상 응답:**
```json
{"success": false, "error": {"code": "CANNOT_RATE_SELF", "message": "자기 자신을 평가할 수 없습니다."}}
```

### 8-2. 중복 평가 불가 (409 ALREADY_RATED)

동일 (pod, reviewer, reviewee) 조합으로 재제출:

```bash
curl -s -X POST http://localhost:3000/v1/ratings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d @/tmp/rate_ab.json | jq '{success, error}'
```

**예상 응답:**
```json
{"success": false, "error": {"code": "ALREADY_RATED", "message": "이미 해당 참여자를 평가했습니다."}}
```

### 8-3. 완료되지 않은 팟 평가 불가 (400 POD_NOT_COMPLETED)

`status = 'recruiting'` 팟 ID를 조회해서 시도합니다:

```bash
RECRUITING_POD=$(psql "$DB_URL" -t -c \
  "SELECT pod_id FROM pods WHERE status='recruiting' LIMIT 1;" \
  | tr -d ' \n')

cat > /tmp/incomplete_rate.json << 'EOF'
{"podId": "PLACEHOLDER", "revieweeId": "PLACEHOLDER_B", "rating": 3}
EOF
sed -i '' "s/PLACEHOLDER/$RECRUITING_POD/" /tmp/incomplete_rate.json
sed -i '' "s/PLACEHOLDER_B/$USER_B/" /tmp/incomplete_rate.json

curl -s -X POST http://localhost:3000/v1/ratings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d @/tmp/incomplete_rate.json | jq '{success, error}'
```

**예상 응답:**
```json
{"success": false, "error": {"code": "POD_NOT_COMPLETED", "message": "완료된 팟에서만 평가할 수 있습니다."}}
```

### 8-4. 유효하지 않은 rating 값 (400 VALIDATION_ERROR)

```bash
node -e "
const http = require('http');
const body = JSON.stringify({podId: '$POD_ID', revieweeId: '$USER_B', rating: 10});
const req = http.request({hostname:'localhost',port:3000,path:'/v1/ratings',method:'POST',
  headers:{'Content-Type':'application/json','Authorization':'Bearer $TOKEN_A','Content-Length':Buffer.byteLength(body)}
}, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>console.log(d)); });
req.write(body); req.end();
"
```

**예상 응답:** `rating` 필드 validation error (rating은 1~5 정수)

### 8-5. 유효하지 않은 태그 (400 VALIDATION_ERROR)

```bash
node -e "
const http = require('http');
const body = JSON.stringify({podId: '$POD_ID', revieweeId: '$USER_B', rating: 3, tags: ['unknown_tag']});
const req = http.request({hostname:'localhost',port:3000,path:'/v1/ratings',method:'POST',
  headers:{'Content-Type':'application/json','Authorization':'Bearer $TOKEN_A','Content-Length':Buffer.byteLength(body)}
}, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>console.log(d)); });
req.write(body); req.end();
"
```

**예상 응답:** `tags` 필드 validation error

### 8-6. 인증 없이 접근 (401 TOKEN_INVALID)

```bash
curl -s http://localhost:3000/v1/ratings/received \
  -H "Authorization: Bearer invalid_token" | jq '{success, error}'
```

**예상 응답:**
```json
{"success": false, "error": {"code": "TOKEN_INVALID", "message": "유효하지 않은 토큰입니다."}}
```

> ℹ️ 토큰이 아예 없을 때는 `UNAUTHORIZED`, 잘못된 토큰 형식일 때는 `TOKEN_INVALID`가 반환됩니다.

### 8-7. 인증 없이 접근 (401 UNAUTHORIZED)

```bash
curl -s http://localhost:3000/v1/ratings/received | jq '{success, error}'
```

**예상 응답:**
```json
{"success": false, "error": {"code": "UNAUTHORIZED", "message": "인증 토큰이 필요합니다."}}
```

---

## 9. DB 상태 직접 확인

```bash
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
DB_URL=$(grep "^DATABASE_URL=" .env | cut -d= -f2-)
```

### ratings 테이블 전체 조회

```bash
psql "$DB_URL" -c \
  "SELECT rating_id, reviewer_id, reviewee_id, rating, tags, comment, created_at
   FROM ratings
   ORDER BY created_at DESC
   LIMIT 10;"
```

### 사용자별 manner_score 확인 (트리거 반영 여부)

```bash
psql "$DB_URL" -c \
  "SELECT user_id, nickname, manner_score
   FROM users
   WHERE user_id IN ('$USER_A', '$USER_B');"
```

> 평가가 제출되면 `on_rating_added` 트리거가 자동으로 `manner_score`를 갱신합니다.

### 팟별 평가 현황

```bash
psql "$DB_URL" -c \
  "SELECT
     r.rating_id,
     u_reviewer.nickname AS reviewer,
     u_reviewee.nickname AS reviewee,
     r.rating,
     r.tags
   FROM ratings r
   JOIN users u_reviewer ON u_reviewer.user_id = r.reviewer_id
   JOIN users u_reviewee ON u_reviewee.user_id = r.reviewee_id
   WHERE r.pod_id = '$POD_ID';"
```

---

## 전체 엔드포인트 요약

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| `POST` | `/v1/ratings` | ✅ | 평가 제출 |
| `GET` | `/v1/ratings/received` | ✅ | 내가 받은 평가 목록 |
| `GET` | `/v1/ratings/sent` | ✅ | 내가 보낸 평가 목록 |
| `GET` | `/v1/ratings/pods/:podId` | ✅ | 팟 평가 현황 조회 |
| `GET` | `/v1/users/:userId/ratings` | ✅ | 사용자 공개 평가 조회 |

## 허용 태그 목록

| 태그 | 의미 |
|------|------|
| `punctual` | 시간 엄수 |
| `friendly` | 친절함 |
| `safe_driving` | 안전 운전 |
| `clean` | 청결 |
| `good_conversation` | 대화가 즐거움 |
| `quiet_ride` | 조용한 탑승 |
| `helpful` | 배려심 있음 |
