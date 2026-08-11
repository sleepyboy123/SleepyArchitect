import type { Node, Edge } from '@xyflow/react'
import type { CSSProperties } from 'react'

export type ServiceType =
  | 'frontend-ec2'
  | 'backend-ec2'
  | 'frontend-ecs'
  | 'backend-ecs'
  | 'asg'
  | 'waf'
  | 'nat'
  | 'rds'
  | 'alb'
  | 'api-gateway'
  | 'lambda'
  | 'lambda-handler'
  | 'lambda-worker'
  | 'dynamodb'
  | 'sqs'
  | 'sagemaker'
  | 'cognito'
  | 'kinesis-data-streams'
  | 'kinesis-firehose'
  | 'lambda-processor'
  | 's3'
  | 'cloudwatch'
  | 'cloudfront'

export interface HandleConfig {
  type: 'source' | 'target'
  position: 'Top' | 'Bottom' | 'Left' | 'Right'
  id?: string
  style?: CSSProperties
  colorClass?: string
}

export interface SidebarItem {
  serviceType: ServiceType
  label: string
  iconSrc: string
  tooltip: string
  extraHandles?: HandleConfig[]
}

export interface ServiceNodeData extends Record<string, unknown> {
  serviceType: ServiceType
  label: string
  iconSrc: string
  tooltip: string
  slotIndex: number
  extraHandles?: HandleConfig[]
}

export interface SubnetNodeData extends Record<string, unknown> {
  subnetType: 'public' | 'private'
  label: string
  occupiedSlots: Record<number, string>
}

export interface VpcNodeData extends Record<string, unknown> {
  label: string
}

export interface TrafficAnimationConfig {
  bubbleCount?: number
  bubbleColor?: string
  bubbleSpeed?: number
}

export type AppNode = Node<ServiceNodeData, 'serviceNode'>
  | Node<SubnetNodeData, 'subnetNode'>
  | Node<VpcNodeData, 'vpcNode'>
  | Node<Record<string, unknown>, 'internetNode'>
  | Node<Record<string, unknown>, 'igwNode'>

export type AppEdge = Edge

// Fixed canvas position for CloudFront - floats outside the VPC in the gap between the Internet node and internet-vpc
export const CLOUDFRONT_SNAP_POSITION = { x: 135, y: 268 }

// Slot grid constants
export const SLOTS_PER_ROW = 7
export const SLOT_WIDTH = 92
export const SLOT_HEIGHT = 104
export const SLOT_START_X = 24
export const SLOT_START_Y = 52

export function getSlotPosition(slotIndex: number): { x: number; y: number } {
  const col = slotIndex % SLOTS_PER_ROW
  const row = Math.floor(slotIndex / SLOTS_PER_ROW)
  return {
    x: SLOT_START_X + col * SLOT_WIDTH,
    y: SLOT_START_Y + row * SLOT_HEIGHT,
  }
}

// --- Initial canvas layout ---
// These live here so the Zustand store can use them as its initial state,
// avoiding the useEffect timing problem (fitView fires before nodes exist).

export const SUBNET_BOTTOM_PAD = 20
export const SUBNET_WIDTH = SLOT_START_X * 2 + SLOTS_PER_ROW * SLOT_WIDTH
export const SUBNET_HEIGHT = SLOT_START_Y + 2 * SLOT_HEIGHT + SUBNET_BOTTOM_PAD
const APP_VPC_WIDTH = SUBNET_WIDTH + 60
const APP_VPC_HEIGHT = SUBNET_HEIGHT * 2 + 130

export const INITIAL_NODES: Node[] = [
  { id: 'internet', type: 'internetNode', position: { x: 40, y: 300 }, data: {}, draggable: false, deletable: false, selectable: false },
  { id: 'internet-vpc', type: 'vpcNode', position: { x: 220, y: 200 }, data: { label: 'Internet VPC' }, draggable: false, deletable: false, selectable: false, style: { width: 200, height: 180 } },
  { id: 'igw', type: 'igwNode', position: { x: 60, y: 55 }, parentId: 'internet-vpc', extent: 'parent', data: {}, draggable: false, deletable: false, selectable: false },
  { id: 'app-vpc', type: 'vpcNode', position: { x: 490, y: 80 }, data: { label: 'Application VPC' }, draggable: false, deletable: false, selectable: false, style: { width: APP_VPC_WIDTH, height: APP_VPC_HEIGHT } },
  { id: 'public-subnet', type: 'subnetNode', position: { x: 30, y: 60 }, parentId: 'app-vpc', extent: 'parent', data: { subnetType: 'public', label: 'Public Subnet', occupiedSlots: {} }, draggable: false, deletable: false, selectable: false },
  { id: 'private-subnet', type: 'subnetNode', position: { x: 30, y: SUBNET_HEIGHT + 100 }, parentId: 'app-vpc', extent: 'parent', data: { subnetType: 'private', label: 'Private Subnet', occupiedSlots: {} }, draggable: false, deletable: false, selectable: false },
]

export const INITIAL_EDGES: Edge[] = [
  { id: 'internet-to-igw', source: 'internet', target: 'igw', type: 'trafficEdge' },
  { id: 'igw-to-public-subnet', source: 'igw', target: 'public-subnet', type: 'trafficEdge' },
]
