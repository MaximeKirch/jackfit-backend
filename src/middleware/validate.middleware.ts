import type { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

export const validate =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({ error: formatZodError(result.error) })
      return
    }
    req.body = result.data as unknown
    next()
  }

const formatZodError = (error: ZodError): string =>
  error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
