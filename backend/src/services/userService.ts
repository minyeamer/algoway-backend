import { query } from '../config/database';
import { ERROR_CODES } from '../config/constants';
import type { FavoriteRoute, PaginatedResult, RideItem, PlaceInfo } from '../types';

type UserRow = {
  userId: string;
  email: string;
  nickname: string;
  profileImage: string | null;
  userType: string;
  isVerified: boolean;
  verificationBadge: string | null;
  mannerScore: string;
  totalRides: number;
  createdAt: Date;
};

type PublicUserRow = Omit<UserRow, 'email'>;

type FavoriteRaw = {
  favoriteId: string;
  departurePlaceName: string;
  departureLat: string;
  departureLng: string;
  arrivalPlaceName: string;
  arrivalLat: string;
  arrivalLng: string;
  createdAt: Date;
};

const makeError = (message: string, code: string, statusCode: number): Error =>
  Object.assign(new Error(message), { code, statusCode });

/**
 * 내 프로필 조회
 */
export const getMyProfile = async (userId: string): Promise<UserRow> => {
  const result = await query<UserRow>(
    `SELECT user_id, email, nickname, profile_image,
            user_type, is_verified, verification_badge,
            manner_score, total_rides, created_at
     FROM users
     WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw makeError('사용자를 찾을 수 없습니다.', ERROR_CODES.NOT_FOUND, 404);
  }

  return result.rows[0];
};

/**
 * 프로필 수정
 */
export const updateMyProfile = async (
  userId: string,
  updateData: { nickname?: string; profileImage?: string | null }
): Promise<Omit<UserRow, 'createdAt'>> => {
  const { nickname, profileImage } = updateData;

  if (!nickname && profileImage === undefined) {
    throw makeError('수정할 내용이 없습니다.', ERROR_CODES.INVALID_INPUT, 400);
  }

  if (nickname) {
    const existing = await query(
      'SELECT user_id FROM users WHERE nickname = $1 AND user_id != $2',
      [nickname, userId]
    );

    if (existing.rows.length > 0) {
      throw makeError('이미 사용 중인 닉네임입니다.', ERROR_CODES.ALREADY_EXISTS, 409);
    }
  }

  const setClauses: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
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

  const result = await query<Omit<UserRow, 'createdAt'>>(
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
 */
export const getUserProfile = async (userId: string): Promise<PublicUserRow> => {
  const result = await query<PublicUserRow>(
    `SELECT user_id, nickname, profile_image,
            user_type, is_verified, verification_badge,
            manner_score, total_rides, created_at
     FROM users
     WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw makeError('사용자를 찾을 수 없습니다.', ERROR_CODES.NOT_FOUND, 404);
  }

  return result.rows[0];
};

/**
 * 탑승 내역 조회
 */
export const getMyRides = async (
  userId: string,
  { page = 1, limit = 20, status }: { page?: number; limit?: number; status?: string } = {}
): Promise<PaginatedResult<RideItem>> => {
  const offset = (page - 1) * limit;
  const values: unknown[] = [userId];
  let statusClause = '';

  if (status) {
    values.push(status);
    statusClause = `AND p.status = $${values.length}`;
  }

  const countResult = await query<{ total: string }>(
    `SELECT COUNT(*) AS total
     FROM pod_participants pp
     JOIN pods p ON pp.pod_id = p.pod_id
     WHERE pp.user_id = $1 ${statusClause}`,
    values
  );

  const total = parseInt(countResult.rows[0].total, 10);

  values.push(limit, offset);

  const result = await query<RideItem>(
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

const toFavoriteRoute = (row: FavoriteRaw): FavoriteRoute => ({
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
});

/**
 * 즐겨찾는 경로 목록 조회
 */
export const getFavorites = async (userId: string): Promise<FavoriteRoute[]> => {
  const result = await query<FavoriteRaw>(
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

  return result.rows.map(toFavoriteRoute);
};

/**
 * 즐겨찾는 경로 추가
 */
export const addFavorite = async (
  userId: string,
  { departurePlace, arrivalPlace }: { departurePlace: PlaceInfo; arrivalPlace: PlaceInfo }
): Promise<FavoriteRoute> => {
  const result = await query<FavoriteRaw>(
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

  return toFavoriteRoute(result.rows[0]);
};

/**
 * 즐겨찾는 경로 삭제
 */
export const deleteFavorite = async (userId: string, favoriteId: string): Promise<void> => {
  const result = await query(
    'DELETE FROM favorite_routes WHERE favorite_id = $1 AND user_id = $2 RETURNING favorite_id',
    [favoriteId, userId]
  );

  if (result.rows.length === 0) {
    throw makeError('즐겨찾는 경로를 찾을 수 없습니다.', ERROR_CODES.NOT_FOUND, 404);
  }
};
