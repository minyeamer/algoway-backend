import { Response, NextFunction } from 'express';
import * as chatService from '../services/chatService';
import { successResponse, paginatedResponse } from '../utils/response';
import { CHAT, PAGINATION } from '../config/constants';
import type { AuthenticatedRequest, SendMessageInput } from '../types';

/**
 * 내 채팅방 목록 조회
 * GET /v1/chat/rooms
 */
export const getMyChatRooms = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rooms = await chatService.getMyChatRooms(req.user!.userId);
    successResponse(res, { items: rooms });
  } catch (error) {
    next(error);
  }
};

/**
 * 채팅 메시지 조회
 * GET /v1/chat/rooms/:chatRoomId/messages
 */
export const getMessages = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const chatRoomId = req.params.chatRoomId as string;
    const page = req.query.page
      ? parseInt(req.query.page as string, 10)
      : PAGINATION.DEFAULT_PAGE;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : CHAT.DEFAULT_MESSAGE_LIMIT;
    const before = req.query.before as string | undefined;

    const result = await chatService.getMessages(chatRoomId, req.user!.userId, {
      page,
      limit,
      before,
    });

    paginatedResponse(res, result.items, result.total, page, limit);
  } catch (error) {
    next(error);
  }
};

/**
 * 메시지 전송
 * POST /v1/chat/rooms/:chatRoomId/messages
 */
export const sendMessage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const chatRoomId = req.params.chatRoomId as string;
    const input: SendMessageInput = req.body;

    const message = await chatService.sendMessage(chatRoomId, req.user!.userId, input);
    successResponse(res, message, undefined, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 준비 상태 업데이트
 * POST /v1/chat/rooms/:chatRoomId/ready
 */
export const updateReadyStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const chatRoomId = req.params.chatRoomId as string;
    const { isReady } = req.body;

    const result = await chatService.updateReadyStatus(chatRoomId, req.user!.userId, isReady);
    successResponse(res, result, '준비 완료 상태가 업데이트되었습니다.');
  } catch (error) {
    next(error);
  }
};

/**
 * 채팅방 참여자 + 준비 상태 조회
 * GET /v1/chat/rooms/:chatRoomId/participants
 */
export const getParticipants = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const chatRoomId = req.params.chatRoomId as string;
    const result = await chatService.getParticipants(chatRoomId, req.user!.userId);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};
