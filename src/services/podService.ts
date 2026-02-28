import { query } from '../config/database';
import { ERROR_CODES, GEO_SEARCH, PAGINATION } from '../config/constants';
import type {
  PodDetail,
  PodSummary,
  PodStatus,
  VehicleType,
  CreatePodInput,
  JoinPodResult,
  UpdatePodStatusResult,
  PodParticipantInfo,
  PaginatedResult,
} from '../types';

// ─── 내부 DB 행 타입 ──────────────────────────────────────────────────────────

type PodRow = {
  podId: string;
  departurePlaceName: string;
  departureLat: string;
  departureLng: string;
  arrivalPlaceName: string;
  arrivalLat: string;
  arrivalLng: string;
  departureTime: Date;
  maxParticipants: number;
  currentParticipants: number;
  vehicleType: string;
  estimatedCost: string | null;
  costPerPerson: string | null;
  status: string;
  distance?: string;
  createdAt: Date;
  creatorId: string;
  creatorNickname: string;
  creatorVerificationBadge: string | null;
};

type PodDetailRow = PodRow & {
  memo: string | null;
  chatRoomId: string | null;
  creatorProfileImage: string | null;
  creatorMannerScore: string;
};

type ParticipantRow = {
  userId: string;
  nickname: string;
  profileImage: string | null;
  verificationBadge: string | null;
  joinedAt: Date;
};

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

const makeError = (message: string, code: string, statusCode: number): Error =>
  Object.assign(new Error(message), { code, statusCode });

const toPodSummary = (row: PodRow): PodSummary => ({
  podId: row.podId,
  departurePlace: {
    name: row.departurePlaceName,
    latitude: parseFloat(row.departureLat),
    longitude: parseFloat(row.departureLng),
  },
  arrivalPlace: {
    name: row.arrivalPlaceName,
    latitude: parseFloat(row.arrivalLat),
    longitude: parseFloat(row.arrivalLng),
  },
  departureTime: row.departureTime,
  maxParticipants: row.maxParticipants,
  currentParticipants: row.currentParticipants,
  vehicleType: row.vehicleType as VehicleType,
  estimatedCost: row.estimatedCost !== null ? parseFloat(row.estimatedCost) : null,
  costPerPerson: row.costPerPerson !== null ? parseFloat(row.costPerPerson) : null,
  distance: row.distance !== undefined ? Math.round(parseFloat(row.distance)) : undefined,
  status: row.status as PodStatus,
  creator: {
    userId: row.creatorId,
    nickname: row.creatorNickname,
    verificationBadge: row.creatorVerificationBadge,
  },
  createdAt: row.createdAt,
});

const toPodDetail = (row: PodDetailRow, participants: PodParticipantInfo[]): PodDetail => ({
  ...toPodSummary(row),
  creator: {
    userId: row.creatorId,
    nickname: row.creatorNickname,
    verificationBadge: row.creatorVerificationBadge,
    profileImage: row.creatorProfileImage,
    mannerScore: row.creatorMannerScore,
  },
  memo: row.memo,
  chatRoomId: row.chatRoomId,
  participants,
});

// 팟 상세 공통 SELECT (배열/단일 모두 사용)
const POD_DETAIL_SELECT = `
  SELECT
    p.pod_id,
    p.departure_place_name,
    ST_Y(p.departure_location::geometry) AS departure_lat,
    ST_X(p.departure_location::geometry) AS departure_lng,
    p.arrival_place_name,
    ST_Y(p.arrival_location::geometry) AS arrival_lat,
    ST_X(p.arrival_location::geometry) AS arrival_lng,
    p.departure_time,
    p.max_participants,
    p.current_participants,
    p.vehicle_type,
    p.estimated_cost,
    p.cost_per_person,
    p.memo,
    p.status,
    p.created_at,
    cr.chat_room_id,
    u.user_id     AS creator_id,
    u.nickname    AS creator_nickname,
    u.profile_image AS creator_profile_image,
    u.verification_badge AS creator_verification_badge,
    u.manner_score AS creator_manner_score
  FROM pods p
  JOIN users u ON p.creator_id = u.user_id
  LEFT JOIN chat_rooms cr ON cr.pod_id = p.pod_id
`;

