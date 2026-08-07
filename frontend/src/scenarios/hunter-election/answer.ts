import type { Node, Edge } from '@xyflow/react'
import { INITIAL_NODES, INITIAL_EDGES, getSlotPosition } from '@/types/game'

// Layout (7 cols per row):
// Public  row 0: ........ [KDS=1] ...........  ............  ...........
// Private row 0: [DDB=0] [Lambda=1] [CW=2]   [Firehose=3]  [S3=4]
//
// IGW → KDS left (horizontal)
// KDS right → Firehose top (curves right-and-down across subnet boundary)
// KDS bottom → Lambda top (straight down, same col)
// KDS bottom → CloudWatch top (slight right-and-down)
// Lambda left → DynamoDB right (leftward arrow)
// Firehose right → S3 left (horizontal)

const SERVICE_NODES: Node[] = [
  {
    id: 'ans-kds', type: 'serviceNode', parentId: 'public-subnet', extent: 'parent',
    position: getSlotPosition(1), draggable: false,
    data: { serviceType: 'kinesis-data-streams', label: 'Kinesis Data Streams', iconSrc: '/aws-icons/kinesis-data-streams.svg', tooltip: 'Managed real-time data stream', slotIndex: 1 },
  },
  {
    // col 0, row 0 — to the left of Lambda, receives Lambda's left→right edge
    id: 'ans-dynamodb', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(0), draggable: false,
    data: { serviceType: 'dynamodb', label: 'DynamoDB', iconSrc: '/aws-icons/dynamodb.svg', tooltip: 'Real-time counter storage', slotIndex: 0 },
  },
  {
    // col 1, row 0 — directly below KDS
    id: 'ans-lambda', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(1), draggable: false,
    data: { serviceType: 'lambda-processor', label: 'Lambda Processor', iconSrc: '/aws-icons/lambda.svg', tooltip: 'Stream consumer and processor', slotIndex: 1 },
  },
  {
    id: 'ans-cloudwatch', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(2), draggable: false,
    data: { serviceType: 'cloudwatch', label: 'CloudWatch', iconSrc: '/aws-icons/cloudwatch.svg', tooltip: 'Stream and Lambda monitoring', slotIndex: 2 },
  },
  {
    id: 'ans-firehose', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(3), draggable: false,
    data: { serviceType: 'kinesis-firehose', label: 'Data Firehose', iconSrc: '/aws-icons/firehose.svg', tooltip: 'Managed delivery stream to S3', slotIndex: 3 },
  },
  {
    id: 'ans-s3', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(4), draggable: false,
    data: { serviceType: 's3', label: 'S3', iconSrc: '/aws-icons/s3.svg', tooltip: 'Data lake for archived events', slotIndex: 4 },
  },
]

const SERVICE_EDGES: Edge[] = [
  // IGW → KDS left entry point
  { id: 'igw-to-ans-kds', source: 'igw', target: 'ans-kds', targetHandle: 'left', type: 'trafficEdge' },
  // KDS right → Firehose top (curves right-and-down across subnet boundary)
  { id: 'ans-kds-to-ans-firehose', source: 'ans-kds', sourceHandle: 'right', target: 'ans-firehose', targetHandle: 'top', type: 'trafficEdge' },
  // Firehose right → S3 left (clean horizontal)
  { id: 'ans-firehose-to-ans-s3', source: 'ans-firehose', sourceHandle: 'right', target: 'ans-s3', targetHandle: 'left', type: 'trafficEdge' },
  // KDS bottom → Lambda top (straight down, same column)
  { id: 'ans-kds-to-ans-lambda', source: 'ans-kds', sourceHandle: 'bottom', target: 'ans-lambda', targetHandle: 'top', type: 'trafficEdge' },
  // KDS bottom → CloudWatch top (slight right-and-down)
  { id: 'ans-kds-to-ans-cloudwatch', source: 'ans-kds', sourceHandle: 'bottom', target: 'ans-cloudwatch', targetHandle: 'top', type: 'trafficEdge' },
  // Lambda left → DynamoDB right (rightward arrow going leftward)
  { id: 'ans-lambda-to-ans-dynamodb', source: 'ans-lambda', sourceHandle: 'left', target: 'ans-dynamodb', targetHandle: 'right', type: 'trafficEdge' },
  // CloudWatch bottom → Lambda bottom (bottom-to-bottom arc)
  { id: 'ans-cloudwatch-to-ans-lambda', source: 'ans-cloudwatch', sourceHandle: 'bottom', target: 'ans-lambda', targetHandle: 'bottom', type: 'trafficEdge' },
]

export const ANSWER_NODES: Node[] = [
  ...INITIAL_NODES.map(n => {
    if (n.id === 'public-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 1: 'ans-kds' } } }
    }
    if (n.id === 'private-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 0: 'ans-dynamodb', 1: 'ans-lambda', 2: 'ans-cloudwatch', 3: 'ans-firehose', 4: 'ans-s3' } } }
    }
    return n
  }),
  ...SERVICE_NODES,
]

export const ANSWER_EDGES: Edge[] = [...INITIAL_EDGES, ...SERVICE_EDGES]
