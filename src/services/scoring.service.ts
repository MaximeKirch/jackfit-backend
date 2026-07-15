import type { HealthSummary, ScoringConfig, ScoreResult } from '../types/api.types'

const DEFAULT_INTENSITY = 0.8

const WORKOUT_INTENSITY: Partial<Record<string, number>> = {
  running:  1.2,
  cycling:  1.0,
  swimming: 1.3,
  strength: 0.9,
}

const scoreActivity = (
  workouts: HealthSummary['workouts'],
  weeklyTargetHours: number,
): number => {
  if (workouts.length === 0) return 0
  const raw = workouts.reduce((acc, w) => {
    const intensity = WORKOUT_INTENSITY[w.type.toLowerCase()] ?? DEFAULT_INTENSITY
    return acc + (w.duration / 60) * intensity
  }, 0)
  return Math.min((raw / weeklyTargetHours) * 40, 40)
}

const scoreSleep = (
  sleep: HealthSummary['sleep'],
  targetSleepHours: number,
): number => {
  if (sleep.length === 0) return 0
  const avg = sleep.reduce((acc, s) => acc + s.duration, 0) / sleep.length
  return Math.min((avg / targetSleepHours) * 40, 40)
}

const scoreConsistency = (
  workouts: HealthSummary['workouts'],
  targetActiveDays: number,
): number => {
  const activeDays = new Set(workouts.map((w) => w.date.slice(0, 10))).size
  return Math.min((activeDays / targetActiveDays) * 20, 20)
}

const hasEnoughData = (health: HealthSummary): boolean =>
  health.workouts.length + health.sleep.length >= 3

type PetStatus = 'NEW' | 'PEAK' | 'GOOD' | 'TIRED' | 'LAZY' | 'OVERREACHED'

const scoreToStatus = (score: number, enough: boolean): PetStatus => {
  if (!enough) return 'NEW'
  if (score >= 80) return 'PEAK'
  if (score >= 60) return 'GOOD'
  if (score >= 40) return 'TIRED'
  if (score >= 20) return 'LAZY'
  return 'OVERREACHED'
}

export const computeWeeklyScore = (
  health: HealthSummary,
  config: ScoringConfig,
): ScoreResult => {
  const daysElapsed = health.daysElapsedThisWeek ?? 6
  const enough = hasEnoughData(health)

  if (daysElapsed === 0) {
    return {
      score: 65,
      status: 'GOOD',
      breakdown: { sleep: 50, activity: 50, wellbeing: 50, total: 65 },
      hasEnoughData: false,
    }
  }

  const weekProgress    = daysElapsed / 7
  const proRatedHours   = config.weeklyTargetHours * weekProgress
  const proRatedDays    = config.targetActiveDays  * weekProgress

  const activityRaw    = scoreActivity(health.workouts, proRatedHours)
  const sleepRaw       = scoreSleep(health.sleep, config.targetSleepHours)
  const consistencyRaw = scoreConsistency(health.workouts, proRatedDays)
  const total          = Math.round(activityRaw + sleepRaw + consistencyRaw)

  return {
    score: total,
    status: scoreToStatus(total, enough),
    breakdown: {
      sleep:     Math.round((sleepRaw / 40) * 100),
      activity:  Math.round((activityRaw / 40) * 100),
      wellbeing: Math.round(((activityRaw + consistencyRaw) / 60) * 100),
      total,
    },
    hasEnoughData: enough,
  }
}