// 팟 참여자 조회
const getParticipants = async (podId: string): Promise<PodParticipantInfo[]> => {
  const result = await query<ParticipantRow>(
    `SELECT
       u.user_id, u.nickname, u.profile_image, u.verification_badge, pp.joined_at
     FROM pod_participants pp
     JOIN users u ON pp.user_id = u.user_id
     WHERE pp.pod_id = $1
     ORDER BY pp.joined_at ASC`,
    [podId]
  );
  return result.rows;
};

// ─── 서비스 함수 ───────────────────────────────────────────────────────────────

/**
 * 팟 생성
 */
export const createPod = async (userId: string, input: CreatePodInput): Promise<PodDetail> => {
  const {
    departurePlace,
    arrivalPlace,
    departureTime,
    maxParticipants,
    vehicleType,
    estimatedCost,
    memo,
  } = input;

  const costPerPerson =
    estimatedCost !== undefined ? Math.ceil(estimatedCost / maxParticipants) : null;

  const result = await query<{ podId: string }>(
    `INSERT INTO pods
       (creator_id, departure_place_name, departure_location,
        arrival_place_name, arrival_location,
        departure_time, max_participants, vehicle_type,
        estimated_cost, cost_per_person, memo)
     VALUES
       ($1, $2, ST_Point($3, $4)::GEOGRAPHY,
        $5, ST_Point($6, $7)::GEOGRAPHY,
        $8, $9, $10, $11, $12, $13)
     RETURNING pod_id`,
    [
      userId,
      departurePlace.name,
      departurePlace.longitude,
      departurePlace.latitude,
      arrivalPlace.name,
      arrivalPlace.longitude,
      arrivalPlace.latitude,
      departureTime,
      maxParticipants,
      vehicleType,
      estimatedCost ?? null,
      costPerPerson,
      memo ?? null,
    ]
  );

  return getPod(result.rows[0].podId);
};

/**
 * 팟 목록 조회 (위치 기반)
 */
