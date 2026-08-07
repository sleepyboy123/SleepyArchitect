import type { ScenarioDefinition } from '@/types/scenario'
import type { SidebarItem } from '@/types/game'
import type { Ticket } from '@/types/scenario'
import { ANSWER_NODES, ANSWER_EDGES } from './answer'

const sidebarItems: SidebarItem[] = [
  { serviceType: 'kinesis-data-streams', label: 'Kinesis Data Streams', iconSrc: '/aws-icons/kinesis-data-streams.svg', tooltip: 'Managed real-time data stream. Captures and buffers event records from producers at high throughput.' },
  { serviceType: 'kinesis-firehose', label: 'Data Firehose', iconSrc: '/aws-icons/firehose.svg', tooltip: 'Fully managed delivery stream. Reads directly from Kinesis Data Streams and delivers to S3 with no code.' },
  { serviceType: 'lambda-processor', label: 'Lambda Processor', iconSrc: '/aws-icons/lambda.svg', tooltip: 'Serverless function triggered by Kinesis. Reads batches of stream records and runs your processing logic.' },
  { serviceType: 'dynamodb', label: 'DynamoDB', iconSrc: '/aws-icons/dynamodb.svg', tooltip: 'NoSQL key-value store used for low-latency real-time counters updated by Lambda on each batch.' },
  { serviceType: 's3', label: 'S3', iconSrc: '/aws-icons/s3.svg', tooltip: 'Object storage for the data lake. Receives archived event records from Firehose for long-term retention.' },
  { serviceType: 'cloudwatch', label: 'CloudWatch', iconSrc: '/aws-icons/cloudwatch.svg', tooltip: 'AWS monitoring service. Tracks stream metrics (IteratorAge, throttles) and Lambda error rates.' },
]

// Placeholder ticket — replaced in Task 5 with the full import from ./tickets
const stubTickets: Ticket[] = [
  {
    id: 'wire-up-stream',
    message: "hey team, our app is generating thousands of engagement events every minute but we're just throwing them away. can you set up kinesis data streams so we can start capturing them?",
    validate: () => false,
    objectives: [],
  },
]

export const currentEvents: ScenarioDefinition = {
  id: 'current-events',
  title: 'Current Events',
  description: 'Build a real-time data pipeline to ingest and process user engagement events at scale.',
  tickets: stubTickets,
  answerNodes: ANSWER_NODES,
  answerEdges: ANSWER_EDGES,
  sidebarItems,
}
