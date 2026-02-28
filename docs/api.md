# API 문서

## 개요

알고타(Algo-Way) 백엔드 API 문서입니다.

- Base URL: `https://api.algoway.com`
- API Version: `v1`
- 인증 방식: Bearer Token (JWT)

---

## 1. 인증 (Authentication)

### 1.1. 회원가입

```
POST /v1/auth/signup
```

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "password123!",
  "userType": "student",  // "student" | "employee" | "others"
  "nickname": "홍길동"
}
```

**Response - 201 Created**
```json
{
  "success": true,
  "data": {
    "userId": "uuid-1234",
    "email": "user@example.com",
    "nickname": "홍길동",
    "userType": "student",
    "isVerified": false,
    "verificationRequired": true
  },
  "message": "회원가입이 완료되었습니다. 이메일 인증을 진행해주세요."
}
```

### 1.2. 로그인

```
POST /v1/auth/login
```

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "password123!"
}
```

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "user": {
      "userId": "uuid-1234",
      "email": "user@example.com",
      "nickname": "홍길동",
      "userType": "student",
      "isVerified": true,
      "verificationBadge": "학생 인증"
    }
  }
}
```

### 1.3. 이메일 인증 코드 발송

```
POST /v1/auth/verify/send
```

**Request Body**
```json
{
  "email": "user@university.ac.kr",
  "verificationType": "student"  // "student" | "employee" | "others"
}
```

**Response - 200 OK**
```json
{
  "success": true,
  "message": "인증 코드가 발송되었습니다."
}
```

### 1.4. 이메일 인증 코드 확인

```
POST /v1/auth/verify/confirm
```

**Request Body**
```json
{
  "email": "user@university.ac.kr",
  "verificationCode": "123456"
}
```

**Response - 200 OK**
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

### 1.5. 토큰 갱신

```
POST /v1/auth/refresh
```

**Request Body**
```json
{
  "refreshToken": "eyJhbGci..."
}
```

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

---

## 2. 사용자 (Users)

### 2.1. 내 프로필 조회

```
GET /v1/users/me
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "userId": "uuid-1234",
    "email": "user@university.ac.kr",
    "nickname": "홍길동",
    "profileImage": "https://cdn.algoway.com/profiles/...",
    "userType": "student",
    "isVerified": true,
    "verificationBadge": "학생 인증",
    "mannerScore": 4.5,
    "totalRides": 15,
    "createdAt": "2026-01-15T09:00:00Z"
  }
}
```

### 2.2. 프로필 수정

```
PATCH /v1/users/me
```

**Headers**
```
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

