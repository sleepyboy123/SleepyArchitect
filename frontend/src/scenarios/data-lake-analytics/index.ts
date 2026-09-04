import type { ScenarioDefinition } from '@/types/scenario'
import type { SidebarItem } from '@/types/game'
import { tickets } from './tickets'
import { ANSWER_NODES, ANSWER_EDGES } from './answer'

const sidebarItems: SidebarItem[] = [
  { serviceType: 's3', label: 'S3', iconSrc: '/aws-icons/s3.svg', tooltip: 'Object storage. The landing zone where raw sales CSV data arrives from the internet.' },
  { serviceType: 'glue-crawler', label: 'Glue Crawler', iconSrc: '/aws-icons/glue-crawler.svg', tooltip: 'Discovers the schema of raw data in S3 and populates the Glue Data Catalog so other services know what columns exist.' },
  { serviceType: 'glue-job', label: 'Glue Job', iconSrc: '/aws-icons/glue-job.svg', tooltip: 'Serverless ETL engine. Triggered by EventBridge on a schedule. Reads schema from the Glue Data Catalog (populated by Glue Crawler) and produces analysis-ready output.' },
  { serviceType: 'athena', label: 'Athena', iconSrc: '/aws-icons/athena.svg', tooltip: 'Serverless SQL query engine. Queries data directly in S3 using the schema from the Glue Data Catalog - no data loading required.' },
  { serviceType: 'quicksight', label: 'QuickSight', iconSrc: '/aws-icons/quicksight.svg', tooltip: 'Business intelligence dashboards. Connects to Athena to visualize sparkling water sales trends with charts bossman can show the board.' },
  { serviceType: 'eventbridge', label: 'EventBridge', iconSrc: '/aws-icons/eventbridge.svg', tooltip: 'Serverless event bus and scheduler. Triggers the Glue Job on a schedule so the ETL pipeline runs automatically.' },
]

export const dataLakeAnalytics: ScenarioDefinition = {
  id: 'data-lake-analytics',
  title: 'The Data Lake',
  description: "Bossman wants dashboards showing sparkling water sales trends.",
  tickets,
  answerNodes: ANSWER_NODES,
  answerEdges: ANSWER_EDGES,
  sidebarItems,
}
