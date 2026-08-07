import type { ScenarioDefinition } from '@/types/scenario'
import type { SidebarItem } from '@/types/game'
import { tickets } from './tickets'
import { ANSWER_NODES, ANSWER_EDGES } from './answer'

const sidebarItems: SidebarItem[] = [
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

export const sparklingWater: ScenarioDefinition = {
  id: 'sparkling-water',
  title: 'Sparkling Secret',
  description: 'Help bossman get his sparkling water empire online, one ticket at a time.',
  tickets,
  answerNodes: ANSWER_NODES,
  answerEdges: ANSWER_EDGES,
  sidebarItems,
}
