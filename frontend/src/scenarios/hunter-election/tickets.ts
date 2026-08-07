import type { Ticket } from '@/types/scenario'
import {
  getNodesOfType,
  hasEdgeBetween,
  isReachableFromIgw,
} from '@/scenarios/validation/utils'

export const tickets: Ticket[] = [
  {
    id: 'wire-up-stream',
    message: "hey rockstar, the hunter chairman election is underway. we are getting flooded by voting events every minute but we are just throwing them away. can you set up kinesis data streams so we can start capturing them?",
    validate(nodes, edges) {
      const kdsNodes = getNodesOfType(nodes, 'kinesis-data-streams')
      if (kdsNodes.length === 0) return false
      return kdsNodes.some(kds => isReachableFromIgw(nodes, edges, kds.id))
    },
    objectives: [
      {
        label: 'Kinesis Data Streams is in the public subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'kinesis-data-streams').some(n => n.parentId === 'public-subnet')
        },
      },
      {
        label: 'Kinesis Data Streams is reachable from the internet',
        check(nodes, edges) {
          return getNodesOfType(nodes, 'kinesis-data-streams').some(kds => isReachableFromIgw(nodes, edges, kds.id))
        },
      },
    ],
  },
  {
    id: 'add-processor',
    message: "nice work rockstar! voting events are flowing in. now we need something to actually read and process them. can you hook up a lambda function to consume from the stream?",
    validate(nodes, edges) {
      const kdsNodes = getNodesOfType(nodes, 'kinesis-data-streams')
      const lambdas = getNodesOfType(nodes, 'lambda-processor')
      if (kdsNodes.length === 0 || lambdas.length === 0) return false
      if (!kdsNodes.some(kds => isReachableFromIgw(nodes, edges, kds.id))) return false
      return kdsNodes.some(kds => lambdas.some(l => hasEdgeBetween(edges, kds.id, l.id)))
    },
    objectives: [
      {
        label: 'Lambda Processor is in the private subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'lambda-processor').some(n => n.parentId === 'private-subnet')
        },
      },
      {
        label: 'Lambda Processor is connected to Kinesis Data Streams',
        check(nodes, edges) {
          const kdsNodes = getNodesOfType(nodes, 'kinesis-data-streams')
          const lambdas = getNodesOfType(nodes, 'lambda-processor')
          return kdsNodes.some(kds => lambdas.some(l => hasEdgeBetween(edges, kds.id, l.id)))
        },
      },
    ],
  },
  {
    id: 'live-counters',
    message: "hey rockstar, bossman wants a live dashboard showing all the voting details. can you connect lambda to dynamodb so we can store real-time aggregations?",
    validate(nodes, edges) {
      const kdsNodes = getNodesOfType(nodes, 'kinesis-data-streams')
      const lambdas = getNodesOfType(nodes, 'lambda-processor')
      const dynamos = getNodesOfType(nodes, 'dynamodb')
      if (kdsNodes.length === 0 || lambdas.length === 0 || dynamos.length === 0) return false
      if (!kdsNodes.some(kds => isReachableFromIgw(nodes, edges, kds.id))) return false
      if (!kdsNodes.some(kds => lambdas.some(l => hasEdgeBetween(edges, kds.id, l.id)))) return false
      return lambdas.some(l => dynamos.some(db => hasEdgeBetween(edges, l.id, db.id)))
    },
    objectives: [
      {
        label: 'DynamoDB is in the private subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'dynamodb').some(n => n.parentId === 'private-subnet')
        },
      },
      {
        label: 'Lambda Processor writes to DynamoDB',
        check(nodes, edges) {
          const lambdas = getNodesOfType(nodes, 'lambda-processor')
          const dynamos = getNodesOfType(nodes, 'dynamodb')
          return lambdas.some(l => dynamos.some(db => hasEdgeBetween(edges, l.id, db.id)))
        },
      },
    ],
  },
  {
    id: 'cold-storage',
    message: "hey rockstar, legal says we need to retain all raw events for 7 years. set up kinesis data firehose reading DIRECTLY from the stream and delivering to s3. don't route it through lambda - firehose can do this natively.",
    validate(nodes, edges) {
      const kdsNodes = getNodesOfType(nodes, 'kinesis-data-streams')
      const lambdas = getNodesOfType(nodes, 'lambda-processor')
      const dynamos = getNodesOfType(nodes, 'dynamodb')
      const firehoses = getNodesOfType(nodes, 'kinesis-firehose')
      const s3Nodes = getNodesOfType(nodes, 's3')
      if (kdsNodes.length === 0 || lambdas.length === 0 || dynamos.length === 0 || firehoses.length === 0 || s3Nodes.length === 0) return false
      if (!kdsNodes.some(kds => isReachableFromIgw(nodes, edges, kds.id))) return false
      if (!kdsNodes.some(kds => lambdas.some(l => hasEdgeBetween(edges, kds.id, l.id)))) return false
      if (!lambdas.some(l => dynamos.some(db => hasEdgeBetween(edges, l.id, db.id)))) return false
      // Firehose must connect from KDS directly — no lambda-to-firehose edge allowed
      if (!kdsNodes.some(kds => firehoses.some(fh => hasEdgeBetween(edges, kds.id, fh.id)))) return false
      if (lambdas.some(l => firehoses.some(fh => hasEdgeBetween(edges, l.id, fh.id)))) return false
      return firehoses.some(fh => s3Nodes.some(s3 => hasEdgeBetween(edges, fh.id, s3.id)))
    },
    objectives: [
      {
        label: 'Data Firehose is in the private subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'kinesis-firehose').some(n => n.parentId === 'private-subnet')
        },
      },
      {
        label: 'Data Firehose connects directly from Kinesis Data Streams (not via Lambda)',
        check(nodes, edges) {
          const kdsNodes = getNodesOfType(nodes, 'kinesis-data-streams')
          const firehoses = getNodesOfType(nodes, 'kinesis-firehose')
          const lambdas = getNodesOfType(nodes, 'lambda-processor')
          const kdsToFirehose = kdsNodes.some(kds => firehoses.some(fh => hasEdgeBetween(edges, kds.id, fh.id)))
          const lambdaToFirehose = lambdas.some(l => firehoses.some(fh => hasEdgeBetween(edges, l.id, fh.id)))
          return kdsToFirehose && !lambdaToFirehose
        },
      },
      {
        label: 'S3 is connected to Data Firehose',
        check(nodes, edges) {
          const firehoses = getNodesOfType(nodes, 'kinesis-firehose')
          const s3Nodes = getNodesOfType(nodes, 's3')
          return firehoses.some(fh => s3Nodes.some(s3 => hasEdgeBetween(edges, fh.id, s3.id)))
        },
      },
    ],
  },
  {
    id: 'observability',
    trafficAnimation: { bubbleCount: 6, bubbleSpeed: 1.5 },
    message: "hey rockstar, bad news... we had a stream outage yesterday and didn't know for 2 hours. can you add cloudwatch so we can alarm on stream lag and lambda errors before hunters notice?",
    validate(nodes, edges) {
      const kdsNodes = getNodesOfType(nodes, 'kinesis-data-streams')
      const lambdas = getNodesOfType(nodes, 'lambda-processor')
      const dynamos = getNodesOfType(nodes, 'dynamodb')
      const firehoses = getNodesOfType(nodes, 'kinesis-firehose')
      const s3Nodes = getNodesOfType(nodes, 's3')
      const cwNodes = getNodesOfType(nodes, 'cloudwatch')
      if (kdsNodes.length === 0 || lambdas.length === 0 || dynamos.length === 0 ||
          firehoses.length === 0 || s3Nodes.length === 0 || cwNodes.length === 0) return false
      if (!kdsNodes.some(kds => isReachableFromIgw(nodes, edges, kds.id))) return false
      if (!kdsNodes.some(kds => lambdas.some(l => hasEdgeBetween(edges, kds.id, l.id)))) return false
      if (!lambdas.some(l => dynamos.some(db => hasEdgeBetween(edges, l.id, db.id)))) return false
      if (!kdsNodes.some(kds => firehoses.some(fh => hasEdgeBetween(edges, kds.id, fh.id)))) return false
      if (lambdas.some(l => firehoses.some(fh => hasEdgeBetween(edges, l.id, fh.id)))) return false
      if (!firehoses.some(fh => s3Nodes.some(s3 => hasEdgeBetween(edges, fh.id, s3.id)))) return false
      // Only KDS → CloudWatch required to pass; Lambda → CloudWatch is a bonus objective
      return kdsNodes.some(kds => cwNodes.some(cw => hasEdgeBetween(edges, kds.id, cw.id)))
    },
    objectives: [
      {
        label: 'CloudWatch is in the private subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'cloudwatch').some(n => n.parentId === 'private-subnet')
        },
      },
      {
        label: 'CloudWatch is connected to Kinesis Data Streams',
        check(nodes, edges) {
          const kdsNodes = getNodesOfType(nodes, 'kinesis-data-streams')
          const cwNodes = getNodesOfType(nodes, 'cloudwatch')
          return kdsNodes.some(kds => cwNodes.some(cw => hasEdgeBetween(edges, kds.id, cw.id)))
        },
      },
      {
        label: '(Bonus) Lambda Processor is also connected to CloudWatch',
        check(nodes, edges) {
          const lambdas = getNodesOfType(nodes, 'lambda-processor')
          const cwNodes = getNodesOfType(nodes, 'cloudwatch')
          return lambdas.some(l => cwNodes.some(cw => hasEdgeBetween(edges, l.id, cw.id)))
        },
      },
    ],
  },
]
