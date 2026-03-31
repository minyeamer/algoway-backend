import 'dotenv/config';
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import logger from './utils/logger';
import { successResponse } from './utils/response';
import { notFoundHandler, globalErrorHandler } from './middlewares/errorHandler';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import podsRouter from './routes/pods';
import chatRouter from './routes/chat';
import ratingsRouter from './routes/ratings';
import notificationsRouter from './routes/notifications';

const app = express();

// 미들웨어
app.use(helmet());
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3001')
  .split(',')
  .map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 요청 로깅
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  successResponse(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API 라우트
app.use('/v1/auth', authRouter);
app.use('/v1/users', usersRouter);
app.use('/v1/pods', podsRouter);
app.use('/v1/chat', chatRouter);
app.use('/v1/ratings', ratingsRouter);
app.use('/v1/notifications', notificationsRouter);
// app.use('/v1/notifications', notificationsRouter);

// 테스트 UI (개발 환경 전용)
if (process.env.NODE_ENV !== 'production') {
  app.get('/test/chat', (_req: Request, res: Response) => {
    // helmet의 기본 CSP가 inline 스크립트를 차단하기 때문에
    // 테스트 UI에서는 "unsafe-inline"을 허용하여 인라인 <script>가 동작하도록 함
    res.set('Content-Security-Policy', "script-src 'self' 'unsafe-inline'; object-src 'none'");
    res.sendFile(path.join(__dirname, '..', 'public', 'test-chat.html'));
  });
  logger.info('Test UI enabled: /test/chat');
}

// 404 처리
app.use(notFoundHandler);

// 전역 에러 핸들러
app.use(globalErrorHandler);

export default app;
