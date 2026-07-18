import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { computeAndSaveXpForUser } from '../services/xp.service'

// Returns the Monday of the last *completed* week, regardless of which day this runs.
const getLastCompletedWeekStart = (): string => {
  const now = new Date()
  const dayOfWeek = now.getUTCDay() // 0=Sun, 1=Mon … 6=Sat
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const thisMonday = new Date(now)
  thisMonday.setUTCDate(now.getUTCDate() - daysToMonday - 7)
  thisMonday.setUTCHours(0, 0, 0, 0)
  return thisMonday.toISOString().slice(0, 10)
}

const runWeeklyXpCron = async (): Promise<void> => {
  const client = createClient(
    process.env['SUPABASE_URL'] ?? '',
    process.env['SUPABASE_SECRET_KEY'] ?? '',
  )

  const weekStart = getLastCompletedWeekStart()
  console.log(`[cron:xp] Démarrage — semaine ${weekStart}`)

  const { data: rows, error } = await client
    .from('health_data_raw')
    .select('user_id')
    .eq('week_start', weekStart)

  if (error) throw error

  const userIds = [
    ...new Set((rows ?? []).map((r: { user_id: string }) => r.user_id)),
  ]
  console.log(`[cron:xp] ${userIds.length} utilisateur(s) actif(s) trouvé(s)`)

  const success: string[] = []
  const failed: Array<{ userId: string; error: string }> = []

  for (const userId of userIds) {
    try {
      await computeAndSaveXpForUser(userId, weekStart, client)
      success.push(userId)
    } catch (err) {
      failed.push({ userId, error: err instanceof Error ? err.message : String(err) })
    }
  }

  console.log(`[cron:xp] Terminé — semaine ${weekStart}`)
  console.log(`Succès: ${success.length}, Échecs: ${failed.length}`)
  if (failed.length > 0) {
    console.log('Détail des échecs:', JSON.stringify(failed, null, 2))
  }
}

runWeeklyXpCron().catch((err: unknown) => {
  console.error('[cron:xp] Erreur fatale:', err)
  process.exit(1)
})
