const { body, param, query, validationResult } = require('express-validator');
const { errorResponse } = require('../utils/response');
const { ERROR_CODES } = require('../config/constants');

/**
 * Validation 결과 체크 미들웨어
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = {};
    errors.array().forEach(error => {
      formattedErrors[error.path] = error.msg;
    });

    return errorResponse(
      res,
      ERROR_CODES.VALIDATION_ERROR,
      '입력 데이터 검증에 실패했습니다.',
      400,
      { fields: formattedErrors }
    );
  }

  next();
};

/**
 * 회원가입 Validation
 */
const signupValidation = [
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
  validate
];

/**
 * 로그인 Validation
 */
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('올바른 이메일 형식이 아닙니다.')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('비밀번호를 입력해주세요.'),
  validate
];

/**
 * 이메일 인증 코드 발송 Validation
 */
const sendVerificationValidation = [
  body('email')
    .isEmail()
    .withMessage('올바른 이메일 형식이 아닙니다.')
    .normalizeEmail(),
  body('verificationType')
    .isIn(['student', 'employee', 'others'])
    .withMessage('인증 유형은 student, employee, others 중 하나여야 합니다.'),
  validate
];

/**
 * 이메일 인증 코드 확인 Validation
 */
const confirmVerificationValidation = [
  body('email')
    .isEmail()
    .withMessage('올바른 이메일 형식이 아닙니다.')
    .normalizeEmail(),
  body('verificationCode')
    .isLength({ min: 6, max: 6 })
    .withMessage('인증 코드는 6자리여야 합니다.')
    .isNumeric()
    .withMessage('인증 코드는 숫자만 가능합니다.'),
  validate
];

/**
 * 토큰 갱신 Validation
 */
const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('리프레시 토큰을 입력해주세요.'),
  validate
];

/**
 * UUID Validation
 */
const uuidValidation = (paramName) => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName}은(는) 올바른 UUID 형식이어야 합니다.`),
  validate
];

/**
 * 페이지네이션 Validation
 */
const paginationValidation = [
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
  validate
];

/**
 * 좌표 Validation
 */
const coordinatesValidation = [
  query('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('위도는 -90~90 사이의 수여야 합니다.')
    .toFloat(),
  query('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('경도는 -180~180 사이의 수여야 합니다.')
    .toFloat(),
  validate
];

module.exports = {
  validate,
  signupValidation,
  loginValidation,
  sendVerificationValidation,
  confirmVerificationValidation,
  refreshTokenValidation,
  uuidValidation,
  paginationValidation,
  coordinatesValidation
};
