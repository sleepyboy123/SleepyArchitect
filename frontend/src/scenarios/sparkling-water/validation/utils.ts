import type { Node, Edge } from '@xyflow/react'
import type { ServiceNodeData, ServiceType } from '@/types/game'

export function getNodesOfType(nodes: Node[], ...types: ServiceType[]): Node[] {
  return nodes.filter(
    n => n.type === 'serviceNode' && types.includes((n.data as ServiceNodeData).serviceType)
  )
}

export function getNodesInSubnet(nodes: Node[], subnetId: string): Node[] {
  return nodes.filter(n => n.type === 'serviceNode' && n.parentId === subnetId)
}

export function hasEdgeBetween(edges: Edge[], idA: string, idB: string): boolean {
  return edges.some(
    e => (e.source === idA && e.target === idB) || (e.source === idB && e.target === idA)
  )
}

export function hasPathBetween(_nodes: Node[], edges: Edge[], sourceId: string, targetId: string): boolean {
  if (sourceId === targetId) return true
  const visited = new Set<string>()
  const queue = [sourceId]
  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === targetId) return true
    if (visited.has(current)) continue
    visited.add(current)
    for (const e of edges) {
      if (e.source === current && !visited.has(e.target)) queue.push(e.target)
      if (e.target === current && !visited.has(e.source)) queue.push(e.source)
    }
  }
  return false
}

export function isReachableFromIgw(nodes: Node[], edges: Edge[], targetId: string): boolean {
  return hasPathBetween(nodes, edges, 'igw', targetId)
}
