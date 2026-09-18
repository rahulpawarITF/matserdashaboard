import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserPayload } from '../types';

export const generateTokens = (payload: UserPayload) => {
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  
  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): UserPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as UserPayload;
};

export const verifyRefreshToken = (token: string): UserPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as UserPayload;
};
