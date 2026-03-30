import { query } from '../config/database';
import { ERROR_CODES, CHAT, PAGINATION } from '../config/constants';
import type {
  ChatRoomSummary,
  ChatMessage,
  ChatParticipant,
  ChatParticipantsResult,
  SendMessageInput,
  MessageType,
  PodStatus,
  PaginatedResult,
} from '../types';

// ─── 내부 DB 행 타입 ──────────────────────────────────────────────────────────

type ChatRoomRow = {
  chatRoomId: string;
  podId: string;
  departurePlace: string;
  arrivalPlace: string;
  departureTime: Date;
  podStatus: string;
  lastMessageId: string | null;
  lastContent: string | null;
  lastSenderId: string | null;
  lastSenderNickname: string | null;
  lastCreatedAt: Date | null;
  createdAt: Date;
};

type MessageRow = {
  messageId: string;
  chatRoomId: string;
  content: string | null;
  messageType: string;
  locationLat: string | null;
  locationLng: string | null;
  locationAddress: string | null;
  senderId: string;
  senderNickname: string;
  senderProfileImage: string | null;
  createdAt: Date;
};

type ParticipantRow = {
  userId: string;
  nickname: string;
  profileImage: string | null;
  verificationBadge: string | null;
  isReady: boolean | null;
};

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

const makeError = (message: string, code: string, statusCode: number): Error =>
  Object.assign(new Error(message), { code, statusCode });

/**
 * 사용자가 채팅방 참여자인지 검증
 */
const verifyParticipant = async (chatRoomId: string, userId: string): Promise<string> => {
  const result = await query<{ podId: string }>(
    `SELECT cr.pod_id
     FROM chat_rooms cr
     JOIN pod_participants pp ON pp.pod_id = cr.pod_id
     WHERE cr.chat_room_id = $1 AND pp.user_id = $2`,
    [chatRoomId, userId]
  );

  if (result.rows.length === 0) {
    // 채팅방 존재 여부 먼저 확인
    const room = await query<{ chatRoomId: string }>(
      'SELECT chat_room_id FROM chat_rooms WHERE chat_room_id = $1',
      [chatRoomId]
    );

    if (room.rows.length === 0) {
      throw makeError('채팅방을 찾을 수 없습니다.', ERROR_CODES.CHAT_ROOM_NOT_FOUND, 404);
    }

    throw makeError(
      '이 채팅방에 참여하고 있지 않습니다.',
      ERROR_CODES.NOT_CHAT_PARTICIPANT,
      403
    );
  }

  return result.rows[0].podId;
};

const toMessage = (row: MessageRow): ChatMessage => ({
  messageId: row.messageId,
  chatRoomId: row.chatRoomId,
  content: row.content,
  messageType: row.messageType as MessageType,
  location:
    row.locationLat !== null
      ? {
          latitude: parseFloat(row.locationLat),
          longitude: parseFloat(row.locationLng!),
          address: row.locationAddress!,
        }
      : null,
  sender: {
    userId: row.senderId,
    nickname: row.senderNickname,
    profileImage: row.senderProfileImage,
  },
  createdAt: row.createdAt,
});

// ─── 서비스 함수 ───────────────────────────────────────────────────────────────

/**
 * 내 채팅방 목록 조회
 */
