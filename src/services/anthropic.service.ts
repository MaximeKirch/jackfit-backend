import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt } from './prompt.service'
import { getRecentMessages, saveMessages, getUserProfile } from './supabase.service'
import type { HealthSummary } from '../types/api.types'

const client = new Anthropic()

export const chat = async (
  userId: string,
  userMessage: string,
  health: HealthSummary,
): Promise<string> => {
  const [history, profile] = await Promise.all([
    getRecentMessages(userId),
    getUserProfile(userId),
  ])

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ]

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: [
      {
        type: 'text',
        text: buildSystemPrompt(health, profile ?? undefined),
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages,
  })

  const firstContent = response.content[0]
  if (!firstContent || firstContent.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic')
  }
  const assistantMessage = firstContent.text

  await saveMessages(userId, userMessage, assistantMessage)

  return assistantMessage
}
