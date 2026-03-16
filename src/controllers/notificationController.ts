import { Response } from 'express';
import * as notificationService from '../services/notificationService';
import { successResponse, errorResponse } from '../utils/response';
import { ERROR_CODES, PAGINATION } from '../config/constants';
import type { AuthenticatedRequest, Notification, NotificationSettings } from '../types';

// ─── 응답 포맷 헬퍼 ───────────────────────────────────────────────────────────

function formatNotification(n: Notification) {
  return {
    notificationId: n.notificationId,
    type: n.type,
    title: n.title,
    message: n.message,
    data: n.data,
    isRead: n.isRead,
    createdAt: n.createdAt,
  };
}

function formatSettings(s: NotificationSettings) {
  return {
    pushEnabled: s.pushEnabled,
    emailEnabled: s.emailEnabled,
    notificationTypes: {
      pod_joined: s.podJoined,
      pod_full: s.podFull,
      pod_started: s.podStarted,
      pod_completed: s.podCompleted,
      message: s.message,
      rating: s.rating,
    },
  };
}

function buildPagination(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// ─── 알림 목록 조회 ───────────────────────────────────────────────────────────

export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.user.userId;
  const page = parseInt(String(req.query.page ?? PAGINATION.DEFAULT_PAGE), 10);
  const limit = Math.min(
    parseInt(String(req.query.limit ?? PAGINATION.DEFAULT_LIMIT), 10),
    PAGINATION.MAX_LIMIT
  );
  const unreadOnly = req.query.unreadOnly === 'true';

  const result = await notificationService.getNotifications(userId, page, limit, unreadOnly);

  successResponse(res, {
    items: result.items.map(formatNotification),
    unreadCount: result.unreadCount,
    pagination: buildPagination(result.total, page, limit),
  });
};

// ─── 알림 읽음 처리 ───────────────────────────────────────────────────────────

export const markNotificationRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.user.userId;
  const { notificationId } = req.params;

  await notificationService.markNotificationRead(notificationId, userId);

  successResponse(res, null, '알림을 읽음 처리했습니다.');
};

// ─── 모든 알림 읽음 처리 ──────────────────────────────────────────────────────

export const markAllNotificationsRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.user.userId;

  const updatedCount = await notificationService.markAllNotificationsRead(userId);

  successResponse(res, { updatedCount }, '모든 알림을 읽음 처리했습니다.');
};

// ─── 알림 설정 조회 ───────────────────────────────────────────────────────────

export const getNotificationSettings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.user.userId;

  const settings = await notificationService.getNotificationSettings(userId);

  successResponse(res, formatSettings(settings));
};

// ─── 알림 설정 업데이트 ───────────────────────────────────────────────────────

export const updateNotificationSettings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.user.userId;
  const { pushEnabled, emailEnabled, notificationTypes } = req.body;

  const settings = await notificationService.updateNotificationSettings(userId, {
    pushEnabled,
    emailEnabled,
    notificationTypes,
  });

  successResponse(res, formatSettings(settings), '알림 설정이 업데이트되었습니다.');
};