**Request Body (Form Data)**
```
nickname: "새닉네임"
profileImage: [File]
```

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "userId": "uuid-1234",
    "nickname": "새닉네임",
    "profileImage": "https://cdn.algoway.com/profiles/..."
  },
  "message": "프로필이 수정되었습니다."
}
```

### 2.3. 사용자 상세 조회

```
GET /v1/users/{userId}
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "userId": "uuid-1234",
    "nickname": "홍길동",
    "profileImage": "https://cdn.algoway.com/profiles/...",
    "verificationBadge": "학생 인증",
    "mannerScore": 4.5,
    "totalRides": 15
  }
}
```

### 2.4. 탑승 내역 조회

```
GET /v1/users/me/rides
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Query Parameters**
- `page` (optional): 페이지 번호 (default: 1)
- `limit` (optional): 페이지당 개수 (default: 20)
- `status` (optional): 상태 필터 ("completed" | "cancelled")

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "rides": [
      {
        "rideId": "ride-uuid-1",
        "pod": {
          "podId": "pod-uuid-1",
          "departurePlace": "서울대입구역",
          "arrivalPlace": "서울대학교 정문",
          "departureTime": "2026-02-20T18:30:00Z"
        },
        "cost": 3500,
        "status": "completed",
        "completedAt": "2026-02-20T18:45:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

### 2.5. 즐겨찾는 경로 목록

```
GET /v1/users/me/favorites
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "favorites": [
      {
        "favoriteId": "fav-uuid-1",
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
        "createdAt": "2026-02-10T12:00:00Z"
      }
    ]
  }
}
```

### 2.6. 즐겨찾는 경로 추가

```
POST /v1/users/me/favorites
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Request Body**
```json
{
  "departurePlace": {
    "name": "서울대입구역",
    "latitude": 37.4812,
    "longitude": 126.9526
  },
  "arrivalPlace": {
    "name": "서울대학교 정문",
    "latitude": 37.4601,
    "longitude": 126.9520
  }
}
```

**Response - 201 Created**
```json
{
  "success": true,
  "data": {
    "favoriteId": "fav-uuid-1",
    "departurePlace": {
      "name": "서울대입구역",
      "latitude": 37.4812,
      "longitude": 126.9526
    },
    "arrivalPlace": {
      "name": "서울대학교 정문",
      "latitude": 37.4601,
      "longitude": 126.9520
    }
  },
  "message": "즐겨찾는 경로가 추가되었습니다."
}
```

### 2.7. 즐겨찾는 경로 삭제

```
DELETE /v1/users/me/favorites/{favoriteId}
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Response - 200 OK**
```json
{
  "success": true,
  "message": "즐겨찾는 경로가 삭제되었습니다."
}
```

---

## 3. 팟 (Pods - 카풀)

### 3.1. 팟 생성

```
POST /v1/pods
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Request Body**
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
  "vehicleType": "taxi",  // "taxi" | "personal"
  "memo": "같이 가실 분~"
}
```

**Response - 201 Created**
```json
{
  "success": true,
  "data": {
    "podId": "pod-uuid-1",
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
    "currentParticipants": 1,
    "vehicleType": "taxi",
    "estimatedCost": 8000,
    "costPerPerson": 2000,
    "memo": "같이 가실 분~",
    "status": "recruiting",
    "creator": {
      "userId": "uuid-1234",
      "nickname": "홍길동",
      "verificationBadge": "학생 인증"
    },
    "createdAt": "2026-02-23T17:00:00Z"
  },
  "message": "팟이 생성되었습니다."
}
```

### 3.2. 팟 목록 조회 (홈 피드)

```
GET /v1/pods
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Query Parameters**
- `latitude` (required): 현재 위치 위도
- `longitude` (required): 현재 위치 경도
- `radius` (optional): 검색 반경(m) (default: 5000)
- `page` (optional): 페이지 번호 (default: 1)
- `limit` (optional): 페이지당 개수 (default: 20)
- `status` (optional): 상태 필터 ("recruiting" | "full" | "in_progress" | "completed")

**Example**
```
GET /v1/pods?latitude=37.4812&longitude=126.9526&radius=5000&page=1&limit=20
```

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "pods": [
      {
        "podId": "pod-uuid-1",
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
        "departureTime": "2026-02-23T18:30:00Z",
        "maxParticipants": 4,
        "currentParticipants": 2,
        "vehicleType": "taxi",
        "estimatedCost": 8000,
        "costPerPerson": 4000,
        "distance": 350,  // 내 위치로부터의 거리(m)
        "status": "recruiting",
        "creator": {
          "userId": "uuid-1234",
          "nickname": "홍길동",
          "verificationBadge": "학생 인증"
        },
        "createdAt": "2026-02-23T17:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8,
      "totalPages": 1
    }
  }
}
```

### 3.3. 팟 상세 조회

```
GET /v1/pods/{podId}
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "podId": "pod-uuid-1",
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
    "currentParticipants": 2,
    "vehicleType": "taxi",
    "estimatedCost": 8000,
    "costPerPerson": 4000,
    "memo": "같이 가실 분~",
    "status": "recruiting",
    "route": {
      "distance": 3200,  // 총 이동 거리(m)
      "duration": 900,   // 예상 소요 시간(초)
      "polyline": "encoded_polyline_here"  // Kakao Map API polyline
    },
    "creator": {
      "userId": "uuid-1234",
      "nickname": "홍길동",
      "profileImage": "https://cdn.algoway.com/profiles/...",
      "verificationBadge": "학생 인증",
      "mannerScore": 4.5
    },
    "participants": [
      {
        "userId": "uuid-1234",
        "nickname": "홍길동",
        "profileImage": "https://cdn.algoway.com/profiles/...",
        "verificationBadge": "학생 인증",
        "joinedAt": "2026-02-23T17:00:00Z"
      },
      {
        "userId": "uuid-5678",
        "nickname": "김철수",
        "profileImage": "https://cdn.algoway.com/profiles/...",
        "verificationBadge": "직장인 인증",
        "joinedAt": "2026-02-23T17:15:00Z"
      }
    ],
    "chatRoomId": "chat-uuid-1",
    "createdAt": "2026-02-23T17:00:00Z"
  }
}
```

### 3.4. 팟 참여

```
POST /v1/pods/{podId}/join
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "podId": "pod-uuid-1",
    "chatRoomId": "chat-uuid-1",
    "currentParticipants": 3,
    "maxParticipants": 4
  },
  "message": "팟에 참여했습니다."
}
```

**Error Response - 400 Bad Request**
```json
{
  "success": false,
  "error": {
    "code": "POD_FULL",
    "message": "팟이 이미 가득 찼습니다."
  }
}
```

### 3.5. 팟 나가기

```
POST /v1/pods/{podId}/leave
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Response - 200 OK**
```json
{
  "success": true,
  "message": "팟에서 나갔습니다."
}
```

### 3.6. 팟 검색 및 필터링

```
GET /v1/pods/search
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Query Parameters**
- `departurePlace` (optional): 출발지 이름
- `departureLat` (optional): 출발지 위도
- `departureLng` (optional): 출발지 경도
- `arrivalPlace` (optional): 도착지 이름
- `arrivalLat` (optional): 도착지 위도
- `arrivalLng` (optional): 도착지 경도
- `departureTimeFrom` (optional): 출발 시간 시작 (ISO 8601)
- `departureTimeTo` (optional): 출발 시간 종료 (ISO 8601)
- `radius` (optional): 검색 반경(m) (default: 1000)
- `verifiedOnly` (optional): 인증된 사용자만 (true | false)
- `vehicleType` (optional): 이동 수단 ("taxi" | "personal")
- `page` (optional): 페이지 번호 (default: 1)
- `limit` (optional): 페이지당 개수 (default: 20)

**Example**
```
GET /v1/pods/search?departureLat=37.4812&departureLng=126.9526&radius=500&verifiedOnly=true
```

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "pods": [
      {
        "podId": "pod-uuid-1",
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
        "departureTime": "2026-02-23T18:30:00Z",
        "maxParticipants": 4,
        "currentParticipants": 2,
        "vehicleType": "taxi",
        "costPerPerson": 4000,
        "distance": 350,
        "status": "recruiting",
        "creator": {
          "userId": "uuid-1234",
          "nickname": "홍길동",
          "verificationBadge": "학생 인증"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "totalPages": 1
    }
  }
}
```

### 3.7. 팟 상태 업데이트 (방장 전용)

```
PATCH /v1/pods/{podId}/status
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Request Body**
```json
{
  "status": "in_progress"  // "recruiting" | "full" | "in_progress" | "completed" | "cancelled"
}
```

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "podId": "pod-uuid-1",
    "status": "in_progress"
  },
  "message": "팟 상태가 업데이트되었습니다."
}
```

---

## 4. 채팅 (Chat)

### 4.1. 내 채팅방 목록

```
GET /v1/chat/rooms
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "chatRooms": [
      {
        "chatRoomId": "chat-uuid-1",
        "pod": {
          "podId": "pod-uuid-1",
          "departurePlace": "서울대입구역",
          "arrivalPlace": "서울대학교 정문",
          "departureTime": "2026-02-23T18:30:00Z",
          "status": "recruiting"
        },
        "lastMessage": {
          "messageId": "msg-uuid-1",
          "content": "몇 시에 출발할까요?",
          "sender": {
            "userId": "uuid-5678",
            "nickname": "김철수"
          },
          "createdAt": "2026-02-23T17:20:00Z"
        },
        "unreadCount": 2,
        "participants": [
          {
            "userId": "uuid-1234",
            "nickname": "홍길동",
            "profileImage": "https://cdn.algoway.com/profiles/..."
          }
        ],
        "createdAt": "2026-02-23T17:00:00Z"
      }
    ]
  }
}
```

### 4.2. 채팅 메시지 조회

```
GET /v1/chat/rooms/{chatRoomId}/messages
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Query Parameters**
- `page` (optional): 페이지 번호 (default: 1)
- `limit` (optional): 페이지당 개수 (default: 50)
- `before` (optional): 특정 메시지 ID 이전 메시지 조회

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "messageId": "msg-uuid-1",
        "chatRoomId": "chat-uuid-1",
        "content": "안녕하세요!",
        "messageType": "text",  // "text" | "location" | "status" | "system"
        "sender": {
          "userId": "uuid-1234",
          "nickname": "홍길동",
          "profileImage": "https://cdn.algoway.com/profiles/..."
        },
        "createdAt": "2026-02-23T17:10:00Z"
      },
      {
        "messageId": "msg-uuid-2",
        "chatRoomId": "chat-uuid-1",
        "content": "몇 시에 출발할까요?",
        "messageType": "text",
        "sender": {
          "userId": "uuid-5678",
          "nickname": "김철수",
          "profileImage": "https://cdn.algoway.com/profiles/..."
        },
        "createdAt": "2026-02-23T17:20:00Z"
      },
      {
        "messageId": "msg-uuid-3",
        "chatRoomId": "chat-uuid-1",
        "messageType": "location",
        "location": {
          "latitude": 37.4812,
          "longitude": 126.9526,
          "address": "서울특별시 관악구 봉천동"
        },
        "sender": {
          "userId": "uuid-1234",
          "nickname": "홍길동",
          "profileImage": "https://cdn.algoway.com/profiles/..."
        },
        "createdAt": "2026-02-23T17:25:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "hasMore": false
    }
  }
}
```

### 4.3. 메시지 전송

```
POST /v1/chat/rooms/{chatRoomId}/messages
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Request Body - 텍스트 메시지**
```json
{
  "messageType": "text",
  "content": "안녕하세요!"
}
```

