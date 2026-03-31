export type PodStatus = 'recruiting' | 'full' | 'in_progress' | 'completed' | 'cancelled';
export type VehicleType = 'taxi' | 'personal';

export interface PodPlace {
  name: string;
  latitude: number;
  longitude: number;
}

export interface PodCreator {
  userId: string;
  nickname: string;
  verificationBadge: string | null;
}

export interface PodCreatorDetail extends PodCreator {
  profileImage: string | null;
  mannerScore: string;
}

export interface PodParticipant {
  userId: string;
  nickname: string;
  profileImage: string | null;
  verificationBadge: string | null;
  joinedAt: string;
}

export interface PodSummary {
  podId: string;
  departurePlace: PodPlace;
  arrivalPlace: PodPlace;
  departureTime: string;
  maxParticipants: number;
  currentParticipants: number;
  vehicleType: VehicleType;
  estimatedCost: number | null;
  costPerPerson: number | null;
  distance?: number;
  status: PodStatus;
  creator: PodCreator;
  createdAt: string;
}

export interface PodDetail extends Omit<PodSummary, 'creator'> {
  memo: string | null;
  chatRoomId: string | null;
  creator: PodCreatorDetail;
  participants: PodParticipant[];
}

export interface CreatePodRequest {
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
}

export interface FetchPodsParams {
  latitude?: number;
  longitude?: number;
  radius?: number;
  status?: string;
  page?: number;
  limit?: number;
}
