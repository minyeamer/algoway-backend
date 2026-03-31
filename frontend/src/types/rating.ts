export interface Rating {
  ratingId: string;
  podId: string;
  reviewer: {
    userId: string;
    nickname: string;
    profileImage: string | null;
  };
  reviewee: {
    userId: string;
    nickname: string;
    profileImage: string | null;
  };
  rating: number;  // 1~5
  comment: string | null;
  createdAt: string;
}

export interface SubmitRatingRequest {
  podId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
}
