import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(err.stack || err.message || err);

  let statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'Internal Server Error';
  let code = 'INTERNAL_SERVER_ERROR';

  if (err.message === 'Invalid credentials' || err.message === 'Unauthorized' || err.message === 'Invalid user' || err.message === 'Invalid refresh token') {
    statusCode = 401;
    message = err.message;
    code = 'UNAUTHORIZED';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Database Validation Error';
    code = 'VALIDATION_ERROR';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    code = 'CAST_ERROR';
  } else if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered';
    code = 'DUPLICATE_KEY_ERROR';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === 'development' && { details: err.stack }),
    },
  });
};
