# 알고타 (Algo-Way) API 문서

> **Base URL** `http://localhost:3000` (개발) · `https://api.algoway.com` (운영)
> **API Version** `v1` — 모든 경로 앞에 `/v1` prefix
> **인증 방식** JWT Bearer Token (`Authorization: Bearer <access_token>`)
> **Content-Type** `application/json`

---

## 공통 규격

### 응답 Envelope

모든 성공 응답은 아래 구조를 따릅니다.

```json
{
  "success": true,
  "data": { "..." : "..." },
  "message": "선택적 메시지"
}
```

오류 응답:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사람이 읽을 수 있는 메시지",
    "details": { "..." : "..." }
  }
}
```

> `data`와 `message`는 상황에 따라 생략될 수 있습니다.
> `error.details`는 개발 환경에서만 포함됩니다.

### HTTP 상태 코드

| 코드 | 의미 |
|---|---|
| 200 | 성공 |
| 201 | 생성 성공 |
| 400 | 잘못된 요청 |
| 401 | 인증 필요 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 409 | 충돌 (중복 등) |
| 429 | 요청 제한 초과 |
| 500 | 서버 오류 |

### Enum 정의

| Enum | 값 |
|---|---|
| UserType | `student` · `employee` · `others` |
| PodStatus | `recruiting` · `full` · `in_progress` · `completed` · `cancelled` |
| VehicleType | `taxi` · `personal` |
| MessageType | `text` · `location` · `status` · `system` |
| NotificationType | `pod_joined` · `pod_full` · `pod_started` · `pod_completed` · `message` · `rating` · `system` |

### 페이지네이션

페이지네이션이 적용되는 목록 API는 아래 공통 쿼리 파라미터를 지원합니다.

| 파라미터 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `page` | integer | 1 | 페이지 번호 (1-based) |
| `limit` | integer | 20 | 페이지당 항목 수 (최대 100) |

페이지네이션 응답 구조:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 에러 코드

| 에러 코드 | HTTP 상태 | 설명 |
|---|---|---|
| `UNAUTHORIZED` | 401 | 인증되지 않은 사용자 |
| `FORBIDDEN` | 403 | 접근 권한 없음 |
| `INVALID_CREDENTIALS` | 401 | 이메일 또는 비밀번호 불일치 |
| `TOKEN_EXPIRED` | 401 | 만료된 토큰 |
| `TOKEN_INVALID` | 401 | 유효하지 않은 토큰 |
| `VALIDATION_ERROR` | 400 | 입력 데이터 검증 실패 |
| `INVALID_INPUT` | 400 | 잘못된 입력값 |
| `NOT_FOUND` | 404 | 리소스를 찾을 수 없음 |
| `ALREADY_EXISTS` | 409 | 이미 존재하는 리소스 (이메일/닉네임 중복 등) |
| `CONFLICT` | 409 | 리소스 충돌 |
| `POD_FULL` | 400 | 팟이 가득 참 |
| `ALREADY_JOINED` | 409 | 이미 참여한 팟 |
| `NOT_PARTICIPANT` | 400 | 팟 참여자가 아님 |
| `CREATOR_CANNOT_LEAVE` | 403 | 방장은 팟을 나갈 수 없음 |
| `RATE_LIMIT_EXCEEDED` | 429 | 요청 제한 초과 |
| `INTERNAL_SERVER_ERROR` | 500 | 서버 내부 오류 |

### Validation 에러 응답

입력값 검증 실패 시 아래 형태로 응답합니다:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력 데이터 검증에 실패했습니다.",
    "details": {
      "fields": {
        "email": "올바른 이메일 형식이 아닙니다.",
        "password": "비밀번호는 최소 8자 이상이어야 합니다."
      }
    }
  }
}
```

---

## 1. 인증 (Auth)

> **회원가입 플로우 (UI 기준)**
> 1. `POST /v1/auth/verify/send` → 이메일 + 인증 유형으로 OTP 요청
> 2. `POST /v1/auth/verify/confirm` → OTP 확인 (Redis에 인증 완료 플래그 저장, 1시간 유효)
> 3. `POST /v1/auth/signup` → 인증된 이메일로 회원가입 제출

---

### 1.1. 이메일 인증 코드 발송

회원가입 전 반드시 먼저 호출합니다. 인증 코드 유효 시간은 10분입니다.

```
POST /v1/auth/verify/send
```

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `email` | string | ✅ | 인증할 이메일 주소 |
| `verificationType` | string | ✅ | `student` · `employee` · `others` |

```json
{
  "email": "user@university.ac.kr",
  "verificationType": "student"
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "인증 코드가 발송되었습니다."
}
```

**Error Cases**

| 상태 | code | 설명 |
|---|---|---|
| 409 | `ALREADY_EXISTS` | 이미 가입된 이메일 |

---

### 1.2. 이메일 인증 코드 확인

OTP를 검증하고 Redis에 인증 완료 플래그를 저장합니다 (1시간 유효).
인증 완료 후 1시간 이내에 회원가입을 완료해야 합니다.

