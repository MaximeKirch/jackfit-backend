import type { Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createUserClient } from '../services/userClient'
import { getUserProfileWithClient, upsertHealthData, upsertWeeklyScore } from '../services/supabase.service'
import { computeWeeklyScore } from '../services/scoring.service'
import { computeWeeklyXp, stageForXp, type XpRatios, type XpBreakdown } from '../services/xp.service'
import type { ScoringConfig, HealthSummary, ScoreResponse } from '../types/api.types'

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

const computeXpRatios = (healthData: HealthSummary, config: ScoringConfig): XpRatios => {
  const daysElapsed  = healthData.daysElapsedThisWeek ?? 6
  const weekProgress = Math.max(daysElapsed / 7, 0.01)
  const proRatedDays = Math.max(config.targetActiveDays * weekProgress, 1)

  const activeDays = new Set(healthData.workouts.map((w) => w.date.slice(0, 10))).size
  const avgSleep   = healthData.sleep.length > 0
    ? healthData.sleep.reduce((acc, s) => acc + s.duration, 0) / healthData.sleep.length
    : 0

  return {
    consistency:   Math.min(activeDays / proRatedDays, 1),
    recovery:      Math.min(avgSleep / config.targetSleepHours, 1),
    planAdherence: 0,
  }
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

  // XP computation — upsert current week then sum all weeks
  const ratios = computeXpRatios(healthData, config)
  const { xpAwarded, breakdown: xpBreakdown } = computeWeeklyXp(ratios)

  await serviceClient.from('xp_transactions').upsert(
    { user_id: userId, week_start: weekStart, xp_awarded: xpAwarded, breakdown: xpBreakdown },
    { onConflict: 'user_id,week_start' },
  )

  const { data: xpRows } = await serviceClient
    .from('xp_transactions')
    .select('xp_awarded')
    .eq('user_id', userId)

  const totalXp = ((xpRows ?? []) as Array<{ xp_awarded: number }>)
    .reduce((sum, row) => sum + row.xp_awarded, 0)

  const currentStage = stageForXp(totalXp)

  const { data: existingProg } = await serviceClient
    .from('pet_progression')
    .select('current_stage, stage_entered_at')
    .eq('user_id', userId)
    .maybeSingle()

  const prog = existingProg as { current_stage: string; stage_entered_at: string } | null
  const stageEnteredAt = prog?.current_stage === currentStage
    ? prog.stage_entered_at
    : new Date().toISOString()

  await serviceClient.from('pet_progression').upsert(
    { user_id: userId, total_xp: totalXp, current_stage: currentStage, stage_entered_at: stageEnteredAt },
    { onConflict: 'user_id' },
  )

  const response: ScoreResponse = { ...result, totalXp, currentStage }
  res.json(response)
}
