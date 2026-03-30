import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationSettings,
  updateNotificationSettings,
} from '../controllers/notificationController';
import {
  paginationValidation,
  notificationIdParamValidation,
  updateNotificationSettingsValidation,
} from '../middlewares/validator';
import type { AuthenticatedRequest } from '../types';
import type { Response } from 'express';

const router = Router();

// 모든 알림 라우트는 인증 필요
router.use(authenticateToken);

// GET  /v1/notifications            — 알림 목록 조회
router.get(
  '/',
  paginationValidation,
  asyncHandler((req, res) =>
    getNotifications(req as AuthenticatedRequest, res as Response)
  )
);

// PATCH /v1/notifications/read-all  — 모든 알림 읽음 처리 (specific 라우트 먼저)
router.patch(
  '/read-all',
  asyncHandler((req, res) =>
    markAllNotificationsRead(req as AuthenticatedRequest, res as Response)
  )
);

// GET  /v1/notifications/settings   — 알림 설정 조회
router.get(
  '/settings',
  asyncHandler((req, res) =>
    getNotificationSettings(req as AuthenticatedRequest, res as Response)
  )
);

// PATCH /v1/notifications/settings  — 알림 설정 업데이트
router.patch(
  '/settings',
  updateNotificationSettingsValidation,
  asyncHandler((req, res) =>
    updateNotificationSettings(req as AuthenticatedRequest, res as Response)
  )
);

// PATCH /v1/notifications/:notificationId/read — 단일 알림 읽음 처리
router.patch(
  '/:notificationId/read',
  notificationIdParamValidation,
  asyncHandler((req, res) =>
    markNotificationRead(req as AuthenticatedRequest, res as Response)
  )
);

export default router;
