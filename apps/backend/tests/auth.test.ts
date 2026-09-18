import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import authRoutes from '../src/routes/auth.routes';
import { User } from '../src/models/User.model';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

describe('Auth Endpoints', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/testdb');
    await User.deleteMany({});
    
    const passwordHash = await bcrypt.hash('password123', 10);
    await User.create({
      email: 'test@test.com',
      passwordHash,
      role: 'owner',
      isActive: true
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'password123' });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBeTruthy();
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.headers['set-cookie'][0]).toMatch(/refreshToken/);
  });

  it('should reject invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'wrongpassword' });
    
    expect(res.statusCode).toEqual(401); // Rate limiter doesn't fail here directly, service throws 401 conceptually but Express async handler catches it. 
  });
  
  it('should reject missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com' });
    
    expect(res.statusCode).toEqual(422); 
  });

  it('should require token for /me', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toEqual(401);
  });
});
