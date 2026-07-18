import type { Request, Response, NextFunction } from 'express'
import jwksRsa from 'jwks-rsa'
import jwt from 'jsonwebtoken'

const jwksClient = jwksRsa({
  jwksUri: `${process.env['SUPABASE_URL'] ?? ''}/auth/v1/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
})

const getSigningKey = (kid: string): Promise<string> =>
  new Promise((resolve, reject) => {
    jwksClient.getSigningKey(kid, (err, key) => {
      if (err ?? !key) return reject(err ?? new Error('no key'))
      resolve(key.getPublicKey())
    })
  })

export const auth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const token = authHeader.slice(7)

  try {
    const decoded = jwt.decode(token, { complete: true })
    if (!decoded || typeof decoded === 'string') throw new Error('invalid token')

    const kid = decoded.header.kid
    if (!kid) throw new Error('no kid in token header')

    const publicKey = await getSigningKey(kid)
    const payload = jwt.verify(token, publicKey) as jwt.JwtPayload
    req.userId = typeof payload.sub === 'string' ? payload.sub : ''
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
