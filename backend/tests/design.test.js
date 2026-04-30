/**
 * User Story 2: "As a user, I want to save my design so that I can access it later."
 *
 * Acceptance Criteria:
 *   - Logged-in user clicks "Save" -> design stored in system
 *   - User logs in again -> saved design is accessible and editable
 *
 * Test Cases covered:
 *   TC1 – Authenticated user can save a design (furniture list + room dimensions)
 *   TC2 – Unauthenticated user cannot save a design (returns 401)
 *   TC3 – Saved design appears in user's list of designs (GET /api/rooms)
 *   TC4 – Design is correctly stored in MongoDB with user reference
 */

const request    = require('supertest');
const mongoose   = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app        = require('../server');
const User       = require('../models/User');
const Room       = require('../models/Room');

let mongoServer;
let authToken;
let userId;

//  Setup 

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  process.env.JWT_SECRET = 'test_jwt_secret_roomly';

  // Register + login a user once for the whole suite
  const res = await request(app).post('/api/auth/register').send({
    name:     'Design Tester',
    email:    'designer@roomly.com',
    password: 'Design@123',
  });

  authToken = res.body.token;
  userId    = res.body.user.id;
});

afterEach(async () => {
  await Room.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.disconnect();
  await mongoServer.stop();
});

//  Sample Design Payload 

const designPayload = {
  name: 'My Living Room',
  type: 'living_room',
  dimensions: { width: 5, length: 6, height: 2.8 },
  wallColor:  '#D6CFC7',
  floorColor: '#C8A882',
  furnitureItems: [
    {
      instanceId:  'sofa-001',
      furnitureId: 'sofa',
      label:       'Sofa',
      icon:        '🛋️',
      modelPath:   '/models/sofa.glb',
      x: 0, z: 0, positionY: 0, scale: 1, rotationY: 0,
    },
  ],
};

const authHeader = () => ({ Authorization: `Bearer ${authToken}` });

//  TC1: Authenticated user can save a design 

describe('TC1 – Authenticated user can save a design', () => {
  test('POST /api/rooms returns 201 with the created room', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set(authHeader())
      .send(designPayload);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.room).toMatchObject({
      name:       designPayload.name,
      type:       designPayload.type,
      dimensions: designPayload.dimensions,
    });
  });

  test('saved room contains furnitureItems', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set(authHeader())
      .send(designPayload);

    expect(res.body.room.furnitureItems).toHaveLength(1);
    expect(res.body.room.furnitureItems[0]).toMatchObject({
      instanceId: 'sofa-001',
      label:      'Sofa',
    });
  });

  test('design is editable via PUT /api/rooms/:id', async () => {
    const createRes = await request(app)
      .post('/api/rooms')
      .set(authHeader())
      .send(designPayload);

    const roomId = createRes.body.room._id;

    const updateRes = await request(app)
      .put(`/api/rooms/${roomId}`)
      .set(authHeader())
      .send({ name: 'Updated Living Room', wallColor: '#FFFFFF' });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.room.name).toBe('Updated Living Room');
    expect(updateRes.body.room.wallColor).toBe('#FFFFFF');
  });
});

//  TC2: Unauthenticated user cannot save design 

describe('TC2 – Unauthenticated user cannot save a design (returns 401)', () => {
  test('POST /api/rooms without token returns 401', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .send(designPayload);

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/rooms with an invalid token returns 401', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set({ Authorization: 'Bearer invalid.token.here' })
      .send(designPayload);

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/rooms without token returns 401', async () => {
    const res = await request(app).get('/api/rooms');
    expect(res.statusCode).toBe(401);
  });
});

//  TC3: Saved design appears in user's list of designs 

describe('TC3 – Saved design appears in GET /api/rooms', () => {
  test('GET /api/rooms returns the saved design after it is created', async () => {
    // Save a design first
    await request(app)
      .post('/api/rooms')
      .set(authHeader())
      .send(designPayload);

    const listRes = await request(app)
      .get('/api/rooms')
      .set(authHeader());

    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.rooms).toHaveLength(1);
    expect(listRes.body.rooms[0].name).toBe(designPayload.name);
  });

  test('count field matches the number of saved designs', async () => {
    await request(app).post('/api/rooms').set(authHeader()).send(designPayload);
    await request(app).post('/api/rooms').set(authHeader()).send({ ...designPayload, name: 'Room 2' });

    const listRes = await request(app).get('/api/rooms').set(authHeader());

    expect(listRes.body.count).toBe(2);
    expect(listRes.body.rooms).toHaveLength(2);
  });

  test('saved design can be fetched individually via GET /api/rooms/:id', async () => {
    const createRes = await request(app)
      .post('/api/rooms')
      .set(authHeader())
      .send(designPayload);

    const roomId = createRes.body.room._id;

    const getRes = await request(app)
      .get(`/api/rooms/${roomId}`)
      .set(authHeader());

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.room._id).toBe(roomId);
    expect(getRes.body.room.name).toBe(designPayload.name);
  });
});

//  TC4: Design stored in MongoDB with user reference 
describe('TC4 – Design is correctly stored in MongoDB with user reference', () => {
  test('room document has user field matching the logged-in user', async () => {
    const createRes = await request(app)
      .post('/api/rooms')
      .set(authHeader())
      .send(designPayload);

    const roomId = createRes.body.room._id;
    const room   = await Room.findById(roomId);

    expect(room).not.toBeNull();
    expect(room.user.toString()).toBe(userId);
  });

  test('room document has all dimension fields stored correctly', async () => {
    const createRes = await request(app)
      .post('/api/rooms')
      .set(authHeader())
      .send(designPayload);

    const room = await Room.findById(createRes.body.room._id);

    expect(room.dimensions.width).toBe(5);
    expect(room.dimensions.length).toBe(6);
    expect(room.dimensions.height).toBe(2.8);
  });

  test("user cannot access another user's room (returns 404)", async () => {
    // Create room with the main user
    const createRes = await request(app)
      .post('/api/rooms')
      .set(authHeader())
      .send(designPayload);
    const roomId = createRes.body.room._id;
    // Register a second user
    const otherRes = await request(app).post('/api/auth/register').send({
      name:     'Other User',
      email:    'other@roomly.com',
      password: 'Other@123',
    });
    const otherToken = otherRes.body.token;
    // Other user tries to access first user's room
    const getRes = await request(app)
      .get(`/api/rooms/${roomId}`)
      .set({ Authorization: `Bearer ${otherToken}` });

    expect(getRes.statusCode).toBe(404);
  });
});