export const getMyChatRooms = async (userId: string): Promise<ChatRoomSummary[]> => {
  const result = await query<ChatRoomRow>(
    `SELECT
       cr.chat_room_id,
       cr.created_at,
       p.pod_id,
       p.departure_place_name AS departure_place,
       p.arrival_place_name   AS arrival_place,
       p.departure_time,
       p.status               AS pod_status,
       lm.message_id          AS last_message_id,
       lm.content             AS last_content,
       lm.sender_id           AS last_sender_id,
       lu.nickname            AS last_sender_nickname,
       lm.created_at          AS last_created_at
     FROM chat_rooms cr
     JOIN pods p ON p.pod_id = cr.pod_id
     JOIN pod_participants pp ON pp.pod_id = p.pod_id
     LEFT JOIN LATERAL (
       SELECT m.message_id, m.content, m.sender_id, m.created_at
       FROM messages m
       WHERE m.chat_room_id = cr.chat_room_id
       ORDER BY m.created_at DESC
       LIMIT 1
     ) lm ON TRUE
     LEFT JOIN users lu ON lu.user_id = lm.sender_id
     WHERE pp.user_id = $1
     ORDER BY COALESCE(lm.created_at, cr.created_at) DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    chatRoomId: row.chatRoomId,
    pod: {
      podId: row.podId,
      departurePlace: row.departurePlace,
      arrivalPlace: row.arrivalPlace,
      departureTime: row.departureTime,
      status: row.podStatus as PodStatus,
    },
    lastMessage:
      row.lastMessageId !== null
        ? {
            messageId: row.lastMessageId,
            content: row.lastContent,
            sender: {
              userId: row.lastSenderId!,
              nickname: row.lastSenderNickname!,
            },
            createdAt: row.lastCreatedAt!,
          }
        : null,
    unreadCount: 0, // TODO: 읽음 추적 테이블 구현 시 업데이트
    createdAt: row.createdAt,
  }));
};

/**
 * 채팅 메시지 조회
 */
export const getMessages = async (
  chatRoomId: string,
  userId: string,
  options: { page?: number; limit?: number; before?: string }
): Promise<PaginatedResult<ChatMessage>> => {
  await verifyParticipant(chatRoomId, userId);

  const page = options.page ?? PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(options.limit ?? CHAT.DEFAULT_MESSAGE_LIMIT, CHAT.MAX_MESSAGE_LIMIT);
  const offset = (page - 1) * limit;

  // before 커서가 있으면 해당 메시지 이전 것만 조회
  const beforeClause = options.before
    ? 'AND m.created_at < (SELECT created_at FROM messages WHERE message_id = $4)'
    : '';
  const params: unknown[] = [chatRoomId, limit, offset];
  if (options.before) params.push(options.before);

  const countParams: unknown[] = [chatRoomId];
  const countBeforeClause = options.before
    ? 'AND m.created_at < (SELECT created_at FROM messages WHERE message_id = $2)'
    : '';
  if (options.before) countParams.push(options.before);

  const [messagesResult, countResult] = await Promise.all([
    query<MessageRow>(
      `SELECT
         m.message_id,
         m.chat_room_id,
         m.content,
         m.message_type,
         m.location_lat,
         m.location_lng,
         m.location_address,
         m.sender_id,
         u.nickname    AS sender_nickname,
         u.profile_image AS sender_profile_image,
         m.created_at
       FROM messages m
       JOIN users u ON u.user_id = m.sender_id
       WHERE m.chat_room_id = $1 ${beforeClause}
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      params
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM messages m WHERE m.chat_room_id = $1 ${countBeforeClause}`,
      countParams
    ),
  ]);

  return {
    items: messagesResult.rows.map(toMessage),
    total: parseInt(countResult.rows[0].count, 10),
  };
};

/**
 * 메시지 전송
 */
export const sendMessage = async (
  chatRoomId: string,
  userId: string,
  input: SendMessageInput
): Promise<ChatMessage> => {
  await verifyParticipant(chatRoomId, userId);

  const { messageType, content, location } = input;

  const result = await query<{ messageId: string }>(
    `INSERT INTO messages
       (chat_room_id, sender_id, message_type, content, location_lat, location_lng, location_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING message_id`,
    [
      chatRoomId,
      userId,
      messageType,
      content ?? null,
      location?.latitude ?? null,
      location?.longitude ?? null,
      location?.address ?? null,
    ]
  );

  const messageId = result.rows[0].messageId;

  const msgResult = await query<MessageRow>(
    `SELECT
       m.message_id,
       m.chat_room_id,
       m.content,
       m.message_type,
       m.location_lat,
       m.location_lng,
       m.location_address,
       m.sender_id,
       u.nickname    AS sender_nickname,
       u.profile_image AS sender_profile_image,
       m.created_at
     FROM messages m
     JOIN users u ON u.user_id = m.sender_id
     WHERE m.message_id = $1`,
    [messageId]
  );

  return toMessage(msgResult.rows[0]);
};

/**
 * 준비 상태 업데이트
 */
export const updateReadyStatus = async (
  chatRoomId: string,
  userId: string,
  isReady: boolean
): Promise<{ userId: string; isReady: boolean }> => {
  await verifyParticipant(chatRoomId, userId);

  // UPSERT: ready_status가 없으면 생성, 있으면 업데이트
  await query(
    `INSERT INTO ready_status (chat_room_id, user_id, is_ready)
     VALUES ($1, $2, $3)
     ON CONFLICT (chat_room_id, user_id)
     DO UPDATE SET is_ready = $3`,
    [chatRoomId, userId, isReady]
  );

  return { userId, isReady };
};

/**
 * 채팅방 참여자 + 준비 상태 조회
 */
export const getParticipants = async (
  chatRoomId: string,
  userId: string
): Promise<ChatParticipantsResult> => {
  await verifyParticipant(chatRoomId, userId);

  const result = await query<ParticipantRow>(
    `SELECT
       u.user_id,
       u.nickname,
       u.profile_image,
       u.verification_badge,
       rs.is_ready
     FROM pod_participants pp
     JOIN users u ON u.user_id = pp.user_id
     JOIN chat_rooms cr ON cr.pod_id = pp.pod_id
     LEFT JOIN ready_status rs ON rs.chat_room_id = cr.chat_room_id AND rs.user_id = u.user_id
     WHERE cr.chat_room_id = $1
     ORDER BY pp.joined_at ASC`,
    [chatRoomId]
  );

  const participants: ChatParticipant[] = result.rows.map((row) => ({
    userId: row.userId,
    nickname: row.nickname,
    profileImage: row.profileImage,
    verificationBadge: row.verificationBadge,
    isReady: row.isReady ?? false,
  }));

  return {
    participants,
    allReady: participants.length > 0 && participants.every((p) => p.isReady),
  };
};
