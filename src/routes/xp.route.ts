import { Router } from 'express'
import { internalAuth } from '../middleware/internalAuth.middleware'
import { computeXpHandler } from '../controllers/xp.controller'

const router = Router()

router.post('/compute-xp', internalAuth, (req, res, next) => { computeXpHandler(req, res).catch(next) })

export default router
