/**
 * User Story 1: "As a user, I want to create an account so that I can save my designs."
 *
 * Acceptance Criteria:
 *   - Valid email + password -> account created (201)
 *   - Invalid input -> error message displayed (400)
 *
 * Test Cases covered:
 *   TC1 - Successful registration with valid email and password
 *   TC2 - Registration fails with duplicate email
 *   TC3 - Registration fails with invalid email format
 *   TC4 - Registration fails with missing / too-short password
 *   TC5 - Password is hashed before saving (not stored in plain text)
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');J
const User = require('../models/User');

let mongoServer;

//  Setup 

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  process.env.JWT_SECRET = 'test_jwt_secret_roomly';
});

afterEach(async () => {
  // Wipe users between tests so duplicate-email tests are isolated
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

//  Helper 

const validPayload = {
  name: 'Jane Designer',
  email: 'jane@roomly.com',
  password: 'Secret123',
};

const post = (payload) =>
  request(app).post('/api/auth/register').send(payload);

//  TC1: Successful Registration 

describe('TC1 – Successful registration with valid email and password', () => {
  test('returns 201 with token and user object', async () => {
    const res = await post(validPayload);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({
      name: validPayload.name,
      email: 'jane@roomly.com', // normalised to lowercase
    });
    expect(res.body.user).not.toHaveProperty('password');
  });

  test('user is actually persisted in the database', async () => {
    await post(validPayload);
    const saved = await User.findOne({ email: 'jane@roomly.com' });
    expect(saved).not.toBeNull();
    expect(saved.name).toBe(validPayload.name);
  });
});

//  TC2: Duplicate Email 

describe('TC2 – Registration fails with duplicate email', () => {
  test('returns 400 when email is already registered', async () => {
    // First registration succeeds
    await post(validPayload);

    // Second registration with same email must fail
    const res = await post({ ...validPayload, name: 'Another Person' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });
});

//  TC3: Invalid Email Format 

describe('TC3 – Registration fails with invalid email format', () => {
  const invalidEmails = [
    'not-an-email',
    'missing@domain',
    '@nodomain.com',
    'spaces in@email.com',
  ];

  test.each(invalidEmails)(
    'rejects "%s" with 400 and validation error',
    async (email) => {
      const res = await post({ ...validPayload, email });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBeTruthy();
    }
  );
});

//  TC4: Missing / Too-Short Password 

describe('TC4 – Registration fails with missing required fields', () => {
  test('returns 400 when password is too short (< 6 chars)', async () => {
    const res = await post({ ...validPayload, password: '123' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/6 characters/i);
  });

  test('returns 400 when password is missing', async () => {
    const { password, ...noPassword } = validPayload;
    const res = await post(noPassword);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 when name is missing', async () => {
    const { name, ...noName } = validPayload;
    const res = await post(noName);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/name/i);
  });

  test('returns 400 when email is missing', async () => {
    const { email, ...noEmail } = validPayload;
    const res = await post(noEmail);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

//  TC5: Password is Hashed Before Saving 

describe('TC5 – Password is hashed before saving', () => {
  test('stored password is not equal to the plaintext password', async () => {
    await post(validPayload);

    // Explicitly select the password field (it has select:false in the schema)
    const user = await User.findOne({ email: 'jane@roomly.com' }).select('+password');

    expect(user).not.toBeNull();
    expect(user.password).not.toBe(validPayload.password);
    // bcrypt hashes always start with "$2"
    expect(user.password).toMatch(/^\$2[aby]\$/);
  });

  test('comparePassword() returns true for the correct password', async () => {
    await post(validPayload);
    const user = await User.findOne({ email: 'jane@roomly.com' }).select('+password');
    const match = await user.comparePassword(validPayload.password);
    expect(match).toBe(true);
  });

  test('comparePassword() returns false for a wrong password', async () => {
    await post(validPayload);
    const user = await User.findOne({ email: 'jane@roomly.com' }).select('+password');
    const match = await user.comparePassword('wrongpassword');
    expect(match).toBe(false);
  });
});
