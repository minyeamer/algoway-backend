const { query } = require('../config/database');
const { ERROR_CODES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * 내 프로필 조회
 * @param {string} userId - 사용자 UUID
 * @returns {Object} 프로필 정보 (camelCase)
 */
const getMyProfile = async (userId) => {
  const result = await query(
    `SELECT
       user_id, email, nickname, profile_image,
       user_type, is_verified, verification_badge,
       manner_score, total_rides, created_at
     FROM users
     WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('사용자를 찾을 수 없습니다.');
    error.code = ERROR_CODES.NOT_FOUND;
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

/**
 * 프로필 수정
 * @param {string} userId - 사용자 UUID
 * @param {Object} updateData - { nickname?, profileImage? }
 * @returns {Object} 수정된 프로필 (camelCase)
 */
const updateMyProfile = async (userId, updateData) => {
  const { nickname, profileImage } = updateData;

  // 변경할 필드가 없는 경우
  if (!nickname && profileImage === undefined) {
    const error = new Error('수정할 내용이 없습니다.');
    error.code = ERROR_CODES.INVALID_INPUT;
    error.statusCode = 400;
    throw error;
  }

  // 닉네임 중복 확인
  if (nickname) {
    const existing = await query(
      'SELECT user_id FROM users WHERE nickname = $1 AND user_id != $2',
      [nickname, userId]
    );

    if (existing.rows.length > 0) {
      const error = new Error('이미 사용 중인 닉네임입니다.');
      error.code = ERROR_CODES.ALREADY_EXISTS;
      error.statusCode = 409;
      throw error;
    }
  }

  // 동적 SET 절 구성
  const setClauses = ['updated_at = NOW()'];
  const values = [];
  let idx = 1;

  if (nickname) {
    setClauses.push(`nickname = $${idx++}`);
    values.push(nickname);
  }

  if (profileImage !== undefined) {
    setClauses.push(`profile_image = $${idx++}`);
    values.push(profileImage);
  }

  values.push(userId);

  const result = await query(
    `UPDATE users
     SET ${setClauses.join(', ')}
     WHERE user_id = $${idx}
     RETURNING user_id, email, nickname, profile_image, user_type, is_verified, verification_badge, manner_score, total_rides`,
    values
  );

  return result.rows[0];
};

/**
 * 특정 사용자 공개 프로필 조회
 * @param {string} userId - 대상 사용자 UUID
 * @returns {Object} 공개 프로필 (이메일, 비밀번호 제외)
 */
const getUserProfile = async (userId) => {
  const result = await query(
    `SELECT
       user_id, nickname, profile_image,
       user_type, is_verified, verification_badge,
       manner_score, total_rides, created_at
     FROM users
     WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('사용자를 찾을 수 없습니다.');
    error.code = ERROR_CODES.NOT_FOUND;
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

/**
 * 탑승 내역 조회
 * @param {string} userId - 사용자 UUID
 * @param {Object} options - { page, limit, status? }
 * @returns {Object} { items, total }
 */
const getMyRides = async (userId, { page = 1, limit = 20, status } = {}) => {
  const offset = (page - 1) * limit;
  const values = [userId];
  let statusClause = '';

  if (status) {
    values.push(status);
    statusClause = `AND p.status = $${values.length}`;
  }

  const countResult = await query(
    `SELECT COUNT(*) AS total
     FROM pod_participants pp
     JOIN pods p ON pp.pod_id = p.pod_id
     WHERE pp.user_id = $1 ${statusClause}`,
    values
  );

  const total = parseInt(countResult.rows[0].total, 10);

  values.push(limit, offset);

  const result = await query(
    `SELECT
       p.pod_id, p.departure_place_name, p.arrival_place_name,
       p.departure_time, p.vehicle_type, p.status,
       p.current_participants, p.max_participants,
       p.estimated_cost, p.cost_per_person,
       pp.joined_at,
       u.user_id AS creator_id, u.nickname AS creator_nickname,
       u.profile_image AS creator_profile_image
     FROM pod_participants pp
     JOIN pods p ON pp.pod_id = p.pod_id
     JOIN users u ON p.creator_id = u.user_id
     WHERE pp.user_id = $1 ${statusClause}
     ORDER BY p.departure_time DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return { items: result.rows, total };
};

/**
 * 즐겨찾는 경로 목록 조회
 * @param {string} userId - 사용자 UUID
 * @returns {Array} 즐겨찾는 경로 목록
 */
const getFavorites = async (userId) => {
  const result = await query(
    `SELECT
       favorite_id,
       departure_place_name,
       ST_Y(departure_location::geometry) AS departure_lat,
       ST_X(departure_location::geometry) AS departure_lng,
       arrival_place_name,
       ST_Y(arrival_location::geometry) AS arrival_lat,
       ST_X(arrival_location::geometry) AS arrival_lng,
       created_at
     FROM favorite_routes
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows.map(row => ({
    favoriteId: row.favoriteId,
    departurePlace: {
      name: row.departurePlaceName,
      lat: parseFloat(row.departureLat),
      lng: parseFloat(row.departureLng),
    },
    arrivalPlace: {
      name: row.arrivalPlaceName,
      lat: parseFloat(row.arrivalLat),
      lng: parseFloat(row.arrivalLng),
    },
    createdAt: row.createdAt,
  }));
};

/**
 * 즐겨찾는 경로 추가
 * @param {string} userId - 사용자 UUID
 * @param {Object} data - { departurePlace, arrivalPlace }
 * @returns {Object} 추가된 경로 정보
 */
const addFavorite = async (userId, { departurePlace, arrivalPlace }) => {
  const result = await query(
    `INSERT INTO favorite_routes
       (user_id, departure_place_name, departure_location, arrival_place_name, arrival_location)
     VALUES
       ($1, $2, ST_Point($3, $4)::GEOGRAPHY, $5, ST_Point($6, $7)::GEOGRAPHY)
     RETURNING
       favorite_id,
       departure_place_name,
       ST_Y(departure_location::geometry) AS departure_lat,
       ST_X(departure_location::geometry) AS departure_lng,
       arrival_place_name,
       ST_Y(arrival_location::geometry) AS arrival_lat,
       ST_X(arrival_location::geometry) AS arrival_lng,
       created_at`,
    [
      userId,
      departurePlace.name,
      departurePlace.lng,
      departurePlace.lat,
      arrivalPlace.name,
      arrivalPlace.lng,
      arrivalPlace.lat,
    ]
  );

  const row = result.rows[0];
  return {
    favoriteId: row.favoriteId,
    departurePlace: {
      name: row.departurePlaceName,
      lat: parseFloat(row.departureLat),
      lng: parseFloat(row.departureLng),
    },
    arrivalPlace: {
      name: row.arrivalPlaceName,
      lat: parseFloat(row.arrivalLat),
      lng: parseFloat(row.arrivalLng),
    },
    createdAt: row.createdAt,
  };
};

/**
 * 즐겨찾는 경로 삭제
 * @param {string} userId - 사용자 UUID
 * @param {string} favoriteId - 경로 UUID
 */
const deleteFavorite = async (userId, favoriteId) => {
  const result = await query(
    'DELETE FROM favorite_routes WHERE favorite_id = $1 AND user_id = $2 RETURNING favorite_id',
    [favoriteId, userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('즐겨찾는 경로를 찾을 수 없습니다.');
    error.code = ERROR_CODES.NOT_FOUND;
    error.statusCode = 404;
    throw error;
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
