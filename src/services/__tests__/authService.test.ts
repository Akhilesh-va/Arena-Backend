import bcrypt from 'bcryptjs';
import { register, login, refreshTokens, logout, forgotPassword, resetPassword } from '../authService';
import { UserModel } from '../../models/User';
import { RefreshTokenModel } from '../../models/RefreshToken';
import mongoose from 'mongoose';

// Mock mongoose connect for unit tests (no DB)
jest.mock('../../models/User');
jest.mock('../../models/RefreshToken');

describe('authService', () => {
  const mockUserId = new mongoose.Types.ObjectId();
  const mockUser = {
    _id: mockUserId,
    email: 'test@example.com',
    passwordHash: '',
    displayName: 'Test User',
    photoUrl: undefined,
    isEmailVerified: false,
    fcmTokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject() {
      return { ...this };
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should throw conflict if email exists', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue({ _id: mockUserId });
      await expect(
        register({
          email: 'test@example.com',
          password: 'password123',
          displayName: 'Test',
        })
      ).rejects.toMatchObject({ code: 'CONFLICT', message: 'Email already registered' });
    });

    it('should create user and return session when email is new', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);
      (UserModel.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        email: 'new@example.com',
        displayName: 'New User',
      });
      (RefreshTokenModel.create as jest.Mock).mockResolvedValue({});
      const result = await register({
        email: 'new@example.com',
        password: 'password123',
        displayName: 'New User',
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toHaveProperty('email', 'new@example.com');
    });
  });

  describe('login', () => {
    it('should throw unauthorized for wrong password', async () => {
      const hash = await bcrypt.hash('correct', 10);
      (UserModel.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          ...mockUser,
          passwordHash: hash,
          toObject() {
            return { ...this };
          },
        }),
      });
      await expect(login('test@example.com', 'wrong')).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('forgotPassword', () => {
    it('should return resetToken even when email does not exist (no leak)', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);
      const { resetToken } = await forgotPassword('nonexistent@example.com');
      expect(resetToken).toBeDefined();
      expect(typeof resetToken).toBe('string');
    });
  });
});