```
POST /v1/auth/verify/confirm
```

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `email` | string | ✅ | 인증 코드를 받은 이메일 |
| `verificationCode` | string | ✅ | 6자리 숫자 인증 코드 |

```json
{
  "email": "user@university.ac.kr",
  "verificationCode": "123456"
}
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "isVerified": true,
    "badge": "학생 인증",
    "verifiedAt": "2026-02-23T10:30:00Z"
  },
  "message": "인증이 완료되었습니다."
}
```

**Error Cases**

| 상태 | code | 설명 |
|---|---|---|
| 400 | `INVALID_INPUT` | 코드 불일치 |
| 400 | `INVALID_INPUT` | 코드 만료 (유효시간 10분) |

---

### 1.3. 회원가입

`verify/confirm` 완료 후 1시간 이내에만 호출 가능합니다.
`userType`은 인증 단계에서 결정된 `verificationType`에 따라 자동 설정됩니다.

```
POST /v1/auth/signup
```

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `email` | string | ✅ | 인증 완료된 이메일 |
| `password` | string | ✅ | 비밀번호 (8자 이상, 영문+숫자 포함) |
| `nickname` | string | ✅ | 닉네임 (2~50자, 한글/영문/숫자/_ 가능) |

```json
{
  "email": "user@university.ac.kr",
  "password": "password123!",
  "nickname": "홍길동"
}
```

**Response `201`**

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@university.ac.kr",
    "nickname": "홍길동",
    "userType": "student",
    "isVerified": true,
    "verificationBadge": "학생 인증"
  },
  "message": "회원가입이 완료되었습니다."
}
```

**Error Cases**

| 상태 | code | 설명 |
|---|---|---|
| 403 | `FORBIDDEN` | 이메일 인증을 먼저 완료해주세요 |
| 409 | `ALREADY_EXISTS` | 이미 가입된 이메일 |

---

### 1.4. 로그인

```
POST /v1/auth/login
```

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `email` | string | ✅ | 이메일 |
| `password` | string | ✅ | 비밀번호 |

```json
{
  "email": "user@university.ac.kr",
  "password": "password123!"
}
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "user": {
      "userId": "uuid",
      "email": "user@university.ac.kr",
      "nickname": "홍길동",
      "userType": "student",
      "isVerified": true,
      "verificationBadge": "학생 인증"
    }
  }
}
```

**Error Cases**

| 상태 | code | 설명 |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | 이메일 또는 비밀번호 불일치 |

---

### 1.5. 토큰 갱신

```
POST /v1/auth/refresh
```

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `refreshToken` | string | ✅ | 로그인 시 발급받은 Refresh Token |

```json
{
  "refreshToken": "eyJhbGci..."
}
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

**Error Cases**

| 상태 | code | 설명 |
|---|---|---|
| 401 | `TOKEN_INVALID` | 유효하지 않은 Refresh Token |
| 401 | `TOKEN_EXPIRED` | 만료된 Refresh Token |

---

### 1.6. 로그아웃

인증 토큰 없이 호출 가능합니다. Refresh Token을 즉시 무효화합니다.

```
POST /v1/auth/logout
```

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `refreshToken` | string | ✅ | 무효화할 Refresh Token |

```json
{
  "refreshToken": "eyJhbGci..."
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "로그아웃되었습니다."
}
```

---

## 2. 사용자 (Users)

> 모든 사용자 API는 `Authorization: Bearer <access_token>` 인증이 필요합니다.

---

### 2.1. 내 프로필 조회

```
GET /v1/users/me
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@university.ac.kr",
    "nickname": "홍길동",
    "profileImage": "https://...",
    "userType": "student",
    "isVerified": true,
    "verificationBadge": "학생 인증",
    "mannerScore": "4.50",
    "totalRides": 15,
    "createdAt": "2026-01-15T09:00:00.000Z"
  }
}
```

> `mannerScore`는 PostgreSQL `numeric` 타입으로, 문자열로 반환됩니다.

---

### 2.2. 프로필 수정

```
PATCH /v1/users/me
```

**Request Body** (모든 필드 선택적, 최소 1개 필수)

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `nickname` | string | — | 닉네임 (2~50자, 한글/영문/숫자/_ 가능) |
| `profileImage` | string \| null | — | 프로필 이미지 URL (`null`로 삭제 가능) |

```json
{
  "nickname": "새닉네임",
  "profileImage": "https://cdn.example.com/img.jpg"
}
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@university.ac.kr",
    "nickname": "새닉네임",
    "profileImage": "https://cdn.example.com/img.jpg",
    "userType": "student",
    "isVerified": true,
    "verificationBadge": "학생 인증",
    "mannerScore": "4.50",
    "totalRides": 15
  },
  "message": "프로필이 수정되었습니다."
}
```

**Error Cases**

