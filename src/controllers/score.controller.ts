import type { Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createUserClient } from '../services/userClient'
import { getUserProfileWithClient, upsertHealthData, upsertWeeklyScore } from '../services/supabase.service'
import { computeWeeklyScore } from '../services/scoring.service'
import type { ScoringConfig, HealthSummary } from '../types/api.types'

const DEFAULT_CONFIG: ScoringConfig = {
  weeklyTargetHours: 5,
  targetActiveDays: 4,
  targetSleepHours: 8,
}

const WorkoutSchema = z.object({
  type: z.string(),
  duration: z.number(),
  calories: z.number(),
  heartRate: z.number().optional(),
  date: z.string(),
})

const SleepSchema = z.object({
  duration: z.number(),
  quality: z.enum(['poor', 'fair', 'good', 'excellent']),
  date: z.string(),
})

const ScoreRequestSchema = z.object({
  healthData: z.object({
    workouts: z.array(WorkoutSchema),
    sleep: z.array(SleepSchema),
    steps: z.number(),
    daysElapsedThisWeek: z.number().int().min(0).max(6).default(6),
    localHour: z.number().int().min(0).max(23).default(12),
  }),
})

const getWeekStart = (): string => {
  const now = new Date()
  const day = now.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day // Monday = start
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() + diff)
  monday.setUTCHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

export const scoreHandler = async (req: Request, res: Response): Promise<void> => {
  const serviceClient = createClient(
    process.env['SUPABASE_URL'] ?? '',
    process.env['SUPABASE_SECRET_KEY'] ?? '',
  )
  const parsed = ScoreRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues })
    return
  }

  const healthData = parsed.data.healthData as unknown as HealthSummary
  const userId = req.userId
  const authHeader = req.headers.authorization ?? ''
  const jwt = authHeader.slice(7)

  const userClient = createUserClient(jwt)
  const weekStart = getWeekStart()

  const profile = await getUserProfileWithClient(userClient, userId)

  const config: ScoringConfig = {
    weeklyTargetHours: profile?.weeklyActivityGoal ?? DEFAULT_CONFIG.weeklyTargetHours,
    targetActiveDays: DEFAULT_CONFIG.targetActiveDays,
    targetSleepHours: profile?.sleepGoal ?? DEFAULT_CONFIG.targetSleepHours,
  }

  const result = computeWeeklyScore(healthData, config)

  await upsertHealthData(userClient, userId, weekStart, healthData)
  await upsertWeeklyScore(serviceClient, userId, weekStart, result)

  res.json(result)
}
