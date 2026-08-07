import type { Node, Edge } from '@xyflow/react'
import { INITIAL_NODES, INITIAL_EDGES, getSlotPosition } from '@/types/game'

const SERVICE_NODES: Node[] = [
  {
    id: 'ans-waf', type: 'serviceNode', parentId: 'public-subnet', extent: 'parent',
    position: getSlotPosition(0), draggable: false,
    data: { serviceType: 'waf', label: 'WAF', iconSrc: '/aws-icons/waf.svg', tooltip: 'Web Application Firewall', slotIndex: 0 },
  },
  {
    id: 'ans-cognito', type: 'serviceNode', parentId: 'public-subnet', extent: 'parent',
    position: getSlotPosition(1), draggable: false,
    data: { serviceType: 'cognito', label: 'Cognito', iconSrc: '/aws-icons/cognito.svg', tooltip: 'Managed user authentication', slotIndex: 1 },
  },
  {
    id: 'ans-apigw', type: 'serviceNode', parentId: 'public-subnet', extent: 'parent',
    position: getSlotPosition(2), draggable: false,
    data: { serviceType: 'api-gateway', label: 'API Gateway', iconSrc: '/aws-icons/api-gateway.svg', tooltip: 'Managed API entry point', slotIndex: 2 },
  },
  {
    id: 'ans-lambda-handler', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(0), draggable: false,
    data: { serviceType: 'lambda', label: 'Lambda', iconSrc: '/aws-icons/lambda.svg', tooltip: 'Request handler function', slotIndex: 0 },
  },
  {
    id: 'ans-sqs', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(1), draggable: false,
    data: { serviceType: 'sqs', label: 'SQS', iconSrc: '/aws-icons/sqs.svg', tooltip: 'Message queue', slotIndex: 1 },
  },
  {
    id: 'ans-lambda-worker', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(2), draggable: false,
    data: { serviceType: 'lambda', label: 'Lambda', iconSrc: '/aws-icons/lambda.svg', tooltip: 'Async worker function', slotIndex: 2 },
  },
  {
    id: 'ans-dynamodb', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(3), draggable: false,
    data: { serviceType: 'dynamodb', label: 'DynamoDB', iconSrc: '/aws-icons/dynamodb.svg', tooltip: 'NoSQL database', slotIndex: 3 },
  },
]

const SERVICE_EDGES: Edge[] = [
  { id: 'igw-to-ans-waf', source: 'igw', target: 'ans-waf', type: 'trafficEdge' },
  { id: 'ans-waf-to-ans-cognito', source: 'ans-waf', target: 'ans-cognito', type: 'trafficEdge' },
  { id: 'ans-cognito-to-ans-apigw', source: 'ans-cognito', target: 'ans-apigw', type: 'trafficEdge' },
  { id: 'ans-apigw-to-ans-lambda-handler', source: 'ans-apigw', target: 'ans-lambda-handler', type: 'trafficEdge' },
  { id: 'ans-lambda-handler-to-ans-sqs', source: 'ans-lambda-handler', target: 'ans-sqs', type: 'trafficEdge' },
  { id: 'ans-sqs-to-ans-lambda-worker', source: 'ans-sqs', target: 'ans-lambda-worker', type: 'trafficEdge' },
  { id: 'ans-lambda-handler-to-ans-dynamodb', source: 'ans-lambda-handler', target: 'ans-dynamodb', type: 'trafficEdge' },
]

export const ANSWER_NODES: Node[] = [
  ...INITIAL_NODES.map(n => {
    if (n.id === 'public-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 0: 'ans-waf', 1: 'ans-cognito', 2: 'ans-apigw' } } }
    }
    if (n.id === 'private-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 0: 'ans-lambda-handler', 1: 'ans-sqs', 2: 'ans-lambda-worker', 3: 'ans-dynamodb' } } }
    }
    return n
  }),
  ...SERVICE_NODES,
]

export const ANSWER_EDGES: Edge[] = [...INITIAL_EDGES, ...SERVICE_EDGES]
