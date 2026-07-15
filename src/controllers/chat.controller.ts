import type { Request, Response } from 'express'
import { z } from 'zod'
import { chat } from '../services/anthropic.service'
import type { ChatRequest } from '../types/api.types'

const WorkoutSchema = z.object({
  type: z.string(),
  duration: z.number().positive(),
  calories: z.number().nonnegative(),
  heartRate: z.number().positive().optional(),
  date: z.string(),
})

const SleepSchema = z.object({
  duration: z.number().positive(),
  quality: z.enum(['poor', 'fair', 'good', 'excellent']),
  date: z.string(),
})

export const ChatRequestSchema = z.object({
  message: z.string().min(1),
  healthData: z.object({
    workouts: z.array(WorkoutSchema),
    sleep: z.array(SleepSchema),
    steps: z.number().nonnegative(),
    weeklyScore: z.number().min(0).max(100),
    daysElapsedThisWeek: z.number().int().min(0).max(6).default(6),
    localHour: z.number().int().min(0).max(23).default(12),
  }),
})

export const handleChat = async (req: Request, res: Response): Promise<void> => {
  const { message, healthData } = req.body as ChatRequest
  const response = await chat(req.userId, message, healthData)
  res.json({ message: response })
}
