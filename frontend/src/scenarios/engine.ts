import type { Node, Edge } from '@xyflow/react'
import type { ValidationResult } from '@/types/scenario'
import { ALL_SCENARIOS } from './index'

export function submitDesign(
  scenarioId: string,
  ticketIndex: number,
  nodes: Node[],
  edges: Edge[],
): ValidationResult {
  if (!Object.hasOwn(ALL_SCENARIOS, scenarioId)) return { passed: false, objectives: [] }
  const scenario = ALL_SCENARIOS[scenarioId]

  for (let i = 0; i <= ticketIndex; i++) {
    if (!scenario.tickets[i].validate(nodes, edges)) {
      const failedTicket = scenario.tickets[i]
      return {
        passed: false,
        objectives: failedTicket.objectives.map(obj => ({ label: obj.label, met: obj.check(nodes, edges) })),
        failedTicketIndex: i < ticketIndex ? i : undefined,
      }
    }
  }

  const current = scenario.tickets[ticketIndex]
  return {
    passed: true,
    objectives: current.objectives.map(obj => ({ label: obj.label, met: obj.check(nodes, edges) })),
  }
}
