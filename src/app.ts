import express from 'express'
import cors from 'cors'
import chatRouter from './routes/chat.route'
import healthRouter from './routes/health.route'
import scoreRouter from './routes/score.route'
import xpRouter from './routes/xp.route'
import { auth } from './middleware/auth.middleware'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/health', healthRouter)   // public — no auth
app.use('/internal', xpRouter)     // internal — x-internal-secret auth (handled per-route)
app.use((req, res, next) => void auth(req, res, next))
app.use('/chat', chatRouter)
app.use('/score', scoreRouter)

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

export default app
