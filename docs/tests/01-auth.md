# Algoway 인증 API 테스트 가이드

로컬 개발 환경에서 인증 API를 검증하는 절차를 기록합니다.  
현재 구현된 Auth API(6개 엔드포인트)를 전수 테스트합니다.

> **플로우**: `verify/send` → `verify/confirm` → `signup` → `login`  
> 이메일 인증을 완료해야 회원가입이 가능합니다. users 테이블에는 인증된 사용자만 저장됩니다.

---

## 목차

0. [사전 준비](#0-사전-준비)
1. [환경 시작 / 종료](#1-환경-시작--종료)
2. [헬스체크](#2-헬스체크)
3. [Auth API 전수 테스트](#3-auth-api-전수-테스트)
   - 3.1 [인증 코드 발송](#31-인증-코드-발송)
   - 3.2 [인증 코드 확인](#32-인증-코드-확인)
   - 3.3 [회원가입](#33-회원가입)
   - 3.4 [로그인](#34-로그인)
   - 3.5 [토큰 갱신](#35-토큰-갱신)
   - 3.6 [로그아웃](#36-로그아웃)
4. [에러 케이스 테스트](#4-에러-케이스-테스트)
5. [DB 상태 직접 확인](#5-db-상태-직접-확인)
6. [로그 모니터링](#6-로그-모니터링)


---

## 0. 사전 준비

필요한 도구:

- Docker Desktop (실행 중)
- `curl` (macOS 기본 포함)
- `jq` (응답 JSON 포맷팅용) — `brew install jq`

---

## 1. 환경 시작 / 종료

### 컨테이너 시작

```bash
cd /Users/cuz/Documents/Github/algoway

docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### 상태 확인

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
```

정상 상태:

```
NAME                STATUS
algoway-postgres    Up X seconds (healthy)
algoway-backend     Up X seconds
```

backend가 `Restarting` 상태라면 로그를 확인합니다:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs backend --tail 40
```

### 컨테이너 종료

```bash
# 컨테이너만 종료 (데이터 유지)
docker compose -f docker-compose.yml -f docker-compose.dev.yml down

# 볼륨까지 삭제 (DB 초기화)
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
```

---

## 2. 헬스체크

```bash
curl -s http://localhost:3000/health | jq
```

기대 응답:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-02-28T12:00:00.000Z",
    "uptime": 123.456,
    "environment": "development"
  }
}
```

---

## 3. Auth API 전수 테스트

테스트는 순서대로 진행합니다. 각 단계의 응답값을 다음 단계에서 사용합니다.

### 3.1. 인증 코드 발송

회원가입 전 반드시 먼저 이메일 인증 코드를 발송합니다.

```bash
curl -s -X POST http://localhost:3000/v1/auth/verify/send \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@university.ac.kr",
    "verificationType": "student"
  }' | jq
```

기대 응답 (`200 OK`):

```json
{
  "success": true,
  "message": "인증 코드가 발송되었습니다."
}
```

오류 케이스:

| 재현 방법 | 기대 응답 |
|---|---|
| 잘못된 이메일 형식 | `400 VALIDATION_ERROR` |
| verificationType 누락 | `400 VALIDATION_ERROR` |

---

### 3.2. 인증 코드 확인

SMTP가 미설정된 개발 환경에서는 인증 코드가 컨테이너 로그에 출력됩니다.

**방법: 컨테이너 로그에서 Ethereal 미리보기 URL 확인**

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs backend \
  2>/dev/null | grep "Mailpit\|code:" | tail -5
```

출력 예시:

```
algoway-backend | 📧 Email Preview URL: https://ethereal.email/message/XXXXX
```

해당 URL을 브라우저에서 열면 전송된 이메일 내용과 **6자리 인증 코드**를 확인할 수 있습니다.

코드를 확인했으면 인증을 완료합니다:

```bash
CODE=123456  # 실제 코드로 교체

curl -s -X POST http://localhost:3000/v1/auth/verify/confirm \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"alice@university.ac.kr\",
    \"verificationCode\": \"$CODE\"
  }" | jq
```

기대 응답 (`200 OK`):

```json
{
  "success": true,
  "data": {
    "isVerified": true,
    "badge": "학생 인증",
    "verifiedAt": "2026-02-28T12:30:00.000Z"
  },
  "message": "인증이 완료되었습니다."
}
```

**Note**: 인증 완료 후 1시간 이내에 회원가입을 완료해야 합니다.

오류 케이스:

| 재현 방법 | 기대 응답 |
|---|---|
| 코드 잘못 입력 | `400 INVALID_INPUT` |
| 코드 만료 (10분 경과) | `400 INVALID_INPUT` |

---

### 3.3. 회원가입

인증이 완료된 이메일로 회원가입합니다. `userType`은 verify/send 단계에서 결정되므로 요청 바디에 포함하지 않습니다.

```bash
curl -s -X POST http://localhost:3000/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@university.ac.kr",
    "password": "TestPass1!",
    "nickname": "Alice"
  }' | jq
```

기대 응답 (`201 Created`):

```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alice@university.ac.kr",
    "nickname": "Alice",
    "userType": "student",
    "isVerified": true,
    "verificationBadge": "학생 인증"
  },
  "message": "회원가입이 완료되었습니다."
}
```

**Note**: `isVerified: true`로 생성됩니다. 미인증 사용자는 users 테이블에 저장되지 않습니다.

오류 케이스:

| 재현 방법 | 기대 응답 |
|---|---|
| verify/confirm 없이 바로 signup | `403 FORBIDDEN` |
| 동일 이메일로 재가입 | `409 ALREADY_EXISTS` |
| 비밀번호 8자 미만 | `400 VALIDATION_ERROR` |

---

### 3.4. 로그인

```bash
curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@university.ac.kr",
    "password": "TestPass1!"
  }' | jq
```

기대 응답 (`200 OK`):

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "email": "alice@university.ac.kr",
      "nickname": "Alice",
      "userType": "student",
      "isVerified": true,
      "verificationBadge": "학생 인증"
    }
  }
}
```

Access Token을 변수로 저장:

```bash
TOKENS=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@university.ac.kr","password":"TestPass1!"}')

ACCESS_TOKEN=$(echo $TOKENS | jq -r '.data.accessToken')
REFRESH_TOKEN=$(echo $TOKENS | jq -r '.data.refreshToken')

echo "Access Token: $ACCESS_TOKEN"
echo "Refresh Token: $REFRESH_TOKEN"
```

오류 케이스:

| 재현 방법 | 기대 응답 |
|---|---|
| 잘못된 비밀번호 | `401 INVALID_CREDENTIALS` |
| 존재하지 않는 이메일 | `401 INVALID_CREDENTIALS` |

---

### 3.5. 토큰 갱신

```bash
curl -s -X POST http://localhost:3000/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}" | jq
```

기대 응답 (`200 OK`):

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...(new)",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...(new)"
  }
}
```

새 토큰으로 업데이트:

```bash
TOKENS=$(curl -s -X POST http://localhost:3000/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")

ACCESS_TOKEN=$(echo $TOKENS | jq -r '.data.accessToken')
REFRESH_TOKEN=$(echo $TOKENS | jq -r '.data.refreshToken')
```

---

### 3.6. 로그아웃

```bash
curl -s -X POST http://localhost:3000/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}" | jq
```

기대 응답 (`200 OK`):

```json
{
  "success": true,
  "data": null,
  "message": "로그아웃되었습니다."
}
```

로그아웃 후 토큰 갱신 시도가 실패하는지 확인:

```bash
curl -s -X POST http://localhost:3000/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}" | jq
# → 401 UNAUTHORIZED
```

---

## 4. 에러 케이스 테스트

### 4.1. 인증 없이 회원가입 시도

```bash
# verify/confirm 없이 바로 signup → 403 에러
curl -s -X POST http://localhost:3000/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "noverify@test.com",
    "password": "TestPass1!",
    "nickname": "미인증사용자"
  }' | jq

# 기대 응답: 403 FORBIDDEN — "이메일 인증을 먼저 완료해주세요."
```

### 4.2. 중복 이메일 회원가입

```bash
# 동일 이메일로 두 번째 회원가입 시도 → 409 에러
# (먼저 verify/send → verify/confirm 을 다시 거쳐야 함)
curl -s -X POST http://localhost:3000/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@university.ac.kr",
    "password": "TestPass1!",
    "nickname": "중복테스트"
  }' | jq

# 기대 응답: 409 ALREADY_EXISTS
```

### 4.3. 잘못된 비밀번호로 로그인

```bash
curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@university.ac.kr",
    "password": "wrongpassword"
  }' | jq

# 기대 응답: 401 INVALID_CREDENTIALS
```

### 4.4. 잘못된 인증 코드

```bash
curl -s -X POST http://localhost:3000/v1/auth/verify/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@university.ac.kr",
    "verificationCode": "000000"
  }' | jq

# 기대 응답: 400 INVALID_INPUT
```

---

## 5. DB 상태 직접 확인

```bash
# users 목록 (모두 is_verified=true 여야 함)
docker exec -it algoway-postgres psql -U algoway_user -d algoway \
  -c "SELECT user_id, email, nickname, user_type, is_verified, verification_badge FROM users;"

# verification_codes 목록
docker exec -it algoway-postgres psql -U algoway_user -d algoway \
  -c "SELECT email, code, verification_type, expires_at, is_used FROM verification_codes ORDER BY created_at DESC LIMIT 10;"

# refresh_tokens 목록
docker exec -it algoway-postgres psql -U algoway_user -d algoway \
  -c "SELECT user_id, expires_at FROM refresh_tokens;"
```

---

## 6. 로그 모니터링

```bash
# 실시간 로그
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f backend

# 에러만 필터
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs backend \
  | grep -i "error\|exception"

# Ethereal 이메일 URL만 필터
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs backend \
  | grep "Preview URL"
```

---

## 전체 테스트 시나리오 (한 번에 실행)

```bash
# 1. 인증 코드 발송
echo "=== 1. 인증 코드 발송 ==="
curl -s -X POST http://localhost:3000/v1/auth/verify/send \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@university.ac.kr",
    "verificationType": "student"
  }' | jq

# 2. 로그에서 인증 코드 확인 (수동)
echo "=== 2. 인증 코드 확인 ==="
echo "다음 명령으로 Ethereal URL을 확인하세요:"
echo "docker compose -f docker-compose.yml -f docker-compose.dev.yml logs backend | grep 'Preview URL' | tail -1"
read -p "인증 코드 6자리를 입력하세요: " CODE

# 3. 이메일 인증 확인
echo "=== 3. 이메일 인증 확인 ==="
curl -s -X POST http://localhost:3000/v1/auth/verify/confirm \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"test@university.ac.kr\",
    \"verificationCode\": \"$CODE\"
  }" | jq

# 4. 회원가입
echo "=== 4. 회원가입 ==="
curl -s -X POST http://localhost:3000/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@university.ac.kr",
    "password": "TestPass1!",
    "nickname": "테스터"
  }' | jq

# 5. 로그인
echo "=== 5. 로그인 ==="
TOKENS=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@university.ac.kr","password":"TestPass1!"}')

ACCESS_TOKEN=$(echo $TOKENS | jq -r '.data.accessToken')
REFRESH_TOKEN=$(echo $TOKENS | jq -r '.data.refreshToken')

echo $TOKENS | jq
echo "Access Token: ${ACCESS_TOKEN:0:50}..."
echo "Refresh Token: ${REFRESH_TOKEN:0:50}..."

# 6. 토큰 갱신
echo "=== 6. 토큰 갱신 ==="
curl -s -X POST http://localhost:3000/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}" | jq

# 7. 로그아웃
echo "=== 7. 로그아웃 ==="
curl -s -X POST http://localhost:3000/v1/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}" | jq

echo "=== 테스트 완료 ==="
```