**Request Body - 위치 공유**
```json
{
  "messageType": "location",
  "location": {
    "latitude": 37.4812,
    "longitude": 126.9526,
    "address": "서울특별시 관악구 봉천동"
  }
}
```

**Response - 201 Created**
```json
{
  "success": true,
  "data": {
    "messageId": "msg-uuid-1",
    "chatRoomId": "chat-uuid-1",
    "content": "안녕하세요!",
    "messageType": "text",
    "sender": {
      "userId": "uuid-1234",
      "nickname": "홍길동",
      "profileImage": "https://cdn.algoway.com/profiles/..."
    },
    "createdAt": "2026-02-23T17:10:00Z"
  }
}
```

### 4.4. 준비 완료 상태 업데이트

```
POST /v1/chat/rooms/{chatRoomId}/ready
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Request Body**
```json
{
  "isReady": true
}
```

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "userId": "uuid-1234",
    "isReady": true
  },
  "message": "준비 완료 상태가 업데이트되었습니다."
}
```

### 4.5. 채팅방 참여자 준비 상태 조회

```
GET /v1/chat/rooms/{chatRoomId}/participants
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "participants": [
      {
        "userId": "uuid-1234",
        "nickname": "홍길동",
        "profileImage": "https://cdn.algoway.com/profiles/...",
        "verificationBadge": "학생 인증",
        "isReady": true
      },
      {
        "userId": "uuid-5678",
        "nickname": "김철수",
        "profileImage": "https://cdn.algoway.com/profiles/...",
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

### 5.1. 매너 평가 작성

```
POST /v1/ratings
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Request Body**
```json
{
  "podId": "pod-uuid-1",
  "targetUserId": "uuid-5678",
  "score": 5,  // 1~5
  "tags": ["시간 약속 잘 지킴", "친절함"],
  "comment": "좋은 분이셨습니다!"
}
```

