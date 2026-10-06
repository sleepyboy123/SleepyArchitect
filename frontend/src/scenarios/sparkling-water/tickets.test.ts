import { describe, it, expect } from 'vitest'
import type { Node, Edge } from '@xyflow/react'
import type { ServiceNodeData } from '@/types/game'
import { tickets } from './tickets'

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

const scalingTicket = tickets[3]
const securityTicket = tickets[4]
const cdnTicket = tickets[5]

describe('scaling ticket (index 3)', () => {
  const baseNodes = [
    svc('alb-1', 'alb', 'public-subnet'),
    svc('asg-1', 'asg', 'public-subnet'),
    svc('fe', 'frontend-ecs', 'private-subnet'),
    svc('be', 'backend-ecs', 'private-subnet'),
  ]
  const baseEdges = [
    edge('alb-1', 'asg-1'),
  ]

  it('rejects when ASG connects to only a frontend', () => {
    const edges = [...baseEdges, edge('asg-1', 'fe')]
    expect(scalingTicket.validate(baseNodes, edges)).toBe(false)
  })

  it('rejects when ASG connects to only a backend', () => {
    const edges = [...baseEdges, edge('asg-1', 'be')]
    expect(scalingTicket.validate(baseNodes, edges)).toBe(false)
  })

  it('accepts when ASG connects to both frontend and backend', () => {
    const edges = [...baseEdges, edge('asg-1', 'fe'), edge('asg-1', 'be')]
    expect(scalingTicket.validate(baseNodes, edges)).toBe(true)
  })

  it('accepts EC2 variants for both tiers', () => {
    const ec2Nodes = [
      svc('alb-1', 'alb', 'public-subnet'),
      svc('asg-1', 'asg', 'public-subnet'),
      svc('fe', 'frontend-ec2', 'public-subnet'),
      svc('be', 'backend-ec2', 'private-subnet'),
    ]
    const edges = [...baseEdges, edge('asg-1', 'fe'), edge('asg-1', 'be')]
    expect(scalingTicket.validate(ec2Nodes, edges)).toBe(true)
  })
})

describe('security ticket (index 4)', () => {
  it('rejects WAF that is reachable from IGW but not directly connected', () => {
    const nodes = [svc('waf-1', 'waf', 'public-subnet'), svc('alb-1', 'alb', 'public-subnet')]
    const edges = [edge('igw', 'alb-1'), edge('alb-1', 'waf-1')]
    expect(securityTicket.validate(nodes, edges)).toBe(false)
  })

  it('accepts WAF directly connected to IGW with a downstream connection', () => {
    const nodes = [svc('waf-1', 'waf', 'public-subnet'), svc('alb-1', 'alb', 'public-subnet')]
    const edges = [edge('igw', 'waf-1'), edge('waf-1', 'alb-1')]
    expect(securityTicket.validate(nodes, edges)).toBe(true)
  })
})

describe('cdn ticket (index 5)', () => {
  it('rejects when direct internet-to-igw edge still exists', () => {
    const nodes = [svc('cf', 'cloudfront')]
    const edges = [
      edge('internet', 'igw'),
      edge('internet', 'cf'),
      edge('cf', 'igw'),
    ]
    expect(cdnTicket.validate(nodes, edges)).toBe(false)
  })

  it('accepts when CloudFront intercepts and direct edge is removed', () => {
    const nodes = [svc('cf', 'cloudfront')]
    const edges = [
      edge('internet', 'cf'),
      edge('cf', 'igw'),
    ]
    expect(cdnTicket.validate(nodes, edges)).toBe(true)
  })
})
