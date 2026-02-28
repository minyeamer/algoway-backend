# 인증 API 테스팅 가이드

알고타 인증 API를 테스트하기 위한 문서입니다.  
각 엔드포인트별로 `curl`, REST Client, Postman 등에서 사용할 수 있는 예시를 제공합니다.

---

## 목차

1. [환경 설정](#1-환경-설정)
2. [회원가입](#2-회원가입)
3. [이메일 인증 코드 확인](#3-이메일-인증-코드-확인)
4. [로그인](#4-로그인)
5. [이메일 인증 코드 재발송](#5-이메일-인증-코드-재발송)
6. [토큰 갱신](#6-토큰-갱신)
7. [로그아웃](#7-로그아웃)
8. [테스트 시나리오](#8-테스트-시나리오)

---

## 1. 환경 설정

### 서버 실행

```bash
# Docker Compose로 실행
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 로그 확인
docker logs -f algoway-backend
```

### Base URL

- **로컬 개발**: `http://localhost:3000`
- **운영**: `https://api.algoway.com`

### Health Check

```bash
curl http://localhost:3000/health
```

**응답 예시:**
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

## 2. 회원가입

### 엔드포인트

```
POST /v1/auth/signup
```

**중요**: 회원가입 시 자동으로 인증 코드가 이메일로 발송됩니다. 인증 완료 후에만 로그인이 가능합니다.

### 요청 예시 (curl)

```bash
curl -X POST http://localhost:3000/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@university.ac.kr",
    "password": "password123!",
    "userType": "student",
    "nickname": "홍길동"
  }'
```

### 요청 예시 (REST Client)

```http
POST http://localhost:3000/v1/auth/signup
Content-Type: application/json

{
  "email": "student@university.ac.kr",
  "password": "password123!",
  "userType": "student",
  "nickname": "홍길동"
}
```

### 응답 (201 Created)

```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "student@university.ac.kr",
    "nickname": "홍길동",
    "userType": "student",
    "isVerified": false,
    "verificationRequired": true로 발송된 인증 코드를 확인해주세요."
}
```

**개발 환경에서 인증 코드 확인**

회원가입 후 서버 로그에서 이메일 미리보기 URL을 확인하세요:

```bash
docker logs algoway-backend | grep "Preview URL" | tail -1
```

**로그 예시:**
```
📧 Email Preview URL: https://ethereal.email/message/XXXXX
```

해당 URL을 브라우저에서 열면 전송된 이메일 내용과 인증 코드(6자리 숫자)를 확인할 수 있습니다.message": "회원가입이 완료되었습니다. 이메일 인증을 진행해주세요."
}
```

### 에러 응답 (409 Conflict - 중복 이메일)

```json
{
  "success": false,
  "error": {
    "c이메일 인증 코드 확인

### 엔드포인트

```
POST /v1/auth/verify/confirm
```

**중요**: 인증 완료 후에만 로그인이 가능합니다.

### 요청 예시 (curl)

```bash
curl -X POST http://localhost:3000/v1/auth/verify/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@university.ac.kr",
    "verificationCode": "123456"
  }'
```

### 요청 예시 (REST Client)

```http
POST http://localhost:3000/v1/auth/verify/confirm
Content-Type: application/json

{
  "email": "student@university.ac.kr",
  "verificationCode": "123456"
}
```

### 응답 (200 OK)

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

### 에러 응답 (400 Bad Request - 잘못된 코드)

```json
{
  "success": 3 Forbidden - 이메일 미인증)

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "이메일 인증이 필요합니다. 회원가입 시 발송된 인증 코드를 확인해주세요."
  }
}
```

### 토큰 저장
  "error": {
    "code": "INVALID_INPUT",
    "message": "유효하지 않거나 만료된 인증 코드입니다."
  }
}
```

---

## 4. 로그인

### 엔드포인트

```
POST /v1/auth/login
```

**중요**: 이메일 인증이 완료된 사용자만 로그인할 수 있습니다. 검증 규칙

- **email**: 올바른 이메일 형식
- **password**: 최소 8자, 영문+숫자 포함
- **userType**: `student`, `employee`, `others` 중 하나
- **nickname**: 2~50자, 한글/영문/숫자/언더스코어만 가능

---

## 5. 이메일 인증 코드 재발송

### 엔드포인트

```
POST /v1/auth/verify/send
```

**Note**: 회원가입 시 자동으로 인증 코드가 발송됩니다. 이 API는 코드를 받지 못했거나 만료된 경우에만 사용하세요.

### 요청 예시 (curl)

```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@university.ac.kr",
    "password": "password123!"
  }'
```

### 요청 예시 (REST Client)

```http
POST http://localhost:3000/v1/auth/login
Content-Type: application/json

{
  "email": "student@university.ac.kr",
  "password": "password123!"
}
```

### 응답 (200 OK)

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "email": "student@university.ac.kr",
      "nickname": "홍길동",
      "userType": "student",
      "isVerified": false,
      "verificationBadge": null
    }
  }
}
```

### 에러 응답 (401 Unauthorized - 잘못된 비밀번호)

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "이메일 또는 비밀번호가 올바르지 않습니다."
  }
}
```

### 토큰 저장

로그인 성공 후 받은 토큰을 저장해두세요:

```bash
# 환경 변수로 저장 (테스트 편의)
export ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export REFRESH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 4. 이메일 인증 코드 발송

### 엔드포인트

```
POST /v1/auth/verify/send
```

### 요청 예시 (curl)

```bash
curl -X POST http://localhost:3000/v1/auth/verify/send \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@university.ac.kr",
    "verificationType": "student"
  }'
```

### 요청 예시 (REST Client)

```http
POST http://localhost:3000/v1/auth/verify/send
Content-Type: applica재발송되었습니다." "code": "INVALID_INPUT",
    "message": "유효하지 않거나 만료된 인증 코드입니다."
  }
}
```

### 에러 응답 (401 Unauthorized - 토큰 없음)

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "인증 토큰이 필요합니다."
  }
}
```

---

## 6. 토큰 갱신

### 엔드포인트

```
POST /v1/auth/refresh
```

### 요청 예시 (curl)

```bash
curl -X POST http://localhost:3000/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "'"$REFRESH_TOKEN"'"
  }'
```

### 요청 예시 (REST Client)

```http
POST http://localhost:3000/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 응답 (200 OK)

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...(new)",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...(new)"
  }
}
```

### 에러 응답 (401 Unauthorized - 만료된 토큰)

```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "만료되었거나 유효하지 않은 리프레시 토큰입니다."
  }
}
```

---

## 7. 로그아웃

### 엔드포인트

```
POST /v1/auth/logout
```

⚠️ **인증 필요**: Access Token 헤더 필요

### 요청 예시 (curl)

```bash
curl -X POST http://localhost:3000/v1/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "refreshToken": "'"$REFRESH_TOKEN"'"
  }'
