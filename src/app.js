require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./utils/logger');
const { successResponse } = require('./utils/response');
const { notFoundHandler, globalErrorHandler } = require('./middlewares/errorHandler');

const app = express();

// 미들웨어
app.use(helmet()); // 보안 헤더
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 요청 로깅
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  successResponse(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API 라우트
app.use('/v1/auth', require('./routes/auth'));
// app.use('/v1/users', require('./routes/users'));
// app.use('/v1/pods', require('./routes/pods'));
// app.use('/v1/chat', require('./routes/chat'));
// app.use('/v1/ratings', require('./routes/ratings'));
// app.use('/v1/notifications', require('./routes/notifications'));

// 404 처리
app.use(notFoundHandler);

// 전역 에러 핸들러
app.use(globalErrorHandler);

module.exports = app;