**Response - 201 Created**
```json
{
  "success": true,
  "data": {
    "ratingId": "rating-uuid-1",
    "podId": "pod-uuid-1",
    "targetUserId": "uuid-5678",
    "score": 5,
    "tags": ["시간 약속 잘 지킴", "친절함"],
    "comment": "좋은 분이셨습니다!",
    "createdAt": "2026-02-23T19:00:00Z"
  },
  "message": "평가가 등록되었습니다."
}
```

### 5.2. 내가 받은 평가 조회

```
GET /v1/ratings/received
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Query Parameters**
- `page` (optional): 페이지 번호 (default: 1)
- `limit` (optional): 페이지당 개수 (default: 20)

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "averageScore": 4.5,
    "totalCount": 15,
    "ratings": [
      {
        "ratingId": "rating-uuid-1",
        "score": 5,
        "tags": ["시간 약속 잘 지킴", "친절함"],
        "comment": "좋은 분이셨습니다!",
        "rater": {
          "userId": "uuid-1234",
          "nickname": "홍길동"
        },
        "createdAt": "2026-02-23T19:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

### 5.3. 평가 가능한 팟 목록

```
GET /v1/ratings/pending
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "pendingRatings": [
      {
        "podId": "pod-uuid-1",
        "departurePlace": "서울대입구역",
        "arrivalPlace": "서울대학교 정문",
        "completedAt": "2026-02-23T18:45:00Z",
        "participantsToRate": [
          {
            "userId": "uuid-5678",
            "nickname": "김철수",
            "profileImage": "https://cdn.algoway.com/profiles/..."
          }
        ]
      }
    ]
  }
}
```

---

## 6. 위치 및 지도 (Location)

### 6.1. 주소 검색

```
GET /v1/location/search
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Query Parameters**
- `query` (required): 검색할 주소 또는 장소명

