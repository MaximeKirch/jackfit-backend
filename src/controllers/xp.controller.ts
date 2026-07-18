import type { Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { computeAndSaveXpForUser } from '../services/xp.service'

const XpRequestSchema = z.object({
  user_id:    z.string().uuid(),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

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

  const result = await computeAndSaveXpForUser(user_id, week_start, client)

  res.json({
    xp_awarded:        result.xpAwarded,
    breakdown:         result.breakdown,
    total_xp:          result.totalXp,
    current_stage:     result.currentStage,
    stage_changed:     result.stageChanged,
    already_processed: result.alreadyProcessed,
  })
}