```

### 요청 예시 (REST Client)

```http
POST http://localhost:3000/v1/auth/logout
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 응답 (200 OK)

```json
{
  "success": true,
  "data": null,
  "message": "로그아웃되었습니다."
}
```

---

## 8. 테스트 시나리오

### 시나리오 1: 회원가입 → 로그인 → 이메일 인증

#### Step 1: 회원가입

```bash
curl -X POST http://localhost:3000/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@university.ac.kr",
    "password": "password123!",
    "userType": "student",
    "nickname": "테스터"
  }'
```

#### Step 2: 로그인 (토큰 저장)

```bash
RESPONSE=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@university.ac.kr",
    "password": "password123!"
  }')

ACCESS_TOKEN=$(echo $RESPONSE | jq -r '.data.accessToken')
REFRESH_TOKEN=$(echo $RESPONSE | jq -r '.data.refreshToken')

echo "Access Token: $ACCESS_TOKEN"
echo "Refresh Token: $REFRESH_TOKEN"
```

#### Step 3: 인증 코드 발송

```bash
curl -X POST http://localhost:3000/v1/auth/verify/send \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@university.ac.kr",
    "verificationType": "student"
  }'

# 서버 로그에서 Ethereal URL 확인
docker logs algoway-backend | grep "Preview URL" | tail -1
```

#### Step 4: 이메일에서 코드 확인 후 인증

```bash
# 이메일에서 확인한 코드를 입력 (예: 123456)
curl -X POST http://localhost:3000/v1/auth/verify/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "email": "test@university.ac.kr",
    "verificationCode": "123456"
  }'
```

#### Step 5: 로그아웃

