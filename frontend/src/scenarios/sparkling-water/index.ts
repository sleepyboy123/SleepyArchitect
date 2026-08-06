import type { ScenarioDefinition } from '@/types/scenario'
import { tickets } from './tickets'
import { ANSWER_NODES, ANSWER_EDGES } from './answer'

export const sparklingWater: ScenarioDefinition = {
  id: 'sparkling-water',
  title: 'The Sparkling Water Co.',
  description: 'Help bossman get his sparkling water empire online, one ticket at a time.',
  tickets,
  answerNodes: ANSWER_NODES,
  answerEdges: ANSWER_EDGES,
}
