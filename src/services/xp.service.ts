import { type SupabaseClient } from '@supabase/supabase-js'

export const XP_WEIGHTS = {
  consistency:   0.6,
  recovery:      0.4,
  // nécessite une intégration API tierce (Coros/Garmin/TrainingPeaks), hors scope HealthKit par nature. Ne pas retirer cette clé du schéma.
  planAdherence: 0,
} as const

export const XP_CONFIG = {
  maxXpPerWeek: 50,
} as const

export type StageName = 'JEUNE_CHIOT' | 'CHIOT' | 'ADULTE_ACTIF' | 'VÉTÉRAN' | 'ATHLÈTE_ÉLITE'

export const STAGES: ReadonlyArray<{ name: StageName; minXp: number }> = [
  { name: 'JEUNE_CHIOT',   minXp: 0    },
  { name: 'CHIOT',         minXp: 200  },
  { name: 'ADULTE_ACTIF',  minXp: 600  },
  { name: 'VÉTÉRAN',       minXp: 1400 },
  { name: 'ATHLÈTE_ÉLITE', minXp: 3000 },
]

export interface XpRatios {
  consistency:   number // 0-1
  recovery:      number // 0-1
  planAdherence: number // 0-1
}

export interface XpBreakdown {
  consistency:   number
  recovery:      number
  planAdherence: number
}

export interface XpResult {
  xpAwarded: number
  breakdown:  XpBreakdown
}

export interface XpSaveResult {
  xpAwarded:        number
  breakdown:        XpBreakdown
  totalXp:          number
  currentStage:     StageName
  stageChanged:     boolean
  alreadyProcessed: boolean
}

export const computeWeeklyXp = (ratios: XpRatios): XpResult => {
  const keys = Object.keys(XP_WEIGHTS) as Array<keyof typeof XP_WEIGHTS>

  const breakdown = keys.reduce<XpBreakdown>((acc, key) => {
    acc[key] = Math.round(ratios[key] * XP_CONFIG.maxXpPerWeek * XP_WEIGHTS[key])
    return acc
  }, { consistency: 0, recovery: 0, planAdherence: 0 })

  const xpAwarded = keys.reduce((sum, key) => sum + breakdown[key], 0)

  return { xpAwarded, breakdown }
}

export const stageForXp = (totalXp: number): StageName => {
  const stage = [...STAGES].reverse().find((s) => totalXp >= s.minXp)
  return stage?.name ?? 'JEUNE_CHIOT'
}

const DEFAULT_TARGET_ACTIVE_DAYS = 4
const DEFAULT_TARGET_SLEEP_HOURS = 8

export const computeAndSaveXpForUser = async (
  userId: string,
  weekStart: string,
  client: SupabaseClient,
): Promise<XpSaveResult> => {
  // Idempotence — return existing award without re-computing if already processed
  const { data: existingTx } = await client
    .from('xp_transactions')
    .select('xp_awarded, breakdown')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle()

  if (existingTx) {
    const tx = existingTx as { xp_awarded: number; breakdown: XpBreakdown }
    const { data: prog } = await client
      .from('pet_progression')
      .select('total_xp, current_stage')
      .eq('user_id', userId)
      .maybeSingle()
    const progRow = prog as { total_xp: number; current_stage: StageName } | null
    return {
      xpAwarded:        tx.xp_awarded,
      breakdown:        tx.breakdown,
      totalXp:          progRow?.total_xp ?? 0,
      currentStage:     progRow?.current_stage ?? 'JEUNE_CHIOT',
      stageChanged:     false,
      alreadyProcessed: true,
    }
  }

  const [rawResult, profileResult] = await Promise.all([
    client
      .from('health_data_raw')
      .select('workouts, sleep')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .maybeSingle(),
    client
      .from('profiles')
      .select('sleep_goal')
      .eq('id', userId)
      .maybeSingle(),
  ])

  const raw = rawResult.data as {
    workouts: Array<{ date: string }>
    sleep: Array<{ duration: number }>
  } | null

  const targetSleepHours = (profileResult.data as { sleep_goal: number } | null)?.sleep_goal
    ?? DEFAULT_TARGET_SLEEP_HOURS

  const activeDays = raw ? new Set(raw.workouts.map((w) => w.date.slice(0, 10))).size : 0
  const sleepEntries = raw?.sleep ?? []
  const avgSleep = sleepEntries.length > 0
    ? sleepEntries.reduce((acc, s) => acc + s.duration, 0) / sleepEntries.length
    : 0

  const ratios: XpRatios = {
    consistency:   Math.min(activeDays / DEFAULT_TARGET_ACTIVE_DAYS, 1),
    recovery:      Math.min(avgSleep / targetSleepHours, 1),
    planAdherence: 0,
  }

  const { xpAwarded, breakdown } = computeWeeklyXp(ratios)

  const { error: txError } = await client.from('xp_transactions').upsert(
    { user_id: userId, week_start: weekStart, xp_awarded: xpAwarded, breakdown },
    { onConflict: 'user_id,week_start' },
  )
  if (txError) throw txError

  const { data: xpRows, error: sumError } = await client
    .from('xp_transactions')
    .select('xp_awarded')
    .eq('user_id', userId)
  if (sumError) throw sumError

  const totalXp = ((xpRows ?? []) as Array<{ xp_awarded: number }>).reduce((sum, r) => sum + r.xp_awarded, 0)
  const currentStage = stageForXp(totalXp)

  const { data: prevProg } = await client
    .from('pet_progression')
    .select('current_stage, stage_entered_at')
    .eq('user_id', userId)
    .maybeSingle()
  const prevRow = prevProg as { current_stage: StageName; stage_entered_at: string } | null
  const stageChanged = (prevRow?.current_stage ?? 'JEUNE_CHIOT') !== currentStage
  const stageEnteredAt = stageChanged
    ? new Date().toISOString()
    : (prevRow?.stage_entered_at ?? new Date().toISOString())

  const { error: progError } = await client.from('pet_progression').upsert(
    {
      user_id:          userId,
      total_xp:         totalXp,
      current_stage:    currentStage,
      stage_entered_at: stageEnteredAt,
      updated_at:       new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (progError) throw progError

  return { xpAwarded, breakdown, totalXp, currentStage, stageChanged, alreadyProcessed: false }
}
