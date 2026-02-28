# Algoway 사용자 API 테스트 가이드

로컬 개발 환경에서 사용자 API를 검증하는 절차를 기록합니다.  
Users API(7개 엔드포인트)를 전수 테스트합니다.

> **사전 조건**: 인증 API 테스트(`docs/testing/01-auth.md`)를 완료하여  
> `ACCESS_TOKEN`, `REFRESH_TOKEN`, `USER_ID` 변수가 준비되어 있어야 합니다.

---

## 목차

0. [사전 준비](#0-사전-준비)
1. [환경 시작 / 토큰 발급](#1-환경-시작--토큰-발급)
2. [내 프로필 조회](#2-내-프로필-조회)
3. [프로필 수정](#3-프로필-수정)
4. [사용자 공개 프로필 조회](#4-사용자-공개-프로필-조회)
5. [탑승 내역 조회](#5-탑승-내역-조회)
6. [즐겨찾는 경로 추가](#6-즐겨찾는-경로-추가)
7. [즐겨찾는 경로 목록 조회](#7-즐겨찾는-경로-목록-조회)
8. [즐겨찾는 경로 삭제](#8-즐겨찾는-경로-삭제)
9. [에러 케이스 테스트](#9-에러-케이스-테스트)
10. [DB 상태 직접 확인](#10-db-상태-직접-확인)

---

## 0. 사전 준비

필요한 도구:

- Docker Desktop (실행 중)
- `curl` (macOS 기본 포함)
- `jq` (응답 JSON 포맷팅용) — `brew install jq`

---

## 1. 환경 시작 / 토큰 발급

### 컨테이너 시작

```bash
cd /Users/cuz/Documents/Github/algoway

docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### 로그인하여 토큰 발급

인증 API 테스트에서 이미 가입한 계정으로 로그인합니다.

```bash
TOKENS=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@university.ac.kr","password":"TestPass1!"}')

ACCESS_TOKEN=$(echo $TOKENS | jq -r '.data.accessToken')
REFRESH_TOKEN=$(echo $TOKENS | jq -r '.data.refreshToken')
USER_ID=$(echo $TOKENS | jq -r '.data.user.userId')

echo "Access Token: ${ACCESS_TOKEN:0:50}..."
echo "User ID: $USER_ID"
```

---

## 2. 내 프로필 조회

```bash
curl -s -X GET http://localhost:3000/v1/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

기대 응답 (`200 OK`):

```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alice@university.ac.kr",
    "nickname": "Alice",
    "profileImage": null,
    "userType": "student",
    "isVerified": true,
    "verificationBadge": "학생 인증",
    "mannerScore": "5.00",
    "totalRides": 0,
    "createdAt": "2026-02-28T12:00:00.000Z"
  }
}
```

---

## 3. 프로필 수정

### 3.1. 닉네임 변경

```bash
curl -s -X PATCH http://localhost:3000/v1/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nickname": "AliceUpdated"}' | jq
```

기대 응답 (`200 OK`):

```json
{
  "success": true,
  "data": {
    "userId": "...",
    "nickname": "AliceUpdated",
    ...
  },
  "message": "프로필이 수정되었습니다."
}
```

### 3.2. 프로필 이미지 URL 변경

```bash
curl -s -X PATCH http://localhost:3000/v1/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"profileImage": "https://example.com/avatar.jpg"}' | jq
```

### 3.3. 프로필 이미지 삭제 (null로 설정)

```bash
curl -s -X PATCH http://localhost:3000/v1/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"profileImage": null}' | jq
```

오류 케이스:

| 재현 방법 | 기대 응답 |
|---|---|
| nickname, profileImage 모두 없음 | `400 INVALID_INPUT` |
| 이미 사용 중인 닉네임 | `409 ALREADY_EXISTS` |
| nickname 1자 | `400 VALIDATION_ERROR` |
| profileImage가 URL이 아님 | `400 VALIDATION_ERROR` |

---

## 4. 사용자 공개 프로필 조회

다른 사용자의 공개 프로필을 조회합니다. 이메일, 비밀번호는 반환되지 않습니다.

```bash
# USER_ID를 실제 userId로 교체
TARGET_USER_ID=$USER_ID

curl -s -X GET "http://localhost:3000/v1/users/$TARGET_USER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

기대 응답 (`200 OK`):

```json
{
  "success": true,
  "data": {
    "userId": "550e8400-...",
    "nickname": "AliceUpdated",
    "profileImage": "https://example.com/avatar.jpg",
    "userType": "student",
    "isVerified": true,
    "verificationBadge": "학생 인증",
    "mannerScore": "5.00",
    "totalRides": 0,
    "createdAt": "2026-02-28T12:00:00.000Z"
  }
}
```

**Note**: `email`, `passwordHash`는 응답에 포함되지 않습니다.

오류 케이스:

| 재현 방법 | 기대 응답 |
|---|---|
| 존재하지 않는 userId | `404 NOT_FOUND` |
| userId가 UUID 형식이 아님 | `400 VALIDATION_ERROR` |

---

## 5. 탑승 내역 조회

**Note**: 팟 기능 구현 전에는 빈 목록이 반환됩니다.

```bash
curl -s -X GET "http://localhost:3000/v1/users/me/rides?page=1&limit=20" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

기대 응답 (`200 OK`):

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "total": 0,
      "page": 1,
      "limit": 20,
      "totalPages": 0,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

상태 필터 사용:

```bash
# 완료된 팟만 조회
curl -s -X GET "http://localhost:3000/v1/users/me/rides?status=completed" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

# 취소된 팟만 조회
curl -s -X GET "http://localhost:3000/v1/users/me/rides?status=cancelled" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

---

## 6. 즐겨찾는 경로 추가

```bash
curl -s -X POST http://localhost:3000/v1/users/me/favorites \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "departurePlace": {
      "name": "서울대입구역",
      "lat": 37.4812,
      "lng": 126.9526
    },
    "arrivalPlace": {
      "name": "관악캠퍼스 정문",
      "lat": 37.4600,
      "lng": 126.9520
    }
  }' | jq
```

기대 응답 (`201 Created`):

```json
{
  "success": true,
  "data": {
    "favoriteId": "abc12345-...",
    "departurePlace": {
      "name": "서울대입구역",
      "lat": 37.4812,
      "lng": 126.9526
    },
    "arrivalPlace": {
      "name": "관악캠퍼스 정문",
      "lat": 37.46,
      "lng": 126.952
    },
    "createdAt": "2026-02-28T12:00:00.000Z"
  },
  "message": "즐겨찾는 경로가 추가되었습니다."
}
```

응답 favoriteId를 변수에 저장:

```bash
FAVORITE_RESULT=$(curl -s -X POST http://localhost:3000/v1/users/me/favorites \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "departurePlace": {"name": "강남역", "lat": 37.4979, "lng": 127.0276},
    "arrivalPlace": {"name": "역삼역", "lat": 37.5007, "lng": 127.0368}
  }')

FAVORITE_ID=$(echo $FAVORITE_RESULT | jq -r '.data.favoriteId')
echo "Favorite ID: $FAVORITE_ID"
```

오류 케이스:

| 재현 방법 | 기대 응답 |
|---|---|
| departurePlace 누락 | `400 VALIDATION_ERROR` |
| lat이 범위 초과 (lat: 200) | `400 VALIDATION_ERROR` |
| name 누락 | `400 VALIDATION_ERROR` |

---

## 7. 즐겨찾는 경로 목록 조회

```bash
curl -s -X GET http://localhost:3000/v1/users/me/favorites \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

기대 응답 (`200 OK`):

```json
{
  "success": true,
  "data": {
    "favorites": [
      {
        "favoriteId": "abc12345-...",
        "departurePlace": {
          "name": "강남역",
          "lat": 37.4979,
          "lng": 127.0276
        },
        "arrivalPlace": {
          "name": "역삼역",
          "lat": 37.5007,
          "lng": 127.0368
        },
        "createdAt": "2026-02-28T12:00:00.000Z"
      }
    ]
  }
}
```

---

## 8. 즐겨찾는 경로 삭제

```bash
curl -s -X DELETE "http://localhost:3000/v1/users/me/favorites/$FAVORITE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

기대 응답 (`200 OK`):

```json
{
  "success": true,
  "message": "즐겨찾는 경로가 삭제되었습니다."
}
```

삭제 후 목록 재조회하여 빈 배열인지 확인:

```bash
curl -s -X GET http://localhost:3000/v1/users/me/favorites \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.data.favorites | length'
# → 0
```

오류 케이스:

| 재현 방법 | 기대 응답 |
|---|---|
| 존재하지 않는 favoriteId | `404 NOT_FOUND` |
| 다른 사용자의 favoriteId | `404 NOT_FOUND` |
| UUID 형식이 아닌 favoriteId | `400 VALIDATION_ERROR` |

---

## 9. 에러 케이스 테스트

### 9.1. 인증 토큰 없이 요청

```bash
curl -s -X GET http://localhost:3000/v1/users/me | jq
# → 401 UNAUTHORIZED
```

### 9.2. 만료된 토큰으로 요청

```bash
curl -s -X GET http://localhost:3000/v1/users/me \
  -H "Authorization: Bearer invalid.token.here" | jq
# → 401 TOKEN_INVALID
```

### 9.3. 중복 닉네임으로 프로필 수정

```bash
# alice와 bob이 각각 가입된 상태에서 alice가 bob의 닉네임으로 변경 시도
curl -s -X PATCH http://localhost:3000/v1/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nickname": "Bob"}' | jq
# → 409 ALREADY_EXISTS
```

### 9.4. 변경 내용 없이 프로필 수정 요청

```bash
curl -s -X PATCH http://localhost:3000/v1/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq
# → 400 INVALID_INPUT
```

---

## 10. DB 상태 직접 확인

```bash
# 사용자 목록 (nickname, profile_image 포함)
docker exec -it algoway-postgres psql -U algoway_user -d algoway \
  -c "SELECT user_id, email, nickname, profile_image, user_type, manner_score FROM users;"

# 즐겨찾는 경로 목록
docker exec -it algoway-postgres psql -U algoway_user -d algoway \
  -c "SELECT favorite_id, user_id, departure_place_name, arrival_place_name,
             ST_Y(departure_location::geometry) AS dep_lat,
             ST_X(departure_location::geometry) AS dep_lng
      FROM favorite_routes;"

# 탑승 내역 (팟 기능 구현 후 사용)
docker exec -it algoway-postgres psql -U algoway_user -d algoway \
  -c "SELECT pp.user_id, p.departure_place_name, p.arrival_place_name, p.status
      FROM pod_participants pp JOIN pods p ON pp.pod_id = p.pod_id;"
```

---

## 전체 테스트 시나리오 (한 번에 실행)

```bash
echo "=== 사전 준비: 로그인 ==="
TOKENS=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@university.ac.kr","password":"TestPass1!"}')
ACCESS_TOKEN=$(echo $TOKENS | jq -r '.data.accessToken')
USER_ID=$(echo $TOKENS | jq -r '.data.user.userId')
echo "User ID: $USER_ID"

echo ""
echo "=== 1. 내 프로필 조회 ==="
curl -s http://localhost:3000/v1/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

echo ""
echo "=== 2. 프로필 수정 ==="
curl -s -X PATCH http://localhost:3000/v1/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nickname": "AliceNew"}' | jq

echo ""
echo "=== 3. 공개 프로필 조회 ==="
curl -s "http://localhost:3000/v1/users/$USER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

echo ""
echo "=== 4. 즐겨찾기 추가 ==="
FAV=$(curl -s -X POST http://localhost:3000/v1/users/me/favorites \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"departurePlace":{"name":"서울대입구역","lat":37.4812,"lng":126.9526},"arrivalPlace":{"name":"관악캠퍼스","lat":37.4600,"lng":126.9520}}')
FAVORITE_ID=$(echo $FAV | jq -r '.data.favoriteId')
echo $FAV | jq

echo ""
echo "=== 5. 즐겨찾기 목록 조회 ==="
curl -s http://localhost:3000/v1/users/me/favorites \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

echo ""
echo "=== 6. 탑승 내역 조회 ==="
curl -s "http://localhost:3000/v1/users/me/rides" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

echo ""
echo "=== 7. 즐겨찾기 삭제 ==="
curl -s -X DELETE "http://localhost:3000/v1/users/me/favorites/$FAVORITE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

echo ""
echo "=== 테스트 완료 ==="
```
