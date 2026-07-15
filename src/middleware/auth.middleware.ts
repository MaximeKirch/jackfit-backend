import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export const auth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const token = authHeader.slice(7)
  // Read lazily so test setup can set the env var before requests are made
  const secret = process.env['SUPABASE_JWT_SECRET'] ?? ''

  try {
    const payload = jwt.verify(token, secret) as { sub: string }
    req.userId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
