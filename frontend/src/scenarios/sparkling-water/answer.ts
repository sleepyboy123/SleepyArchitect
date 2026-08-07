import type { Node, Edge } from '@xyflow/react'
import { INITIAL_NODES, INITIAL_EDGES, getSlotPosition } from '@/types/game'

// Layout (7 cols per row):
// Public  row 0: [WAF=0] [ALB=1] [ASG=2] [Frontend ECS=3] ...
// Private row 0: ....... ....... [Backend ECS=2] [RDS=3] ...
// ASG sends one edge right to Frontend ECS, one edge straight down to Backend ECS — no crossings.

const SERVICE_NODES: Node[] = [
  {
    id: 'ans-waf', type: 'serviceNode', parentId: 'public-subnet', extent: 'parent',
    position: getSlotPosition(0), draggable: false,
    data: { serviceType: 'waf', label: 'WAF', iconSrc: '/aws-icons/waf.svg', tooltip: 'Web Application Firewall', slotIndex: 0 },
  },
  {
    id: 'ans-alb', type: 'serviceNode', parentId: 'public-subnet', extent: 'parent',
    position: getSlotPosition(1), draggable: false,
    data: { serviceType: 'alb', label: 'ALB', iconSrc: '/aws-icons/alb.svg', tooltip: 'Application Load Balancer', slotIndex: 1 },
  },
  {
    id: 'ans-asg', type: 'serviceNode', parentId: 'public-subnet', extent: 'parent',
    position: getSlotPosition(2), draggable: false,
    data: { serviceType: 'asg', label: 'ASG', iconSrc: '/aws-icons/asg.svg', tooltip: 'Auto Scaling Group', slotIndex: 2 },
  },
  {
    id: 'ans-frontend', type: 'serviceNode', parentId: 'public-subnet', extent: 'parent',
    position: getSlotPosition(3), draggable: false,
    data: { serviceType: 'frontend-ecs', label: 'Frontend ECS', iconSrc: '/aws-icons/ecs.svg', tooltip: 'Frontend container', slotIndex: 3 },
  },
  {
    // col 2, row 0 — directly below ASG
    id: 'ans-backend', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(2), draggable: false,
    data: { serviceType: 'backend-ecs', label: 'Backend ECS', iconSrc: '/aws-icons/ecs.svg', tooltip: 'Backend container', slotIndex: 2 },
  },
  {
    id: 'ans-rds', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(3), draggable: false,
    data: { serviceType: 'rds', label: 'RDS', iconSrc: '/aws-icons/rds.svg', tooltip: 'Managed database', slotIndex: 3 },
  },
]

const SERVICE_EDGES: Edge[] = [
  // IGW → WAF
  { id: 'igw-to-ans-waf', source: 'igw', target: 'ans-waf', targetHandle: 'left', type: 'trafficEdge' },
  // Horizontal chain across public subnet
  { id: 'ans-waf-to-ans-alb', source: 'ans-waf', sourceHandle: 'right', target: 'ans-alb', targetHandle: 'left', type: 'trafficEdge' },
  { id: 'ans-alb-to-ans-asg', source: 'ans-alb', sourceHandle: 'right', target: 'ans-asg', targetHandle: 'left', type: 'trafficEdge' },
  // ASG → Frontend ECS (right, same row)
  { id: 'ans-asg-to-ans-frontend', source: 'ans-asg', sourceHandle: 'right', target: 'ans-frontend', targetHandle: 'left', type: 'trafficEdge' },
  // ASG drops straight down to Backend ECS (same column, no crossing)
  { id: 'ans-asg-to-ans-backend', source: 'ans-asg', sourceHandle: 'bottom', target: 'ans-backend', targetHandle: 'top', type: 'trafficEdge' },
  // Backend ECS → RDS (right, same row)
  { id: 'ans-backend-to-ans-rds', source: 'ans-backend', sourceHandle: 'right', target: 'ans-rds', targetHandle: 'left', type: 'trafficEdge' },
]

export const ANSWER_NODES: Node[] = [
  ...INITIAL_NODES.map(n => {
    if (n.id === 'public-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 0: 'ans-waf', 1: 'ans-alb', 2: 'ans-asg', 3: 'ans-frontend' } } }
    }
    if (n.id === 'private-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 2: 'ans-backend', 3: 'ans-rds' } } }
    }
    return n
  }),
  ...SERVICE_NODES,
]

export const ANSWER_EDGES: Edge[] = [...INITIAL_EDGES, ...SERVICE_EDGES]
