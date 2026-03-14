import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import { ERROR_CODES, PAGINATION } from '../config/constants';
import * as ratingService from '../services/ratingService';
import type { AppError } from '../types';

// ─── 평가 제출 ────────────────────────────────────────────────────────────────

/**
 * POST /v1/ratings
 */
export const createRating = async (req: Request, res: Response): Promise<void> => {
  try {
    const reviewerId = req.user!.userId;
    const { podId, revieweeId, rating, tags, comment } = req.body;

    const result = await ratingService.createRating(reviewerId, {
      podId,
      revieweeId,
      rating,
      tags,
      comment,
    });

    successResponse(res, formatRating(result), '평가가 완료되었습니다.', 201);
  } catch (err) {
    const error = err as AppError;
    errorResponse(
      res,
      error.code ?? ERROR_CODES.INTERNAL_SERVER_ERROR,
      error.message,
      error.statusCode ?? 500
    );
  }
};

// ─── 내가 받은 평가 목록 ──────────────────────────────────────────────────────

/**
 * GET /v1/ratings/received
 */
export const getReceivedRatings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page  = Math.max(1, parseInt(req.query.page  as string) || PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(
      PAGINATION.MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT)
    );

    const result = await ratingService.getReceivedRatings(userId, page, limit);

    successResponse(res, {
      items: result.items.map(formatRating),
      pagination: buildPagination(result.total, page, limit),
    });
  } catch (err) {
    const error = err as AppError;
    errorResponse(res, error.code ?? ERROR_CODES.INTERNAL_SERVER_ERROR, error.message, error.statusCode ?? 500);
  }
};

// ─── 내가 보낸 평가 목록 ──────────────────────────────────────────────────────

/**
 * GET /v1/ratings/sent
 */
export const getSentRatings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page  = Math.max(1, parseInt(req.query.page  as string) || PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(
      PAGINATION.MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT)
    );

    const result = await ratingService.getSentRatings(userId, page, limit);

    successResponse(res, {
      items: result.items.map(formatRating),
      pagination: buildPagination(result.total, page, limit),
    });
  } catch (err) {
    const error = err as AppError;
    errorResponse(res, error.code ?? ERROR_CODES.INTERNAL_SERVER_ERROR, error.message, error.statusCode ?? 500);
  }
};

// ─── 특정 유저 공개 평가 목록 ─────────────────────────────────────────────────

/**
 * GET /v1/users/:userId/ratings
 */
export const getUserRatings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const page  = Math.max(1, parseInt(req.query.page  as string) || PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(
      PAGINATION.MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT)
    );

    const result = await ratingService.getUserRatings(userId, page, limit);

    successResponse(res, {
      averageRating: result.averageRating,
      items: result.items.map(formatRating),
      pagination: buildPagination(result.total, page, limit),
    });
  } catch (err) {
    const error = err as AppError;
    errorResponse(res, error.code ?? ERROR_CODES.INTERNAL_SERVER_ERROR, error.message, error.statusCode ?? 500);
  }
};

// ─── 팟 평가 현황 조회 ────────────────────────────────────────────────────────

/**
 * GET /v1/ratings/pods/:podId
 */
export const getPodRatingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const reviewerId = req.user!.userId;
    const { podId } = req.params;

    const result = await ratingService.getPodRatingStatus(podId, reviewerId);

    successResponse(res, result);
  } catch (err) {
    const error = err as AppError;
    errorResponse(res, error.code ?? ERROR_CODES.INTERNAL_SERVER_ERROR, error.message, error.statusCode ?? 500);
  }
};

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function formatRating(r: ReturnType<typeof Object.assign>) {
  return {
    ratingId:   r.ratingId,
    podId:      r.podId,
    rating:     r.rating,
    tags:       r.tags ?? [],
    comment:    r.comment ?? null,
    createdAt:  r.createdAt,
    reviewer: {
      userId:            r.reviewerId,
      nickname:          r.reviewerNickname,
      profileImage:      r.reviewerProfileImage ?? null,
      verificationBadge: r.reviewerVerificationBadge ?? null,
    },
    reviewee: {
      userId:            r.revieweeId,
      nickname:          r.revieweeNickname,
      profileImage:      r.revieweeProfileImage ?? null,
    },
    pod: {
      podId:              r.podId,
      departurePlaceName: r.podDeparturePlaceName,
      arrivalPlaceName:   r.podArrivalPlaceName,
      departureTime:      r.podDepartureTime,
    },
  };
}

function buildPagination(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
