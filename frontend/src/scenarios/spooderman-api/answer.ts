import type { Node, Edge } from '@xyflow/react'
import { INITIAL_NODES, INITIAL_EDGES, getSlotPosition } from '@/types/game'

// Layout (7 cols per row):
// Public  row 0: [WAF=0] [Cognito=1] [API GW=2] ...
// Private row 0: ....... ........... [Handler=2] [SQS=3] [Worker=4] [SageMaker=5]
// Private row 1: ....... ........... [DynamoDB=9]
// All horizontal flows use right→left handles; cross-subnet/row drops use bottom→top.

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
    position: getSlotPosition(2), draggable: false,
    data: { serviceType: 'lambda-handler', label: 'Handler Lambda', iconSrc: '/aws-icons/lambda.svg', tooltip: 'Request handler function', slotIndex: 2 },
  },
  {
    id: 'ans-sqs', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(3), draggable: false,
    data: { serviceType: 'sqs', label: 'SQS', iconSrc: '/aws-icons/sqs.svg', tooltip: 'Message queue', slotIndex: 3 },
  },
  {
    id: 'ans-lambda-worker', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(4), draggable: false,
    data: { serviceType: 'lambda-worker', label: 'Worker Lambda', iconSrc: '/aws-icons/lambda.svg', tooltip: 'Async worker function', slotIndex: 4 },
  },
  {
    id: 'ans-sagemaker', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(5), draggable: false,
    data: { serviceType: 'sagemaker', label: 'SageMaker', iconSrc: '/aws-icons/sagemaker.svg', tooltip: 'ML inference endpoint', slotIndex: 5 },
  },
  {
    // slot 9 = col 2, row 1 — directly below Handler Lambda
    id: 'ans-dynamodb', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(9), draggable: false,
    data: { serviceType: 'dynamodb', label: 'DynamoDB', iconSrc: '/aws-icons/dynamodb.svg', tooltip: 'NoSQL database', slotIndex: 9 },
  },
]

const SERVICE_EDGES: Edge[] = [
  // IGW → WAF (IGW only has a right source handle, no id needed on source side)
  { id: 'igw-to-ans-waf', source: 'igw', target: 'ans-waf', targetHandle: 'left', type: 'trafficEdge' },
  // Horizontal chain across public subnet
  { id: 'ans-waf-to-ans-cognito', source: 'ans-waf', sourceHandle: 'right', target: 'ans-cognito', targetHandle: 'left', type: 'trafficEdge' },
  { id: 'ans-cognito-to-ans-apigw', source: 'ans-cognito', sourceHandle: 'right', target: 'ans-apigw', targetHandle: 'left', type: 'trafficEdge' },
  // API GW drops straight down into Handler Lambda (same column)
  { id: 'ans-apigw-to-ans-lambda-handler', source: 'ans-apigw', sourceHandle: 'bottom', target: 'ans-lambda-handler', targetHandle: 'top', type: 'trafficEdge' },
  // Horizontal chain across private subnet row 0
  { id: 'ans-lambda-handler-to-ans-sqs', source: 'ans-lambda-handler', sourceHandle: 'right', target: 'ans-sqs', targetHandle: 'left', type: 'trafficEdge' },
  { id: 'ans-sqs-to-ans-lambda-worker', source: 'ans-sqs', sourceHandle: 'right', target: 'ans-lambda-worker', targetHandle: 'left', type: 'trafficEdge' },
  { id: 'ans-lambda-worker-to-ans-sagemaker', source: 'ans-lambda-worker', sourceHandle: 'right', target: 'ans-sagemaker', targetHandle: 'left', type: 'trafficEdge' },
  // Handler Lambda drops straight down to DynamoDB (same column)
  { id: 'ans-lambda-handler-to-ans-dynamodb', source: 'ans-lambda-handler', sourceHandle: 'bottom', target: 'ans-dynamodb', targetHandle: 'top', type: 'trafficEdge' },
]

export const ANSWER_NODES: Node[] = [
  ...INITIAL_NODES.map(n => {
    if (n.id === 'public-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 0: 'ans-waf', 1: 'ans-cognito', 2: 'ans-apigw' } } }
    }
    if (n.id === 'private-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 2: 'ans-lambda-handler', 3: 'ans-sqs', 4: 'ans-lambda-worker', 5: 'ans-sagemaker', 9: 'ans-dynamodb' } } }
    }
    return n
  }),
  ...SERVICE_NODES,
]

export const ANSWER_EDGES: Edge[] = [...INITIAL_EDGES, ...SERVICE_EDGES]
