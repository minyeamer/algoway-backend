import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        nickname: string;
        userType: string;
        isVerified: boolean;
        verificationBadge: string | null;
      };
    }
  }
}
