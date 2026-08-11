import type { ScenarioDefinition } from '@/types/scenario'
import type { SidebarItem } from '@/types/game'
import { tickets } from './tickets'
import { ANSWER_NODES, ANSWER_EDGES } from './answer'

const sidebarItems: SidebarItem[] = [
  { serviceType: 'kinesis-data-streams', label: 'Kinesis Data Streams', iconSrc: '/aws-icons/kinesis-data-streams.svg', tooltip: 'Managed real-time data stream. Captures and buffers dispense events from the office water sensors.' },
  { serviceType: 'kinesis-firehose', label: 'Data Firehose', iconSrc: '/aws-icons/firehose.svg', tooltip: 'Fully managed delivery stream. Reads directly from Kinesis Data Streams and delivers to S3 with no code.' },
  { serviceType: 'lambda-processor', label: 'Lambda Processor', iconSrc: '/aws-icons/lambda.svg', tooltip: 'Serverless function triggered by Kinesis. Reads batches of dispense events and computes per-developer hydration counts.' },
  { serviceType: 'dynamodb', label: 'DynamoDB', iconSrc: '/aws-icons/dynamodb.svg', tooltip: 'NoSQL key-value store. Holds the live hydration leaderboard, updated by Lambda on every batch.' },
  { serviceType: 's3', label: 'S3', iconSrc: '/aws-icons/s3.svg', tooltip: 'Object storage for the data lake. Receives raw dispense events from Firehose for the legally mandated 7-year retention.' },
  { serviceType: 'cloudwatch', label: 'CloudWatch', iconSrc: '/aws-icons/cloudwatch.svg', tooltip: 'AWS monitoring service. Tracks stream metrics (IteratorAge, throttles) and Lambda error rates so bossman always knows if they were drinking.' },
]

export const hydrationInitiative: ScenarioDefinition = {
  id: 'hydration-initiative',
  title: 'The Hydration Initiative',
  description: "Bossman wants to analyse the companies hydration analytics.",
  tickets,
  answerNodes: ANSWER_NODES,
  answerEdges: ANSWER_EDGES,
  sidebarItems,
}
