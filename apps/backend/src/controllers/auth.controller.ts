import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuditLog } from '../models/AuditLog.model';

export class AuthController {
  static async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await AuthService.login(email, password);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Record login in AuditLog for security compliance
    try {
      await AuditLog.create({
        userId: user._id,
        userEmail: user.email,
        action: 'auth.login',
        targetType: 'user',
        targetId: user._id,
        changes: { role: user.role },
        ip: (req.headers['x-forwarded-for'] as string) || req.ip || req.socket?.remoteAddress || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'browser',
      });
    } catch (e) {
      console.error('AuditLog login record error:', e);
    }

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        role: user.role,
        user: {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
    });
  }

  static async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, error: { message: 'No refresh token' } });
    }

    try {
      const { verifyRefreshToken } = await import('../utils/jwt');
      const payload = verifyRefreshToken(refreshToken);
      const tokens = await AuthService.refresh(payload.userId, refreshToken);

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.status(200).json({ success: true, data: { accessToken: tokens.accessToken } });
    } catch (err) {
      return res.status(401).json({ success: false, error: { message: 'Invalid refresh token' } });
    }
  }

  static async logout(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken && req.user?.userId) {
      await AuthService.logout(req.user.userId, refreshToken);
      try {
        await AuditLog.create({
          userId: req.user.userId,
          userEmail: req.user.email || 'system',
          action: 'auth.logout',
          targetType: 'user',
          targetId: req.user.userId,
          ip: (req.headers['x-forwarded-for'] as string) || req.ip || req.socket?.remoteAddress || '127.0.0.1',
          userAgent: req.headers['user-agent'] || 'browser',
        });
      } catch (e) {
        console.error('AuditLog logout error:', e);
      }
    }
    
    res.clearCookie('refreshToken');
    res.status(200).json({ success: true, message: 'Logged out' });
  }

  static async getMe(req: Request, res: Response) {
    res.status(200).json({ success: true, data: req.user });
  }

  static async changePassword(req: Request, res: Response) {
    if (!req.user) return res.status(401).json({ success: false });
    
    const { currentPassword, newPassword } = req.body;
    await AuthService.changePassword(req.user.userId, currentPassword, newPassword);
    
    // Changing password logs out everywhere
    res.clearCookie('refreshToken');
    res.status(200).json({ success: true, message: 'Password changed successfully' });
  }
}
