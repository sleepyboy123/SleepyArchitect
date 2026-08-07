import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '@/store/useGameStore'
import type { ServiceType } from '@/types/game'
import { INITIAL_NODES, INITIAL_EDGES } from '@/types/game'

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

const mockScenario = (id: string, sidebarServiceTypes: ServiceType[] = []) => ({
  id,
  title: id,
  description: id,
  tickets: [],
  answerNodes: [],
  answerEdges: [],
  sidebarItems: sidebarServiceTypes.map(st => ({
    serviceType: st,
    label: st,
    iconSrc: `/aws-icons/${st}.svg`,
    tooltip: st,
  })),
})

describe('startScenario', () => {
  beforeEach(() => {
    useGameStore.setState({
      currentScenarioId: null,
      currentTicketIndex: 5,
      nodes: [],
      edges: [],
      sidebarItems: [],
    })
  })

  it('sets currentScenarioId', () => {
    useGameStore.getState().startScenario(mockScenario('sparkling-water'))
    expect(useGameStore.getState().currentScenarioId).toBe('sparkling-water')
  })

  it('resets currentTicketIndex to 0', () => {
    useGameStore.getState().startScenario(mockScenario('sparkling-water'))
    expect(useGameStore.getState().currentTicketIndex).toBe(0)
  })

  it('resets the board to initial nodes and edges', () => {
    useGameStore.getState().startScenario(mockScenario('sparkling-water'))
    const state = useGameStore.getState()
    expect(state.nodes).toEqual(INITIAL_NODES)
    expect(state.edges).toEqual(INITIAL_EDGES)
  })

  it('sets sidebarItems from the scenario definition', () => {
    useGameStore.getState().startScenario(mockScenario('sparkling-water', ['waf', 'rds']))
    expect(useGameStore.getState().sidebarItems).toHaveLength(2)
    expect(useGameStore.getState().sidebarItems[0].serviceType).toBe('waf')
  })

  it('replaces existing sidebarItems when switching scenarios', () => {
    useGameStore.setState({ sidebarItems: [{ serviceType: 'alb', label: 'ALB', iconSrc: '/aws-icons/alb.svg', tooltip: 'ALB' }] })
    useGameStore.getState().startScenario(mockScenario('spooderman-api', ['lambda']))
    expect(useGameStore.getState().sidebarItems).toHaveLength(1)
    expect(useGameStore.getState().sidebarItems[0].serviceType).toBe('lambda')
  })
})

describe('advanceTicket', () => {
  beforeEach(() => {
    useGameStore.setState({ currentTicketIndex: 0 })
  })

  it('increments currentTicketIndex by 1', () => {
    useGameStore.getState().advanceTicket()
    expect(useGameStore.getState().currentTicketIndex).toBe(1)
  })

  it('increments again on repeated calls', () => {
    useGameStore.getState().advanceTicket()
    useGameStore.getState().advanceTicket()
    expect(useGameStore.getState().currentTicketIndex).toBe(2)
  })
})

