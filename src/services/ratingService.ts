import { query } from '../config/database';
import { ERROR_CODES, RATING } from '../config/constants';
import type {
  CreateRatingInput,
  RatingWithUsers,
  PodRatingStatus,
  Pagination,
  PaginatedResult,
} from '../types';

// ─── 에러 팩토리 ──────────────────────────────────────────────────────────────

const createError = (code: string, message: string, statusCode: number) => {
  const err = new Error(message) as Error & { code: string; statusCode: number };
  err.code = code;
  err.statusCode = statusCode;
  return err;
};

// ─── 평가 제출 ────────────────────────────────────────────────────────────────

/**
 * POST /v1/ratings
 * - 팟이 completed 상태여야 함
 * - reviewer/reviewee 모두 팟 참여자여야 함
 * - 자기 자신 평가 불가
 * - 동일 (pod, reviewer, reviewee) 중복 불가
 * - tags는 허용된 값만 가능
 */
export const createRating = async (
  reviewerId: string,
  input: CreateRatingInput
): Promise<RatingWithUsers> => {
  const { podId, revieweeId, rating, tags, comment } = input;

  // 자기 자신 평가 불가
  if (reviewerId === revieweeId) {
    throw createError(ERROR_CODES.CANNOT_RATE_SELF, '자기 자신을 평가할 수 없습니다.', 400);
  }

  // 팟 상태 + 두 참여자 동시 검증
  const podResult = await query<{
    podId: string;
    status: string;
    departurePlaceName: string;
    arrivalPlaceName: string;
    departureTime: Date;
  }>(
    `SELECT p.pod_id, p.status,
            p.departure_place_name,
            p.arrival_place_name,
            p.departure_time
     FROM pods p
     WHERE p.pod_id = $1`,
    [podId]
  );

  if (!podResult.rows.length) {
    throw createError(ERROR_CODES.NOT_FOUND, '팟을 찾을 수 없습니다.', 404);
  }

  const pod = podResult.rows[0];

  if (pod.status !== 'completed') {
    throw createError(
      ERROR_CODES.POD_NOT_COMPLETED,
      '완료된 팟에서만 평가할 수 있습니다.',
      400
    );
  }

  // reviewer가 팟 참여자인지 확인
  const reviewerParticipantResult = await query<{ userId: string }>(
    `SELECT user_id FROM pod_participants WHERE pod_id = $1 AND user_id = $2`,
    [podId, reviewerId]
  );
  if (!reviewerParticipantResult.rows.length) {
    throw createError(ERROR_CODES.NOT_PARTICIPANT, '해당 팟의 참여자만 평가할 수 있습니다.', 403);
  }

  // reviewee가 팟 참여자인지 확인
  const revieweeParticipantResult = await query<{ userId: string }>(
    `SELECT user_id FROM pod_participants WHERE pod_id = $1 AND user_id = $2`,
    [podId, revieweeId]
  );
  if (!revieweeParticipantResult.rows.length) {
    throw createError(ERROR_CODES.NOT_FOUND, '평가 대상자가 해당 팟의 참여자가 아닙니다.', 404);
  }

  // 중복 평가 확인
  const duplicateResult = await query<{ ratingId: string }>(
    `SELECT rating_id FROM ratings WHERE pod_id = $1 AND reviewer_id = $2 AND reviewee_id = $3`,
    [podId, reviewerId, revieweeId]
  );
  if (duplicateResult.rows.length) {
    throw createError(ERROR_CODES.ALREADY_RATED, '이미 해당 참여자를 평가했습니다.', 409);
  }

  // 태그 유효성 검사
  if (tags && tags.length > 0) {
    const invalidTags = tags.filter(
      (tag) => !(RATING.ALLOWED_TAGS as readonly string[]).includes(tag)
    );
    if (invalidTags.length > 0) {
      throw createError(
        ERROR_CODES.VALIDATION_ERROR,
        `유효하지 않은 태그입니다: ${invalidTags.join(', ')}`,
        400
      );
    }
  }

  // 평가 저장
  const insertResult = await query<{ ratingId: string; createdAt: Date }>(
    `INSERT INTO ratings (pod_id, reviewer_id, reviewee_id, rating, tags, comment)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING rating_id, created_at`,
    [podId, reviewerId, revieweeId, rating, tags ?? null, comment ?? null]
  );

  const ratingId = insertResult.rows[0].ratingId;

  // 상세 정보 조회 후 반환
  return getRatingById(ratingId);
};

