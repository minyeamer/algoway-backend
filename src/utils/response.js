/**
 * 성공 응답 헬퍼
 */
const successResponse = (res, data = null, message = null, statusCode = 200) => {
  const response = {
    success: true,
  };

  if (data !== null) {
    response.data = data;
  }

  if (message !== null) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
};

/**
 * 에러 응답 헬퍼
 */
const errorResponse = (res, code, message, statusCode = 400, details = null) => {
  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details !== null) {
    response.error.details = details;
  }

  return res.status(statusCode).json(response);
};

/**
 * 페이지네이션 응답 헬퍼
 */
const paginatedResponse = (res, items, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);

  return successResponse(res, {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
};

/**
 * 커스텀 에러 클래스
 */
class AppError extends Error {
  constructor(code, message, statusCode = 400, details = null) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  AppError,
};
