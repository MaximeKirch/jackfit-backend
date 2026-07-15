import { Router } from 'express'
import { validate } from '../middleware/validate.middleware'
import { rateLimit } from '../middleware/rateLimit.middleware'
import { ChatRequestSchema, handleChat } from '../controllers/chat.controller'

const router = Router()

router.post(
  '/',
  validate(ChatRequestSchema),
  (req, res, next) => { rateLimit(req, res, next).catch(next) },
  (req, res, next) => { handleChat(req, res).catch(next) },
)

export default router
