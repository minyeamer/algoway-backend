# 데이터베이스 케이스 매핑

## 네이밍 규칙

### PostgreSQL (snake_case)
데이터베이스 테이블과 컬럼은 PostgreSQL 표준인 `snake_case`를 사용합니다.

```sql
SELECT user_id, email, created_at, is_verified
FROM users
WHERE user_type = 'student';
```

### JavaScript (camelCase)
JavaScript 코드와 API 응답은 `camelCase`를 사용합니다.

```javascript
{
  userId: 'uuid',
  email: 'user@example.com',
  createdAt: '2026-02-28T12:00:00Z',
  isVerified: true
}
```

## 자동 변환

`src/config/database.js`의 `query()` 함수는 자동으로 결과를 camelCase로 변환합니다.

```javascript
const { query } = require('./config/database');

// SQL은 snake_case 사용
const result = await query(
  'SELECT user_id, password_hash, created_at FROM users WHERE email = $1',
  ['user@example.com']
);

// 결과는 자동으로 camelCase
console.log(result.rows[0]);
// { userId: 'uuid', passwordHash: 'hash', createdAt: '2026-02-28' }
```

## 수동 변환

필요시 `caseConverter` 유틸리티를 직접 사용할 수 있습니다.

```javascript
const { keysToCamel, keysToSnake } = require('./utils/caseConverter');

// snake_case → camelCase
const jsObject = keysToCamel(dbResult);

// camelCase → snake_case
const dbObject = keysToSnake(jsObject);
```

## 주요 필드 매핑표

| PostgreSQL (snake_case) | JavaScript (camelCase) |
|------------------------|------------------------|
| user_id | userId |
| password_hash | passwordHash |
| created_at | createdAt |
| updated_at | updatedAt |
| is_verified | isVerified |
| user_type | userType |
| verification_badge | verificationBadge |
| manner_score | mannerScore |
| total_rides | totalRides |
| pod_id | podId |
| departure_location | departureLocation |
| arrival_location | arrivalLocation |
| departure_time | departureTime |
| max_participants | maxParticipants |
| current_participants | currentParticipants |
| vehicle_type | vehicleType |
| estimated_cost | estimatedCost |
| cost_per_person | costPerPerson |
| chat_room_id | chatRoomId |
| sender_id | senderId |
| message_type | messageType |
| location_lat | locationLat |
| location_lng | locationLng |
| location_address | locationAddress |
| is_ready | isReady |
| rating_id | ratingId |
| reviewer_id | reviewerId |
| reviewee_id | revieweeId |
| is_read | isRead |
| notification_type | notificationType |
| push_enabled | pushEnabled |
| email_enabled | emailEnabled |

## 참고

이는 Node.js + PostgreSQL 생태계의 베스트 프랙티스이며, TypeORM, Prisma, Sequelize 등 모든 주요 ORM이 동일한 방식을 사용합니다.
