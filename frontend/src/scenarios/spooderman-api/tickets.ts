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
    message: 'hey rockstar, bossman has been vibecoding something to track spooderman\'s location. he wants to put it out onto the web. haha get it?',
    validate(nodes, edges) {
      const gateways = getNodesOfType(nodes, 'api-gateway')
      const lambdas = getNodesOfType(nodes, 'lambda', 'lambda-handler', 'lambda-worker')
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
          return getNodesOfType(nodes, 'lambda', 'lambda-handler', 'lambda-worker').some(n => n.parentId === 'private-subnet')
        },
      },
    ],
  },
  {
    id: 'save-data',
    message: 'hey rockstar, bossman wants to save some of this spooderman data somewhere. he kind of wants to map out where spooderman goes. sort of like a web...',
    validate(nodes, edges) {
      const dynamos = getNodesOfType(nodes, 'dynamodb')
      const lambdas = getNodesOfType(nodes, 'lambda', 'lambda-handler', 'lambda-worker')
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
    message: 'hey rockstar, apparently the sinister six have been using this platform to track spooderman. who would have thought. we should do something about that',
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
    id: 'ml-inference',
    message: "hey rockstar, bossman wants to get onto that ai hype train. he keeps telling me how spooderman can stop a train? i don't quite get it...",
    validate(nodes, edges) {
      const sagemakers = getNodesOfType(nodes, 'sagemaker')
      const lambdas = getNodesOfType(nodes, 'lambda-handler', 'lambda-worker')
      if (sagemakers.length === 0 || lambdas.length === 0) return false
      return sagemakers.some(sm =>
        lambdas.some(l => hasEdgeBetween(edges, l.id, sm.id))
      )
    },
    objectives: [
      {
        label: 'SageMaker is in the private subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'sagemaker').some(n => n.parentId === 'private-subnet')
        },
      },
    ],
  },
  {
    id: 'async-processing',
    trafficAnimation: { bubbleCount: 8, bubbleSpeed: 1.2 },
    message: 'hey rockstar, some people have been complaining that their requests have been timing out? maybe our lambda is doing too much at once. Maybe we can split it? One lambda to respond to the request, one lambda to do the actual work and a queue in the middle to make sure nothing is lost.',
    validate(nodes, edges) {
      const sqsList = getNodesOfType(nodes, 'sqs')
      const handlers = getNodesOfType(nodes, 'lambda-handler')
      const workers = getNodesOfType(nodes, 'lambda-worker')
      const sagemakers = getNodesOfType(nodes, 'sagemaker')
      if (sqsList.length === 0 || handlers.length === 0 || workers.length === 0 || sagemakers.length === 0) return false
      const hasProducer = sqsList.some(sqs =>
        handlers.some(h => edges.some(e => e.source === h.id && e.target === sqs.id))
      )
      const hasConsumer = sqsList.some(sqs =>
        workers.some(w => edges.some(e => e.source === sqs.id && e.target === w.id))
      )
      const workerCallsSagemaker = sagemakers.some(sm =>
        workers.some(w => hasEdgeBetween(edges, w.id, sm.id))
      )
      return hasProducer && hasConsumer && workerCallsSagemaker
    },
    objectives: [
      {
        label: 'SQS is in the private subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'sqs').some(n => n.parentId === 'private-subnet')
        },
      },
      {
        label: 'Handler Lambda sends to SQS',
        check(nodes, edges) {
          const handlers = getNodesOfType(nodes, 'lambda-handler')
          const sqsList = getNodesOfType(nodes, 'sqs')
          return sqsList.some(sqs =>
            handlers.some(h => edges.some(e => e.source === h.id && e.target === sqs.id))
          )
        },
      },
      {
        label: 'Worker Lambda receives from SQS',
        check(nodes, edges) {
          const workers = getNodesOfType(nodes, 'lambda-worker')
          const sqsList = getNodesOfType(nodes, 'sqs')
          return sqsList.some(sqs =>
            workers.some(w => edges.some(e => e.source === sqs.id && e.target === w.id))
          )
        },
      },
      {
        label: 'Worker Lambda calls SageMaker',
        check(nodes, edges) {
          const workers = getNodesOfType(nodes, 'lambda-worker')
          const sagemakers = getNodesOfType(nodes, 'sagemaker')
          return sagemakers.some(sm =>
            workers.some(w => hasEdgeBetween(edges, w.id, sm.id))
          )
        },
      },
    ],
  },
  {
    id: 'security',
    trafficAnimation: { bubbleColor: '#ef4444', bubbleCount: 6, bubbleSpeed: 1.6 },
    message: 'hey rockstar, QUICK!! the sinister six is attacking our api. There has got to be a way to protect ourselves.',
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
