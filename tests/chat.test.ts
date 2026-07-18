// Set env before any module is loaded
process.env['SUPABASE_URL'] = 'http://localhost:54321'

// jose is ESM; stub it so ts-jest (CJS) can load the auth middleware
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn().mockReturnValue({}),
  jwtVerify: jest.fn().mockImplementation((token: string) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jwtLib = require('jsonwebtoken') as typeof import('jsonwebtoken')
    try {
      const payload = jwtLib.verify(token, 'test-jwt-secret') as { sub: string }
      return Promise.resolve({ payload })
    } catch {
      return Promise.reject(new Error('invalid token'))
    }
  }),
}))

import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../src/app'
import * as supabaseService from '../src/services/supabase.service'

const TEST_SECRET = 'test-jwt-secret'
const TEST_USER_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

// Sign a valid test JWT
const makeToken = (sub = TEST_USER_ID) =>
  jwt.sign({ sub, role: 'authenticated' }, TEST_SECRET, { expiresIn: '1h' })

jest.mock('../src/services/anthropic.service', () => ({
  chat: jest.fn().mockResolvedValue("J'ai tellement d'énergie aujourd'hui ! Continue comme ça. 🐾"),
}))

jest.mock('../src/services/supabase.service', () => ({
  checkAndIncrementUsage: jest.fn().mockResolvedValue({ allowed: true, currentCount: 1 }),
  getRecentMessages: jest.fn().mockResolvedValue([]),
  saveMessages: jest.fn().mockResolvedValue(undefined),
  getUserProfile: jest.fn().mockResolvedValue(null),
}))

const mockHealthData = {
  workouts: [
    { type: 'running', duration: 45, calories: 400, date: '2026-07-01T08:00:00Z' },
    { type: 'cycling', duration: 90, calories: 700, date: '2026-07-03T07:00:00Z' },
  ],
  sleep: [
    { duration: 7.5, quality: 'good', date: '2026-07-01' },
    { duration: 6.5, quality: 'fair', date: '2026-07-02' },
  ],
  steps: 42000,
  weeklyScore: 72,
  daysElapsedThisWeek: 3,
  localHour: 10,
}

describe('Auth middleware', () => {
  it('returns 401 without Authorization header', async () => {
    const res = await request(app).post('/chat').send({
      message: 'Hello',
      healthData: mockHealthData,
    })
    expect(res.status).toBe(401)
  })

  it('returns 401 with invalid JWT', async () => {
    const res = await request(app)
      .post('/chat')
      .set('Authorization', 'Bearer invalid.token.here')
      .send({ message: 'Hello', healthData: mockHealthData })
    expect(res.status).toBe(401)
  })
})

describe('POST /chat', () => {
  it('returns 400 without message', async () => {
    const res = await request(app)
      .post('/chat')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ healthData: mockHealthData })
    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })

  it('returns 400 without healthData', async () => {
    const res = await request(app)
      .post('/chat')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ message: 'Hello' })
    expect(res.status).toBe(400)
  })

  it('returns 200 with valid payload and JWT', async () => {
    const res = await request(app)
      .post('/chat')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ message: 'Comment tu vas Uma ?', healthData: mockHealthData })
    expect(res.status).toBe(200)
    expect(res.body.message).toBeDefined()
    expect(typeof res.body.message).toBe('string')
  })

  it('returns 429 when rate limit exceeded', async () => {
    const checkAndIncrementUsage = jest.mocked(supabaseService.checkAndIncrementUsage)
    checkAndIncrementUsage.mockResolvedValueOnce({ allowed: false, currentCount: 31 })

    const res = await request(app)
      .post('/chat')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ message: 'Message de trop', healthData: mockHealthData })

    expect(res.status).toBe(429)
    expect(res.body.error).toBe('rate_limit_exceeded')
    expect(res.body.limit).toBeDefined()
    expect(res.body.reset_at).toBeDefined()
  })
})

describe('GET /health', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})
