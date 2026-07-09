import express from 'express'
import cors from 'cors'
import chatRouter from './routes/chat.route'
import healthRouter from './routes/health.route'
import { auth } from './middleware/auth.middleware'

const app = express()

app.use(cors())
app.use(express.json())
app.use(auth)

app.use('/chat', chatRouter)
app.use('/health', healthRouter)

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

export default app
