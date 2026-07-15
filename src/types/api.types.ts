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
  weeklyScore: number
  daysElapsedThisWeek: number
  localHour: number
}

export interface UserProfile {
  firstName?: string
  mainSports?: string[]
  weeklyActivityGoal: number
  sleepGoal: number
}

export interface ChatRequest {
  message: string
  healthData: HealthSummary
}

export interface ChatResponse {
  message: string
}

export interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}
