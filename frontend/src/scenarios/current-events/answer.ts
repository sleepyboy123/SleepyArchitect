import type { Node, Edge } from '@xyflow/react'
import { INITIAL_NODES, INITIAL_EDGES, getSlotPosition } from '@/types/game'

const SERVICE_NODES: Node[] = [
  {
    id: 'ans-kds', type: 'serviceNode', parentId: 'public-subnet', extent: 'parent',
    position: getSlotPosition(0), draggable: false,
    data: { serviceType: 'kinesis-data-streams', label: 'Kinesis Data Streams', iconSrc: '/aws-icons/kinesis-data-streams.svg', tooltip: 'Managed real-time data stream', slotIndex: 0 },
  },
  {
    id: 'ans-lambda', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(0), draggable: false,
    data: { serviceType: 'lambda-processor', label: 'Lambda Processor', iconSrc: '/aws-icons/lambda.svg', tooltip: 'Stream consumer and processor', slotIndex: 0 },
  },
  {
    id: 'ans-dynamodb', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(1), draggable: false,
    data: { serviceType: 'dynamodb', label: 'DynamoDB', iconSrc: '/aws-icons/dynamodb.svg', tooltip: 'Real-time counter storage', slotIndex: 1 },
  },
  {
    id: 'ans-firehose', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(2), draggable: false,
    data: { serviceType: 'kinesis-firehose', label: 'Data Firehose', iconSrc: '/aws-icons/firehose.svg', tooltip: 'Managed delivery stream to S3', slotIndex: 2 },
  },
  {
    id: 'ans-s3', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(3), draggable: false,
    data: { serviceType: 's3', label: 'S3', iconSrc: '/aws-icons/s3.svg', tooltip: 'Data lake for archived events', slotIndex: 3 },
  },
  {
    id: 'ans-cloudwatch', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(7), draggable: false,
    data: { serviceType: 'cloudwatch', label: 'CloudWatch', iconSrc: '/aws-icons/cloudwatch.svg', tooltip: 'Stream and Lambda monitoring', slotIndex: 7 },
  },
]

const SERVICE_EDGES: Edge[] = [
  { id: 'igw-to-ans-kds', source: 'igw', target: 'ans-kds', type: 'trafficEdge' },
  { id: 'ans-kds-to-ans-lambda', source: 'ans-kds', target: 'ans-lambda', type: 'trafficEdge' },
  { id: 'ans-kds-to-ans-firehose', source: 'ans-kds', target: 'ans-firehose', type: 'trafficEdge' },
  { id: 'ans-lambda-to-ans-dynamodb', source: 'ans-lambda', target: 'ans-dynamodb', type: 'trafficEdge' },
  { id: 'ans-firehose-to-ans-s3', source: 'ans-firehose', target: 'ans-s3', type: 'trafficEdge' },
  { id: 'ans-kds-to-ans-cloudwatch', source: 'ans-kds', target: 'ans-cloudwatch', type: 'trafficEdge' },
  { id: 'ans-lambda-to-ans-cloudwatch', source: 'ans-lambda', target: 'ans-cloudwatch', type: 'trafficEdge' },
]

export const ANSWER_NODES: Node[] = [
  ...INITIAL_NODES.map(n => {
    if (n.id === 'public-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 0: 'ans-kds' } } }
    }
    if (n.id === 'private-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 0: 'ans-lambda', 1: 'ans-dynamodb', 2: 'ans-firehose', 3: 'ans-s3', 7: 'ans-cloudwatch' } } }
    }
    return n
  }),
  ...SERVICE_NODES,
]

export const ANSWER_EDGES: Edge[] = [...INITIAL_EDGES, ...SERVICE_EDGES]
