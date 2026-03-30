import { Response } from 'express';

export const successResponse = (
  res: Response,
  data: unknown = null,
  message: string | null = null,
  statusCode: number = 200
): Response => {
  const response: Record<string, unknown> = { success: true };

  if (data !== null) {
    response.data = data;
  }

  if (message !== null) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
};

export const errorResponse = (
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  details: unknown = null
): Response => {
  const response: Record<string, unknown> = {
    success: false,
    error: { code, message },
  };

  if (details !== null) {
    (response.error as Record<string, unknown>).details = details;
  }

  return res.status(statusCode).json(response);
};

export const paginatedResponse = (
  res: Response,
  items: unknown[],
  total: number,
  page: number,
  limit: number
): Response => {
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

export class AppError extends Error {
  code: string;
  statusCode: number;
  details: unknown;

  constructor(
    code: string,
    message: string,
    statusCode: number = 400,
    details: unknown = null
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
