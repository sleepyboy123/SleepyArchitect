import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '@/store/useGameStore'
import type { ServiceType } from '@/types/game'

const makeServiceNode = (id: string, serviceType: ServiceType = 'waf') => ({
  id,
  type: 'serviceNode' as const,
  position: { x: 0, y: 0 },
  parentId: 'public-subnet',
  extent: 'parent' as const,
  data: { serviceType, label: 'WAF', iconSrc: '/aws-icons/waf.svg', tooltip: 'WAF', slotIndex: 0 },
})

describe('useGameStore', () => {
  beforeEach(() => {
    useGameStore.setState({
      nodes: [],
      edges: [],
    })
  })

  it('addServiceNode inserts a node into state', () => {
    const node = makeServiceNode('n1')
    useGameStore.getState().addServiceNode(node)
    expect(useGameStore.getState().nodes).toHaveLength(1)
    expect(useGameStore.getState().nodes[0].id).toBe('n1')
  })

  it('removeNode deletes the node and all connected edges', () => {
    const node = makeServiceNode('n1')
    useGameStore.setState({
      nodes: [node],
      edges: [
        { id: 'e1', source: 'n1', target: 'igw' },
        { id: 'e2', source: 'igw', target: 'n1' },
        { id: 'e3', source: 'igw', target: 'internet' },
      ],
    })
    useGameStore.getState().removeNode('n1')
    expect(useGameStore.getState().nodes).toHaveLength(0)
    expect(useGameStore.getState().edges).toHaveLength(1)
    expect(useGameStore.getState().edges[0].id).toBe('e3')
  })

  it('splitEdge replaces one edge with two routed through a new node', () => {
    useGameStore.setState({
      nodes: [],
      edges: [{ id: 'e1', source: 'igw', target: 'ec2-1' }],
    })
    useGameStore.getState().splitEdge('e1', 'waf-1')
    const { edges } = useGameStore.getState()
    expect(edges.find(e => e.id === 'e1')).toBeUndefined()
    expect(edges.find(e => e.source === 'igw' && e.target === 'waf-1')).toBeDefined()
    expect(edges.find(e => e.source === 'waf-1' && e.target === 'ec2-1')).toBeDefined()
  })
})
