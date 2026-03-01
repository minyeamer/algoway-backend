import { Server } from 'socket.io';
import { query } from '../config/database';
import { ERROR_CODES, MESSAGE_TYPES } from '../config/constants';
import * as chatService from '../services/chatService';
import logger from '../utils/logger';
import type { AuthenticatedSocket } from './index';
import type { SendMessageInput, MessageType } from '../types';

// ─── 이벤트 타입 ──────────────────────────────────────────────────────────────

interface JoinPayload {
  chatRoomId: string;
}

interface MessagePayload {
  chatRoomId: string;
  messageType: MessageType;
  content?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

interface TypingPayload {
  chatRoomId: string;
}

interface ReadyPayload {
  chatRoomId: string;
  isReady: boolean;
}

// ─── 참여자 검증 ──────────────────────────────────────────────────────────────

const verifyParticipant = async (
  chatRoomId: string,
  userId: string
): Promise<boolean> => {
  const result = await query<{ podId: string }>(
    `SELECT cr.pod_id
    FROM chat_rooms cr
    JOIN pod_participants pp ON pp.pod_id = cr.pod_id
    WHERE cr.chat_room_id = $1 AND pp.user_id = $2`,
    [chatRoomId, userId]
  );
  return result.rows.length > 0;
};

// ─── UUID 간이 검증 ──────────────────────────────────────────────────────────

const isValidUUID = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

// ─── 에러 응답 헬퍼 ───────────────────────────────────────────────────────────

const emitError = (
  socket: AuthenticatedSocket,
  event: string,
  code: string,
  message: string
): void => {
  socket.emit('error:chat', { event, code, message });
};

// ─── 핸들러 등록 ──────────────────────────────────────────────────────────────

export const registerChatHandlers = (
  io: Server,
  socket: AuthenticatedSocket
): void => {
  const userId = socket.userId;
  const nickname = socket.nickname;

  /**
   * chat:join — 채팅방 입장 (Socket.io Room 참여)
   */
  socket.on('chat:join', async (payload: JoinPayload) => {
    try {
      const { chatRoomId } = payload;

      if (!chatRoomId || !isValidUUID(chatRoomId)) {
        return emitError(socket, 'chat:join', ERROR_CODES.VALIDATION_ERROR, '유효하지 않은 chatRoomId입니다.');
      }

      const isParticipant = await verifyParticipant(chatRoomId, userId);
      if (!isParticipant) {
        return emitError(socket, 'chat:join', ERROR_CODES.NOT_CHAT_PARTICIPANT, '이 채팅방에 참여하고 있지 않습니다.');
      }

      // Socket.io Room에 참여
      socket.join(`chat:${chatRoomId}`);
      logger.info(`💬 ${nickname} joined room chat:${chatRoomId}`);

      // 같은 방의 다른 참여자에게 알림
      socket.to(`chat:${chatRoomId}`).emit('chat:user_joined', {
        chatRoomId,
        userId,
        nickname,
        timestamp: new Date().toISOString(),
      });

      // 입장 완료 응답
      socket.emit('chat:joined', {
        chatRoomId,
        message: `${chatRoomId} 채팅방에 입장했습니다.`,
      });
    } catch (error) {
      logger.error(`chat:join error (${userId}):`, error);
      emitError(socket, 'chat:join', ERROR_CODES.INTERNAL_SERVER_ERROR, '채팅방 입장 중 오류가 발생했습니다.');
    }
  });

  /**
   * chat:leave — 채팅방 퇴장 (Socket.io Room에서만 나감, 팟 탈퇴 아님)
   */
  socket.on('chat:leave', async (payload: JoinPayload) => {
    try {
      const { chatRoomId } = payload;

      if (!chatRoomId || !isValidUUID(chatRoomId)) {
        return emitError(socket, 'chat:leave', ERROR_CODES.VALIDATION_ERROR, '유효하지 않은 chatRoomId입니다.');
      }

      socket.leave(`chat:${chatRoomId}`);
      logger.info(`💬 ${nickname} left room chat:${chatRoomId}`);

      // 같은 방의 다른 참여자에게 알림
      socket.to(`chat:${chatRoomId}`).emit('chat:user_left', {
        chatRoomId,
        userId,
        nickname,
        timestamp: new Date().toISOString(),
      });

      socket.emit('chat:left', {
        chatRoomId,
        message: `${chatRoomId} 채팅방에서 나갔습니다.`,
      });
    } catch (error) {
      logger.error(`chat:leave error (${userId}):`, error);
      emitError(socket, 'chat:leave', ERROR_CODES.INTERNAL_SERVER_ERROR, '채팅방 퇴장 중 오류가 발생했습니다.');
    }
  });

  /**
   * chat:message — 메시지 전송 (DB 저장 + Room 브로드캐스트)
   */
  socket.on('chat:message', async (payload: MessagePayload) => {
    try {
      const { chatRoomId, messageType, content, location } = payload;

      // 입력 검증
      if (!chatRoomId || !isValidUUID(chatRoomId)) {
        return emitError(socket, 'chat:message', ERROR_CODES.VALIDATION_ERROR, '유효하지 않은 chatRoomId입니다.');
      }

      if (!messageType || !['text', 'location'].includes(messageType)) {
        return emitError(socket, 'chat:message', ERROR_CODES.VALIDATION_ERROR, 'messageType은 text 또는 location이어야 합니다.');
      }

      if (messageType === 'text') {
        if (!content || content.trim().length === 0) {
          return emitError(socket, 'chat:message', ERROR_CODES.VALIDATION_ERROR, '텍스트 메시지는 content가 필요합니다.');
        }
        if (content.length > 1000) {
          return emitError(socket, 'chat:message', ERROR_CODES.VALIDATION_ERROR, '메시지는 1000자를 초과할 수 없습니다.');
        }
      }

      if (messageType === 'location') {
        if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
          return emitError(socket, 'chat:message', ERROR_CODES.VALIDATION_ERROR, '위치 메시지는 location(latitude, longitude)이 필요합니다.');
        }
      }

      // chatService.sendMessage 재사용 (DB 저장 + 응답 포맷)
      const input: SendMessageInput = { messageType, content, location };
      const message = await chatService.sendMessage(chatRoomId, userId, input);

      // Room 전체에 브로드캐스트 (보낸 사람 포함)
      io.to(`chat:${chatRoomId}`).emit('chat:new_message', message);

      logger.info(`💬 Message in ${chatRoomId} from ${nickname}: ${messageType}`);
    } catch (error) {
      const err = error as Error & { code?: string; statusCode?: number };

      if (err.code === ERROR_CODES.NOT_CHAT_PARTICIPANT) {
        return emitError(socket, 'chat:message', ERROR_CODES.NOT_CHAT_PARTICIPANT, err.message);
      }
      if (err.code === ERROR_CODES.CHAT_ROOM_NOT_FOUND) {
        return emitError(socket, 'chat:message', ERROR_CODES.CHAT_ROOM_NOT_FOUND, err.message);
      }

      logger.error(`chat:message error (${userId}):`, error);
      emitError(socket, 'chat:message', ERROR_CODES.INTERNAL_SERVER_ERROR, '메시지 전송 중 오류가 발생했습니다.');
    }
  });

