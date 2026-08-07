import type { ScenarioDefinition } from '@/types/scenario'
import type { SidebarItem } from '@/types/game'
import { tickets } from './tickets'
import { ANSWER_NODES, ANSWER_EDGES } from './answer'

const sidebarItems: SidebarItem[] = [
  { serviceType: 'api-gateway', label: 'API Gateway', iconSrc: '/aws-icons/api-gateway.svg', tooltip: 'Managed API entry point - routes HTTP requests to backend services' },
  { serviceType: 'lambda', label: 'Lambda', iconSrc: '/aws-icons/lambda.svg', tooltip: 'Serverless function - runs code without provisioning servers' },
  { serviceType: 'dynamodb', label: 'DynamoDB', iconSrc: '/aws-icons/dynamodb.svg', tooltip: 'Managed NoSQL database - fast, flexible, serverless-native' },
  { serviceType: 'sqs', label: 'SQS', iconSrc: '/aws-icons/sqs.svg', tooltip: 'Simple Queue Service - decouples components with managed message queuing' },
  { serviceType: 'cognito', label: 'Cognito', iconSrc: '/aws-icons/cognito.svg', tooltip: 'Managed user authentication and authorisation' },
  { serviceType: 'waf', label: 'WAF', iconSrc: '/aws-icons/waf.svg', tooltip: 'Web Application Firewall - filters and monitors HTTP traffic' },
]

export const spoodermanApi: ScenarioDefinition = {
  id: 'spooderman-api',
  title: 'Spooderman API',
  description: "Bossman has been reading Medium articles. Time to go serverless.",
  tickets,
  answerNodes: ANSWER_NODES,
  answerEdges: ANSWER_EDGES,
  sidebarItems,
}
