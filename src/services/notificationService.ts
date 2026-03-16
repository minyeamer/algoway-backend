import { query } from '../config/database';
import { ERROR_CODES } from '../config/constants';
import type {
  Notification,
  NotificationSettings,
  NotificationsResult,
  UpdateNotificationSettingsInput,
  PaginatedResult,
} from '../types';

// ─── 에러 팩토리 ──────────────────────────────────────────────────────────────

const createError = (code: string, message: string, statusCode: number) => {
  const err = new Error(message) as Error & { code: string; statusCode: number };
  err.code = code;
  err.statusCode = statusCode;
  return err;
};

// ─── 알림 목록 조회 ───────────────────────────────────────────────────────────

export const getNotifications = async (
  userId: string,
  page: number,
  limit: number,
  unreadOnly: boolean
): Promise<NotificationsResult> => {
  const offset = (page - 1) * limit;
  const whereClause = unreadOnly
    ? 'WHERE user_id = $1 AND is_read = FALSE'
    : 'WHERE user_id = $1';

  const [countResult, unreadResult, rowsResult] = await Promise.all([
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM notifications ${whereClause}`,
      [userId]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    ),
    query<Notification>(
      `SELECT notification_id, user_id, type, title, message, data, is_read, created_at
       FROM notifications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
  ]);

  return {
    items: rowsResult.rows,
    unreadCount: parseInt(unreadResult.rows[0].count, 10),
    total: parseInt(countResult.rows[0].count, 10),
  };
};

// ─── 알림 읽음 처리 ───────────────────────────────────────────────────────────

export const markNotificationRead = async (
  notificationId: string,
  userId: string
): Promise<void> => {
  const result = await query<{ notificationId: string }>(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE notification_id = $1 AND user_id = $2
     RETURNING notification_id`,
    [notificationId, userId]
  );

  if (!result.rows.length) {
    throw createError(
      ERROR_CODES.NOTIFICATION_NOT_FOUND,
      '알림을 찾을 수 없습니다.',
      404
    );
  }
};

// ─── 모든 알림 읽음 처리 ──────────────────────────────────────────────────────

export const markAllNotificationsRead = async (userId: string): Promise<number> => {
  const result = await query<{ notificationId: string }>(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE user_id = $1 AND is_read = FALSE
     RETURNING notification_id`,
    [userId]
  );

  return result.rows.length;
};

// ─── 알림 설정 조회 ───────────────────────────────────────────────────────────

export const getNotificationSettings = async (
  userId: string
): Promise<NotificationSettings> => {
  const result = await query<NotificationSettings>(
    `SELECT settings_id, user_id, push_enabled, email_enabled,
            pod_joined, pod_full, pod_started, pod_completed, message, rating, updated_at
     FROM notification_settings
     WHERE user_id = $1`,
    [userId]
  );

  if (!result.rows.length) {
    // 회원가입 트리거가 자동 생성하지만 레거시 계정 대비 INSERT fallback
    const inserted = await query<NotificationSettings>(
      `INSERT INTO notification_settings (user_id)
       VALUES ($1)
       RETURNING settings_id, user_id, push_enabled, email_enabled,
                 pod_joined, pod_full, pod_started, pod_completed, message, rating, updated_at`,
      [userId]
    );
    return inserted.rows[0];
  }

  return result.rows[0];
};

// ─── 알림 설정 업데이트 ───────────────────────────────────────────────────────

export const updateNotificationSettings = async (
  userId: string,
  input: UpdateNotificationSettingsInput
): Promise<NotificationSettings> => {
  const setClauses: string[] = [];
  const values: unknown[] = [userId];
  let idx = 2;

  if (input.pushEnabled !== undefined) {
    setClauses.push(`push_enabled = $${idx++}`);
    values.push(input.pushEnabled);
  }
  if (input.emailEnabled !== undefined) {
    setClauses.push(`email_enabled = $${idx++}`);
    values.push(input.emailEnabled);
  }

  if (input.notificationTypes) {
    const typeMap: Record<string, string> = {
      pod_joined: 'pod_joined',
      pod_full: 'pod_full',
      pod_started: 'pod_started',
      pod_completed: 'pod_completed',
      message: 'message',
      rating: 'rating',
    };
    for (const [key, col] of Object.entries(typeMap)) {
      const val = (input.notificationTypes as Record<string, boolean | undefined>)[key];
      if (val !== undefined) {
        setClauses.push(`${col} = $${idx++}`);
        values.push(val);
      }
    }
  }

  if (setClauses.length === 0) {
    return getNotificationSettings(userId);
  }

  setClauses.push(`updated_at = NOW()`);

  const result = await query<NotificationSettings>(
    `UPDATE notification_settings
     SET ${setClauses.join(', ')}
     WHERE user_id = $1
     RETURNING settings_id, user_id, push_enabled, email_enabled,
               pod_joined, pod_full, pod_started, pod_completed, message, rating, updated_at`,
    values
  );

  if (!result.rows.length) {
    // 설정 레코드가 없을 경우 생성 후 재시도
    await query(
      `INSERT INTO notification_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );
    return updateNotificationSettings(userId, input);
  }

  return result.rows[0];
};

// ─── 알림 생성 (내부 유틸 — 다른 서비스에서 호출용) ──────────────────────────

export const createNotification = async (params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}): Promise<void> => {
  await query(
    `INSERT INTO notifications (user_id, type, title, message, data)
     VALUES ($1, $2, $3, $4, $5)`,
    [params.userId, params.type, params.title, params.message, params.data ?? null]
  );
};
