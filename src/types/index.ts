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

// ─── 팟 ───────────────────────────────────────────────────────────────────────

export type PodStatus = 'recruiting' | 'full' | 'in_progress' | 'completed' | 'cancelled';
export type VehicleType = 'taxi' | 'personal';

export interface PodPlace {
  name: string;
  latitude: number;
  longitude: number;
}

export interface PodCreatorInfo {
  userId: string;
  nickname: string;
  verificationBadge: string | null;
}

export interface PodCreatorDetail extends PodCreatorInfo {
  profileImage: string | null;
  mannerScore: string;
}

export interface PodParticipantInfo {
  userId: string;
  nickname: string;
  profileImage: string | null;
  verificationBadge: string | null;
  joinedAt: Date;
}

export interface PodSummary {
  podId: string;
  departurePlace: PodPlace;
  arrivalPlace: PodPlace;
  departureTime: Date;
  maxParticipants: number;
  currentParticipants: number;
  vehicleType: VehicleType;
  estimatedCost: number | null;
  costPerPerson: number | null;
  distance?: number;
  status: PodStatus;
  creator: PodCreatorInfo;
  createdAt: Date;
}

export interface PodDetail extends Omit<PodSummary, 'creator'> {
  memo: string | null;
  chatRoomId: string | null;
  creator: PodCreatorDetail;
  participants: PodParticipantInfo[];
}

export interface CreatePodInput {
  departurePlace: PodPlace;
  arrivalPlace: PodPlace;
  departureTime: string;
  maxParticipants: number;
  vehicleType: VehicleType;
  estimatedCost?: number;
  memo?: string;
}

export interface JoinPodResult {
  podId: string;
  chatRoomId: string | null;
  currentParticipants: number;
  maxParticipants: number;
}

export interface UpdatePodStatusResult {
  podId: string;
  status: PodStatus;
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

// ─── 채팅 ─────────────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'location' | 'status' | 'system';

export interface ChatRoomSummary {
  chatRoomId: string;
  pod: {
    podId: string;
    departurePlace: string;
    arrivalPlace: string;
    departureTime: Date;
    status: PodStatus;
  };
  lastMessage: {
    messageId: string;
    content: string | null;
    sender: {
      userId: string;
      nickname: string;
    };
    createdAt: Date;
  } | null;
  unreadCount: number;
  createdAt: Date;
}

export interface ChatMessage {
  messageId: string;
  chatRoomId: string;
  content: string | null;
  messageType: MessageType;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  } | null;
  sender: {
    userId: string;
    nickname: string;
    profileImage: string | null;
  };
  createdAt: Date;
}

export interface SendMessageInput {
  messageType: MessageType;
  content?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

export interface ChatParticipant {
  userId: string;
  nickname: string;
  profileImage: string | null;
  verificationBadge: string | null;
  isReady: boolean;
}

export interface ChatParticipantsResult {
  participants: ChatParticipant[];
  allReady: boolean;
}

// ─── 에러 ─────────────────────────────────────────────────────────────────────

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: unknown;
}
