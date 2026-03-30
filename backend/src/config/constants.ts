// 사용자 유형
export const USER_TYPES = {
  STUDENT: 'student',
  EMPLOYEE: 'employee',
  OTHERS: 'others',
} as const;

export type UserType = (typeof USER_TYPES)[keyof typeof USER_TYPES];

// 인증 뱃지
export const VERIFICATION_BADGES = {
  STUDENT: 'student_verified',
  EMPLOYEE: 'employee_verified',
  GENERAL: 'general_verified',
} as const;

// 팟 상태
export const POD_STATUS = {
  RECRUITING: 'recruiting',
  FULL: 'full',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// 이동 수단
export const VEHICLE_TYPES = {
  TAXI: 'taxi',
  PERSONAL: 'personal',
} as const;

// 메시지 타입
export const MESSAGE_TYPES = {
  TEXT: 'text',
  LOCATION: 'location',
  STATUS: 'status',
  SYSTEM: 'system',
} as const;

// 알림 타입
export const NOTIFICATION_TYPES = {
  POD_JOINED: 'pod_joined',
  POD_FULL: 'pod_full',
  POD_STARTED: 'pod_started',
  POD_COMPLETED: 'pod_completed',
  MESSAGE: 'message',
  RATING: 'rating',
  SYSTEM: 'system',
} as const;

// 에러 코드
export const ERROR_CODES = {
  // 인증 관련
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',

  // 검증 관련
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // 리소스 관련
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // 팟 관련
  POD_FULL: 'POD_FULL',
  ALREADY_JOINED: 'ALREADY_JOINED',
  NOT_PARTICIPANT: 'NOT_PARTICIPANT',
  CREATOR_CANNOT_LEAVE: 'CREATOR_CANNOT_LEAVE',

  // 채팅 관련
  NOT_CHAT_PARTICIPANT: 'NOT_CHAT_PARTICIPANT',
  CHAT_ROOM_NOT_FOUND: 'CHAT_ROOM_NOT_FOUND',

  // 평가 관련
  ALREADY_RATED: 'ALREADY_RATED',
  CANNOT_RATE_SELF: 'CANNOT_RATE_SELF',
  POD_NOT_COMPLETED: 'POD_NOT_COMPLETED',
  RATING_NOT_FOUND: 'RATING_NOT_FOUND',

  // 알림 관련
  NOTIFICATION_NOT_FOUND: 'NOTIFICATION_NOT_FOUND',
  NOTIFICATION_SETTINGS_NOT_FOUND: 'NOTIFICATION_SETTINGS_NOT_FOUND',

  // 서버 관련
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  REDIS_ERROR: 'REDIS_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// JWT 설정
export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '1h',
  REFRESH_TOKEN_EXPIRY: '7d',
  PASSWORD_RESET_TOKEN_EXPIRY: '1h',
} as const;

// Rate Limiting 설정
export const RATE_LIMIT = {
  GENERAL: {
    points: 100,
    duration: 600, // 10분
  },
  LOGIN: {
    points: 5,
    duration: 600, // 10분
  },
  VERIFICATION_SEND: {
    points: 3,
    duration: 3600, // 1시간
  },
} as const;

// 페이지네이션 설정
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// 지리 검색 설정
export const GEO_SEARCH = {
  DEFAULT_RADIUS: 5000, // 5km
  MAX_RADIUS: 20000, // 20km
} as const;

// 채팅 설정
export const CHAT = {
  DEFAULT_MESSAGE_LIMIT: 50,
  MAX_MESSAGE_LIMIT: 100,
  MAX_CONTENT_LENGTH: 1000,
} as const;

// 평가 설정
export const RATING = {
  MIN_SCORE: 1,
  MAX_SCORE: 5,
  ALLOWED_TAGS: [
    'punctual',       // 시간 엄수
    'friendly',       // 친절함
    'safe_driving',   // 안전 운전
    'clean',          // 청결
    'good_conversation', // 대화가 즐거움
    'quiet_ride',     // 조용한 탑승
    'helpful',        // 배려심 있음
  ] as const,
} as const;

export type RatingTag = (typeof RATING.ALLOWED_TAGS)[number];

// 인증 코드 설정
export const VERIFICATION_CODE = {
  LENGTH: 6,
  EXPIRY_MINUTES: 10,
} as const;
