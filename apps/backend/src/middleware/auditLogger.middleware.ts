import { Request, Response, NextFunction } from 'express';

// Audit logging functionality is temporarily disabled per user request
export const auditLog = (_action: string, _targetType: string) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    next();
  };
};
