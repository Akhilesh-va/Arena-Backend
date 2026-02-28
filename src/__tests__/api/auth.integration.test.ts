/**
 * Integration tests for auth and protected routes.
 * Set MONGODB_URI to a test database (e.g. mongodb://localhost:27017/arena_test).
 */
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../app';
import { connectDatabase, disconnectDatabase } from '../../config/database';
import { UserModel } from '../../models/User';
import { RefreshTokenModel } from '../../models/RefreshToken';

const API = '/api/v1';

describe('Auth API', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
    await RefreshTokenModel.deleteMany({});
  });

  describe('POST /auth/register', () => {
    it('should register and return user + tokens', async () => {
      const res = await request(app)
        .post(`${API}/auth/register`)
        .send({
          email: 'arena@test.com',
          password: 'password123',
          displayName: 'Arena User',
        })
        .expect(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('arena@test.com');
      expect(res.body.user.displayName).toBe('Arena User');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body).toHaveProperty('expiresIn');
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(app)
        .post(`${API}/auth/register`)
        .send({
          email: 'not-an-email',
          password: 'password123',
          displayName: 'User',
        })
        .expect(400);
      expect(res.body.code).toBe('VALIDATION');
    });

    it('should return 409 for duplicate email', async () => {
      await request(app).post(`${API}/auth/register`).send({
        email: 'dup@test.com',
        password: 'password123',
        displayName: 'First',
      });
      const res = await request(app)
        .post(`${API}/auth/register`)
        .send({
          email: 'dup@test.com',
          password: 'other456',
          displayName: 'Second',
        })
        .expect(409);
      expect(res.body.code).toBe('CONFLICT');
    });
  });

  describe('POST /auth/login', () => {
    it('should login and return tokens', async () => {
      await request(app).post(`${API}/auth/register`).send({
        email: 'login@test.com',
        password: 'password123',
        displayName: 'Login User',
      });
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({ email: 'login@test.com', password: 'password123' })
        .expect(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('should return 401 for wrong password', async () => {
      await request(app).post(`${API}/auth/register`).send({
        email: 'wrong@test.com',
        password: 'password123',
        displayName: 'User',
      });
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({ email: 'wrong@test.com', password: 'wrongpassword' })
        .expect(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Protected route GET /users/me', () => {
    it('should return 401 without token', async () => {
      await request(app).get(`${API}/users/me`).expect(401);
    });

    it('should return current user with valid token', async () => {
      const registerRes = await request(app).post(`${API}/auth/register`).send({
        email: 'me@test.com',
        password: 'password123',
        displayName: 'Me',
      });
      const token = registerRes.body.accessToken;
      const res = await request(app)
        .get(`${API}/users/me`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.email).toBe('me@test.com');
      expect(res.body.displayName).toBe('Me');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return new tokens with valid refresh token', async () => {
      const registerRes = await request(app).post(`${API}/auth/register`).send({
        email: 'refresh@test.com',
        password: 'password123',
        displayName: 'Refresh User',
      });
      const refreshToken = registerRes.body.refreshToken;
      const res = await request(app)
        .post(`${API}/auth/refresh`)
        .send({ refreshToken })
        .expect(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });
  });
});