| 상태 | code | 설명 |
|---|---|---|
| 400 | `INVALID_INPUT` | 수정할 내용이 없음 |
| 409 | `ALREADY_EXISTS` | 이미 사용 중인 닉네임 |

---

### 2.3. 사용자 상세 조회 (공개 프로필)

```
GET /v1/users/:userId
```

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `userId` | UUID | 조회할 사용자 ID |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "nickname": "홍길동",
    "profileImage": "https://...",
    "userType": "student",
    "isVerified": true,
    "verificationBadge": "학생 인증",
    "mannerScore": "4.50",
    "totalRides": 15
  }
}
```

**Error Cases**

| 상태 | code | 설명 |
|---|---|---|
| 404 | `NOT_FOUND` | 사용자를 찾을 수 없음 |

---

### 2.4. 탑승 내역 조회

```
GET /v1/users/me/rides
```

**Query Parameters**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `page` | integer | — | 1 | 페이지 번호 |
| `limit` | integer | — | 20 | 페이지당 항목 수 (최대 100) |
| `status` | string | — | — | 상태 필터 (`completed` · `cancelled` 등) |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "podId": "uuid",
        "departurePlaceName": "서울대입구역",
        "arrivalPlaceName": "서울대학교 정문",
        "departureTime": "2026-02-20T18:30:00.000Z",
        "vehicleType": "taxi",
        "status": "completed",
        "currentParticipants": 3,
        "maxParticipants": 4,
        "estimatedCost": 8000,
        "costPerPerson": 2000,
        "joinedAt": "2026-02-20T18:00:00.000Z",
        "creatorId": "uuid",
        "creatorNickname": "홍길동",
        "creatorProfileImage": "https://..."
      }
    ],
    "pagination": {
      "total": 15,
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

### 2.5. 즐겨찾는 경로 목록

```
GET /v1/users/me/favorites
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "favorites": [
      {
        "favoriteId": "uuid",
        "departurePlace": {
          "name": "서울대입구역",
          "lat": 37.4812,
          "lng": 126.9526
        },
        "arrivalPlace": {
          "name": "서울대학교 정문",
          "lat": 37.4601,
          "lng": 126.9520
        },
        "createdAt": "2026-02-10T12:00:00.000Z"
      }
    ]
  }
}
```

---

### 2.6. 즐겨찾는 경로 추가

```
POST /v1/users/me/favorites
```

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `departurePlace` | object | ✅ | 출발지 정보 |
| `departurePlace.name` | string | ✅ | 출발지 이름 |
| `departurePlace.lat` | number | ✅ | 출발지 위도 (-90~90) |
| `departurePlace.lng` | number | ✅ | 출발지 경도 (-180~180) |
| `arrivalPlace` | object | ✅ | 도착지 정보 |
| `arrivalPlace.name` | string | ✅ | 도착지 이름 |
| `arrivalPlace.lat` | number | ✅ | 도착지 위도 (-90~90) |
| `arrivalPlace.lng` | number | ✅ | 도착지 경도 (-180~180) |

```json
{
  "departurePlace": {
    "name": "서울대입구역",
    "lat": 37.4812,
    "lng": 126.9526
  },
  "arrivalPlace": {
    "name": "서울대학교 정문",
    "lat": 37.4601,
    "lng": 126.9520
  }
}
```

**Response `201`**

```json
{
  "success": true,
  "data": {
    "favoriteId": "uuid",
    "departurePlace": {
      "name": "서울대입구역",
      "lat": 37.4812,
      "lng": 126.9526
    },
    "arrivalPlace": {
      "name": "서울대학교 정문",
      "lat": 37.4601,
      "lng": 126.9520
    },
    "createdAt": "2026-02-10T12:00:00.000Z"
  },
  "message": "즐겨찾는 경로가 추가되었습니다."
}
```

---

### 2.7. 즐겨찾는 경로 삭제

```
DELETE /v1/users/me/favorites/:favoriteId
```

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `favoriteId` | UUID | 삭제할 경로 ID |

**Response `200`**

```json
{
  "success": true,
  "message": "즐겨찾는 경로가 삭제되었습니다."
}
```

**Error Cases**

| 상태 | code | 설명 |
|---|---|---|
| 404 | `NOT_FOUND` | 즐겨찾는 경로를 찾을 수 없음 |

---

## 3. 팟 (Pods)

> 모든 팟 API는 `Authorization: Bearer <access_token>` 인증이 필요합니다.

---

### 3.1. 팟 생성

팟을 생성하면 DB 트리거가 자동으로 채팅방을 생성하고 생성자를 참여자로 추가합니다.

```
POST /v1/pods
```

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `departurePlace` | object | ✅ | 출발지 정보 |
| `departurePlace.name` | string | ✅ | 출발지 이름 |
| `departurePlace.latitude` | number | ✅ | 출발지 위도 (-90~90) |
| `departurePlace.longitude` | number | ✅ | 출발지 경도 (-180~180) |
| `arrivalPlace` | object | ✅ | 도착지 정보 |
| `arrivalPlace.name` | string | ✅ | 도착지 이름 |
| `arrivalPlace.latitude` | number | ✅ | 도착지 위도 (-90~90) |
| `arrivalPlace.longitude` | number | ✅ | 도착지 경도 (-180~180) |
| `departureTime` | string | ✅ | 출발 시간 (ISO 8601, 현재 시간 이후) |
| `maxParticipants` | integer | ✅ | 최대 인원 (2~4) |
| `vehicleType` | string | ✅ | `taxi` · `personal` |
| `estimatedCost` | integer | — | 예상 비용 (0 이상, 원 단위) |
| `memo` | string | — | 메모 (최대 200자) |

```json
{
  "departurePlace": {
    "name": "서울대입구역 3번 출구",
    "latitude": 37.4812,
    "longitude": 126.9526
  },
  "arrivalPlace": {
    "name": "서울대학교 정문",
    "latitude": 37.4601,
    "longitude": 126.9520
  },
  "departureTime": "2026-02-23T18:30:00Z",
  "maxParticipants": 4,
  "vehicleType": "taxi",
  "estimatedCost": 8000,
  "memo": "같이 가실 분~"
}
```

**Response `201`** — 팟 상세 (§3.4 응답 구조와 동일)

```json
{
  "success": true,
  "data": {
    "podId": "uuid",
    "departurePlace": {
      "name": "서울대입구역 3번 출구",
      "latitude": 37.4812,
      "longitude": 126.9526
    },
    "arrivalPlace": {
      "name": "서울대학교 정문",
      "latitude": 37.4601,
      "longitude": 126.9520
    },
    "departureTime": "2026-02-23T18:30:00.000Z",
    "maxParticipants": 4,
    "currentParticipants": 1,
    "vehicleType": "taxi",
    "estimatedCost": 8000,
    "costPerPerson": 8000,
    "status": "recruiting",
    "memo": "같이 가실 분~",
    "chatRoomId": "uuid",
    "creator": {
      "userId": "uuid",
      "nickname": "홍길동",
      "verificationBadge": "학생 인증",
      "profileImage": "https://...",
      "mannerScore": "4.50"
    },
    "participants": [
      {
        "userId": "uuid",
        "nickname": "홍길동",
        "profileImage": "https://...",
        "verificationBadge": "학생 인증",
        "joinedAt": "2026-02-23T17:00:00.000Z"
      }
    ],
    "createdAt": "2026-02-23T17:00:00.000Z"
  },
  "message": "팟이 생성되었습니다."
}
```

---

### 3.2. 팟 목록 조회 (위치 기반)

현재 위치 기반으로 반경 내 팟을 거리순으로 조회합니다.
기본적으로 `cancelled`, `completed` 상태는 제외됩니다.

```
GET /v1/pods
```

**Query Parameters**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `latitude` | float | ✅ | — | 현재 위치 위도 (-90~90) |
| `longitude` | float | ✅ | — | 현재 위치 경도 (-180~180) |
| `radius` | integer | — | 5000 | 검색 반경 (100~20000m) |
| `page` | integer | — | 1 | 페이지 번호 |
| `limit` | integer | — | 20 | 페이지당 항목 수 (최대 100) |
| `status` | string | — | — | 상태 필터 (`recruiting` · `full` · `in_progress` · `completed`) |

**예시**

```
GET /v1/pods?latitude=37.4812&longitude=126.9526&radius=5000
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "podId": "uuid",
        "departurePlace": {
          "name": "서울대입구역",
          "latitude": 37.4812,
          "longitude": 126.9526
        },
        "arrivalPlace": {
          "name": "서울대학교 정문",
          "latitude": 37.4601,
          "longitude": 126.9520
        },
        "departureTime": "2026-02-23T18:30:00.000Z",
        "maxParticipants": 4,
        "currentParticipants": 2,
        "vehicleType": "taxi",
        "estimatedCost": 8000,
        "costPerPerson": 4000,
        "distance": 350,
        "status": "recruiting",
        "creator": {
          "userId": "uuid",
          "nickname": "홍길동",
          "verificationBadge": "학생 인증"
        },
        "createdAt": "2026-02-23T17:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 8,
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

