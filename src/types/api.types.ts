export interface WorkoutData {
  type: string
  duration: number
  calories: number
  heartRate?: number
  date: string
}

export interface SleepData {
  duration: number
  quality: 'poor' | 'fair' | 'good' | 'excellent'
  date: string
}

export interface HealthSummary {
  workouts: WorkoutData[]
  sleep: SleepData[]
  steps: number
  daysElapsedThisWeek: number
  localHour: number
}

export interface ScoringConfig {
  weeklyTargetHours: number
  targetActiveDays: number
  targetSleepHours: number
}

export interface ScoreBreakdown {
  sleep: number
  activity: number
  wellbeing: number
  total: number
}

export type PetStatus = 'NEW' | 'PEAK' | 'GOOD' | 'TIRED' | 'LAZY' | 'OVERREACHED'

export interface ScoreResult {
  score: number
  status: PetStatus
  breakdown: ScoreBreakdown
  hasEnoughData: boolean
}

export interface ScoreRequest {
  healthData: HealthSummary
  config?: Partial<ScoringConfig>
}

export interface UserProfile {
  firstName?: string
  mainSports?: string[]
  weeklyActivityGoal: number
  sleepGoal: number
}

export interface ChatRequest {
  message: string
  weeklyScore: number
  healthData: HealthSummary
}

export interface ChatResponse {
  message: string
}

export interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}
