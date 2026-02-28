const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middlewares/auth');
const {
  updateProfileValidation,
  addFavoriteValidation,
  uuidValidation,
  paginationValidation,
} = require('../middlewares/validator');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * 내 프로필 조회
 * GET /v1/users/me
 */
router.get(
  '/me',
  authenticateToken,
  asyncHandler(userController.getMyProfile)
);

/**
 * 프로필 수정
 * PATCH /v1/users/me
 */
router.patch(
  '/me',
  authenticateToken,
  updateProfileValidation,
  asyncHandler(userController.updateMyProfile)
);

/**
 * 탑승 내역 조회
 * GET /v1/users/me/rides
 */
router.get(
  '/me/rides',
  authenticateToken,
  paginationValidation,
  asyncHandler(userController.getMyRides)
);

/**
 * 즐겨찾는 경로 목록 조회
 * GET /v1/users/me/favorites
 */
router.get(
  '/me/favorites',
  authenticateToken,
  asyncHandler(userController.getFavorites)
);

/**
 * 즐겨찾는 경로 추가
 * POST /v1/users/me/favorites
 */
router.post(
  '/me/favorites',
  authenticateToken,
  addFavoriteValidation,
  asyncHandler(userController.addFavorite)
);

/**
 * 즐겨찾는 경로 삭제
 * DELETE /v1/users/me/favorites/:favoriteId
 */
router.delete(
  '/me/favorites/:favoriteId',
  authenticateToken,
  uuidValidation('favoriteId'),
  asyncHandler(userController.deleteFavorite)
);

/**
 * 사용자 상세 조회 (공개 프로필)
 * GET /v1/users/:userId
 * NOTE: 고정 경로(/me/*)가 먼저 매칭되도록 반드시 마지막에 선언
 */
router.get(
  '/:userId',
  authenticateToken,
  uuidValidation('userId'),
  asyncHandler(userController.getUserProfile)
);

module.exports = router;