> `distance`: 출발지로부터 현재 위치까지의 거리 (미터, 정수 반올림)
> `costPerPerson`: `estimatedCost / currentParticipants` (자동 계산)

---

### 3.3. 팟 검색

다중 필터로 팟을 검색합니다. 모든 파라미터는 선택적이며 조합 가능합니다.

```
GET /v1/pods/search
```

**Query Parameters**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `departureLat` | float | — | — | 출발지 위도 |
| `departureLng` | float | — | — | 출발지 경도 |
| `arrivalLat` | float | — | — | 도착지 위도 |
| `arrivalLng` | float | — | — | 도착지 경도 |
| `radius` | integer | — | 5000 | 좌표 검색 반경 (100~20000m) |
| `departureTimeFrom` | string | — | — | 출발 시간 시작 (ISO 8601) |
| `departureTimeTo` | string | — | — | 출발 시간 종료 (ISO 8601) |
| `verifiedOnly` | boolean | — | — | 인증된 사용자만 |
| `vehicleType` | string | — | — | `taxi` · `personal` |
| `page` | integer | — | 1 | 페이지 번호 |
| `limit` | integer | — | 20 | 페이지당 항목 수 (최대 100) |

**예시**

```
GET /v1/pods/search?departureLat=37.4812&departureLng=126.9526&radius=500&verifiedOnly=true
```

