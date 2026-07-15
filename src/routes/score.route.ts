import { Router } from 'express'
import { scoreHandler } from '../controllers/score.controller'

const router = Router()

router.post('/', scoreHandler)

export default router
