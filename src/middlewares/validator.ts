import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';
import { ERROR_CODES } from '../config/constants';

type ValidationMiddleware = ValidationChain | ((req: Request, res: Response, next: NextFunction) => void);

/**
 * Validation 결과 체크 미들웨어
 */
export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors: Record<string, string> = {};
    errors.array().forEach((error) => {
      if ('path' in error) {
        formattedErrors[error.path as string] = error.msg;
      }
    });

    errorResponse(
      res,
      ERROR_CODES.VALIDATION_ERROR,
      '입력 데이터 검증에 실패했습니다.',
      400,
      { fields: formattedErrors }
    );
    return;
  }

  next();
};

/**
 * 회원가입 Validation
 */
export const signupValidation: ValidationMiddleware[] = [
  body('email')
    .isEmail()
    .withMessage('올바른 이메일 형식이 아닙니다.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('비밀번호는 최소 8자 이상이어야 합니다.')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('비밀번호는 영문과 숫자를 포함해야 합니다.'),
  body('nickname')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('닉네임은 2~50자 사이여야 합니다.')
    .matches(/^[a-zA-Z0-9가-힣_]+$/)
    .withMessage('닉네임은 한글, 영문, 숫자, 언더스코어만 사용 가능합니다.'),
  validate,
];

/**
 * 로그인 Validation
 */
export const loginValidation: ValidationMiddleware[] = [
  body('email')
    .isEmail()
    .withMessage('올바른 이메일 형식이 아닙니다.')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('비밀번호를 입력해주세요.'),
  validate,
];

/**
 * 이메일 인증 코드 발송 Validation
 */
export const sendVerificationValidation: ValidationMiddleware[] = [
  body('email')
    .isEmail()
    .withMessage('올바른 이메일 형식이 아닙니다.')
    .normalizeEmail(),
  body('verificationType')
    .isIn(['student', 'employee', 'others'])
    .withMessage('인증 유형은 student, employee, others 중 하나여야 합니다.'),
  validate,
];

/**
 * 이메일 인증 코드 확인 Validation
 */
export const confirmVerificationValidation: ValidationMiddleware[] = [
  body('email')
    .isEmail()
    .withMessage('올바른 이메일 형식이 아닙니다.')
    .normalizeEmail(),
  body('verificationCode')
    .isLength({ min: 6, max: 6 })
    .withMessage('인증 코드는 6자리여야 합니다.')
    .isNumeric()
    .withMessage('인증 코드는 숫자만 가능합니다.'),
  validate,
];

/**
 * 토큰 갱신 Validation
 */
export const refreshTokenValidation: ValidationMiddleware[] = [
  body('refreshToken').notEmpty().withMessage('리프레시 토큰을 입력해주세요.'),
  validate,
];

/**
 * 프로필 수정 Validation
 */
export const updateProfileValidation: ValidationMiddleware[] = [
  body('nickname')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('닉네임은 2~50자 사이여야 합니다.')
    .matches(/^[a-zA-Z0-9가-힣_]+$/)
    .withMessage('닉네임은 한글, 영문, 숫자, 언더스코어만 사용 가능합니다.'),
  body('profileImage')
    .optional({ nullable: true })
    .isURL()
    .withMessage('프로필 이미지는 올바른 URL이어야 합니다.'),
  validate,
];

/**
 * 즐겨찾는 경로 추가 Validation
 */
export const addFavoriteValidation: ValidationMiddleware[] = [
  body('departurePlace').notEmpty().withMessage('출발지 정보는 필수입니다.'),
  body('departurePlace.name').notEmpty().withMessage('출발지 이름은 필수입니다.'),
  body('departurePlace.lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('출발지 위도는 -90~90 사이의 숫자여야 합니다.')
    .toFloat(),
  body('departurePlace.lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('출발지 경도는 -180~180 사이의 숫자여야 합니다.')
    .toFloat(),
  body('arrivalPlace').notEmpty().withMessage('도착지 정보는 필수입니다.'),
  body('arrivalPlace.name').notEmpty().withMessage('도착지 이름은 필수입니다.'),
  body('arrivalPlace.lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('도착지 위도는 -90~90 사이의 숫자여야 합니다.')
    .toFloat(),
  body('arrivalPlace.lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('도착지 경도는 -180~180 사이의 숫자여야 합니다.')
    .toFloat(),
  validate,
];

/**
 * UUID Validation
 */
export const uuidValidation = (paramName: string): ValidationMiddleware[] => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName}은(는) 올바른 UUID 형식이어야 합니다.`),
  validate,
];

/**
 * 페이지네이션 Validation
 */
export const paginationValidation: ValidationMiddleware[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('페이지는 1 이상의 정수여야 합니다.')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit은 1~100 사이의 정수여야 합니다.')
    .toInt(),
  validate,
];

/**
 * 좌표 Validation
 */
export const coordinatesValidation: ValidationMiddleware[] = [
  query('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('위도는 -90~90 사이의 수여야 합니다.')
    .toFloat(),
  query('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('경도는 -180~180 사이의 수여야 합니다.')
    .toFloat(),
  validate,
];

// ─── 팟 Validation ────────────────────────────────────────────────────────────

/**
 * 팟 생성 Validation
 */
export const createPodValidation: ValidationMiddleware[] = [
  body('departurePlace.name')
    .trim()
    .notEmpty()
    .withMessage('출발지 이름을 입력해주세요.'),
  body('departurePlace.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('출발지 위도가 올바르지 않습니다.')
    .toFloat(),
  body('departurePlace.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('출발지 경도가 올바르지 않습니다.')
    .toFloat(),
  body('arrivalPlace.name')
    .trim()
    .notEmpty()
    .withMessage('도착지 이름을 입력해주세요.'),
  body('arrivalPlace.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('도착지 위도가 올바르지 않습니다.')
    .toFloat(),
  body('arrivalPlace.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('도착지 경도가 올바르지 않습니다.')
    .toFloat(),
  body('departureTime')
    .isISO8601()
    .withMessage('출발 시간은 ISO 8601 형식이어야 합니다.')
    .custom((value: string) => {
      if (new Date(value) <= new Date()) {
        throw new Error('출발 시간은 현재 시간 이후여야 합니다.');
      }
      return true;
    }),
  body('maxParticipants')
    .isInt({ min: 2, max: 4 })
    .withMessage('최대 인원은 2~4명이어야 합니다.')
    .toInt(),
  body('vehicleType')
    .isIn(['taxi', 'personal'])
    .withMessage('이동 수단은 taxi 또는 personal이어야 합니다.'),
  body('estimatedCost')
    .optional()
    .isInt({ min: 0 })
    .withMessage('예상 비용은 0 이상의 정수여야 합니다.')
    .toInt(),
  body('memo')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('메모는 200자 이내여야 합니다.'),
  validate,
];

/**
 * 팟 목록 조회 Validation (위치 기반)
 */
export const listPodsValidation: ValidationMiddleware[] = [
  query('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('위도는 -90~90 사이의 수여야 합니다.')
    .toFloat(),
  query('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('경도는 -180~180 사이의 수여야 합니다.')
    .toFloat(),
  query('radius')
    .optional()
    .isInt({ min: 100, max: 20000 })
    .withMessage('반경은 100~20000m 사이여야 합니다.')
    .toInt(),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('페이지는 1 이상의 정수여야 합니다.')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit은 1~100 사이의 정수여야 합니다.')
    .toInt(),
  query('status')
    .optional()
    .isIn(['recruiting', 'full', 'in_progress', 'completed'])
    .withMessage('올바르지 않은 상태값입니다.'),
  validate,
];

/**
 * 팟 검색 Validation
 */
export const searchPodsValidation: ValidationMiddleware[] = [
  query('departureLat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('출발지 위도가 올바르지 않습니다.')
    .toFloat(),
  query('departureLng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('출발지 경도가 올바르지 않습니다.')
    .toFloat(),
  query('arrivalLat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('도착지 위도가 올바르지 않습니다.')
    .toFloat(),
  query('arrivalLng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('도착지 경도가 올바르지 않습니다.')
    .toFloat(),
  query('radius')
    .optional()
    .isInt({ min: 100, max: 20000 })
    .withMessage('반경은 100~20000m 사이여야 합니다.')
    .toInt(),
  query('departureTimeFrom')
    .optional()
    .isISO8601()
    .withMessage('출발 시간 시작은 ISO 8601 형식이어야 합니다.'),
  query('departureTimeTo')
    .optional()
    .isISO8601()
    .withMessage('출발 시간 종료는 ISO 8601 형식이어야 합니다.'),
  query('verifiedOnly')
    .optional()
    .isBoolean()
    .withMessage('verifiedOnly는 true 또는 false여야 합니다.')
    .toBoolean(),
  query('vehicleType')
    .optional()
    .isIn(['taxi', 'personal'])
    .withMessage('이동 수단은 taxi 또는 personal이어야 합니다.'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('페이지는 1 이상의 정수여야 합니다.')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit은 1~100 사이의 정수여야 합니다.')
    .toInt(),
  validate,
];

/**
 * 팟 상태 업데이트 Validation
 */
export const updatePodStatusValidation: ValidationMiddleware[] = [
  body('status')
    .isIn(['recruiting', 'full', 'in_progress', 'completed', 'cancelled'])
    .withMessage('올바르지 않은 상태값입니다.'),
  validate,
];

// ─── 채팅 Validation ──────────────────────────────────────────────────────────

/**
 * 메시지 전송 Validation
 */
export const sendMessageValidation: ValidationMiddleware[] = [
  body('messageType')
    .isIn(['text', 'location'])
    .withMessage('메시지 타입은 text 또는 location이어야 합니다.'),
  body('content')
    .if(body('messageType').equals('text'))
    .notEmpty()
    .withMessage('텍스트 메시지는 content가 필수입니다.')
    .isLength({ max: 1000 })
    .withMessage('메시지는 1000자 이내여야 합니다.'),
  body('location')
    .if(body('messageType').equals('location'))
    .notEmpty()
    .withMessage('위치 메시지는 location이 필수입니다.'),
  body('location.latitude')
    .if(body('messageType').equals('location'))
    .isFloat({ min: -90, max: 90 })
    .withMessage('위도는 -90~90 사이의 수여야 합니다.')
    .toFloat(),
  body('location.longitude')
    .if(body('messageType').equals('location'))
    .isFloat({ min: -180, max: 180 })
    .withMessage('경도는 -180~180 사이의 수여야 합니다.')
    .toFloat(),
  body('location.address')
    .if(body('messageType').equals('location'))
    .notEmpty()
    .withMessage('주소는 필수입니다.'),
  validate,
];

/**
 * 준비 상태 업데이트 Validation
 */
export const updateReadyStatusValidation: ValidationMiddleware[] = [
  body('isReady')
    .isBoolean()
    .withMessage('isReady는 boolean이어야 합니다.'),
  validate,
];

/**
 * 메시지 목록 조회 Validation
 */
export const getMessagesValidation: ValidationMiddleware[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('페이지는 1 이상의 정수여야 합니다.')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit은 1~100 사이의 정수여야 합니다.')
    .toInt(),
  query('before')
    .optional()
    .isUUID()
    .withMessage('before는 올바른 UUID 형식이어야 합니다.'),
  validate,
];

/**
 * Pod ID 경로 파라미터 Validation
 */
export const podIdParamValidation: ValidationMiddleware[] = [
  param('podId').isUUID().withMessage('podId는 올바른 UUID 형식이어야 합니다.'),
  validate,
];

/**
 * User ID 경로 파라미터 Validation
 */
export const userIdParamValidation: ValidationMiddleware[] = [
  param('userId').isUUID().withMessage('userId는 올바른 UUID 형식이어야 합니다.'),
  validate,
];

/**
 * 평가 제출 Validation
 */
export const createRatingValidation: ValidationMiddleware[] = [
  body('podId')
    .isUUID()
    .withMessage('podId는 올바른 UUID 형식이어야 합니다.'),
  body('revieweeId')
    .isUUID()
    .withMessage('revieweeId는 올바른 UUID 형식이어야 합니다.'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('rating은 1~5 사이의 정수여야 합니다.')
    .toInt(),
  body('tags')
    .optional()
    .isArray()
    .withMessage('tags는 배열이어야 합니다.')
    .custom((tags: unknown[]) => {
      if (!Array.isArray(tags)) return true;
      if (tags.length > 7) throw new Error('태그는 최대 7개까지 가능합니다.');
      if (tags.some((t) => typeof t !== 'string')) throw new Error('태그는 문자열이어야 합니다.');
      return true;
    }),
  body('comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('코멘트는 500자 이내여야 합니다.'),
  validate,
];

/**
 * Notification ID 경로 파라미터 Validation
 */
export const notificationIdParamValidation: ValidationMiddleware[] = [
  param('notificationId')
    .isUUID()
    .withMessage('notificationId는 올바른 UUID 형식이어야 합니다.'),
  validate,
];

/**
 * 알림 설정 업데이트 Validation
 */
export const updateNotificationSettingsValidation: ValidationMiddleware[] = [
  body('pushEnabled')
    .optional()
    .isBoolean()
    .withMessage('pushEnabled는 boolean이어야 합니다.'),
  body('emailEnabled')
    .optional()
    .isBoolean()
    .withMessage('emailEnabled는 boolean이어야 합니다.'),
  body('notificationTypes')
    .optional()
    .isObject()
    .withMessage('notificationTypes는 객체여야 합니다.'),
  body('notificationTypes.pod_joined').optional().isBoolean(),
  body('notificationTypes.pod_full').optional().isBoolean(),
  body('notificationTypes.pod_started').optional().isBoolean(),
  body('notificationTypes.pod_completed').optional().isBoolean(),
  body('notificationTypes.message').optional().isBoolean(),
  body('notificationTypes.rating').optional().isBoolean(),
  validate,
];