**Response `200`** — §3.2 응답과 동일 구조 (페이지네이션 포함)

---

### 3.4. 팟 상세 조회

```
GET /v1/pods/:podId
```

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `podId` | UUID | 팟 ID |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "podId": "uuid",
    "departurePlace": {
      "name": "서울대입구역 3번 출구",
      "latitude": 37.4812,
      "longitude": 126.9526
    },
    "arrivalPlace": {
      "name": "서울대학교 정문",
      "latitude": 37.4601,
      "longitude": 126.9520
    },
    "departureTime": "2026-02-23T18:30:00.000Z",
    "maxParticipants": 4,
    "currentParticipants": 2,
    "vehicleType": "taxi",
    "estimatedCost": 8000,
    "costPerPerson": 4000,
    "status": "recruiting",
    "memo": "같이 가실 분~",
    "chatRoomId": "uuid",
    "creator": {
      "userId": "uuid",
      "nickname": "홍길동",
      "verificationBadge": "학생 인증",
      "profileImage": "https://...",
      "mannerScore": "4.50"
    },
    "participants": [
      {
        "userId": "uuid",
        "nickname": "홍길동",
        "profileImage": "https://...",
        "verificationBadge": "학생 인증",
        "joinedAt": "2026-02-23T17:00:00.000Z"
      },
      {
        "userId": "uuid",
        "nickname": "김철수",
        "profileImage": "https://...",
        "verificationBadge": "직장인 인증",
        "joinedAt": "2026-02-23T17:15:00.000Z"
      }
    ],
    "createdAt": "2026-02-23T17:00:00.000Z"
  }
}
```

**Error Cases**

| 상태 | code | 설명 |
|---|---|---|
| 404 | `NOT_FOUND` | 팟을 찾을 수 없음 |

---

### 3.5. 팟 참여

```
POST /v1/pods/:podId/join
```

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `podId` | UUID | 참여할 팟 ID |

**Response `201`**

```json
{
  "success": true,
  "data": {
    "podId": "uuid",
    "chatRoomId": "uuid",
    "currentParticipants": 3,
    "maxParticipants": 4
  },
  "message": "팟에 참여했습니다."
}
```

**Error Cases**

| 상태 | code | 설명 |
|---|---|---|
| 400 | `POD_FULL` | 팟이 이미 가득 참 |
| 404 | `NOT_FOUND` | 팟을 찾을 수 없음 |
| 409 | `ALREADY_JOINED` | 이미 참여한 팟 |

---

### 3.6. 팟 나가기

방장(생성자)은 팟을 나갈 수 없습니다.

```
POST /v1/pods/:podId/leave
```

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `podId` | UUID | 나갈 팟 ID |

**Response `200`**

```json
{
  "success": true,
  "message": "팟에서 나갔습니다."
}
```

**Error Cases**

| 상태 | code | 설명 |
|---|---|---|
| 400 | `NOT_PARTICIPANT` | 팟 참여자가 아님 |
| 403 | `CREATOR_CANNOT_LEAVE` | 방장은 나갈 수 없음 |
| 404 | `NOT_FOUND` | 팟을 찾을 수 없음 |

---

### 3.7. 팟 상태 변경 (방장 전용)

팟 생성자만 상태를 변경할 수 있습니다. `cancelled` 또는 `completed` 상태에서는 변경 불가합니다.

```
PATCH /v1/pods/:podId/status
```

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `podId` | UUID | 팟 ID |

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `status` | string | ✅ | `recruiting` · `full` · `in_progress` · `completed` · `cancelled` |

```json
{
  "status": "in_progress"
}
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "podId": "uuid",
    "status": "in_progress"
  },
  "message": "팟 상태가 변경되었습니다."
}
```

**Error Cases**

| 상태 | code | 설명 |
|---|---|---|
| 403 | `FORBIDDEN` | 팟 방장이 아님 |
| 404 | `NOT_FOUND` | 팟을 찾을 수 없음 |

---

## 4. 채팅 (Chat)

> 모든 채팅 API는 `Authorization: Bearer <access_token>` 인증이 필요합니다.

---

### 4.1. 내 채팅방 목록

```
GET /v1/chat/rooms
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "chatRoomId": "uuid",
        "pod": {
          "podId": "uuid",
          "departurePlace": "서울대입구역",
          "arrivalPlace": "서울대학교 정문",
          "departureTime": "2026-02-23T18:30:00.000Z",
          "status": "recruiting"
        },
        "lastMessage": {
          "messageId": "uuid",
          "content": "몇 시에 출발할까요?",
          "sender": {
            "userId": "uuid",
            "nickname": "김철수"
          },
          "createdAt": "2026-02-23T17:20:00.000Z"
        },
        "unreadCount": 2,
        "createdAt": "2026-02-23T17:00:00.000Z"
      }
    ]
  }
}
```

---

### 4.2. 채팅 메시지 조회

```
GET /v1/chat/rooms/:chatRoomId/messages
```

**Query Parameters**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `page` | integer | — | 1 | 페이지 번호 |
| `limit` | integer | — | 50 | 페이지당 메시지 수 |
| `before` | UUID | — | — | 특정 메시지 ID 이전 메시지 조회 (커서 기반) |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "messageId": "uuid",
        "chatRoomId": "uuid",
        "content": "안녕하세요!",
        "messageType": "text",
        "sender": {
          "userId": "uuid",
          "nickname": "홍길동",
          "profileImage": "https://..."
        },
        "createdAt": "2026-02-23T17:10:00.000Z"
      },
      {
        "messageId": "uuid",
        "chatRoomId": "uuid",
        "messageType": "location",
        "location": {
          "latitude": 37.4812,
          "longitude": 126.9526,
          "address": "서울특별시 관악구 봉천동"
        },
        "sender": {
          "userId": "uuid",
          "nickname": "홍길동",
          "profileImage": "https://..."
        },
        "createdAt": "2026-02-23T17:25:00.000Z"
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 50,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

### 4.3. 메시지 전송

```
POST /v1/chat/rooms/:chatRoomId/messages
```

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `messageType` | string | ✅ | `text` · `location` |
| `content` | string | 조건 | 텍스트 메시지 내용 (`messageType=text` 시 필수) |
| `location` | object | 조건 | 위치 정보 (`messageType=location` 시 필수) |
| `location.latitude` | number | 조건 | 위도 |
| `location.longitude` | number | 조건 | 경도 |
| `location.address` | string | 조건 | 주소 |

```json
{
  "messageType": "text",
  "content": "안녕하세요!"
}
```

**Response `201`**

```json
{
  "success": true,
  "data": {
    "messageId": "uuid",
    "chatRoomId": "uuid",
    "content": "안녕하세요!",
    "messageType": "text",
    "sender": {
      "userId": "uuid",
      "nickname": "홍길동",
      "profileImage": "https://..."
    },
    "createdAt": "2026-02-23T17:10:00.000Z"
  }
}
```

---

### 4.4. 준비 완료 상태 업데이트

```
POST /v1/chat/rooms/:chatRoomId/ready
```

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `isReady` | boolean | ✅ | 준비 완료 여부 |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "isReady": true
  },
  "message": "준비 완료 상태가 업데이트되었습니다."
}
```

