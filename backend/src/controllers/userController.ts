import { Response, NextFunction } from 'express';
import * as userService from '../services/userService';
import { successResponse, paginatedResponse } from '../utils/response';
import type { AuthenticatedRequest } from '../types';

/**
 * 내 프로필 조회
 * GET /v1/users/me
 */
export const getMyProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.getMyProfile(req.user!.userId);
    successResponse(res, user);
  } catch (error) {
    next(error);
  }
};

/**
 * 프로필 수정
 * PATCH /v1/users/me
 */
export const updateMyProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { nickname, profileImage } = req.body as {
      nickname?: string;
      profileImage?: string | null;
    };

    const user = await userService.updateMyProfile(req.user!.userId, {
      nickname,
      profileImage,
    });

    successResponse(res, user, '프로필이 수정되었습니다.');
  } catch (error) {
    next(error);
  }
};

/**
 * 사용자 상세 조회 (공개 프로필)
 * GET /v1/users/:userId
 */
export const getUserProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.getUserProfile(req.params.userId);
    successResponse(res, user);
  } catch (error) {
    next(error);
  }
};

/**
 * 탑승 내역 조회
 * GET /v1/users/me/rides
 */
export const getMyRides = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as string | undefined;

    const { items, total } = await userService.getMyRides(req.user!.userId, {
      page,
      limit,
      status,
    });

    paginatedResponse(res, items, total, page, limit);
  } catch (error) {
    next(error);
  }
};

/**
 * 즐겨찾는 경로 목록 조회
 * GET /v1/users/me/favorites
 */
export const getFavorites = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const favorites = await userService.getFavorites(req.user!.userId);
    successResponse(res, { favorites });
  } catch (error) {
    next(error);
  }
};

/**
 * 즐겨찾는 경로 추가
 * POST /v1/users/me/favorites
 */
export const addFavorite = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { departurePlace, arrivalPlace } = req.body as {
      departurePlace: { name: string; lat: number; lng: number };
      arrivalPlace: { name: string; lat: number; lng: number };
    };

    const favorite = await userService.addFavorite(req.user!.userId, {
      departurePlace,
      arrivalPlace,
    });

    successResponse(res, favorite, '즐겨찾는 경로가 추가되었습니다.', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 즐겨찾는 경로 삭제
 * DELETE /v1/users/me/favorites/:favoriteId
 */
export const deleteFavorite = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await userService.deleteFavorite(req.user!.userId, req.params.favoriteId);
    successResponse(res, null, '즐겨찾는 경로가 삭제되었습니다.');
  } catch (error) {
    next(error);
  }
};