// ─── 단일 평가 조회 ───────────────────────────────────────────────────────────

export const getRatingById = async (ratingId: string): Promise<RatingWithUsers> => {
  const result = await query<RatingWithUsers>(
    `SELECT
       r.rating_id, r.pod_id, r.reviewer_id, r.reviewee_id,
       r.rating, r.tags, r.comment, r.created_at,
       reviewer.nickname      AS reviewer_nickname,
       reviewer.profile_image AS reviewer_profile_image,
       reviewer.verification_badge AS reviewer_verification_badge,
       reviewee.nickname      AS reviewee_nickname,
       reviewee.profile_image AS reviewee_profile_image,
       p.departure_place_name AS pod_departure_place_name,
       p.arrival_place_name   AS pod_arrival_place_name,
       p.departure_time           AS pod_departure_time
     FROM ratings r
     JOIN users reviewer ON reviewer.user_id = r.reviewer_id
     JOIN users reviewee ON reviewee.user_id = r.reviewee_id
     JOIN pods  p        ON p.pod_id         = r.pod_id
     WHERE r.rating_id = $1`,
    [ratingId]
  );

  if (!result.rows.length) {
    throw createError(ERROR_CODES.RATING_NOT_FOUND, '평가를 찾을 수 없습니다.', 404);
  }

  return result.rows[0];
};

// ─── 내가 받은 평가 목록 ──────────────────────────────────────────────────────

