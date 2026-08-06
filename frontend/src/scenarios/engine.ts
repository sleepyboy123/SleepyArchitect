import type { Node, Edge } from '@xyflow/react'
import type { ValidationResult } from '@/types/scenario'
import { ALL_SCENARIOS } from './index'

export function submitDesign(
  scenarioId: string,
  ticketIndex: number,
  nodes: Node[],
  edges: Edge[],
): ValidationResult {
  const scenario = ALL_SCENARIOS[scenarioId]
  if (!scenario) return { passed: false, objectives: [] }

  for (let i = 0; i <= ticketIndex; i++) {
    if (!scenario.tickets[i].validate(nodes, edges)) {
      const current = scenario.tickets[ticketIndex]
      return {
        passed: false,
        objectives: current.objectives.map(obj => ({ label: obj.label, met: obj.check(nodes, edges) })),
      }
    }
  }

  const current = scenario.tickets[ticketIndex]
  return {
    passed: true,
    objectives: current.objectives.map(obj => ({ label: obj.label, met: obj.check(nodes, edges) })),
  }
}
