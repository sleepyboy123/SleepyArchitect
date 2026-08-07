import { describe, it, expect } from 'vitest'
import type { Node, Edge } from '@xyflow/react'
import { tickets } from './tickets'

const BASE_NODES: Node[] = [
  { id: 'igw', type: 'igwNode', position: { x: 0, y: 0 }, data: {} },
  { id: 'public-subnet', type: 'subnetNode', position: { x: 0, y: 0 }, data: { subnetType: 'public', label: 'Public', occupiedSlots: {} } },
  { id: 'private-subnet', type: 'subnetNode', position: { x: 0, y: 0 }, data: { subnetType: 'private', label: 'Private', occupiedSlots: {} } },
]

function makeService(id: string, serviceType: string, subnetId = 'public-subnet'): Node {
  return {
    id,
    type: 'serviceNode',
    parentId: subnetId,
    position: { x: 0, y: 0 },
    data: { serviceType, label: serviceType, iconSrc: '', tooltip: '', slotIndex: 0 },
  }
}

function edge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target }
}

describe('ticket 1 - api-online', () => {
  const ticket = tickets[0]

  it('fails when no api-gateway is present', () => {
    const nodes = [...BASE_NODES, makeService('lambda1', 'lambda', 'private-subnet')]
    expect(ticket.validate(nodes, [edge('igw', 'lambda1')])).toBe(false)
  })

  it('fails when api-gateway is not reachable from IGW', () => {
    const nodes = [
      ...BASE_NODES,
      makeService('apigw', 'api-gateway', 'public-subnet'),
      makeService('lambda1', 'lambda', 'private-subnet'),
    ]
    expect(ticket.validate(nodes, [edge('apigw', 'lambda1')])).toBe(false)
  })

  it('passes when api-gateway is reachable from IGW and connected to a lambda', () => {
    const nodes = [
      ...BASE_NODES,
      makeService('apigw', 'api-gateway', 'public-subnet'),
      makeService('lambda1', 'lambda', 'private-subnet'),
    ]
    expect(ticket.validate(nodes, [edge('igw', 'apigw'), edge('apigw', 'lambda1')])).toBe(true)
  })
})

describe('ticket 4 - async-processing', () => {
  const ticket = tickets[3]

  const fullSetup = (extraNodes: Node[], extraEdges: Edge[]) => {
    const nodes = [
      ...BASE_NODES,
      makeService('cognito1', 'cognito', 'public-subnet'),
      makeService('apigw', 'api-gateway', 'public-subnet'),
      makeService('dynamodb1', 'dynamodb', 'private-subnet'),
      ...extraNodes,
    ]
    const baseEdges = [
      edge('igw', 'cognito1'), edge('cognito1', 'apigw'),
    ]
    return ticket.validate(nodes, [...baseEdges, ...extraEdges])
  }

  it('fails when handler exists but no worker connected from SQS', () => {
    const result = fullSetup(
      [
        makeService('lambda1', 'lambda-handler', 'private-subnet'),
        makeService('sqs1', 'sqs', 'private-subnet'),
        makeService('lambda2', 'lambda-worker', 'private-subnet'),
      ],
      [
        edge('apigw', 'lambda1'),
        edge('lambda1', 'sqs1'),
        edge('lambda1', 'dynamodb1'),
      ],
    )
    expect(result).toBe(false)
  })

  it('fails with only a handler lambda and no worker', () => {
    const result = fullSetup(
      [makeService('lambda1', 'lambda-handler', 'private-subnet'), makeService('sqs1', 'sqs', 'private-subnet')],
      [edge('apigw', 'lambda1'), edge('lambda1', 'sqs1'), edge('lambda1', 'dynamodb1')],
    )
    expect(result).toBe(false)
  })

  it('passes with handler lambda sending to SQS and worker lambda receiving from SQS', () => {
    const result = fullSetup(
      [
        makeService('lambda1', 'lambda-handler', 'private-subnet'),
        makeService('sqs1', 'sqs', 'private-subnet'),
        makeService('lambda2', 'lambda-worker', 'private-subnet'),
      ],
      [
        edge('apigw', 'lambda1'),
        edge('lambda1', 'sqs1'),
        edge('sqs1', 'lambda2'),
        edge('lambda1', 'dynamodb1'),
      ],
    )
    expect(result).toBe(true)
  })
})
