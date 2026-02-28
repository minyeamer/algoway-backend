# Algoway 인증 API 테스트 가이드

로컬 개발 환경에서 인증 API를 검증하는 절차를 기록합니다.  
현재 구현된 Auth API(6개 엔드포인트)를 전수 테스트합니다.

---

## 목차

0. [사전 준비](#0-사전-준비)
1. [환경 시작 / 종료](#1-환경-시작--종료)
2. [헬스체크](#2-헬스체크)
3. [Auth API 전수 테스트](#3-auth-api-전수-테스트)
   - 3.1 [회원가입](#31-회원가입)
   - 3.2 [인증 코드 확인](#32-인증-코드-확인)
   - 3.3 [이메일 인증](#33-이메일-인증)
   - 3.4 [로그인](#34-로그인)
   - 3.5 [인증 코드 재발송](#35-인증-코드-재발송)
   - 3.6 [토큰 갱신](#36-토큰-갱신)
   - 3.7 [로그아웃](#37-로그아웃)
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

### 3.1. 회원가입

```bash
curl -s -X POST http://localhost:3000/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@university.ac.kr",
    "password": "TestPass1!",
    "userType": "student",
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
    "isVerified": false,
    "verificationRequired": true
  },
  "message": "회원가입이 완료되었습니다. 이메일로 발송된 인증 코드를 확인해주세요."
}
```

**중요**: 회원가입 시 자동으로 인증 코드가 이메일로 발송됩니다.

오류 케이스:

| 재현 방법 | 기대 응답 |
|---|---|
| 동일 이메일로 `/signup` 재호출 | `409 EMAIL_ALREADY_EXISTS` |
| 잘못된 이메일 형식 | `400 VALIDATION_ERROR` |
| 비밀번호 8자 미만 | `400 VALIDATION_ERROR` |

---

### 3.2. 인증 코드 확인

SMTP가 미설정된 개발 환경에서는 인증 코드가 컨테이너 로그에 출력됩니다.

**방법: 컨테이너 로그에서 Ethereal 미리보기 URL 확인**

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs backend \
  | grep "Preview URL" | tail -1
```

출력 예시:

```
algoway-backend | 📧 Email Preview URL: https://ethereal.email/message/XXXXX
```

해당 URL을 브라우저에서 열면 전송된 이메일 내용과 **6자리 인증 코드**를 확인할 수 있습니다.

---

### 3.3. 이메일 인증

위에서 얻은 코드를 사용합니다.

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

오류 케이스:

| 재현 방법 | 기대 응답 |
|---|---|
| 코드 잘못 입력 | `400 INVALID_INPUT` |
| 코드 만료 (10분 경과) | `400 CODE_EXPIRED` |

---

### 3.4. 로그인

**중요**: 이메일 인증이 완료된 사용자만 로그인할 수 있습니다.

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
| 이메일 미인증 계정으로 로그인 | `403 EMAIL_NOT_VERIFIED` |

---

### 3.5. 인증 코드 재발송

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
  "data": null,
  "message": "인증 코드가 재발송되었습니다."
}
```

**Note**: 회원가입 시 자동으로 인증 코드가 발송되므로, 이 API는 코드를 받지 못했거나 만료된 경우에만 사용합니다.

---

### 3.6. 토큰 갱신

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

### 3.7. 로그아웃

```bash
curl -s -X POST http://localhost:3000/v1/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
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

### 4.1. 인증 없이 로그인 시도

```bash
# Step 1: 회원가입
curl -s -X POST http://localhost:3000/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "unverified@test.com",
    "password": "TestPass1!",
    "userType": "student",
    "nickname": "미인증사용자"
  }' | jq

# Step 2: 인증 없이 바로 로그인 시도 → 403 에러
curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "unverified@test.com",
    "password": "TestPass1!"
  }' | jq

# 기대 응답: 403 FORBIDDEN
```

### 4.2. 중복 이메일 회원가입

```bash
# 동일 이메일로 두 번째 회원가입 시도 → 409 에러
curl -s -X POST http://localhost:3000/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@university.ac.kr",
    "password": "TestPass1!",
    "userType": "student",
    "nickname": "중복테스트"
  }' | jq

# 기대 응답: 409 EMAIL_ALREADY_EXISTS
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
# users 목록
docker exec -it algoway-postgres psql -U algoway_user -d algoway \
  -c "SELECT user_id, email, nickname, user_type, is_verified FROM users;"

# verification_codes 목록
docker exec -it algoway-postgres psql -U algoway_user -d algoway \
  -c "SELECT user_id, email, code, expires_at FROM verification_codes WHERE expires_at > now();"

# refresh_tokens 목록
docker exec -it algoway-postgres psql -U algoway_user -d algoway \
  -c "SELECT user_id, expires_at, is_revoked FROM refresh_tokens;"
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
# 1. 회원가입
echo "=== 1. 회원가입 ==="
curl -s -X POST http://localhost:3000/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@university.ac.kr",
    "password": "TestPass1!",
    "userType": "student",
    "nickname": "테스터"
  }' | jq

# 2. 로그에서 인증 코드 확인 (수동)
echo "=== 2. 인증 코드 확인 ==="
echo "다음 명령으로 Ethereal URL을 확인하세요:"
echo "docker compose -f docker-compose.yml -f docker-compose.dev.yml logs backend | grep 'Preview URL' | tail -1"
read -p "인증 코드 6자리를 입력하세요: " CODE

# 3. 이메일 인증
echo "=== 3. 이메일 인증 ==="
curl -s -X POST http://localhost:3000/v1/auth/verify/confirm \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"test@university.ac.kr\",
    \"verificationCode\": \"$CODE\"
  }" | jq

# 4. 로그인
echo "=== 4. 로그인 ==="
TOKENS=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@university.ac.kr","password":"TestPass1!"}')

ACCESS_TOKEN=$(echo $TOKENS | jq -r '.data.accessToken')
REFRESH_TOKEN=$(echo $TOKENS | jq -r '.data.refreshToken')

echo $TOKENS | jq
echo "Access Token: ${ACCESS_TOKEN:0:50}..."
echo "Refresh Token: ${REFRESH_TOKEN:0:50}..."

# 5. 토큰 갱신
echo "=== 5. 토큰 갱신 ==="
curl -s -X POST http://localhost:3000/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}" | jq

# 6. 로그아웃
echo "=== 6. 로그아웃 ==="
curl -s -X POST http://localhost:3000/v1/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}" | jq

echo "=== 테스트 완료 ==="
```

---

## 다음 단계

인증 API 테스트 완료 후:

1. **사용자 API 테스팅** (`docs/testing-users.md`)
2. **팟 API 테스팅** (`docs/testing-pods.md`)
3. **채팅 API 테스팅** (`docs/testing-chat.md`)
4. **평가 API 테스팅** (`docs/testing-ratings.md`)

