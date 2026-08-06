import type { Node, Edge } from '@xyflow/react'
import { INITIAL_NODES, INITIAL_EDGES, getSlotPosition } from '@/types/game'

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
    id: 'ans-backend', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(0), draggable: false,
    data: { serviceType: 'backend-ecs', label: 'Backend ECS', iconSrc: '/aws-icons/ecs.svg', tooltip: 'Backend container', slotIndex: 0 },
  },
  {
    id: 'ans-rds', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(1), draggable: false,
    data: { serviceType: 'rds', label: 'RDS', iconSrc: '/aws-icons/rds.svg', tooltip: 'Managed database', slotIndex: 1 },
  },
]

const SERVICE_EDGES: Edge[] = [
  { id: 'igw-to-ans-waf', source: 'igw', target: 'ans-waf', type: 'default' },
  { id: 'ans-waf-to-ans-alb', source: 'ans-waf', target: 'ans-alb', type: 'default' },
  { id: 'ans-alb-to-ans-asg', source: 'ans-alb', target: 'ans-asg', type: 'default' },
  { id: 'ans-asg-to-ans-frontend', source: 'ans-asg', target: 'ans-frontend', sourceHandle: 'to-frontend', type: 'default' },
  { id: 'ans-asg-to-ans-backend', source: 'ans-asg', target: 'ans-backend', sourceHandle: 'to-backend', type: 'default' },
  { id: 'ans-backend-to-ans-rds', source: 'ans-backend', target: 'ans-rds', type: 'default' },
]

export const ANSWER_NODES: Node[] = [
  ...INITIAL_NODES.map(n => {
    if (n.id === 'public-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 0: 'ans-waf', 1: 'ans-alb', 2: 'ans-asg', 3: 'ans-frontend' } } }
    }
    if (n.id === 'private-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 0: 'ans-backend', 1: 'ans-rds' } } }
    }
    return n
  }),
  ...SERVICE_NODES,
]

export const ANSWER_EDGES: Edge[] = [...INITIAL_EDGES, ...SERVICE_EDGES]
