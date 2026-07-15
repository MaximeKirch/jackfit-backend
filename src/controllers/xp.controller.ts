import type { Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { computeWeeklyXp, stageForXp } from '../services/xp.service'

const XpRequestSchema = z.object({
  user_id:    z.string().uuid(),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const DEFAULT_TARGET_ACTIVE_DAYS  = 4
const DEFAULT_TARGET_SLEEP_HOURS  = 8

export const computeXpHandler = async (req: Request, res: Response): Promise<void> => {
  const parsed = XpRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues })
    return
  }

  const { user_id, week_start } = parsed.data

  const client = createClient(
    process.env['SUPABASE_URL'] ?? '',
    process.env['SUPABASE_SECRET_KEY'] ?? '',
  )

  // Idempotence — return existing award if this week was already processed
  const { data: existing } = await client
    .from('xp_transactions')
    .select('xp_awarded, breakdown')
    .eq('user_id', user_id)
    .eq('week_start', week_start)
    .maybeSingle()

  if (existing) {
    const { data: prog } = await client
      .from('pet_progression')
      .select('total_xp, current_stage')
      .eq('user_id', user_id)
      .maybeSingle()

    res.json({
      xp_awarded: existing.xp_awarded as number,
      breakdown: existing.breakdown,
      total_xp: (prog?.total_xp as number) ?? 0,
      current_stage: prog?.current_stage ?? 'JEUNE_CHIOT',
      stage_changed: false,
      already_processed: true,
    })
    return
  }

  // Read raw health data to compute ratios
  const [rawResult, profileResult] = await Promise.all([
    client
      .from('health_data_raw')
      .select('data')
      .eq('user_id', user_id)
      .eq('week_start', week_start)
      .maybeSingle(),
    client
      .from('profiles')
      .select('sleep_goal')
      .eq('id', user_id)
      .maybeSingle(),
  ])

  const healthData = rawResult.data?.data as {
    workouts?: Array<{ date: string }>
    sleep?: Array<{ duration: number }>
  } | null

  const targetSleepHours = (profileResult.data?.sleep_goal as number | null) ?? DEFAULT_TARGET_SLEEP_HOURS

  const activeDays = healthData
    ? new Set((healthData.workouts ?? []).map((w) => w.date.slice(0, 10))).size
    : 0

  const sleepEntries = healthData?.sleep ?? []
  const avgSleepHours = sleepEntries.length > 0
    ? sleepEntries.reduce((acc, s) => acc + s.duration, 0) / sleepEntries.length
    : 0

  const ratios = {
    consistency:   Math.min(activeDays / DEFAULT_TARGET_ACTIVE_DAYS, 1),
    recovery:      Math.min(avgSleepHours / targetSleepHours, 1),
    planAdherence: 0,
  }

  const { xpAwarded, breakdown } = computeWeeklyXp(ratios)

  // Write xp_transaction (idempotent — unique constraint on user_id + week_start)
  await client.from('xp_transactions').insert({
    user_id,
    week_start,
    xp_awarded: xpAwarded,
    breakdown,
  })

  // Upsert pet_progression — increment total_xp atomically, never decrement
  const { data: prev } = await client
    .from('pet_progression')
    .select('total_xp, current_stage, stage_entered_at')
    .eq('user_id', user_id)
    .maybeSingle()

  const prevRow = prev as { total_xp: number; current_stage: string; stage_entered_at: string } | null

  const prevXp      = prevRow?.total_xp ?? 0
  const prevStage   = prevRow?.current_stage ?? 'JEUNE_CHIOT'
  const newTotalXp  = prevXp + xpAwarded
  const newStage    = stageForXp(newTotalXp)
  const stageChanged = newStage !== prevStage

  await client.from('pet_progression').upsert(
    {
      user_id,
      total_xp:         newTotalXp,
      current_stage:    newStage,
      stage_entered_at: stageChanged ? new Date().toISOString() : (prevRow?.stage_entered_at ?? new Date().toISOString()),
      updated_at:       new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  res.json({
    xp_awarded:    xpAwarded,
    breakdown,
    total_xp:      newTotalXp,
    current_stage: newStage,
    stage_changed: stageChanged,
    already_processed: false,
  })
}
