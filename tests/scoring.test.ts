/**
 * Non-regression tests for the server-side scoring formula.
 * Expected values were derived from the original client-side implementation
 * in src/features/pet/utils/scoring.ts before migration.
 * These must remain identical to the client output on the same inputs.
 */
import { computeWeeklyScore } from '../src/services/scoring.service'

const DEFAULT_CONFIG = {
  weeklyTargetHours: 5,
  targetActiveDays: 4,
  targetSleepHours: 8,
}

describe('computeWeeklyScore — non-regression', () => {
  it('Monday morning with no data returns GOOD fallback (score 65)', () => {
    const result = computeWeeklyScore(
      { workouts: [], sleep: [], steps: 0, daysElapsedThisWeek: 0, localHour: 8 },
      DEFAULT_CONFIG,
    )
    expect(result.score).toBe(65)
    expect(result.status).toBe('GOOD')
    expect(result.breakdown).toEqual({ sleep: 50, activity: 50, wellbeing: 50, total: 65 })
    expect(result.hasEnoughData).toBe(false)
  })

  it('Mid-week (daysElapsed=2): 1 run 30min + 2 nights sleep → GOOD', () => {
    const result = computeWeeklyScore(
      {
        workouts: [{ type: 'running', duration: 30, calories: 250, date: '2026-07-14T07:00:00Z' }],
        sleep: [
          { duration: 6.5, quality: 'fair', date: '2026-07-13' },
          { duration: 7, quality: 'good', date: '2026-07-14' },
        ],
        steps: 8000,
        daysElapsedThisWeek: 2,
        localHour: 18,
      },
      DEFAULT_CONFIG,
    )
    expect(result.score).toBe(68)
    expect(result.status).toBe('GOOD')
    expect(result.breakdown.sleep).toBe(84)
    expect(result.breakdown.activity).toBe(42)
    expect(result.breakdown.wellbeing).toBe(57)
    expect(result.hasEnoughData).toBe(true)
  })

  it('End of week (daysElapsed=4): no workouts, good sleep → LAZY', () => {
    const result = computeWeeklyScore(
      {
        workouts: [],
        sleep: [
          { duration: 7, quality: 'good', date: '2026-07-11' },
          { duration: 7.5, quality: 'good', date: '2026-07-12' },
          { duration: 8, quality: 'good', date: '2026-07-13' },
          { duration: 8, quality: 'good', date: '2026-07-14' },
        ],
        steps: 5000,
        daysElapsedThisWeek: 4,
        localHour: 20,
      },
      DEFAULT_CONFIG,
    )
    expect(result.score).toBe(38)
    expect(result.status).toBe('LAZY')
    expect(result.breakdown.sleep).toBe(95)
    expect(result.breakdown.activity).toBe(0)
    expect(result.breakdown.wellbeing).toBe(0)
    expect(result.hasEnoughData).toBe(true)
  })

  it('Full week (daysElapsed=6): heavy training → PEAK', () => {
    const result = computeWeeklyScore(
      {
        workouts: [
          { type: 'running', duration: 60, calories: 600, date: '2026-07-08T07:00:00Z' },
          { type: 'running', duration: 45, calories: 450, date: '2026-07-09T07:00:00Z' },
          { type: 'cycling', duration: 90, calories: 700, date: '2026-07-11T07:00:00Z' },
          { type: 'cycling', duration: 60, calories: 500, date: '2026-07-13T07:00:00Z' },
        ],
        sleep: Array.from({ length: 6 }, (_, i) => ({
          duration: 7,
          quality: 'good' as const,
          date: `2026-07-${(8 + i).toString().padStart(2, '0')}`,
        })),
        steps: 60000,
        daysElapsedThisWeek: 6,
        localHour: 20,
      },
      DEFAULT_CONFIG,
    )
    expect(result.score).toBe(95)
    expect(result.status).toBe('PEAK')
    expect(result.breakdown.activity).toBe(100)
    expect(result.breakdown.wellbeing).toBe(100)
    expect(result.hasEnoughData).toBe(true)
  })

  it('Not enough data (1 workout, 0 sleep) → NEW status regardless of score', () => {
    const result = computeWeeklyScore(
      {
        workouts: [{ type: 'running', duration: 60, calories: 500, date: '2026-07-14T07:00:00Z' }],
        sleep: [],
        steps: 3000,
        daysElapsedThisWeek: 3,
        localHour: 10,
      },
      DEFAULT_CONFIG,
    )
    expect(result.status).toBe('NEW')
    expect(result.hasEnoughData).toBe(false)
  })

  it('Custom scoring config is respected', () => {
    const customConfig = { weeklyTargetHours: 10, targetActiveDays: 6, targetSleepHours: 9 }
    const result = computeWeeklyScore(
      {
        workouts: [{ type: 'running', duration: 30, calories: 250, date: '2026-07-14T07:00:00Z' }],
        sleep: [{ duration: 7, quality: 'good', date: '2026-07-14' }],
        steps: 5000,
        daysElapsedThisWeek: 2,
        localHour: 12,
      },
      customConfig,
    )
    // With higher targets, same data should score lower than with default config
    const defaultResult = computeWeeklyScore(
      {
        workouts: [{ type: 'running', duration: 30, calories: 250, date: '2026-07-14T07:00:00Z' }],
        sleep: [{ duration: 7, quality: 'good', date: '2026-07-14' }],
        steps: 5000,
        daysElapsedThisWeek: 2,
        localHour: 12,
      },
      DEFAULT_CONFIG,
    )
    expect(result.score).toBeLessThan(defaultResult.score)
  })
})
