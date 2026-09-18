import { User } from '../models/User.model';
import bcrypt from 'bcrypt';
import { generateTokens } from '../utils/jwt';

export class AuthService {
  static async login(email: string, password: string) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const { accessToken, refreshToken } = generateTokens({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Hash refresh token for DB storage
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    user.refreshTokenHashes.push(hashedRefresh);
    if (user.refreshTokenHashes.length > 5) {
      user.refreshTokenHashes.shift(); // Keep last 5
    }
    await user.save();

    return { user, accessToken, refreshToken };
  }

  static async refresh(userId: string, oldRefreshToken: string) {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new Error('Invalid user');
    }

    // Verify token exists in array
    let isValid = false;
    let validHashIndex = -1;
    for (let i = 0; i < user.refreshTokenHashes.length; i++) {
      if (await bcrypt.compare(oldRefreshToken, user.refreshTokenHashes[i])) {
        isValid = true;
        validHashIndex = i;
        break;
      }
    }

    if (!isValid) {
      throw new Error('Invalid refresh token');
    }

    // Generate new tokens
    const { accessToken, refreshToken } = generateTokens({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    user.refreshTokenHashes[validHashIndex] = hashedRefresh; // Replace old with new
    await user.save();

    return { accessToken, refreshToken };
  }

  static async logout(userId: string, refreshToken: string) {
    const user = await User.findById(userId);
    if (user) {
      const hashes = user.refreshTokenHashes;
      for (let i = 0; i < hashes.length; i++) {
        if (await bcrypt.compare(refreshToken, hashes[i])) {
          user.refreshTokenHashes.splice(i, 1);
          await user.save();
          break;
        }
      }
    }
  }

  static async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const isMatch = await bcrypt.compare(currentPass, user.passwordHash);
    if (!isMatch) throw new Error('Incorrect current password');

    user.passwordHash = await bcrypt.hash(newPass, 10);
    // Invalidate all sessions on password change
    user.refreshTokenHashes = [];
    await user.save();
  }
}
