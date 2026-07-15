import { createClient } from '@supabase/supabase-js'
import type { AnthropicMessage, UserProfile } from '../types/api.types'

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
  })

  if (error) throw error

  const row = (data as Array<{ allowed: boolean; current_count: number }>)[0]
  return {
    allowed: row?.allowed ?? false,
    currentCount: row?.current_count ?? 0,
  }
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