---

### 4.5. 채팅방 참여자 준비 상태 조회

```
GET /v1/chat/rooms/:chatRoomId/participants
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "participants": [
      {
        "userId": "uuid",
        "nickname": "홍길동",
        "profileImage": "https://...",
        "verificationBadge": "학생 인증",
        "isReady": true
      },
      {
        "userId": "uuid",
        "nickname": "김철수",
        "profileImage": "https://...",
        "verificationBadge": "직장인 인증",
        "isReady": false
      }
    ],
    "allReady": false
  }
}
```

---

## 5. 평가 (Rating)

> 모든 평가 API는 `Authorization: Bearer <access_token>` 인증이 필요합니다.

---

### 5.1. 매너 평가 작성

```
POST /v1/ratings
```

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `podId` | UUID | ✅ | 평가 대상 팟 |
| `revieweeId` | UUID | ✅ | 평가 대상 사용자 |
| `rating` | integer | ✅ | 평점 (1~5) |
| `tags` | string[] | — | 평가 태그 |
| `comment` | string | — | 코멘트 |

```json
{
  "podId": "uuid",
  "revieweeId": "uuid",
  "rating": 5,
  "tags": ["시간 약속 잘 지킴", "친절함"],
  "comment": "좋은 분이셨습니다!"
}
```

**Response `201`**

```json
{
  "success": true,
  "data": {
    "ratingId": "uuid",
    "podId": "uuid",
    "rating": 5,
    "tags": ["시간 약속 잘 지킴", "친절함"],
    "comment": "좋은 분이셨습니다!",
    "createdAt": "2026-02-23T19:00:00.000Z",
    "reviewer": {
      "userId": "uuid",
      "nickname": "홍길동",
      "profileImage": "https://...",
      "verificationBadge": "학생 인증"
    }
  },
  "message": "평가가 완료되었습니다."
}
```

---

### 5.2. 내가 받은 평가 조회

```
GET /v1/ratings/received
```

