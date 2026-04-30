/**
 * Integration Test: Full API Lifecycle
 * 
 * This test suite validates all core backend APIs by following a complete user workflow:
 * 1. Health check verification.
 * 2. User registration and token generation.
 * 3. User login with credentials.
 * 4. Profile retrieval using the generated token.
 * 5. Room design creation (Save functionality).
 * 6. Listing saved designs.
 * 7. Updating an existing design.
 * 8. Retrieving design data for export.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Room = require('../models/Room');

let mongoServer;
let authToken;
let userId;
let roomId;

const userPayload = {
    name: 'Integration Tester',
    email: 'tester@roomly.com',
    password: 'Password123!',
};

const roomPayload = {
    name: 'Integration Test Room',
    type: 'bedroom',
    dimensions: { width: 4, length: 5, height: 2.5 },
    wallColor: '#FFFFFF',
    floorColor: '#000000',
    furnitureItems: [
        {
            instanceId: 'item-1',
            furnitureId: 'chair',
            label: 'Chair',
            icon: '🪑',
            modelPath: '/models/chair.glb',
            x: 1, z: 1, positionY: 0, scale: 1, rotationY: 0
        }
    ]
};

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    process.env.JWT_SECRET = 'integration_test_secret';
});

afterAll(async () => {
    await User.deleteMany({});
    await Room.deleteMany({});
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Full Backend API Integration Flow', () => {

    test('Step 1: Health Check', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test('Step 2: User Registration', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(userPayload);
        
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('token');
        authToken = res.body.token;
        userId = res.body.user.id;
    });

    test('Step 3: User Login', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: userPayload.email,
                password: userPayload.password,
            });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('token');
        // Refresh token just in case
        authToken = res.body.token;
    });

    test('Step 4: Get Profile (Auth Verification)', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${authToken}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.user.email).toBe(userPayload.email.toLowerCase());
    });

    test('Step 5: Create Room Design', async () => {
        const res = await request(app)
            .post('/api/rooms')
            .set('Authorization', `Bearer ${authToken}`)
            .send(roomPayload);
        
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.room.name).toBe(roomPayload.name);
        roomId = res.body.room._id;
    });

    test('Step 6: List Saved Designs', async () => {
        const res = await request(app)
            .get('/api/rooms')
            .set('Authorization', `Bearer ${authToken}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.rooms)).toBe(true);
        expect(res.body.count).toBeGreaterThan(0);
    });

    test('Step 7: Update Design', async () => {
        const updatedName = 'Updated Integration Room';
        const res = await request(app)
            .put(`/api/rooms/${roomId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ name: updatedName });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.room.name).toBe(updatedName);
    });

    test('Step 8: Get Room for Export', async () => {
        const res = await request(app)
            .get(`/api/rooms/${roomId}`)
            .set('Authorization', `Bearer ${authToken}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.room).toHaveProperty('furnitureItems');
        expect(res.body.room.furnitureItems.length).toBe(1);
        expect(res.body.room.dimensions).toMatchObject(roomPayload.dimensions);
    });

    test('Step 9: Unauthorized Access Prevention', async () => {
        const res = await request(app).get('/api/rooms');
        expect(res.statusCode).toBe(401);
    });

});
