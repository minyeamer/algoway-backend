// 사용자 유형
const USER_TYPES = {
  STUDENT: 'student',
  EMPLOYEE: 'employee',
  OTHERS: 'others',
};

// 인증 뱃지
const VERIFICATION_BADGES = {
  STUDENT: 'student_verified',
  EMPLOYEE: 'employee_verified',
  GENERAL: 'general_verified',
};

// 팟 상태
const POD_STATUS = {
  RECRUITING: 'recruiting',
  FULL: 'full',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// 이동 수단
const VEHICLE_TYPES = {
  TAXI: 'taxi',
  PERSONAL: 'personal',
};

// 메시지 타입
const MESSAGE_TYPES = {
  TEXT: 'text',
  LOCATION: 'location',
  STATUS: 'status',
  SYSTEM: 'system',
};

// 알림 타입
const NOTIFICATION_TYPES = {
  POD_JOINED: 'pod_joined',
  POD_FULL: 'pod_full',
  POD_STARTED: 'pod_started',
  POD_COMPLETED: 'pod_completed',
  MESSAGE: 'message',
  RATING: 'rating',
  SYSTEM: 'system',
};

// 에러 코드
const ERROR_CODES = {
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
  
  // 서버 관련
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  REDIS_ERROR: 'REDIS_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
};

// JWT 설정
const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '1h',
  REFRESH_TOKEN_EXPIRY: '7d',
  PASSWORD_RESET_TOKEN_EXPIRY: '1h',
};

// Rate Limiting 설정
const RATE_LIMIT = {
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
};

// 페이지네이션 설정
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// 지리 검색 설정
const GEO_SEARCH = {
  DEFAULT_RADIUS: 5000, // 5km
  MAX_RADIUS: 20000, // 20km
};

// 인증 코드 설정
const VERIFICATION_CODE = {
  LENGTH: 6,
  EXPIRY_MINUTES: 10,
};

module.exports = {
  USER_TYPES,
  VERIFICATION_BADGES,
  POD_STATUS,
  VEHICLE_TYPES,
  MESSAGE_TYPES,
  NOTIFICATION_TYPES,
  ERROR_CODES,
  JWT_CONFIG,
  RATE_LIMIT,
  PAGINATION,
  GEO_SEARCH,
  VERIFICATION_CODE,
};
