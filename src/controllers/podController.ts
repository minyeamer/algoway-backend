import { Response, NextFunction } from 'express';
import * as podService from '../services/podService';
import { successResponse, paginatedResponse } from '../utils/response';
import { PAGINATION } from '../config/constants';
import type { AuthenticatedRequest, PodStatus } from '../types';

/**
 * 팟 생성
 * POST /v1/pods
 */
export const createPod = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pod = await podService.createPod(req.user!.userId, req.body);
    successResponse(res, pod, '팟이 생성되었습니다.', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 팟 목록 조회 (위치 기반)
 * GET /v1/pods
 */
export const listPods = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const latitude = parseFloat(req.query.latitude as string);
    const longitude = parseFloat(req.query.longitude as string);
    const radius = req.query.radius ? parseInt(req.query.radius as string, 10) : undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : PAGINATION.DEFAULT_PAGE;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : PAGINATION.DEFAULT_LIMIT;
    const status = req.query.status as string | undefined;

    const result = await podService.listPods({ latitude, longitude, radius, page, limit, status });
    paginatedResponse(res, result.items, result.total, page, limit);
  } catch (error) {
    next(error);
  }
};

/**
 * 팟 검색
 * GET /v1/pods/search
 */
export const searchPods = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const toFloat = (v: unknown) => (v !== undefined && v !== '' ? parseFloat(v as string) : undefined);
    const toInt = (v: unknown) => (v !== undefined && v !== '' ? parseInt(v as string, 10) : undefined);

    const q = req.query;
    const page = toInt(q.page) ?? PAGINATION.DEFAULT_PAGE;
    const limit = toInt(q.limit) ?? PAGINATION.DEFAULT_LIMIT;

    const result = await podService.searchPods({
      departureLat: toFloat(q.departureLat),
      departureLng: toFloat(q.departureLng),
      arrivalLat: toFloat(q.arrivalLat),
      arrivalLng: toFloat(q.arrivalLng),
      radius: toInt(q.radius),
      departureTimeFrom: q.departureTimeFrom as string | undefined,
      departureTimeTo: q.departureTimeTo as string | undefined,
      verifiedOnly: q.verifiedOnly === 'true' ? true : q.verifiedOnly === 'false' ? false : undefined,
      vehicleType: q.vehicleType as string | undefined,
      page,
      limit,
    });

    paginatedResponse(res, result.items, result.total, page, limit);
  } catch (error) {
    next(error);
  }
};

/**
 * 팟 상세 조회
 * GET /v1/pods/:podId
 */
export const getPod = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pod = await podService.getPod(req.params.podId as string);
    successResponse(res, pod);
  } catch (error) {
    next(error);
  }
};

/**
 * 팟 참여
 * POST /v1/pods/:podId/join
 */
export const joinPod = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await podService.joinPod(req.params.podId as string, req.user!.userId);
    successResponse(res, result, '팟에 참여했습니다.', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 팟 나가기
 * POST /v1/pods/:podId/leave
 */
export const leavePod = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await podService.leavePod(req.params.podId as string, req.user!.userId);
    successResponse(res, null, '팟에서 나갔습니다.');
  } catch (error) {
    next(error);
  }
};

/**
 * 팟 상태 변경 (방장 전용)
 * PATCH /v1/pods/:podId/status
 */
export const updatePodStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.body as { status: PodStatus };
    const result = await podService.updatePodStatus(req.params.podId as string, req.user!.userId, status);
    successResponse(res, result, '팟 상태가 변경되었습니다.');
  } catch (error) {
    next(error);
  }
};
