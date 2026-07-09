import type { Request, Response, NextFunction } from 'express'

export const auth = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key']
  const expected = process.env['JACKFIT_API_KEY']

  if (expected && apiKey !== expected) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  next()
}