**Query Parameters**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `page` | integer | — | 1 | 페이지 번호 |
| `limit` | integer | — | 20 | 페이지당 항목 수 |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "ratingId": "uuid",
        "podId": "uuid",
        "rating": 5,
        "tags": ["시간 약속 잘 지킴", "친절함"],
        "comment": "좋은 분이셨습니다!",
        "createdAt": "2026-02-23T19:00:00.000Z",
        "reviewer": {
          "userId": "uuid",
          "nickname": "홍길동",
          "profileImage": "https://...",
          "verificationBadge": "학생 인증"
        }
      }
    ],
    "pagination": {
      "total": 15,
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

### 5.3. 내가 보낸 평가 조회

```
GET /v1/ratings/sent
```

**Query Parameters**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `page` | integer | — | 1 | 페이지 번호 |
| `limit` | integer | — | 20 | 페이지당 항목 수 |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "ratingId": "uuid",
        "podId": "uuid",
        "rating": 5,
        "tags": ["시간 약속 잘 지킴", "친절함"],
        "comment": "좋은 분이셨습니다!",
        "createdAt": "2026-02-23T19:00:00.000Z",
        "reviewer": {
          "userId": "uuid",
          "nickname": "홍길동",
          "profileImage": "https://...",
          "verificationBadge": "학생 인증"
        }
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

### 5.4. 팟 평가 현황 조회

완료된 팟에서 본인이 아직 평가하지 않은 참여자를 확인합니다. 팟 참여자만 조회 가능합니다.

```
GET /v1/ratings/pods/:podId
```

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `podId` | UUID | 조회할 팟 ID |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "podId": "uuid",
    "departurePlaceName": "서울대입구역",
    "arrivalPlaceName": "서울대학교 정문",
    "departureTime": "2026-02-23T18:30:00.000Z",
    "participants": [
      {
        "userId": "uuid",
        "nickname": "김철수",
        "profileImage": "https://...",
        "verificationBadge": "직장인 인증",
        "alreadyRated": false
      }
    ]
  }
}
```

**Error Cases**

| 상태 | code | 설명 |
|---|---|---|
| 400 | `POD_NOT_COMPLETED` | 팟이 완료 상태가 아님 |
| 403 | `NOT_PARTICIPANT` | 팟 참여자가 아님 |
| 404 | `NOT_FOUND` | 팟을 찾을 수 없음 |

---

## 6. 알림 (Notifications)

> 모든 알림 API는 `Authorization: Bearer <access_token>` 인증이 필요합니다.

---

### 6.1. 알림 목록 조회

```
GET /v1/notifications
```

**Query Parameters**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `page` | integer | — | 1 | 페이지 번호 |
| `limit` | integer | — | 20 | 페이지당 항목 수 |
| `unreadOnly` | boolean | — | false | 읽지 않은 알림만 |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "notificationId": "uuid",
        "type": "pod_joined",
        "title": "새로운 참여자",
        "message": "김철수님이 팟에 참여했습니다.",
        "data": {
          "podId": "uuid",
          "userId": "uuid"
        },
        "isRead": false,
        "createdAt": "2026-02-23T17:15:00.000Z"
      }
    ],
    "unreadCount": 3,
    "pagination": {
      "total": 10,
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

### 6.2. 알림 읽음 처리

```
PATCH /v1/notifications/:notificationId/read
```

**Response `200`**

```json
{
  "success": true,
  "message": "알림을 읽음 처리했습니다."
}
```

---

### 6.3. 모든 알림 읽음 처리

```
PATCH /v1/notifications/read-all
```

**Response `200`**

```json
{
  "success": true,
  "message": "모든 알림을 읽음 처리했습니다."
}
```

---

### 6.4. 알림 설정 조회

```
GET /v1/notifications/settings
```

**Response `200`**

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
      "message": true,
      "rating": true
    }
  }
}
```

---

### 6.5. 알림 설정 업데이트

```
PATCH /v1/notifications/settings
```

**Request Body** (모든 필드 선택적)

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `pushEnabled` | boolean | — | 푸시 알림 활성화 |
| `emailEnabled` | boolean | — | 이메일 알림 활성화 |
| `notificationTypes` | object | — | 알림 유형별 On/Off |

```json
{
  "pushEnabled": true,
  "emailEnabled": false,
  "notificationTypes": {
    "pod_joined": true,
    "pod_full": true,
    "pod_started": true,
    "message": false,
    "rating": true
  }
}
```

**Response `200`** — 변경된 설정 전체 반환 (§6.4 응답 구조와 동일)

---

## 7. WebSocket (실시간 통신)

> Socket.io 클라이언트로 연결합니다. 인증은 연결 시 `auth.token` 또는 `Authorization` 헤더로 전달합니다.

### 7.1. 연결

```
Socket.io URL: http://localhost:3000 (개발) · https://api.algoway.com (운영)
```

```javascript
// 연결 예시
const socket = io('http://localhost:3000', {
  auth: { token: accessToken },
  // 또는: extraHeaders: { Authorization: `Bearer ${accessToken}` }
});
```

