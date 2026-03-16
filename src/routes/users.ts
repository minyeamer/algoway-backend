import { Router } from 'express';
import * as userController from '../controllers/userController';
import { getUserRatings } from '../controllers/ratingController';
import { authenticateToken } from '../middlewares/auth';
import {
  updateProfileValidation,
  addFavoriteValidation,
  uuidValidation,
  paginationValidation,
  userIdParamValidation,
} from '../middlewares/validator';
import { asyncHandler } from '../middlewares/errorHandler';
import type { RequestHandler } from 'express';

const router = Router();

/** 내 프로필 조회 GET /v1/users/me */
router.get('/me', authenticateToken, asyncHandler(userController.getMyProfile as RequestHandler));

/** 프로필 수정 PATCH /v1/users/me */
router.patch(
  '/me',
  authenticateToken,
  updateProfileValidation,
  asyncHandler(userController.updateMyProfile as RequestHandler)
);

/** 탑승 내역 조회 GET /v1/users/me/rides */
router.get(
  '/me/rides',
  authenticateToken,
  paginationValidation,
  asyncHandler(userController.getMyRides as RequestHandler)
);

/** 즐겨찾는 경로 목록 조회 GET /v1/users/me/favorites */
router.get(
  '/me/favorites',
  authenticateToken,
  asyncHandler(userController.getFavorites as RequestHandler)
);

/** 즐겨찾는 경로 추가 POST /v1/users/me/favorites */
router.post(
  '/me/favorites',
  authenticateToken,
  addFavoriteValidation,
  asyncHandler(userController.addFavorite as RequestHandler)
);

/** 즐겨찾는 경로 삭제 DELETE /v1/users/me/favorites/:favoriteId */
router.delete(
  '/me/favorites/:favoriteId',
  authenticateToken,
  uuidValidation('favoriteId'),
  asyncHandler(userController.deleteFavorite as RequestHandler)
);

/**
 * 특정 사용자 공개 평가 목록 GET /v1/users/:userId/ratings
 * NOTE: /:userId 보다 먼저 선언해야 함
 */
router.get(
  '/:userId/ratings',
  authenticateToken,
  userIdParamValidation,
  paginationValidation,
  getUserRatings
);

/**
 * 사용자 상세 조회 (공개 프로필) GET /v1/users/:userId
 * NOTE: 고정 경로(/me/*)가 먼저 매칭되도록 반드시 마지막에 선언
 */
router.get(
  '/:userId',
  authenticateToken,
  uuidValidation('userId'),
  asyncHandler(userController.getUserProfile as RequestHandler)
);

export default router;
