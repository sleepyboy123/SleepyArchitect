import { describe, it, expect } from 'vitest'
import { submitDesign } from './engine'
import type { Node, Edge } from '@xyflow/react'
import type { ServiceNodeData } from '@/types/game'

function svc(id: string, serviceType: string, parentId?: string): Node {
  return {
    id,
    type: 'serviceNode',
    position: { x: 0, y: 0 },
    ...(parentId ? { parentId } : {}),
    data: { serviceType, label: id, iconSrc: '', tooltip: '', slotIndex: 0 } as ServiceNodeData & Record<string, unknown>,
  }
}

function edge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target }
}

describe('submitDesign', () => {
  it('returns passed: false for unknown scenario', () => {
    const result = submitDesign('nonexistent', 0, [], [])
    expect(result.passed).toBe(false)
    expect(result.objectives).toEqual([])
  })

  it('returns failedTicketIndex when a previous ticket regresses', () => {
    // Sparkling-water ticket 0 (host-website) requires a frontend reachable from IGW.
    // Submit ticket 1 (backend-apis) with a backend but no frontend - ticket 0 should fail.
    const nodes = [svc('be', 'backend-ec2', 'private-subnet')]
    const edges = [edge('igw', 'be')]
    const result = submitDesign('sparkling-water', 1, nodes, edges)
    expect(result.passed).toBe(false)
    expect(result.failedTicketIndex).toBe(0)
  })

  it('does not set failedTicketIndex when the current ticket itself fails', () => {
    // Ticket 0 requires a frontend reachable from IGW. Submit with no frontend.
    const result = submitDesign('sparkling-water', 0, [], [])
    expect(result.passed).toBe(false)
    expect(result.failedTicketIndex).toBeUndefined()
  })

  it('returns the failing tickets objectives, not the current tickets', () => {
    // Ticket 0 objectives include "Frontend is in the correct subnet".
    // Submit ticket 1 with no frontend - ticket 0 fails.
    const nodes = [svc('be', 'backend-ec2', 'private-subnet')]
    const edges = [edge('igw', 'be')]
    const result = submitDesign('sparkling-water', 1, nodes, edges)
    expect(result.objectives.some(o => o.label.includes('Frontend is in the correct subnet'))).toBe(true)
    // Ticket 1's objective "Backend is in the private subnet" should NOT appear
    expect(result.objectives.some(o => o.label.includes('Backend is in the private subnet'))).toBe(false)
  })
})