export const getReceivedRatings = async (
  userId: string,
  page: number,
  limit: number
): Promise<PaginatedResult<RatingWithUsers>> => {
  const offset = (page - 1) * limit;

  const [countResult, rowsResult] = await Promise.all([
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM ratings WHERE reviewee_id = $1`,
      [userId]
    ),
    query<RatingWithUsers>(
      `SELECT
         r.rating_id, r.pod_id, r.reviewer_id, r.reviewee_id,
         r.rating, r.tags, r.comment, r.created_at,
         reviewer.nickname      AS reviewer_nickname,
         reviewer.profile_image AS reviewer_profile_image,
         reviewer.verification_badge AS reviewer_verification_badge,
         reviewee.nickname      AS reviewee_nickname,
         reviewee.profile_image AS reviewee_profile_image,
         p.departure_place_name AS pod_departure_place_name,
         p.arrival_place_name   AS pod_arrival_place_name,
         p.departure_time           AS pod_departure_time
       FROM ratings r
       JOIN users reviewer ON reviewer.user_id = r.reviewer_id
       JOIN users reviewee ON reviewee.user_id = r.reviewee_id
       JOIN pods  p        ON p.pod_id         = r.pod_id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
  ]);

  return {
    items: rowsResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
};

// ─── 내가 보낸 평가 목록 ──────────────────────────────────────────────────────

export const getSentRatings = async (
  userId: string,
  page: number,
  limit: number
): Promise<PaginatedResult<RatingWithUsers>> => {
  const offset = (page - 1) * limit;

  const [countResult, rowsResult] = await Promise.all([
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM ratings WHERE reviewer_id = $1`,
      [userId]
    ),
    query<RatingWithUsers>(
      `SELECT
         r.rating_id, r.pod_id, r.reviewer_id, r.reviewee_id,
         r.rating, r.tags, r.comment, r.created_at,
         reviewer.nickname      AS reviewer_nickname,
         reviewer.profile_image AS reviewer_profile_image,
         reviewer.verification_badge AS reviewer_verification_badge,
         reviewee.nickname      AS reviewee_nickname,
         reviewee.profile_image AS reviewee_profile_image,
         p.departure_place_name AS pod_departure_place_name,
         p.arrival_place_name   AS pod_arrival_place_name,
         p.departure_time           AS pod_departure_time
       FROM ratings r
       JOIN users reviewer ON reviewer.user_id = r.reviewer_id
       JOIN users reviewee ON reviewee.user_id = r.reviewee_id
       JOIN pods  p        ON p.pod_id         = r.pod_id
       WHERE r.reviewer_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
  ]);

  return {
    items: rowsResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
};

// ─── 특정 유저 공개 평가 목록 ─────────────────────────────────────────────────

export const getUserRatings = async (
  userId: string,
  page: number,
  limit: number
): Promise<PaginatedResult<RatingWithUsers> & { averageRating: number | null }> => {
  const offset = (page - 1) * limit;

  const [countResult, rowsResult, avgResult] = await Promise.all([
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM ratings WHERE reviewee_id = $1`,
      [userId]
    ),
    query<RatingWithUsers>(
      `SELECT
         r.rating_id, r.pod_id, r.reviewer_id, r.reviewee_id,
         r.rating, r.tags, r.comment, r.created_at,
         reviewer.nickname      AS reviewer_nickname,
         reviewer.profile_image AS reviewer_profile_image,
         reviewer.verification_badge AS reviewer_verification_badge,
         reviewee.nickname      AS reviewee_nickname,
         reviewee.profile_image AS reviewee_profile_image,
         p.departure_place_name AS pod_departure_place_name,
         p.arrival_place_name   AS pod_arrival_place_name,
         p.departure_time           AS pod_departure_time
       FROM ratings r
       JOIN users reviewer ON reviewer.user_id = r.reviewer_id
       JOIN users reviewee ON reviewee.user_id = r.reviewee_id
       JOIN pods  p        ON p.pod_id         = r.pod_id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    query<{ avg: string | null }>(
      `SELECT AVG(rating)::DECIMAL(3,2) AS avg FROM ratings WHERE reviewee_id = $1`,
      [userId]
    ),
  ]);

  return {
    items: rowsResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
    averageRating: avgResult.rows[0].avg ? parseFloat(avgResult.rows[0].avg) : null,
  };
};

// ─── 팟 평가 현황 (평가 가능한 참여자 목록) ──────────────────────────────────

export const getPodRatingStatus = async (
  podId: string,
  reviewerId: string
): Promise<PodRatingStatus> => {
  // 팟 존재 및 상태 확인
  const podResult = await query<{
    podId: string;
    status: string;
    departurePlaceName: string;
    arrivalPlaceName: string;
    departureTime: Date;
  }>(
    `SELECT pod_id, status,
            departure_place_name,
            arrival_place_name,
            departure_time
     FROM pods WHERE pod_id = $1`,
    [podId]
  );

  if (!podResult.rows.length) {
    throw createError(ERROR_CODES.NOT_FOUND, '팟을 찾을 수 없습니다.', 404);
  }

  const pod = podResult.rows[0];

  if (pod.status !== 'completed') {
    throw createError(
      ERROR_CODES.POD_NOT_COMPLETED,
      '완료된 팟에서만 평가 현황을 조회할 수 있습니다.',
      400
    );
  }

  // reviewer가 팟 참여자인지 확인
  const participantCheck = await query<{ userId: string }>(
    `SELECT user_id FROM pod_participants WHERE pod_id = $1 AND user_id = $2`,
    [podId, reviewerId]
  );
  if (!participantCheck.rows.length) {
    throw createError(ERROR_CODES.NOT_PARTICIPANT, '해당 팟의 참여자만 조회할 수 있습니다.', 403);
  }

  // 본인 제외 참여자 목록 + 이미 평가 여부
  const participantsResult = await query<{
    userId: string;
    nickname: string;
    profileImage: string | null;
    verificationBadge: string | null;
    alreadyRated: boolean;
  }>(
    `SELECT
       pp.user_id,
       u.nickname,
       u.profile_image,
       u.verification_badge,
       EXISTS (
         SELECT 1 FROM ratings r
         WHERE r.pod_id = $1 AND r.reviewer_id = $2 AND r.reviewee_id = pp.user_id
       ) AS already_rated
     FROM pod_participants pp
     JOIN users u ON u.user_id = pp.user_id
     WHERE pp.pod_id = $1 AND pp.user_id != $2
     ORDER BY pp.joined_at`,
    [podId, reviewerId]
  );

  return {
    podId: pod.podId,
    departurePlaceName: pod.departurePlaceName,
    arrivalPlaceName: pod.arrivalPlaceName,
    departureTime: pod.departureTime,
    participants: participantsResult.rows,
  };
};
