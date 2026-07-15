import { Router } from 'express'
import { scoreHandler } from '../controllers/score.controller'

const router = Router()

router.post('/', (req, res, next) => { scoreHandler(req, res).catch(next) })

export default router
