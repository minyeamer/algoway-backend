# Algoway 알림 API 테스트 가이드

로컬 개발 환경에서 알림(Notifications) API를 검증하는 절차를 기록합니다.  
5개 엔드포인트와 주요 에러 케이스를 전수 테스트합니다.

---

## 목차

0. [사전 준비](#0-사전-준비)
1. [환경 시작 / 토큰 발급](#1-환경-시작--토큰-발급)
2. [테스트 알림 데이터 준비](#2-테스트-알림-데이터-준비)
3. [알림 목록 조회](#3-알림-목록-조회)
4. [단일 알림 읽음 처리](#4-단일-알림-읽음-처리)
5. [전체 알림 읽음 처리](#5-전체-알림-읽음-처리)
6. [알림 설정 조회](#6-알림-설정-조회)
7. [알림 설정 업데이트](#7-알림-설정-업데이트)
8. [에러 케이스 테스트](#8-에러-케이스-테스트)
9. [DB 상태 직접 확인](#9-db-상태-직접-확인)

---

## 0. 사전 준비

필요한 도구:

- Docker Desktop (실행 중)
- `curl` (macOS 기본 포함)
- `jq` (응답 JSON 포맷팅용) — `brew install jq`
- `psql` — `brew install postgresql@16` (DB 직접 확인용)

**알림 시스템 주요 특징:**
- 모든 엔드포인트는 Bearer 토큰 인증이 필요합니다.
- `notification_settings` 행은 회원가입 시 DB 트리거(`create_notification_settings_for_user`)에 의해 자동 생성됩니다.
- 다른 사용자의 알림을 읽음처리하려고 하면 `NOTIFICATION_NOT_FOUND(404)` 반환 (보안 처리).
- 알림 타입: `pod_joined` | `pod_full` | `pod_started` | `pod_completed` | `message` | `rating` | `system`

---

## 1. 환경 시작 / 토큰 발급

### 컨테이너 시작

```bash
cd /Users/cuz/Documents/Github/algoway

docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### 로그인 — 사용자 A (Alice)

```bash
TOKEN_A=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@university.ac.kr","password":"TestPass1!"}' \
  | jq -r '.data.accessToken')

USER_A="e7996183-c53f-4bf4-bedc-c8082b17efad"
echo "A: ${TOKEN_A:0:30}..."
```

### 로그인 — 사용자 B (Bob)

```bash
TOKEN_B=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@university.ac.kr","password":"TestPass1!"}' \
  | jq -r '.data.accessToken')

USER_B="da72b373-3ca0-4228-83e2-4814b392c21c"
echo "B: ${TOKEN_B:0:30}..."
```

---

## 2. 테스트 알림 데이터 준비

알림은 서비스 내부(팟 참가, 채팅, 평가 등)에서 자동 생성되지만, 독립 테스트를 위해 DB에 직접 삽입합니다.

```bash
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
DB_URL=$(grep "^DATABASE_URL=" .env | cut -d= -f2-)

psql "$DB_URL" -c "
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES
    ('$USER_A', 'system',  '테스트 알림1', '시스템 공지입니다.', '{\"key\": \"value\"}'),
    ('$USER_A', 'rating',  '새로운 평가',  '평점을 받았습니다.',  '{\"ratingId\": \"abc-123\"}'),
    ('$USER_A', 'message', '새 메시지',    '새 채팅 메시지가 있습니다.', '{\"podId\": \"pod-xyz\"}')
  RETURNING notification_id, type;
"
```

삽입 후 반환된 `notification_id` 중 하나를 변수로 저장합니다:

```bash
NOTIF_ID="<위에서 반환된 notification_id>"
```

---

## 3. 알림 목록 조회

### 기본 조회 (페이지네이션)

**`GET /v1/notifications`**

```bash
curl -s "http://localhost:3000/v1/notifications" \
  -H "Authorization: Bearer $TOKEN_A" | jq .
```

**예상 응답:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "notificationId": "82cc627f-ed7e-...",
        "type": "system",
        "title": "테스트 알림1",
        "message": "시스템 공지입니다.",
        "data": { "key": "value" },
        "isRead": false,
        "createdAt": "2026-03-16T14:38:06.592Z"
      }
    ],
    "unreadCount": 3,
    "pagination": {
      "total": 3,
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

**확인 포인트:**
- `items` 배열에 알림 목록 반환
- `unreadCount` = 읽지 않은 알림 수
- `pagination` 포함

---

### 미읽음 필터 (`?unreadOnly=true`)

**`GET /v1/notifications?unreadOnly=true`**

```bash
curl -s "http://localhost:3000/v1/notifications?unreadOnly=true" \
  -H "Authorization: Bearer $TOKEN_A" | jq '.data.items | length'
```

**확인 포인트:** 반환된 항목 수 = `data.unreadCount`와 일치해야 함

---

### 페이지네이션 파라미터

```bash
curl -s "http://localhost:3000/v1/notifications?page=1&limit=2" \
  -H "Authorization: Bearer $TOKEN_A" | jq '.data.pagination'
```

**확인 포인트:** `limit=2`이면 `items` 최대 2개, `totalPages` = `ceil(total / 2)`

---

## 4. 단일 알림 읽음 처리

**`PATCH /v1/notifications/:notificationId/read`**

```bash
curl -s -X PATCH "http://localhost:3000/v1/notifications/$NOTIF_ID/read" \
  -H "Authorization: Bearer $TOKEN_A" | jq .
```

**예상 응답:**

```json
{
  "success": true,
  "message": "알림을 읽음 처리했습니다."
}
```

**처리 후 확인:**

```bash
curl -s "http://localhost:3000/v1/notifications" \
  -H "Authorization: Bearer $TOKEN_A" | jq '.data.unreadCount'
```

**확인 포인트:** `unreadCount`가 1 감소해야 함

---

## 5. 전체 알림 읽음 처리

**`PATCH /v1/notifications/read-all`**

```bash
curl -s -X PATCH "http://localhost:3000/v1/notifications/read-all" \
  -H "Authorization: Bearer $TOKEN_A" | jq .
```

**예상 응답:**

```json
{
  "success": true,
  "data": {
    "updatedCount": 2
  },
  "message": "모든 알림을 읽음 처리했습니다."
}
```

**처리 후 확인:**

```bash
curl -s "http://localhost:3000/v1/notifications" \
  -H "Authorization: Bearer $TOKEN_A" | jq '.data.unreadCount'
# 0 이어야 함
```

**확인 포인트:**
- `updatedCount` = 실제 읽음 처리된 미읽음 알림 수
- 처리 후 `unreadCount` = `0`
- 이미 모두 읽음 상태이면 `updatedCount: 0` 반환

---

## 6. 알림 설정 조회

**`GET /v1/notifications/settings`**

```bash
curl -s "http://localhost:3000/v1/notifications/settings" \
  -H "Authorization: Bearer $TOKEN_A" | jq .
```

**예상 응답:**

```json
{
  "success": true,
  "data": {
    "pushEnabled": true,
    "emailEnabled": false,
    "notificationTypes": {
      "pod_joined": true,
      "pod_full": true,
      "pod_started": true,
      "pod_completed": true,
      "message": true,
      "rating": true
    }
  }
}
```

**확인 포인트:**
- `pushEnabled`, `emailEnabled`: 채널별 수신 여부
- `notificationTypes`: 알림 유형별 수신 여부 (기본값 전부 `true`)

---

## 7. 알림 설정 업데이트

**`PATCH /v1/notifications/settings`**

### 전체 설정 변경

```bash
curl -s -X PATCH "http://localhost:3000/v1/notifications/settings" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{
    "pushEnabled": false,
    "notificationTypes": {
      "pod_joined": false,
      "pod_full": true,
      "pod_started": true,
      "pod_completed": true,
      "message": true,
      "rating": false
    }
  }' | jq .
```

**예상 응답:**

```json
{
  "success": true,
  "data": {
    "pushEnabled": false,
    "emailEnabled": false,
    "notificationTypes": {
      "pod_joined": false,
      "pod_full": true,
      "pod_started": true,
      "pod_completed": true,
      "message": true,
      "rating": false
    }
  },
  "message": "알림 설정이 업데이트되었습니다."
}
```

### 부분 업데이트 (`emailEnabled`만)

```bash
curl -s -X PATCH "http://localhost:3000/v1/notifications/settings" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"emailEnabled": true}' | jq '.data.emailEnabled'
# true 이어야 함, 나머지 필드는 이전 값 유지
```

**확인 포인트:** 전달하지 않은 필드는 기존 값을 유지해야 함

---

## 8. 에러 케이스 테스트

### E1. 인증 없이 접근 → 401

```bash
curl -s "http://localhost:3000/v1/notifications" | jq '.error.code'
# "UNAUTHORIZED"
```

### E2. 존재하지 않는 알림 읽음처리 → 404

```bash
curl -s -X PATCH \
  "http://localhost:3000/v1/notifications/00000000-0000-0000-0000-000000000000/read" \
  -H "Authorization: Bearer $TOKEN_A" | jq '.error.code'
# "NOTIFICATION_NOT_FOUND"
```

### E3. 다른 사용자의 알림 읽음처리 → 404 (보안)

```bash
# TOKEN_B로 USER_A의 알림 읽음처리 시도
curl -s -X PATCH "http://localhost:3000/v1/notifications/$NOTIF_ID/read" \
  -H "Authorization: Bearer $TOKEN_B" | jq '.error.code'
# "NOTIFICATION_NOT_FOUND" (403 대신 404를 반환하여 존재 자체를 노출하지 않음)
```

### E4. 유효하지 않은 UUID 형식 → 422

```bash
curl -s -X PATCH "http://localhost:3000/v1/notifications/not-a-uuid/read" \
  -H "Authorization: Bearer $TOKEN_A" | jq '.error.code'
# "VALIDATION_ERROR"
```

### E5. 설정 업데이트 — 잘못된 타입 → 422

```bash
curl -s -X PATCH "http://localhost:3000/v1/notifications/settings" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"pushEnabled": "yes"}' | jq '.error.code'
# "VALIDATION_ERROR"
```

---

## 9. DB 상태 직접 확인

### notifications 테이블 직접 조회

```bash
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
DB_URL=$(grep "^DATABASE_URL=" .env | cut -d= -f2-)

psql "$DB_URL" -c "
  SELECT notification_id, type, title, is_read, created_at
  FROM notifications
  WHERE user_id = '$USER_A'
  ORDER BY created_at DESC;
"
```

### notification_settings 테이블 직접 조회

```bash
psql "$DB_URL" -c "
  SELECT push_enabled, email_enabled,
         pod_joined, pod_full, pod_started, pod_completed, message, rating,
         updated_at
  FROM notification_settings
  WHERE user_id = '$USER_A';
"
```

### 테스트 데이터 정리 (선택)

```bash
psql "$DB_URL" -c "
  DELETE FROM notifications
  WHERE user_id = '$USER_A'
    AND title IN ('테스트 알림1', '새로운 평가', '새 메시지');
"
```

---

## 실행 결과 요약 (검증 완료)

| # | 엔드포인트 | 시나리오 | HTTP | 결과 |
|---|-----------|---------|------|------|
| 1 | GET /v1/notifications | 목록 조회 (기본) | 200 | ✅ |
| 2 | GET /v1/notifications?unreadOnly=true | 미읽음 필터 | 200 | ✅ |
| 3 | GET /v1/notifications?page=1&limit=2 | 페이지네이션 | 200 | ✅ |
| 4 | PATCH /v1/notifications/:id/read | 단일 읽음 처리 | 200 | ✅ |
| 5 | PATCH /v1/notifications/read-all | 전체 읽음 처리 | 200 | ✅ |
| 6 | GET /v1/notifications/settings | 설정 조회 | 200 | ✅ |
| 7 | PATCH /v1/notifications/settings | 설정 전체 업데이트 | 200 | ✅ |
| 8 | PATCH /v1/notifications/settings | 설정 부분 업데이트 | 200 | ✅ |
| E1 | GET /v1/notifications | 인증 없음 | 401 | ✅ |
| E2 | PATCH /:id/read | 존재하지 않는 알림 | 404 | ✅ |
| E3 | PATCH /:id/read | 다른 사용자의 알림 | 404 | ✅ |
| E4 | PATCH /:id/read | 유효하지 않은 UUID | 422 | ✅ |
| E5 | PATCH /settings | 잘못된 타입 | 422 | ✅ |