**Example**
```
GET /v1/location/search?query=서울대입구역
```

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "places": [
      {
        "name": "서울대입구역",
        "address": "서울특별시 관악구 봉천동",
        "latitude": 37.4812,
        "longitude": 126.9526,
        "category": "지하철역"
      },
      {
        "name": "서울대입구역 3번 출구",
        "address": "서울특별시 관악구 봉천동",
        "latitude": 37.4815,
        "longitude": 126.9530,
        "category": "지하철역"
      }
    ]
  }
}
```

### 6.2. 경로 계산

```
POST /v1/location/route
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Request Body**
```json
{
  "origin": {
    "latitude": 37.4812,
    "longitude": 126.9526
  },
  "destination": {
    "latitude": 37.4601,
    "longitude": 126.9520
  }
}
```

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "distance": 3200,  // 총 거리(m)
    "duration": 900,   // 예상 소요 시간(초)
    "estimatedCost": 8000,  // 예상 택시 요금(원)
    "polyline": "encoded_polyline_here",  // 경로 polyline
    "waypoints": [
      {
        "latitude": 37.4812,
        "longitude": 126.9526
      },
      {
        "latitude": 37.4700,
        "longitude": 126.9520
      },
      {
        "latitude": 37.4601,
        "longitude": 126.9520
      }
    ]
  }
}
```

---

## 7. 알림 (Notifications)

### 7.1. 알림 목록 조회

```
GET /v1/notifications
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Query Parameters**
- `page` (optional): 페이지 번호 (default: 1)
- `limit` (optional): 페이지당 개수 (default: 20)
- `unreadOnly` (optional): 읽지 않은 알림만 (true | false)

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "notificationId": "noti-uuid-1",
        "type": "pod_joined",  // "pod_joined" | "pod_full" | "pod_starting" | "chat_message" | "rating_received"
        "title": "새로운 참여자",
        "message": "김철수님이 팟에 참여했습니다.",
        "data": {
          "podId": "pod-uuid-1",
          "userId": "uuid-5678"
        },
        "isRead": false,
        "createdAt": "2026-02-23T17:15:00Z"
      }
    ],
    "unreadCount": 3,
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 10,
      "totalPages": 1
    }
  }
}
```

### 7.2. 알림 읽음 처리

```
PATCH /v1/notifications/{notificationId}/read
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Response - 200 OK**
```json
{
  "success": true,
  "message": "알림을 읽음 처리했습니다."
}
```

### 7.3. 모든 알림 읽음 처리

