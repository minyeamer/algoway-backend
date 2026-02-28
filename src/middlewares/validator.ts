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
