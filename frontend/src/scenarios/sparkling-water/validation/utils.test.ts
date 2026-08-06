import { describe, it, expect } from 'vitest'
import type { Node, Edge } from '@xyflow/react'
import type { ServiceNodeData } from '@/types/game'
import {
  getNodesOfType,
  getNodesInSubnet,
  hasEdgeBetween,
  hasPathBetween,
  isReachableFromIgw,
} from './utils'

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

describe('getNodesOfType', () => {
  it('returns nodes matching a single type', () => {
    const nodes = [svc('a', 'frontend-ec2'), svc('b', 'backend-ec2')]
    expect(getNodesOfType(nodes, 'frontend-ec2').map(n => n.id)).toEqual(['a'])
  })
  it('returns nodes matching multiple types', () => {
    const nodes = [svc('a', 'frontend-ec2'), svc('b', 'frontend-ecs'), svc('c', 'rds')]
    expect(getNodesOfType(nodes, 'frontend-ec2', 'frontend-ecs')).toHaveLength(2)
  })
  it('returns empty array when no match', () => {
    expect(getNodesOfType([svc('a', 'rds')], 'waf')).toHaveLength(0)
  })
})

describe('getNodesInSubnet', () => {
  it('returns only nodes in the specified subnet', () => {
    const nodes = [svc('a', 'frontend-ec2', 'public-subnet'), svc('b', 'backend-ec2', 'private-subnet')]
    expect(getNodesInSubnet(nodes, 'public-subnet').map(n => n.id)).toEqual(['a'])
  })
})

describe('hasEdgeBetween', () => {
  it('returns true for a direct edge source→target', () => {
    expect(hasEdgeBetween([edge('igw', 'fe')], 'igw', 'fe')).toBe(true)
  })
  it('returns true for the reverse direction', () => {
    expect(hasEdgeBetween([edge('igw', 'fe')], 'fe', 'igw')).toBe(true)
  })
  it('returns false when no edge exists', () => {
    expect(hasEdgeBetween([], 'a', 'b')).toBe(false)
  })
})

describe('hasPathBetween', () => {
  it('finds a direct path', () => {
    expect(hasPathBetween([], [edge('a', 'b')], 'a', 'b')).toBe(true)
  })
  it('finds a multi-hop path', () => {
    expect(hasPathBetween([], [edge('a', 'b'), edge('b', 'c')], 'a', 'c')).toBe(true)
  })
  it('returns false when no path exists', () => {
    expect(hasPathBetween([], [edge('a', 'b')], 'a', 'c')).toBe(false)
  })
  it('returns true when source equals target', () => {
    expect(hasPathBetween([], [], 'a', 'a')).toBe(true)
  })
})

describe('isReachableFromIgw', () => {
  it('returns true when target is reachable from igw', () => {
    expect(isReachableFromIgw([], [edge('igw', 'fe')], 'fe')).toBe(true)
  })
  it('returns false when target is not connected', () => {
    expect(isReachableFromIgw([], [], 'fe')).toBe(false)
  })
})