```
PATCH /v1/notifications/read-all
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Response - 200 OK**
```json
{
  "success": true,
  "message": "모든 알림을 읽음 처리했습니다."
}
```

### 7.4. 알림 설정 조회

```
GET /v1/notifications/settings
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "pushEnabled": true,
    "emailEnabled": false,
    "notificationTypes": {
      "pod_joined": true,
      "pod_full": true,
      "pod_starting": true,
      "chat_message": true,
      "rating_received": true
    }
  }
}
```

### 7.5. 알림 설정 업데이트

```
PATCH /v1/notifications/settings
```

**Headers**
```
Authorization: Bearer {accessToken}
```

**Request Body**
```json
{
  "pushEnabled": true,
  "emailEnabled": false,
  "notificationTypes": {
    "pod_joined": true,
    "pod_full": true,
    "pod_starting": true,
    "chat_message": false,
    "rating_received": true
  }
}
```

**Response - 200 OK**
```json
{
  "success": true,
  "data": {
    "pushEnabled": true,
    "emailEnabled": false,
    "notificationTypes": {
      "pod_joined": true,
      "pod_full": true,
      "pod_starting": true,
      "chat_message": false,
      "rating_received": true
    }
  },
  "message": "알림 설정이 업데이트되었습니다."
}
```

---

## 8. WebSocket (실시간 통신)

### 8.1. 연결

```
WebSocket URL: wss://api.algoway.com/ws
```

**연결 시 Query Parameter**
```
?token={accessToken}
```

### 8.2. 이벤트 타입

**클라이언트 → 서버**

```javascript
// 채팅방 입장
{
  "type": "join_room",
  "data": {
    "chatRoomId": "chat-uuid-1"
  }
}

// 채팅방 나가기
{
  "type": "leave_room",
  "data": {
    "chatRoomId": "chat-uuid-1"
  }
}

// 메시지 전송
{
  "type": "send_message",
  "data": {
    "chatRoomId": "chat-uuid-1",
    "messageType": "text",
    "content": "안녕하세요!"
  }
}

// 준비 상태 변경
{
  "type": "update_ready_status",
  "data": {
    "chatRoomId": "chat-uuid-1",
    "isReady": true
  }
}

// 타이핑 중 알림
{
  "type": "typing",
  "data": {
    "chatRoomId": "chat-uuid-1"
  }
}
```

**서버 → 클라이언트**

```javascript
// 새 메시지 수신
{
  "type": "new_message",
  "data": {
    "messageId": "msg-uuid-1",
    "chatRoomId": "chat-uuid-1",
    "content": "안녕하세요!",
    "messageType": "text",
    "sender": {
      "userId": "uuid-1234",
      "nickname": "홍길동",
      "profileImage": "https://cdn.algoway.com/profiles/..."
    },
    "createdAt": "2026-02-23T17:10:00Z"
  }
}

// 참여자 준비 상태 변경
{
  "type": "ready_status_updated",
  "data": {
    "chatRoomId": "chat-uuid-1",
    "userId": "uuid-1234",
    "isReady": true
  }
}

// 새 참여자 입장
{
  "type": "user_joined",
  "data": {
    "chatRoomId": "chat-uuid-1",
    "user": {
      "userId": "uuid-5678",
      "nickname": "김철수",
      "profileImage": "https://cdn.algoway.com/profiles/...",
      "verificationBadge": "직장인 인증"
    }
  }
}

// 참여자 나가기
{
  "type": "user_left",
  "data": {
    "chatRoomId": "chat-uuid-1",
    "userId": "uuid-5678"
  }
}

// 타이핑 중 알림
{
  "type": "user_typing",
  "data": {
    "chatRoomId": "chat-uuid-1",
    "userId": "uuid-1234",
    "nickname": "홍길동"
  }
}

// 팟 상태 변경
{
  "type": "pod_status_updated",
  "data": {
    "podId": "pod-uuid-1",
    "status": "in_progress"
  }
}
```

---

## 9. 에러 응답

### 9.1. 에러 응답 형식

모든 에러 응답은 다음 형식을 따릅니다:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지",
    "details": {}  // 선택적 상세 정보
  }
}
```

### 9.2. HTTP 상태 코드

|상태 코드|설명|
|---|---|
|200|OK - 요청 성공|
|201|Created - 리소스 생성 성공|
|400|Bad Request - 잘못된 요청|
|401|Unauthorized - 인증 필요|
|403|Forbidden - 권한 없음|
|404|Not Found - 리소스를 찾을 수 없음|
|409|Conflict - 리소스 충돌|
|429|Too Many Requests - 요청 제한 초과|
|500|Internal Server Error - 서버 오류|

### 9.3. 주요 에러 코드

