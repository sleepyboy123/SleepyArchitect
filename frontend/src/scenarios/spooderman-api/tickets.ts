import type { Ticket } from '@/types/scenario'
import {
  getNodesOfType,
  hasEdgeBetween,
  hasPathBetween,
  isReachableFromIgw,
} from '@/scenarios/validation/utils'

const STRUCTURAL_IDS = new Set(['internet', 'igw', 'internet-vpc', 'app-vpc', 'public-subnet', 'private-subnet'])

export const tickets: Ticket[] = [
  {
    id: 'api-online',
    message: '[placeholder] Put the API on the internet.',
    validate(nodes, edges) {
      const gateways = getNodesOfType(nodes, 'api-gateway')
      const lambdas = getNodesOfType(nodes, 'lambda')
      if (gateways.length === 0 || lambdas.length === 0) return false
      const gatewayReachable = gateways.some(gw => isReachableFromIgw(nodes, edges, gw.id))
      if (!gatewayReachable) return false
      return gateways.some(gw => lambdas.some(l => hasPathBetween(nodes, edges, gw.id, l.id)))
    },
    objectives: [
      {
        label: 'API Gateway is in the public subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'api-gateway').some(n => n.parentId === 'public-subnet')
        },
      },
      {
        label: 'Lambda is in the private subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'lambda').some(n => n.parentId === 'private-subnet')
        },
      },
    ],
  },
  {
    id: 'save-data',
    message: '[placeholder] We need to save stuff.',
    validate(nodes, edges) {
      const dynamos = getNodesOfType(nodes, 'dynamodb')
      const lambdas = getNodesOfType(nodes, 'lambda')
      if (dynamos.length === 0 || lambdas.length === 0) return false
      return dynamos.some(db => lambdas.some(l => hasEdgeBetween(edges, db.id, l.id)))
    },
    objectives: [
      {
        label: 'DynamoDB is in the private subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'dynamodb').some(n => n.parentId === 'private-subnet')
        },
      },
    ],
  },
  {
    id: 'auth',
    message: '[placeholder] Users are logging in as each other.',
    validate(nodes, edges) {
      const cognitos = getNodesOfType(nodes, 'cognito')
      const gateways = getNodesOfType(nodes, 'api-gateway')
      if (cognitos.length === 0 || gateways.length === 0) return false
      const cognitoReachable = cognitos.some(c => isReachableFromIgw(nodes, edges, c.id))
      if (!cognitoReachable) return false
      return cognitos.some(c => gateways.some(gw => hasEdgeBetween(edges, c.id, gw.id)))
    },
    objectives: [
      {
        label: 'Cognito is in the public subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'cognito').some(n => n.parentId === 'public-subnet')
        },
      },
      {
        label: 'Cognito is directly connected to API Gateway',
        check(nodes, edges) {
          const cognitos = getNodesOfType(nodes, 'cognito')
          const gateways = getNodesOfType(nodes, 'api-gateway')
          return cognitos.some(c => gateways.some(gw => hasEdgeBetween(edges, c.id, gw.id)))
        },
      },
    ],
  },
  {
    id: 'async-processing',
    trafficAnimation: { bubbleCount: 8, bubbleSpeed: 1.2 },
    message: '[placeholder] Requests are timing out.',
    validate(nodes, edges) {
      const sqsList = getNodesOfType(nodes, 'sqs')
      const lambdas = getNodesOfType(nodes, 'lambda')
      if (sqsList.length === 0 || lambdas.length < 2) return false
      const lambdaToSqs = sqsList.some(sqs => lambdas.some(l => hasEdgeBetween(edges, l.id, sqs.id)))
      const sqsToLambda = sqsList.some(sqs => lambdas.some(l => hasEdgeBetween(edges, sqs.id, l.id)))
      return lambdaToSqs && sqsToLambda
    },
    objectives: [
      {
        label: 'SQS is in the private subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'sqs').some(n => n.parentId === 'private-subnet')
        },
      },
      {
        label: 'Two Lambda functions are present',
        check(nodes) {
          return getNodesOfType(nodes, 'lambda').length >= 2
        },
      },
    ],
  },
  {
    id: 'security',
    trafficAnimation: { bubbleColor: '#ef4444', bubbleCount: 6, bubbleSpeed: 1.6 },
    message: '[placeholder] Security team is breathing down our necks.',
    validate(nodes, edges) {
      const wafs = getNodesOfType(nodes, 'waf')
      if (wafs.length === 0) return false
      const wafReachable = wafs.some(waf => isReachableFromIgw(nodes, edges, waf.id))
      if (!wafReachable) return false
      return wafs.some(waf =>
        edges.some(e => {
          const neighbor = e.source === waf.id ? e.target : e.target === waf.id ? e.source : null
          return neighbor !== null && !STRUCTURAL_IDS.has(neighbor)
        })
      )
    },
    objectives: [
      {
        label: 'WAF is in the public subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'waf').some(w => w.parentId === 'public-subnet')
        },
      },
      {
        label: 'WAF is directly connected to IGW',
        check(nodes, edges) {
          return getNodesOfType(nodes, 'waf').some(w => hasEdgeBetween(edges, 'igw', w.id))
        },
      },
    ],
  },
]
