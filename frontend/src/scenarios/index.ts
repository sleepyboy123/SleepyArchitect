import type { ScenarioDefinition } from '@/types/scenario'
import { sparklingWater } from './sparkling-water'
import { spoodermanApi } from './spooderman-api'

export const ALL_SCENARIOS: Record<string, ScenarioDefinition> = {
  [sparklingWater.id]: sparklingWater,
  [spoodermanApi.id]: spoodermanApi,
}
