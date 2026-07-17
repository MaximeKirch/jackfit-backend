import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AnthropicMessage, UserProfile, HealthSummary, ScoreResult } from '../types/api.types'

const supabase = createClient(
  process.env['SUPABASE_URL'] ?? '',
  process.env['SUPABASE_SECRET_KEY'] ?? '',
)

export const getRecentMessages = async (userId: string, limit = 20): Promise<AnthropicMessage[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return ((data ?? []) as AnthropicMessage[]).reverse()
}

export const saveMessages = async (
  userId: string,
  userContent: string,
  assistantContent: string,
): Promise<void> => {
  const { error } = await supabase.from('messages').insert([
    { user_id: userId, role: 'user', content: userContent },
    { user_id: userId, role: 'assistant', content: assistantContent },
  ])
  if (error) throw error
}

export const checkAndIncrementUsage = async (
  userId: string,
  dailyLimit: number,
): Promise<{ allowed: boolean; currentCount: number }> => {
  const { data, error } = await supabase.rpc('increment_chat_usage', {
    p_user_id: userId,
    p_limit: dailyLimit,
  }) as { data: Array<{ allowed: boolean; current_count: number }> | null; error: Error | null }

  if (error) throw error

  const row = (data ?? [])[0]
  return {
    allowed: row?.allowed ?? false,
    currentCount: row?.current_count ?? 0,
  }
}

export const getUserProfileWithClient = async (
  client: SupabaseClient,
  userId: string,
): Promise<UserProfile | null> => {
  const { data, error } = await client
    .from('profiles')
    .select('first_name, main_sports, weekly_activity_goal, sleep_goal')
    .eq('id', userId)
    .single()

  if (error || !data) return null

  const row = data as {
    first_name?: string
    main_sports?: string[]
    weekly_activity_goal: number
    sleep_goal: number
  }

  const profile: UserProfile = {
    weeklyActivityGoal: row.weekly_activity_goal,
    sleepGoal: row.sleep_goal,
  }
  if (row.first_name !== undefined) profile.firstName = row.first_name
  if (row.main_sports !== undefined) profile.mainSports = row.main_sports
  return profile
}

export const upsertHealthData = async (
  client: SupabaseClient,
  userId: string,
  weekStart: string,
  data: HealthSummary,
): Promise<void> => {
  const { error } = await client.from('health_data_raw').upsert(
    {
      user_id: userId,
      week_start: weekStart,
      workouts: data.workouts,
      sleep: data.sleep,
      steps: data.steps,
      synced_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,week_start' },
  )
  if (error) throw error
}

export const upsertWeeklyScore = async (
  serviceClient: SupabaseClient,
  userId: string,
  weekStart: string,
  result: ScoreResult,
): Promise<void> => {
  const { error } = await serviceClient.from('weekly_scores').upsert(
    {
      user_id: userId,
      week_start: weekStart,
      score: result.score,
      status: result.status,
      breakdown: result.breakdown,
      computed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,week_start' },
  )
  if (error) throw error
}

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('first_name, main_sports, weekly_activity_goal, sleep_goal')
    .eq('id', userId)
    .single()

  if (error || !data) return null

  const row = data as {
    first_name?: string
    main_sports?: string[]
    weekly_activity_goal: number
    sleep_goal: number
  }

  const profile: UserProfile = {
    weeklyActivityGoal: row.weekly_activity_goal,
    sleepGoal: row.sleep_goal,
  }
  if (row.first_name !== undefined) profile.firstName = row.first_name
  if (row.main_sports !== undefined) profile.mainSports = row.main_sports
  return profile
}
