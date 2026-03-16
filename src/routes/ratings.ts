import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import {
  createRatingValidation,
  podIdParamValidation,
  userIdParamValidation,
} from '../middlewares/validator';
import {
  createRating,
  getReceivedRatings,
  getSentRatings,
  getPodRatingStatus,
} from '../controllers/ratingController';

const router = Router();

/** 평가 제출  POST /v1/ratings */
router.post('/', authenticateToken, createRatingValidation, createRating);

/** 내가 받은 평가 목록  GET /v1/ratings/received */
router.get('/received', authenticateToken, getReceivedRatings);

/** 내가 보낸 평가 목록  GET /v1/ratings/sent */
router.get('/sent', authenticateToken, getSentRatings);

/** 팟 평가 현황  GET /v1/ratings/pods/:podId */
router.get('/pods/:podId', authenticateToken, podIdParamValidation, getPodRatingStatus);

export default router;
