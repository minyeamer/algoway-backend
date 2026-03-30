import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { query } from '../config/database';
import logger from '../utils/logger';
import { registerChatHandlers } from './chatHandler';

// Socket에 사용자 정보를 부착하기 위한 확장
export interface AuthenticatedSocket extends Socket {
  userId: string;
  nickname: string;
}

let io: Server;

/**
 * Socket.io 서버 초기화
 */
export const initSocketServer = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // ─── JWT 인증 미들웨어 ──────────────────────────────────────────────────────
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('인증 토큰이 필요합니다.'));
      }

      const decoded = verifyAccessToken(token);

      // DB에서 사용자 확인
      const result = await query<{ userId: string; nickname: string }>(
        'SELECT user_id, nickname FROM users WHERE user_id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return next(new Error('사용자를 찾을 수 없습니다.'));
      }

      // 소켓에 사용자 정보 부착
      (socket as AuthenticatedSocket).userId = result.rows[0].userId;
      (socket as AuthenticatedSocket).nickname = result.rows[0].nickname;

      next();
    } catch (error) {
      const err = error as Error;
      if (err.name === 'TokenExpiredError') {
        return next(new Error('토큰이 만료되었습니다.'));
      }
      return next(new Error('유효하지 않은 토큰입니다.'));
    }
  });

  // ─── 연결 처리 ──────────────────────────────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    logger.info(`🔌 Socket connected: ${authSocket.userId} (${authSocket.nickname})`);

    // 채팅 이벤트 핸들러 등록
    registerChatHandlers(io, authSocket);

    // 연결 해제
    socket.on('disconnect', (reason) => {
      logger.info(`🔌 Socket disconnected: ${authSocket.userId} — ${reason}`);
    });

    // 에러 처리
    socket.on('error', (error) => {
      logger.error(`🔌 Socket error (${authSocket.userId}):`, error);
    });
  });

  logger.info('🔌 Socket.io server initialized');
  return io;
};

/**
 * Socket.io 서버 인스턴스 반환
 */
export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io server not initialized');
  }
  return io;
};
