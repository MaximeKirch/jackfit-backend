import type { Request, Response, NextFunction } from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const JWKS = createRemoteJWKSet(
  new URL(`${process.env['SUPABASE_URL'] ?? ''}/auth/v1/.well-known/jwks.json`)
)

export const auth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const token = authHeader.slice(7)

  try {
    const { payload } = await jwtVerify(token, JWKS)
    req.userId = payload.sub ?? ''
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
