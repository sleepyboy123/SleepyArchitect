import type { ScenarioDefinition } from '@/types/scenario'
import { sparklingWater } from './sparkling-water'

export const ALL_SCENARIOS: Record<string, ScenarioDefinition> = {
  [sparklingWater.id]: sparklingWater,
}
