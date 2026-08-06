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
}

export interface SubnetNodeData extends Record<string, unknown> {
  subnetType: 'public' | 'private'
  label: string
  occupiedSlots: Record<number, string>
}

export interface VpcNodeData extends Record<string, unknown> {
  label: string
}

export type AppNode = Node<ServiceNodeData, 'serviceNode'>
  | Node<SubnetNodeData, 'subnetNode'>
  | Node<VpcNodeData, 'vpcNode'>
  | Node<Record<string, unknown>, 'internetNode'>
  | Node<Record<string, unknown>, 'igwNode'>

export type AppEdge = Edge

// Slot grid constants
export const SLOTS_PER_ROW = 5
export const SLOT_WIDTH = 76
export const SLOT_HEIGHT = 90
export const SLOT_START_X = 20
export const SLOT_START_Y = 50

export function getSlotPosition(slotIndex: number): { x: number; y: number } {
  const col = slotIndex % SLOTS_PER_ROW
  const row = Math.floor(slotIndex / SLOTS_PER_ROW)
  return {
    x: SLOT_START_X + col * SLOT_WIDTH,
    y: SLOT_START_Y + row * SLOT_HEIGHT,
  }
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { serviceType: 'frontend-ec2', label: 'Frontend EC2', iconSrc: '/aws-icons/ec2.svg', tooltip: 'Virtual server hosting the frontend web application' },
  { serviceType: 'backend-ec2', label: 'Backend EC2', iconSrc: '/aws-icons/ec2.svg', tooltip: 'Virtual server hosting the backend API' },
  { serviceType: 'frontend-ecs', label: 'Frontend ECS', iconSrc: '/aws-icons/ecs.svg', tooltip: 'Containerised frontend application managed by ECS' },
  { serviceType: 'backend-ecs', label: 'Backend ECS', iconSrc: '/aws-icons/ecs.svg', tooltip: 'Containerised backend API managed by ECS' },
  { serviceType: 'asg', label: 'Auto Scaling Group', iconSrc: '/aws-icons/asg.svg', tooltip: 'Automatically adjusts compute capacity based on demand', extraHandles: [
    { type: 'source', position: 'Bottom', id: 'to-frontend', style: { left: '30%' }, colorClass: '!bg-primary' },
    { type: 'source', position: 'Bottom', id: 'to-backend', style: { left: '70%' }, colorClass: '!bg-primary' },
  ] },
  { serviceType: 'waf', label: 'WAF', iconSrc: '/aws-icons/waf.svg', tooltip: 'Web Application Firewall - filters and monitors HTTP traffic' },
  { serviceType: 'nat', label: 'NAT Gateway', iconSrc: '/aws-icons/nat.svg', tooltip: 'Enables private subnet resources to reach the internet' },
  { serviceType: 'rds', label: 'RDS', iconSrc: '/aws-icons/rds.svg', tooltip: 'Managed relational database service' },
  { serviceType: 'alb', label: 'ALB', iconSrc: '/aws-icons/alb.svg', tooltip: 'Application Load Balancer - distributes incoming traffic across targets' },
]

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
  { id: 'igw-to-public-subnet', source: 'igw', target: 'public-subnet', type: 'default' },
]