|에러 코드|HTTP 상태|설명|
|---|---|---|
|INVALID_REQUEST|400|요청 형식이 잘못됨|
|VALIDATION_ERROR|400|유효성 검사 실패|
|UNAUTHORIZED|401|인증되지 않은 사용자|
|INVALID_TOKEN|401|유효하지 않은 토큰|
|TOKEN_EXPIRED|401|만료된 토큰|
|FORBIDDEN|403|접근 권한 없음|
|NOT_FOUND|404|리소스를 찾을 수 없음|
|USER_NOT_FOUND|404|사용자를 찾을 수 없음|
|POD_NOT_FOUND|404|팟을 찾을 수 없음|
|ALREADY_EXISTS|409|이미 존재하는 리소스|
|EMAIL_ALREADY_EXISTS|409|이미 가입된 이메일|
|ALREADY_JOINED|409|이미 참여한 팟|
|POD_FULL|400|팟이 가득 참|
|POD_EXPIRED|400|팟 출발 시간이 지남|
|NOT_POD_CREATOR|403|팟 방장이 아님|
|VERIFICATION_REQUIRED|403|인증이 필요함|
|INVALID_VERIFICATION_CODE|400|잘못된 인증 코드|
|RATE_LIMIT_EXCEEDED|429|요청 제한 초과|
|INTERNAL_ERROR|500|서버 내부 오류|

### 9.4. 에러 응답 예시

**400 Bad Request**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "유효성 검사에 실패했습니다.",
    "details": {
      "fields": {
        "email": "올바른 이메일 형식이 아닙니다.",
        "password": "비밀번호는 최소 8자 이상이어야 합니다."
      }
    }
  }
}
```

**401 Unauthorized**
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "토큰이 만료되었습니다. 다시 로그인해주세요."
  }
}
```

**409 Conflict**
```json
{
  "success": false,
  "error": {
    "code": "POD_FULL",
    "message": "팟이 이미 가득 찼습니다."
  }
}
```

---

## 10. 페이지별 API 매핑

|페이지|사용 API|
|---|---|
|P01: 온보딩/스플래시|없음 (정적 페이지)|
|P02: 회원가입/인증|`POST /auth/signup`, `POST /auth/verify/send`, `POST /auth/verify/confirm`, `PATCH /users/me`|
|P03: 홈 피드|`GET /pods`, `GET /location/search`|
|P04: 팟 상세|`GET /pods/{podId}`, `POST /pods/{podId}/join`|
|P05: 팟 생성|`POST /pods`, `GET /location/search`, `POST /location/route`|
|P06: 채팅방|`GET /chat/rooms/{chatRoomId}/messages`, `POST /chat/rooms/{chatRoomId}/messages`, `POST /chat/rooms/{chatRoomId}/ready`, WebSocket 연결|
|P07: 검색/필터|`GET /pods/search`, `GET /location/search`|
|P08: 마이페이지|`GET /users/me`, `PATCH /users/me`, `GET /users/me/rides`, `GET /users/me/favorites`, `GET /notifications/settings`|

---

## 부록: 데이터 모델

### User (사용자)
```typescript
{
  userId: string;
  email: string;
  nickname: string;
  profileImage?: string;
  userType: "student" | "employee" | "others";
  isVerified: boolean;
  verificationBadge?: string;
  mannerScore: number;
  totalRides: number;
  createdAt: string;
  updatedAt: string;
}
```

### Pod (팟)
```typescript
{
  podId: string;
  departurePlace: {
    name: string;
    latitude: number;
    longitude: number;
  };
  arrivalPlace: {
    name: string;
    latitude: number;
    longitude: number;
  };
  departureTime: string;
  maxParticipants: number;
  currentParticipants: number;
  vehicleType: "taxi" | "personal";
  estimatedCost: number;
  costPerPerson: number;
  memo?: string;
  status: "recruiting" | "full" | "in_progress" | "completed" | "cancelled";
  creatorId: string;
  chatRoomId: string;
  createdAt: string;
  updatedAt: string;
}
```

### ChatRoom (채팅방)
```typescript
{
  chatRoomId: string;
  podId: string;
  participants: string[];  // userId[]
  createdAt: string;
}
```

### Message (메시지)
```typescript
{
  messageId: string;
  chatRoomId: string;
  senderId: string;
  messageType: "text" | "location" | "status" | "system";
  content?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  createdAt: string;
}
```

### Rating (평가)
```typescript
{
  ratingId: string;
  podId: string;
  raterId: string;
  targetUserId: string;
  score: number;  // 1-5
  tags: string[];
  comment?: string;
  createdAt: string;
}
```