  /**
   * chat:typing — 타이핑 상태 알림 (DB 저장 없이 실시간만)
   */
  socket.on('chat:typing', (payload: TypingPayload) => {
    const { chatRoomId } = payload;

    if (!chatRoomId || !isValidUUID(chatRoomId)) return;

    // 보낸 사람 제외 나머지에게만 전송
    socket.to(`chat:${chatRoomId}`).emit('chat:user_typing', {
      chatRoomId,
      userId,
      nickname,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * chat:stop_typing — 타이핑 중지 알림
   */
  socket.on('chat:stop_typing', (payload: TypingPayload) => {
    const { chatRoomId } = payload;

    if (!chatRoomId || !isValidUUID(chatRoomId)) return;

    socket.to(`chat:${chatRoomId}`).emit('chat:user_stop_typing', {
      chatRoomId,
      userId,
      nickname,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * chat:ready — 준비 상태 변경 (DB 저장 + Room 브로드캐스트)
   */
  socket.on('chat:ready', async (payload: ReadyPayload) => {
    try {
      const { chatRoomId, isReady } = payload;

      if (!chatRoomId || !isValidUUID(chatRoomId)) {
        return emitError(socket, 'chat:ready', ERROR_CODES.VALIDATION_ERROR, '유효하지 않은 chatRoomId입니다.');
      }

      if (typeof isReady !== 'boolean') {
        return emitError(socket, 'chat:ready', ERROR_CODES.VALIDATION_ERROR, 'isReady는 boolean이어야 합니다.');
      }

      // DB 업데이트 (chatService 재사용)
      await chatService.updateReadyStatus(chatRoomId, userId, isReady);

      // 참여자 전체 상태 조회
      const participantsResult = await chatService.getParticipants(chatRoomId, userId);

      // Room 전체에 브로드캐스트
      io.to(`chat:${chatRoomId}`).emit('chat:ready_update', {
        chatRoomId,
        userId,
        nickname,
        isReady,
        participants: participantsResult.participants,
        allReady: participantsResult.allReady,
        timestamp: new Date().toISOString(),
      });

      logger.info(`💬 Ready status: ${nickname} in ${chatRoomId} → ${isReady}`);
    } catch (error) {
      const err = error as Error & { code?: string };

      if (err.code === ERROR_CODES.NOT_CHAT_PARTICIPANT) {
        return emitError(socket, 'chat:ready', ERROR_CODES.NOT_CHAT_PARTICIPANT, err.message);
      }

      logger.error(`chat:ready error (${userId}):`, error);
      emitError(socket, 'chat:ready', ERROR_CODES.INTERNAL_SERVER_ERROR, '준비 상태 변경 중 오류가 발생했습니다.');
    }
  });

  /**
   * disconnect — 연결 해제 시 모든 Room에 알림
   */
  socket.on('disconnecting', () => {
    // 현재 참여 중인 chat: Room들에 퇴장 알림
    for (const room of socket.rooms) {
      if (room.startsWith('chat:')) {
        socket.to(room).emit('chat:user_disconnected', {
          chatRoomId: room.replace('chat:', ''),
          userId,
          nickname,
          timestamp: new Date().toISOString(),
        });
      }
    }
  });
};
