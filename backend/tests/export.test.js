/**
 * User Story 3: "As a user, I want to export my design as an image so that I can share it."
 *
 * Acceptance Criteria:
 *   - Design exists ->user clicks "Export" -> file is downloaded as GLB/GLTF or OBJ
 *
 * Test cases:
 *   TC1 – Authenticated user can request a room (prerequisite for export)
 *   TC2 – Unauthenticated user cannot access the design endpoint (401)
 *   TC3 – Room data returned by API contains geometry/furniture data needed for export
 *   TC4 – A saved room has a non-zero furnitureItems array (confirms exportable content exists)
 *
 *  The actual GLB/GLTF file generation happens client-side (Three.js GLTFExporter).
 *       These tests validate the API layer that supplies the design data to the exporter.
 */

const request    = require('supertest');
const mongoose   = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app        = require('../server');
const User       = require('../models/User');
const Room       = require('../models/Room');

let mongoServer;
let authToken;
let savedRoomId;

//  Sample design with furniture (needed for a meaningful export) 

const exportableDesign = {
  name: 'Export Test Room',
  type: 'bedroom',
  dimensions: { width: 4, length: 5, height: 2.8 },
  wallColor:  '#EDE8E3',
  floorColor: '#A07850',
  furnitureItems: [
    {
      instanceId:  'bed-001',
      furnitureId: 'bed_double',
      label:       'Double Bed',
      icon:        '🛏️',
      modelPath:   '/models/bed_double.glb',
      x: 1, z: 1, positionY: 0, scale: 1, rotationY: 90,
    },
    {
      instanceId:  'lamp-001',
      furnitureId: 'table_lamp',
      label:       'Table Lamp',
      icon:        '💡',
      modelPath:   '/models/table_lamp.glb',
      x: 2, z: 1, positionY: 0, scale: 0.5, rotationY: 0,
    },
  ],
};

//  Setup / Teardown 

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  process.env.JWT_SECRET = 'test_jwt_secret_roomly';

  // Register a user
  const regRes = await request(app).post('/api/auth/register').send({
    name:     'Export Tester',
    email:    'export@roomly.com',
    password: 'Export@123',
  });
  authToken = regRes.body.token;

  // Save a design so we have something to export
  const roomRes = await request(app)
    .post('/api/rooms')
    .set({ Authorization: `Bearer ${authToken}` })
    .send(exportableDesign);
  savedRoomId = roomRes.body.room._id;
});

afterAll(async () => {
  await Room.deleteMany({});
  await User.deleteMany({});
  await mongoose.disconnect();
  await mongoServer.stop();
});

//  TC1: Authenticated user can request the design for export 

describe('TC1 – Authenticated user can request room data for export', () => {
  test('GET /api/rooms/:id returns 200 for authenticated owner', async () => {
    const res = await request(app)
      .get(`/api/rooms/${savedRoomId}`)
      .set({ Authorization: `Bearer ${authToken}` });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.room).toBeDefined();
  });

  test('response includes room name and type', async () => {
    const res = await request(app)
      .get(`/api/rooms/${savedRoomId}`)
      .set({ Authorization: `Bearer ${authToken}` });

    expect(res.body.room.name).toBe(exportableDesign.name);
    expect(res.body.room.type).toBe(exportableDesign.type);
  });
});

//  TC2: Unauthenticated user cannot access the design 

describe('TC2 – Unauthenticated user cannot request a design (returns 401)', () => {
  test('GET /api/rooms/:id without token returns 401', async () => {
    const res = await request(app).get(`/api/rooms/${savedRoomId}`);
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/rooms/:id with expired/invalid token returns 401', async () => {
    const res = await request(app)
      .get(`/api/rooms/${savedRoomId}`)
      .set({ Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.expired.token' });
    expect(res.statusCode).toBe(401);
  });
});

//  TC3: Room data contains geometry fields required for export 
describe('TC3 – Room data contains geometry / design data required for export', () => {
  test('dimensions (width, length, height) are present and numeric', async () => {
    const res = await request(app)
      .get(`/api/rooms/${savedRoomId}`)
      .set({ Authorization: `Bearer ${authToken}` });

    const { dimensions } = res.body.room;
    expect(typeof dimensions.width).toBe('number');
    expect(typeof dimensions.length).toBe('number');
    expect(typeof dimensions.height).toBe('number');
  });

  test('wallColor and floorColor are present', async () => {
    const res = await request(app)
      .get(`/api/rooms/${savedRoomId}`)
      .set({ Authorization: `Bearer ${authToken}` });

    const { room } = res.body;
    expect(room.wallColor).toBeTruthy();
    expect(room.floorColor).toBeTruthy();
  });

  test('furnitureItems is an array', async () => {
    const res = await request(app)
      .get(`/api/rooms/${savedRoomId}`)
      .set({ Authorization: `Bearer ${authToken}` });

    expect(Array.isArray(res.body.room.furnitureItems)).toBe(true);
  });
});

//  TC4: Exportable content – furnitureItems array is non-empty 

describe('TC4 – Exported file would contain visible design elements (size > 0 check)', () => {
  test('furnitureItems has at least one element (non-empty content to export)', async () => {
    const res = await request(app)
      .get(`/api/rooms/${savedRoomId}`)
      .set({ Authorization: `Bearer ${authToken}` });

    const { furnitureItems } = res.body.room;
    expect(furnitureItems.length).toBeGreaterThan(0);
  });

  test('each furnitureItem has a modelPath (file reference for the exporter)', async () => {
    const res = await request(app)
      .get(`/api/rooms/${savedRoomId}`)
      .set({ Authorization: `Bearer ${authToken}` });

    res.body.room.furnitureItems.forEach((item) => {
      expect(item.modelPath).toBeTruthy();
      expect(typeof item.modelPath).toBe('string');
    });
  });

  test('furnitureItem position fields are stored correctly', async () => {
    const res = await request(app)
      .get(`/api/rooms/${savedRoomId}`)
      .set({ Authorization: `Bearer ${authToken}` });

    const bed = res.body.room.furnitureItems.find((i) => i.instanceId === 'bed-001');
    expect(bed).toBeDefined();
    expect(bed.x).toBe(1);
    expect(bed.z).toBe(1);
    expect(bed.rotationY).toBe(90);
    expect(bed.scale).toBe(1);
  });
});