```bash
curl -X POST http://localhost:3000/v1/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "refreshToken": "'"$REFRESH_TOKEN"'"
  }'
```

---

### 시나리오 2: 토큰 만료 후 갱신

#### Step 1: 로그인

```bash이메일 인증 → 로그인

#### Step 1: 회원가입

```bash
curl -X POST http://localhost:3000/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@university.ac.kr",
    "password": "password123!",
    "userType": "student",
    "nickname": "테스터"
  }'
```

#### Step 2: 서버 로그에서 인증 코드 확인

```bash
# 서버 로그에서 Ethereal URL 확인
docker logs algoway-backend | grep "Preview URL" | tail -1
```

브라우저에서 URL을 열어 6자리 인증 코드 확인

#### Step 3: 이메일 인증

```bash
# 이메일에서 확인한 코드를 입력 (예: 123456)
curl -X POST http://localhost:3000/v1/auth/verify/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@university.ac.kr",
    "verificationCode": "123456"
  }'
```

#### Step 4: 로그인 (토큰 저장)

```bash
RESPONSE=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@university.ac.kr",
    "password": "password123!"
  }')

ACCESS_TOKEN=$(echo $RESPONSE | jq -r '.data.accessToken')
REFRESH_TOKEN=$(echo $RESPONSE | jq -r '.data.refreshToken')

echo "Access Token: $ACCESS_TOKEN"
echo "Refresh Token: $REFRESH_TOKEN" 이메일로 두 번째 회원가입 시도 → 409 에러
curl -X POST http://localhost:3000/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "duplicate@test.com",
    "password": "password123!",
    "userType": "student",
    "nickname": "중복테스트2"
  }'
```

#### 잘못된 비밀번호로 로그인

```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@university.ac.kr",
    "password": "wrongpassword"
  }'

# 응답: 401 INVALID_CREDENTIALS
```

#### 유효하지 않은 인증 코드

```bash
curl -X POST http://localhost:3000/v1/auth/verify/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "email": "test@university.ac.kr",
    "verificationCode": "000000"
  }'
인증 코드 재발송

#### Step 1: 회원가입

```bash
curl -X POST http://localhost:3000/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@university.ac.kr",
    "password": "password123!",
    "userType": "student",
    "nickname": "테스터2"
  }'
```

#### Step 2: 인증 코드 재발송 (만료 또는 미수신 시)

```bash
curl -X POST http://localhost:3000/v1/auth/verify/send \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@university.ac.kr",
    "verificationType": "student"
  }'

# 서버 로그에서 Ethereal URL 확인
docker logs algoway-backend | grep "Preview URL" | tail -1
```

#### Step 3: 새 인증 코드로 인증

```bash
curl -X POST http://localhost:3000/v1/auth/verify/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@university.ac.kr",
    "verificationCode": "654321"
  }'
```

---

### 시나리오 3: 토큰 만료 후 갱신

#### Step 1: 로그인 (인증 완료된 사용자)
4: 에러 케이스 테스트

#### 인증 없이 로그인 시도

```bash
# Step 1: 회원가입
curl -X POST http://localhost:3000/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "unverified@test.com",
    "password": "password123!",
    "userType": "student",
    "nickname": "미인증사용자"
  }'

# Step 2: 인증 없이 바로 로그인 시도 → 403 에러
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "unverified@test.com",
    "password": "password123!"
  }'

# 응답: 403 FORBIDDEN - 이메일 인증이 필요합니다
```
---

## 디버깅Tips
인증 코드

```bash
curl -X POST http://localhost:3000/v1/auth/verify/confirm \
  -H "Content-Type: application/json
```

### 4. API 테스트 도구 사용

- **Postman**: Collection 임포트 (추후 제공)
- **REST Client (VS Code)**: 위 예시를 `.http` 파일로 저장
- **Insomnia**: Collection 임포트 (추후 제공)

---

## 다음 단계

인증 API 테스트 완료 후:

1. **사용자 API 테스팅** (`docs/testing-users.md`)
2. **팟 API 테스팅** (`docs/testing-pods.md`)
3. **채팅 API 테스팅** (`docs/testing-chat.md`)
4. **평가 API 테스팅** (`docs/testing-ratings.md`)

---

## 문의

테스트 중 문제가 발생하면:
- GitHub Issues에 등록
- Discord 개발 채널에서 문의
- 이메일: dev@algoway.com
