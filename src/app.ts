import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import logger from './utils/logger';
import { successResponse } from './utils/response';
import { notFoundHandler, globalErrorHandler } from './middlewares/errorHandler';
import authRouter from './routes/auth';
import usersRouter from './routes/users';

const app = express();

// 미들웨어
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
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
// app.use('/v1/pods', podsRouter);
// app.use('/v1/chat', chatRouter);
// app.use('/v1/ratings', ratingsRouter);
// app.use('/v1/notifications', notificationsRouter);

// 404 처리
app.use(notFoundHandler);

// 전역 에러 핸들러
app.use(globalErrorHandler);

export default app;
