import type { Node, Edge } from '@xyflow/react'
import { INITIAL_NODES, INITIAL_EDGES, getSlotPosition } from '@/types/game'

const SERVICE_NODES: Node[] = [
  {
    id: 'ans-s3', type: 'serviceNode', parentId: 'public-subnet', extent: 'parent',
    position: getSlotPosition(2), draggable: false,
    data: { serviceType: 's3', label: 'S3', iconSrc: '/aws-icons/s3.svg', tooltip: 'Landing zone for raw sparkling water sales CSVs', slotIndex: 2 },
  },
  {
    id: 'ans-glue-crawler', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(0), draggable: false,
    data: { serviceType: 'glue-crawler', label: 'Glue Crawler', iconSrc: '/aws-icons/glue-crawler.svg', tooltip: 'Discovers schema of raw sales data in S3', slotIndex: 0 },
  },
  {
    id: 'ans-glue-job', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(1), draggable: false,
    data: { serviceType: 'glue-job', label: 'Glue Job', iconSrc: '/aws-icons/glue-job.svg', tooltip: 'Cleans and transforms raw CSV data for analysis', slotIndex: 1 },
  },
  {
    id: 'ans-athena', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(2), draggable: false,
    data: { serviceType: 'athena', label: 'Athena', iconSrc: '/aws-icons/athena.svg', tooltip: 'SQL query engine over the S3 data lake', slotIndex: 2 },
  },
  {
    id: 'ans-quicksight', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(3), draggable: false,
    data: { serviceType: 'quicksight', label: 'QuickSight', iconSrc: '/aws-icons/quicksight.svg', tooltip: 'Dashboards for the board meeting', slotIndex: 3 },
  },
  {
    id: 'ans-eventbridge', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(4), draggable: false,
    data: { serviceType: 'eventbridge', label: 'EventBridge', iconSrc: '/aws-icons/eventbridge.svg', tooltip: 'Scheduled trigger for the Glue ETL pipeline', slotIndex: 4 },
  },
]

const SERVICE_EDGES: Edge[] = [
  { id: 'igw-to-ans-s3', source: 'igw', target: 'ans-s3', targetHandle: 'left', type: 'trafficEdge' },
  { id: 'ans-s3-to-ans-glue-crawler', source: 'ans-s3', sourceHandle: 'bottom', target: 'ans-glue-crawler', targetHandle: 'top', type: 'trafficEdge' },
  { id: 'ans-glue-crawler-to-ans-glue-job', source: 'ans-glue-crawler', sourceHandle: 'right', target: 'ans-glue-job', targetHandle: 'left', type: 'trafficEdge' },
  { id: 'ans-s3-to-ans-athena', source: 'ans-s3', sourceHandle: 'bottom', target: 'ans-athena', targetHandle: 'top', type: 'trafficEdge' },
  { id: 'ans-athena-to-ans-quicksight', source: 'ans-athena', sourceHandle: 'right', target: 'ans-quicksight', targetHandle: 'left', type: 'trafficEdge' },
  { id: 'ans-eventbridge-to-ans-glue-job', source: 'ans-eventbridge', sourceHandle: 'left', target: 'ans-glue-job', targetHandle: 'right', type: 'trafficEdge' },
]

export const ANSWER_NODES: Node[] = [
  ...INITIAL_NODES.map(n => {
    if (n.id === 'public-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 2: 'ans-s3' } } }
    }
    if (n.id === 'private-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 0: 'ans-glue-crawler', 1: 'ans-glue-job', 2: 'ans-athena', 3: 'ans-quicksight', 4: 'ans-eventbridge' } } }
    }
    return n
  }),
  ...SERVICE_NODES,
]

export const ANSWER_EDGES: Edge[] = [...INITIAL_EDGES, ...SERVICE_EDGES]
