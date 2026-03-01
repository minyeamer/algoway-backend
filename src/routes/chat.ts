import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import {
  sendMessageValidation,
  updateReadyStatusValidation,
  getMessagesValidation,
  uuidValidation,
} from '../middlewares/validator';
import * as chatController from '../controllers/chatController';

const router = Router();

// 모든 채팅 엔드포인트는 인증 필요
router.use(authenticateToken);

// GET /v1/chat/rooms — 내 채팅방 목록
router.get('/rooms', chatController.getMyChatRooms);

// GET /v1/chat/rooms/:chatRoomId/messages — 메시지 조회
router.get(
  '/rooms/:chatRoomId/messages',
  uuidValidation('chatRoomId'),
  getMessagesValidation,
  chatController.getMessages
);

// POST /v1/chat/rooms/:chatRoomId/messages — 메시지 전송
router.post(
  '/rooms/:chatRoomId/messages',
  uuidValidation('chatRoomId'),
  sendMessageValidation,
  chatController.sendMessage
);

// POST /v1/chat/rooms/:chatRoomId/ready — 준비 상태 업데이트
router.post(
  '/rooms/:chatRoomId/ready',
  uuidValidation('chatRoomId'),
  updateReadyStatusValidation,
  chatController.updateReadyStatus
);

// GET /v1/chat/rooms/:chatRoomId/participants — 참여자 + 준비 상태 조회
router.get(
  '/rooms/:chatRoomId/participants',
  uuidValidation('chatRoomId'),
  chatController.getParticipants
);

export default router;