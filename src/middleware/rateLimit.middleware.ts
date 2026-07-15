import type { Request, Response, NextFunction } from 'express'
import { checkAndIncrementUsage } from '../services/supabase.service'

const DAILY_LIMIT = parseInt(process.env['CHAT_DAILY_LIMIT'] ?? '30', 10)

export const rateLimit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { allowed } = await checkAndIncrementUsage(req.userId, DAILY_LIMIT)

    if (!allowed) {
      const resetAt = new Date()
      resetAt.setUTCDate(resetAt.getUTCDate() + 1)
      resetAt.setUTCHours(0, 0, 0, 0)

      res.status(429).json({
        error: 'rate_limit_exceeded',
        limit: DAILY_LIMIT,
        reset_at: resetAt.toISOString(),
      })
      return
    }

    next()
  } catch (err) {
    // Fail open — a DB hiccup shouldn't block legitimate users
    console.error('Rate limit check failed, failing open:', err)
    next()
  }
}
