import type { ZoneId } from '../sim/state'

export interface ZoneDef {
  id: ZoneId
  name: string
  description: string
  /** Enemy ids, rolled uniformly on each spawn. */
  enemies: string[]
  /** Minimum combat level (mean of the four combat skills) to deploy. */
  levelRequired: number
}

export const ZONES: readonly ZoneDef[] = [
  {
    id: 'rustbelt',
    name: 'The Rustbelt',
    description:
      'The industrial ring, where the machines outlasted everyone who built them. Most are still working.',
    enemies: ['scrap_crawler', 'sentry_drone', 'reclaimer', 'overseer'],
    levelRequired: 1,
  },
] as const

const byId = new Map(ZONES.map((z) => [z.id, z]))

export function getZone(id: ZoneId): ZoneDef | undefined {
  return byId.get(id)
}