export const listPods = async (
  query_: {
    latitude: number;
    longitude: number;
    radius?: number;
    page?: number;
    limit?: number;
    status?: string;
  }
): Promise<PaginatedResult<PodSummary>> => {
  const {
    latitude,
    longitude,
    radius = GEO_SEARCH.DEFAULT_RADIUS,
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    status,
  } = query_;

  const offset = (page - 1) * limit;
  const values: unknown[] = [longitude, latitude, radius];
  let statusClause = `AND p.status NOT IN ('cancelled', 'completed')`;

  if (status) {
    values.push(status);
    statusClause = `AND p.status = $${values.length}`;
  }

  const countResult = await query<{ total: string }>(
    `SELECT COUNT(*) AS total
     FROM pods p
     JOIN users u ON p.creator_id = u.user_id
     WHERE ST_DWithin(p.departure_location, ST_Point($1, $2)::GEOGRAPHY, $3) ${statusClause}`,
    values
  );

  const total = parseInt(countResult.rows[0].total, 10);

  values.push(limit, offset);

  const result = await query<PodRow>(
    `SELECT
       p.pod_id,
       p.departure_place_name,
       ST_Y(p.departure_location::geometry) AS departure_lat,
       ST_X(p.departure_location::geometry) AS departure_lng,
       p.arrival_place_name,
       ST_Y(p.arrival_location::geometry) AS arrival_lat,
       ST_X(p.arrival_location::geometry) AS arrival_lng,
       p.departure_time,
       p.max_participants,
       p.current_participants,
       p.vehicle_type,
       p.estimated_cost,
       p.cost_per_person,
       p.status,
       p.created_at,
       ST_Distance(p.departure_location, ST_Point($1, $2)::GEOGRAPHY) AS distance,
       u.user_id           AS creator_id,
       u.nickname          AS creator_nickname,
       u.verification_badge AS creator_verification_badge
     FROM pods p
     JOIN users u ON p.creator_id = u.user_id
     WHERE ST_DWithin(p.departure_location, ST_Point($1, $2)::GEOGRAPHY, $3) ${statusClause}
     ORDER BY distance ASC, p.departure_time ASC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return { items: result.rows.map(toPodSummary), total };
};

/**
 * 팟 검색 (출발지/도착지/시간/필터 기반)
 */
export const searchPods = async (params: {
  departureLat?: number;
  departureLng?: number;
  arrivalLat?: number;
  arrivalLng?: number;
  radius?: number;
  departureTimeFrom?: string;
  departureTimeTo?: string;
  verifiedOnly?: boolean;
  vehicleType?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<PodSummary>> => {
  const {
    departureLat,
    departureLng,
    arrivalLat,
    arrivalLng,
    radius = 1000,
    departureTimeFrom,
    departureTimeTo,
    verifiedOnly,
    vehicleType,
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
  } = params;

  const offset = (page - 1) * limit;
  const values: unknown[] = [];
  const conditions: string[] = [`p.status NOT IN ('cancelled', 'completed')`];

  if (departureLat !== undefined && departureLng !== undefined) {
    values.push(departureLng, departureLat, radius);
    conditions.push(
      `ST_DWithin(p.departure_location, ST_Point($${values.length - 2}, $${values.length - 1})::GEOGRAPHY, $${values.length})`
    );
  }

  if (arrivalLat !== undefined && arrivalLng !== undefined) {
    values.push(arrivalLng, arrivalLat, radius);
    conditions.push(
      `ST_DWithin(p.arrival_location, ST_Point($${values.length - 2}, $${values.length - 1})::GEOGRAPHY, $${values.length})`
    );
  }

  if (departureTimeFrom) {
    values.push(departureTimeFrom);
    conditions.push(`p.departure_time >= $${values.length}`);
  }

  if (departureTimeTo) {
    values.push(departureTimeTo);
    conditions.push(`p.departure_time <= $${values.length}`);
  }

  if (verifiedOnly) {
    conditions.push(`u.is_verified = TRUE`);
  }

  if (vehicleType) {
    values.push(vehicleType);
    conditions.push(`p.vehicle_type = $${values.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query<{ total: string }>(
    `SELECT COUNT(*) AS total
     FROM pods p
     JOIN users u ON p.creator_id = u.user_id
     ${whereClause}`,
    values
  );

  const total = parseInt(countResult.rows[0].total, 10);

  values.push(limit, offset);

  // distance: 출발지 좌표가 있으면 거리, 없으면 null
  const distanceExpr =
    departureLat !== undefined && departureLng !== undefined
      ? `ST_Distance(p.departure_location, ST_Point($${values.indexOf(departureLng) + 1}, $${values.indexOf(departureLat) + 1})::GEOGRAPHY) AS distance,`
      : '';

  const result = await query<PodRow>(
    `SELECT
       p.pod_id,
       p.departure_place_name,
       ST_Y(p.departure_location::geometry) AS departure_lat,
       ST_X(p.departure_location::geometry) AS departure_lng,
       p.arrival_place_name,
       ST_Y(p.arrival_location::geometry) AS arrival_lat,
       ST_X(p.arrival_location::geometry) AS arrival_lng,
       p.departure_time,
       p.max_participants,
       p.current_participants,
       p.vehicle_type,
       p.estimated_cost,
       p.cost_per_person,
       p.status,
       p.created_at,
       ${distanceExpr}
       u.user_id            AS creator_id,
       u.nickname           AS creator_nickname,
       u.verification_badge AS creator_verification_badge
     FROM pods p
     JOIN users u ON p.creator_id = u.user_id
     ${whereClause}
     ORDER BY p.departure_time ASC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return { items: result.rows.map(toPodSummary), total };
};

/**
 * 팟 상세 조회
 */
export const getPod = async (podId: string): Promise<PodDetail> => {
  const result = await query<PodDetailRow>(
    `${POD_DETAIL_SELECT} WHERE p.pod_id = $1`,
    [podId]
  );

  if (result.rows.length === 0) {
    throw makeError('팟을 찾을 수 없습니다.', ERROR_CODES.NOT_FOUND, 404);
  }

  const participants = await getParticipants(podId);

  return toPodDetail(result.rows[0], participants);
};

/**
 * 팟 참여
 */
export const joinPod = async (podId: string, userId: string): Promise<JoinPodResult> => {
  // 팟 조회
  const podResult = await query<{ status: string; maxParticipants: number; currentParticipants: number; chatRoomId: string | null }>(
    `SELECT p.status, p.max_participants, p.current_participants, cr.chat_room_id
     FROM pods p
     LEFT JOIN chat_rooms cr ON cr.pod_id = p.pod_id
     WHERE p.pod_id = $1`,
    [podId]
  );

  if (podResult.rows.length === 0) {
    throw makeError('팟을 찾을 수 없습니다.', ERROR_CODES.NOT_FOUND, 404);
  }

  const pod = podResult.rows[0];

  if (pod.status === 'cancelled') {
    throw makeError('취소된 팟입니다.', ERROR_CODES.FORBIDDEN, 403);
  }

  if (pod.status === 'full' || pod.status === 'in_progress' || pod.status === 'completed') {
    throw makeError('팟에 참여할 수 없습니다.', ERROR_CODES.POD_FULL, 400);
  }

  // 이미 참여중인지 확인
  const participantCheck = await query(
    'SELECT 1 FROM pod_participants WHERE pod_id = $1 AND user_id = $2',
    [podId, userId]
  );

  if (participantCheck.rows.length > 0) {
    throw makeError('이미 참여 중인 팟입니다.', ERROR_CODES.ALREADY_JOINED, 409);
  }

  // 참여 (트리거가 current_participants 자동 증분 + full 상태 전환)
  await query(
    'INSERT INTO pod_participants (pod_id, user_id) VALUES ($1, $2)',
    [podId, userId]
  );

  // 업데이트된 팟 정보 반환
  const updated = await query<{ currentParticipants: number; maxParticipants: number; chatRoomId: string | null }>(
    `SELECT p.current_participants, p.max_participants, cr.chat_room_id
     FROM pods p
     LEFT JOIN chat_rooms cr ON cr.pod_id = p.pod_id
     WHERE p.pod_id = $1`,
    [podId]
  );

  return {
    podId,
    chatRoomId: updated.rows[0].chatRoomId,
    currentParticipants: updated.rows[0].currentParticipants,
    maxParticipants: updated.rows[0].maxParticipants,
  };
};

/**
 * 팟 나가기
 */
export const leavePod = async (podId: string, userId: string): Promise<void> => {
  // 팟 존재 및 방장 여부 확인
  const podResult = await query<{ creatorId: string; status: string }>(
    'SELECT creator_id, status FROM pods WHERE pod_id = $1',
    [podId]
  );

  if (podResult.rows.length === 0) {
    throw makeError('팟을 찾을 수 없습니다.', ERROR_CODES.NOT_FOUND, 404);
  }

  const pod = podResult.rows[0];

  if (pod.creatorId === userId) {
    throw makeError(
      '팟 방장은 나갈 수 없습니다. 팟을 취소하려면 상태를 cancelled로 변경하세요.',
      ERROR_CODES.CREATOR_CANNOT_LEAVE,
      400
    );
  }

  if (pod.status === 'cancelled' || pod.status === 'completed') {
    throw makeError('이미 종료된 팟입니다.', ERROR_CODES.FORBIDDEN, 403);
  }

  // 참여 여부 확인 후 삭제 (트리거가 current_participants 자동 감소)
  const result = await query(
    'DELETE FROM pod_participants WHERE pod_id = $1 AND user_id = $2 RETURNING participant_id',
    [podId, userId]
  );

  if (result.rows.length === 0) {
    throw makeError('참여 중인 팟이 아닙니다.', ERROR_CODES.NOT_PARTICIPANT, 404);
  }
};

/**
 * 팟 상태 업데이트 (방장 전용)
 */
export const updatePodStatus = async (
  podId: string,
  userId: string,
  status: PodStatus
): Promise<UpdatePodStatusResult> => {
  // 팟 존재 및 방장 확인
  const podResult = await query<{ creatorId: string; status: string }>(
    'SELECT creator_id, status FROM pods WHERE pod_id = $1',
    [podId]
  );

  if (podResult.rows.length === 0) {
    throw makeError('팟을 찾을 수 없습니다.', ERROR_CODES.NOT_FOUND, 404);
  }

  const pod = podResult.rows[0];

  if (pod.creatorId !== userId) {
    throw makeError('방장만 팟 상태를 변경할 수 있습니다.', ERROR_CODES.FORBIDDEN, 403);
  }

  if (pod.status === 'cancelled' || pod.status === 'completed') {
    throw makeError('이미 종료된 팟의 상태는 변경할 수 없습니다.', ERROR_CODES.FORBIDDEN, 403);
  }

  const result = await query<{ podId: string; status: string }>(
    'UPDATE pods SET status = $1, updated_at = NOW() WHERE pod_id = $2 RETURNING pod_id, status',
    [status, podId]
  );

  return {
    podId: result.rows[0].podId,
    status: result.rows[0].status as PodStatus,
  };
};
