const userService = require('../services/userService');
const { successResponse, paginatedResponse } = require('../utils/response');

/**
 * 내 프로필 조회
 * GET /v1/users/me
 */
const getMyProfile = async (req, res, next) => {
  try {
    const user = await userService.getMyProfile(req.user.userId);

    return successResponse(res, user);
  } catch (error) {
    next(error);
  }
};

/**
 * 프로필 수정
 * PATCH /v1/users/me
 */
const updateMyProfile = async (req, res, next) => {
  try {
    const { nickname, profileImage } = req.body;

    const user = await userService.updateMyProfile(req.user.userId, {
      nickname,
      profileImage,
    });

    return successResponse(res, user, '프로필이 수정되었습니다.');
  } catch (error) {
    next(error);
  }
};

/**
 * 사용자 상세 조회 (공개 프로필)
 * GET /v1/users/:userId
 */
const getUserProfile = async (req, res, next) => {
  try {
    const user = await userService.getUserProfile(req.params.userId);

    return successResponse(res, user);
  } catch (error) {
    next(error);
  }
};

/**
 * 탑승 내역 조회
 * GET /v1/users/me/rides
 */
const getMyRides = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { status } = req.query;

    const { items, total } = await userService.getMyRides(req.user.userId, {
      page,
      limit,
      status,
    });

    return paginatedResponse(res, items, total, page, limit);
  } catch (error) {
    next(error);
  }
};

/**
 * 즐겨찾는 경로 목록 조회
 * GET /v1/users/me/favorites
 */
const getFavorites = async (req, res, next) => {
  try {
    const favorites = await userService.getFavorites(req.user.userId);

    return successResponse(res, { favorites });
  } catch (error) {
    next(error);
  }
};

/**
 * 즐겨찾는 경로 추가
 * POST /v1/users/me/favorites
 */
const addFavorite = async (req, res, next) => {
  try {
    const { departurePlace, arrivalPlace } = req.body;

    const favorite = await userService.addFavorite(req.user.userId, {
      departurePlace,
      arrivalPlace,
    });

    return successResponse(res, favorite, '즐겨찾는 경로가 추가되었습니다.', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 즐겨찾는 경로 삭제
 * DELETE /v1/users/me/favorites/:favoriteId
 */
const deleteFavorite = async (req, res, next) => {
  try {
    await userService.deleteFavorite(req.user.userId, req.params.favoriteId);

    return successResponse(res, null, '즐겨찾는 경로가 삭제되었습니다.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getUserProfile,
  getMyRides,
  getFavorites,
  addFavorite,
  deleteFavorite,
};
