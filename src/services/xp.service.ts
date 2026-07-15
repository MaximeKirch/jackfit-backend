export const XP_WEIGHTS = {
  consistency:   0.6,
  recovery:      0.4,
  // nécessite une intégration API tierce (Coros/Garmin/TrainingPeaks), hors scope HealthKit par nature. Ne pas retirer cette clé du schéma.
  planAdherence: 0,
} as const

export const XP_CONFIG = {
  maxXpPerWeek: 50,
} as const

export type StageName = 'JEUNE_CHIOT' | 'CHIOT' | 'ADULTE_ACTIF' | 'VÉTÉRAN' | 'ATHLÈTE_ÉLITE'

export const STAGES: ReadonlyArray<{ name: StageName; minXp: number }> = [
  { name: 'JEUNE_CHIOT',   minXp: 0    },
  { name: 'CHIOT',         minXp: 200  },
  { name: 'ADULTE_ACTIF',  minXp: 600  },
  { name: 'VÉTÉRAN',       minXp: 1400 },
  { name: 'ATHLÈTE_ÉLITE', minXp: 3000 },
]

export interface XpRatios {
  consistency:   number // 0-1
  recovery:      number // 0-1
  planAdherence: number // 0-1
}

export interface XpBreakdown {
  consistency:   number
  recovery:      number
  planAdherence: number
}

export interface XpResult {
  xpAwarded: number
  breakdown:  XpBreakdown
}

export const computeWeeklyXp = (ratios: XpRatios): XpResult => {
  const keys = Object.keys(XP_WEIGHTS) as Array<keyof typeof XP_WEIGHTS>

  const breakdown = keys.reduce<XpBreakdown>((acc, key) => {
    acc[key] = Math.round(ratios[key] * XP_CONFIG.maxXpPerWeek * XP_WEIGHTS[key])
    return acc
  }, { consistency: 0, recovery: 0, planAdherence: 0 })

  const xpAwarded = keys.reduce((sum, key) => sum + breakdown[key], 0)

  return { xpAwarded, breakdown }
}

export const stageForXp = (totalXp: number): StageName => {
  const stage = [...STAGES].reverse().find((s) => totalXp >= s.minXp)
  return stage?.name ?? 'JEUNE_CHIOT'
}
