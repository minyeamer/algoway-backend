import { Request } from 'express';

// ─── 사용자 ───────────────────────────────────────────────────────────────────

export interface User {
  userId: string;
  email: string;
  nickname: string;
  profileImage: string | null;
  userType: 'student' | 'employee' | 'others';
  isVerified: boolean;
  verificationBadge: string | null;
  mannerScore: string;
  totalRides: number;
  createdAt: Date;
  updatedAt: Date;
}

export type PublicUser = Omit<User, 'email' | 'updatedAt'>;
export type AuthUser = Pick<User, 'userId' | 'email' | 'nickname' | 'userType' | 'isVerified' | 'verificationBadge'>;

// ─── 인증 ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult extends TokenPair {
  user: AuthUser;
}

export interface SignupResult {
  userId: string;
  email: string;
  nickname: string;
  userType: string;
  isVerified: boolean;
  verificationBadge: string | null;
}

export interface VerifyResult {
  isVerified: boolean;
  badge: string;
  verifiedAt: string;
}

// ─── 즐겨찾는 경로 ────────────────────────────────────────────────────────────

export interface PlaceInfo {
  name: string;
  lat: number;
  lng: number;
}

export interface FavoriteRoute {
  favoriteId: string;
  departurePlace: PlaceInfo;
  arrivalPlace: PlaceInfo;
  createdAt: Date;
}

// ─── 탑승 내역 ────────────────────────────────────────────────────────────────

export interface RideItem {
  podId: string;
  departurePlaceName: string;
  arrivalPlaceName: string;
  departureTime: Date;
  vehicleType: string;
  status: string;
  currentParticipants: number;
  maxParticipants: number;
  estimatedCost: number | null;
  costPerPerson: number | null;
  joinedAt: Date;
  creatorId: string;
  creatorNickname: string;
  creatorProfileImage: string | null;
}

// ─── 페이지네이션 ─────────────────────────────────────────────────────────────

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

// ─── Express 확장 ─────────────────────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    nickname: string;
    userType: string;
    isVerified: boolean;
    verificationBadge: string | null;
  };
}

// ─── 에러 ─────────────────────────────────────────────────────────────────────

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: unknown;
}
