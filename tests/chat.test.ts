import request from 'supertest'
import app from '../src/app'

jest.mock('../src/services/anthropic.service', () => ({
  chat: jest.fn().mockResolvedValue("J'ai tellement d'énergie aujourd'hui ! Continue comme ça. 🐾"),
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
}

describe('POST /chat', () => {
  it('should return 400 without userId', async () => {
    const res = await request(app).post('/chat').send({ healthData: mockHealthData })
    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })

  it('should return 400 without healthData', async () => {
    const res = await request(app).post('/chat').send({ userId: 'test-user', message: 'Hello' })
    expect(res.status).toBe(400)
  })

  it('should return 200 with valid payload', async () => {
    const res = await request(app).post('/chat').send({
      userId: 'test-user',
      message: 'Comment tu vas Uma ?',
      healthData: mockHealthData,
    })
    expect(res.status).toBe(200)
    expect(res.body.message).toBeDefined()
    expect(typeof res.body.message).toBe('string')
  })
})

describe('GET /health', () => {
  it('should return 200', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})
