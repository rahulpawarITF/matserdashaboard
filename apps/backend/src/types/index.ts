import 'express';

export interface UserPayload {
  userId: string;
  email: string;
  role: 'owner' | 'admin' | 'viewer';
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}
