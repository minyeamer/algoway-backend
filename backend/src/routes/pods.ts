import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import {
  createPodValidation,
  listPodsValidation,
  searchPodsValidation,
  updatePodStatusValidation,
  uuidValidation,
} from '../middlewares/validator';
import * as podController from '../controllers/podController';

const router = Router();

// 모든 팟 엔드포인트는 인증 필요
router.use(authenticateToken);

// GET /v1/pods/my — 반드시 /:podId 앞에 선언
router.get('/my', podController.getMyPods);

// GET /v1/pods/search — 반드시 /:podId 앞에 선언
router.get('/search', searchPodsValidation, podController.searchPods);

// GET /v1/pods
router.get('/', listPodsValidation, podController.listPods);

// POST /v1/pods
router.post('/', createPodValidation, podController.createPod);

// GET /v1/pods/:podId
router.get('/:podId', uuidValidation('podId'), podController.getPod);

// POST /v1/pods/:podId/join
router.post('/:podId/join', uuidValidation('podId'), podController.joinPod);

// POST /v1/pods/:podId/leave
router.post('/:podId/leave', uuidValidation('podId'), podController.leavePod);

// PATCH /v1/pods/:podId/status
router.patch(
  '/:podId/status',
  uuidValidation('podId'),
  updatePodStatusValidation,
  podController.updatePodStatus
);

export default router;
