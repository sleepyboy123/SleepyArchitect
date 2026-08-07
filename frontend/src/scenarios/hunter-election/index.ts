import type { ScenarioDefinition } from '@/types/scenario'
import type { SidebarItem } from '@/types/game'
import { tickets } from './tickets'
import { ANSWER_NODES, ANSWER_EDGES } from './answer'

const sidebarItems: SidebarItem[] = [
  { serviceType: 'kinesis-data-streams', label: 'Kinesis Data Streams', iconSrc: '/aws-icons/kinesis-data-streams.svg', tooltip: 'Managed real-time data stream. Captures and buffers event records from producers at high throughput.' },
  { serviceType: 'kinesis-firehose', label: 'Data Firehose', iconSrc: '/aws-icons/firehose.svg', tooltip: 'Fully managed delivery stream. Reads directly from Kinesis Data Streams and delivers to S3 with no code.' },
  { serviceType: 'lambda-processor', label: 'Lambda Processor', iconSrc: '/aws-icons/lambda.svg', tooltip: 'Serverless function triggered by Kinesis. Reads batches of stream records and runs your processing logic.' },
  { serviceType: 'dynamodb', label: 'DynamoDB', iconSrc: '/aws-icons/dynamodb.svg', tooltip: 'NoSQL key-value store used for low-latency real-time counters updated by Lambda on each batch.' },
  { serviceType: 's3', label: 'S3', iconSrc: '/aws-icons/s3.svg', tooltip: 'Object storage for the data lake. Receives archived event records from Firehose for long-term retention.' },
  { serviceType: 'cloudwatch', label: 'CloudWatch', iconSrc: '/aws-icons/cloudwatch.svg', tooltip: 'AWS monitoring service. Tracks stream metrics (IteratorAge, throttles) and Lambda error rates.' },
]

export const hunterElection: ScenarioDefinition = {
  id: 'hunter-election',
  title: 'Hunter Election',
  description: 'The Hunter Chairman Election is live. Build a real-time data pipeline to capture, process, and archive the flood of engagement events.',
  tickets,
  answerNodes: ANSWER_NODES,
  answerEdges: ANSWER_EDGES,
  sidebarItems,
}