### 7.2. 클라이언트 → 서버

| 이벤트 | data | 설명 |
|---|---|---|
| `chat:join` | `{ chatRoomId }` | 채팅방 입장 |
| `chat:leave` | `{ chatRoomId }` | 채팅방 나가기 (팟 탈퇴 아님) |
| `chat:message` | `{ chatRoomId, messageType, content?, location? }` | 메시지 전송 (`text` · `location`) |
| `chat:typing` | `{ chatRoomId }` | 타이핑 중 알림 |
| `chat:stop_typing` | `{ chatRoomId }` | 타이핑 중지 알림 |
| `chat:ready` | `{ chatRoomId, isReady }` | 준비 상태 변경 |

### 7.3. 서버 → 클라이언트

| 이벤트 | data | 설명 |
|---|---|---|
| `chat:joined` | `{ chatRoomId, message }` | 본인 입장 완료 확인 |
| `chat:left` | `{ chatRoomId, message }` | 본인 퇴장 완료 확인 |
| `chat:user_joined` | `{ chatRoomId, userId, nickname, timestamp }` | 다른 참여자 입장 |
| `chat:user_left` | `{ chatRoomId, userId, nickname, timestamp }` | 다른 참여자 퇴장 |
| `chat:new_message` | `{ messageId, chatRoomId, content, messageType, sender, createdAt }` | 새 메시지 수신 |
| `chat:user_typing` | `{ chatRoomId, userId, nickname, timestamp }` | 타이핑 중 알림 |
| `chat:user_stop_typing` | `{ chatRoomId, userId, nickname, timestamp }` | 타이핑 중지 알림 |
| `chat:ready_update` | `{ chatRoomId, userId, nickname, isReady, participants, allReady, timestamp }` | 준비 상태 변경 브로드캐스트 |
| `chat:user_disconnected` | `{ chatRoomId, userId, nickname, timestamp }` | 참여자 연결 끊김 |
| `error:chat` | `{ event, code, message }` | 오류 응답 |

---

## 부록

### A. 구현 현황

| 섹션 | 상태 | 버전 |
|---|---|---|
| 1. 인증 (Auth) | ✅ 구현 완료 | v1.1.0 |
| 2. 사용자 (Users) | ✅ 구현 완료 | v1.2.0 |
| 3. 팟 (Pods) | ✅ 구현 완료 | v1.3.0 |
| 4. 채팅 (Chat) | ✅ 구현 완료 | v1.4.0 |
| 5. 평가 (Rating) | ✅ 구현 완료 | v1.5.0 |
| 6. 알림 (Notifications) | ✅ 구현 완료 | v1.7.0 |
| 7. WebSocket | ✅ 구현 완료 | v1.4.1 |

### B. 페이지별 API 매핑

| 페이지 | 사용 API |
|---|---|
| P01: 온보딩/스플래시 | 없음 (정적) |
| P02: 회원가입/인증 | §1.1 · §1.2 · §1.3 |
| P03: 홈 피드 | §3.2 |
| P04: 팟 상세 | §3.4 · §3.5 |
| P05: 팟 생성 | §3.1 |
| P06: 채팅방 | §4.2 · §4.3 · §4.4 · §7 |
| P07: 검색/필터 | §3.3 |
| P08: 마이페이지 | §2.1 · §2.2 · §2.4 · §2.5 · §6.4 |

### C. 데이터 모델

```typescript
// 사용자
interface User {
  userId: string;
  email: string;
  nickname: string;
  profileImage: string | null;
  userType: 'student' | 'employee' | 'others';
  isVerified: boolean;
  verificationBadge: string | null;
  mannerScore: string;         // numeric, 문자열로 반환
  totalRides: number;
  createdAt: Date;
  updatedAt: Date;
}

// 팟
interface Pod {
  podId: string;
  departurePlace: { name: string; latitude: number; longitude: number };
  arrivalPlace: { name: string; latitude: number; longitude: number };
  departureTime: Date;
  maxParticipants: number;     // 2~4
  currentParticipants: number;
  vehicleType: 'taxi' | 'personal';
  estimatedCost: number | null;
  costPerPerson: number | null;
  memo: string | null;
  status: 'recruiting' | 'full' | 'in_progress' | 'completed' | 'cancelled';
  creatorId: string;
  chatRoomId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 즐겨찾는 경로
interface FavoriteRoute {
  favoriteId: string;
  departurePlace: { name: string; lat: number; lng: number };
  arrivalPlace: { name: string; lat: number; lng: number };
  createdAt: Date;
}

// 채팅 메시지
interface Message {
  messageId: string;
  chatRoomId: string;
  senderId: string;
  messageType: 'text' | 'location' | 'status' | 'system';
  content: string | null;
  location: { latitude: number; longitude: number; address: string } | null;
  createdAt: Date;
}

// 평가
interface Rating {
  ratingId: string;
  podId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;              // 1~5
  tags: string[];
  comment: string | null;
  createdAt: Date;
}
```
