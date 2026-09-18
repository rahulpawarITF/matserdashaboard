import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import projectRoutes from '../src/routes/project.routes';
import { Project } from '../src/models/Project.model';
import { generateTokens } from '../src/utils/jwt';

const app = express();
app.use(express.json());

// Mock auth middleware for testing
app.use((req, res, next) => {
  if (req.headers.authorization === 'Bearer valid-token') {
    req.user = { userId: new mongoose.Types.ObjectId().toString(), email: 'test@test.com', role: 'admin' };
    next();
  } else {
    res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
  }
});

app.use('/api/projects', projectRoutes);

describe('Project Endpoints', () => {
  let projectId: string;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/testdb2');
    await Project.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.statusCode).toEqual(401);
  });

  it('should create project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', 'Bearer valid-token')
      .send({
        name: 'Test Project',
        urls: [{ label: 'Main', url: 'https://example.com' }]
      });
    
    expect(res.statusCode).toEqual(201);
    projectId = res.body.data._id;
  });

  it('should get projects array', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', 'Bearer valid-token');
    
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body.data.projects)).toBeTruthy();
  });

  it('should get project by id', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', 'Bearer valid-token');
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.data._id).toEqual(projectId);
  });

  it('should update project', async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}`)
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Updated Project' });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.name).toEqual('Updated Project');
  });

  it('should delete project', async () => {
    const res = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', 'Bearer valid-token');
    
    expect(res.statusCode).toEqual(200);
  });
});
