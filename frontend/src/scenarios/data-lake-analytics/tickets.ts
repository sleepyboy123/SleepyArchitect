import type { Ticket } from '@/types/scenario'
import {
  getNodesOfType,
  hasEdgeBetween,
  isReachableFromIgw,
} from '@/scenarios/validation/utils'

export const tickets: Ticket[] = [
  {
    id: 'raw-data-landing',
    message: "hey rockstar, the sales team has been emailing me CSV spreadsheets of sparkling water sales every single day. i am DROWNING in spreadsheets. can you set up an S3 bucket where they can dump their data instead? it needs to be accessible from outside our network since the sales team uploads from the internet like normal people.",
    validate(nodes, edges) {
      const s3Nodes = getNodesOfType(nodes, 's3')
      if (s3Nodes.length === 0) return false
      if (!s3Nodes.some(n => n.parentId === 'public-subnet')) return false
      return s3Nodes.some(s3 => isReachableFromIgw(nodes, edges, s3.id))
    },
    objectives: [
      {
        label: 'S3 is in the public subnet',
        check(nodes) {
          return getNodesOfType(nodes, 's3').some(n => n.parentId === 'public-subnet')
        },
      },
      {
        label: 'S3 is reachable from the internet',
        check(nodes, edges) {
          return getNodesOfType(nodes, 's3').some(s3 => isReachableFromIgw(nodes, edges, s3.id))
        },
      },
    ],
  },
  {
    id: 'etl-pipeline',
    message: "ok rockstar we have data landing in S3 but it is just raw CSV garbage. i cannot make sense of any of this. set up a Glue Crawler to figure out what columns are in there, then a Glue Job to clean it up and make it analysis-ready. keep all this processing stuff locked down in the private subnet - it is internal only.",
    validate(nodes, edges) {
      const s3Nodes = getNodesOfType(nodes, 's3')
      const crawlers = getNodesOfType(nodes, 'glue-crawler')
      const jobs = getNodesOfType(nodes, 'glue-job')
      if (s3Nodes.length === 0 || crawlers.length === 0 || jobs.length === 0) return false
      if (!s3Nodes.some(n => n.parentId === 'public-subnet')) return false
      if (!crawlers.some(n => n.parentId === 'private-subnet')) return false
      if (!jobs.some(n => n.parentId === 'private-subnet')) return false
      if (!s3Nodes.some(s3 => isReachableFromIgw(nodes, edges, s3.id))) return false
      if (!s3Nodes.some(s3 => crawlers.some(c => hasEdgeBetween(edges, s3.id, c.id)))) return false
      return crawlers.some(c => jobs.some(j => hasEdgeBetween(edges, c.id, j.id)))
    },
    objectives: [
      {
        label: 'Glue Crawler is in the private subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'glue-crawler').some(n => n.parentId === 'private-subnet')
        },
      },
      {
        label: 'Glue Job is in the private subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'glue-job').some(n => n.parentId === 'private-subnet')
        },
      },
      {
        label: 'Glue Crawler is connected to S3',
        check(nodes, edges) {
          const s3Nodes = getNodesOfType(nodes, 's3')
          const crawlers = getNodesOfType(nodes, 'glue-crawler')
          return s3Nodes.some(s3 => crawlers.some(c => hasEdgeBetween(edges, s3.id, c.id)))
        },
      },
      {
        label: 'Glue Crawler is connected to Glue Job',
        check(nodes, edges) {
          const crawlers = getNodesOfType(nodes, 'glue-crawler')
          const jobs = getNodesOfType(nodes, 'glue-job')
          return crawlers.some(c => jobs.some(j => hasEdgeBetween(edges, c.id, j.id)))
        },
      },
    ],
  },
  {
    id: 'query-layer',
    message: "rockstar. i just learned that SQL exists and it is INCREDIBLE. i want to run queries on our sales data myself. can you hook up Athena so we can query the data in S3 directly? no more waiting for the data team to send me reports. i want answers NOW.",
    validate(nodes, edges) {
      const s3Nodes = getNodesOfType(nodes, 's3')
      const crawlers = getNodesOfType(nodes, 'glue-crawler')
      const jobs = getNodesOfType(nodes, 'glue-job')
      const athenaNodes = getNodesOfType(nodes, 'athena')
      if (s3Nodes.length === 0 || crawlers.length === 0 || jobs.length === 0 || athenaNodes.length === 0) return false
      if (!s3Nodes.some(n => n.parentId === 'public-subnet')) return false
      if (!crawlers.some(n => n.parentId === 'private-subnet')) return false
      if (!jobs.some(n => n.parentId === 'private-subnet')) return false
      if (!athenaNodes.some(n => n.parentId === 'private-subnet')) return false
      if (!s3Nodes.some(s3 => isReachableFromIgw(nodes, edges, s3.id))) return false
      if (!s3Nodes.some(s3 => crawlers.some(c => hasEdgeBetween(edges, s3.id, c.id)))) return false
      if (!crawlers.some(c => jobs.some(j => hasEdgeBetween(edges, c.id, j.id)))) return false
      return s3Nodes.some(s3 => athenaNodes.some(a => hasEdgeBetween(edges, s3.id, a.id)))
    },
    objectives: [
      {
        label: 'Athena is in the private subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'athena').some(n => n.parentId === 'private-subnet')
        },
      },
      {
        label: 'Athena is connected to S3',
        check(nodes, edges) {
          const s3Nodes = getNodesOfType(nodes, 's3')
          const athenaNodes = getNodesOfType(nodes, 'athena')
          return s3Nodes.some(s3 => athenaNodes.some(a => hasEdgeBetween(edges, s3.id, a.id)))
        },
      },
    ],
  },
  {
    id: 'dashboards',
    message: "hey rockstar, SQL is cool and all but i cannot show a SQL terminal in the board meeting. we need PRETTY CHARTS. set up QuickSight and point it at Athena so i can have dashboards that make the board think i know what sparkling water sales look like. private subnet - board members do not get to see the backend.",
    validate(nodes, edges) {
      const s3Nodes = getNodesOfType(nodes, 's3')
      const crawlers = getNodesOfType(nodes, 'glue-crawler')
      const jobs = getNodesOfType(nodes, 'glue-job')
      const athenaNodes = getNodesOfType(nodes, 'athena')
      const qsNodes = getNodesOfType(nodes, 'quicksight')
      if (s3Nodes.length === 0 || crawlers.length === 0 || jobs.length === 0 ||
          athenaNodes.length === 0 || qsNodes.length === 0) return false
      if (!s3Nodes.some(n => n.parentId === 'public-subnet')) return false
      if (!crawlers.some(n => n.parentId === 'private-subnet')) return false
      if (!jobs.some(n => n.parentId === 'private-subnet')) return false
      if (!athenaNodes.some(n => n.parentId === 'private-subnet')) return false
      if (!qsNodes.some(n => n.parentId === 'private-subnet')) return false
      if (!s3Nodes.some(s3 => isReachableFromIgw(nodes, edges, s3.id))) return false
      if (!s3Nodes.some(s3 => crawlers.some(c => hasEdgeBetween(edges, s3.id, c.id)))) return false
      if (!crawlers.some(c => jobs.some(j => hasEdgeBetween(edges, c.id, j.id)))) return false
      if (!s3Nodes.some(s3 => athenaNodes.some(a => hasEdgeBetween(edges, s3.id, a.id)))) return false
      return athenaNodes.some(a => qsNodes.some(qs => hasEdgeBetween(edges, a.id, qs.id)))
    },
    objectives: [
      {
        label: 'QuickSight is in the private subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'quicksight').some(n => n.parentId === 'private-subnet')
        },
      },
      {
        label: 'QuickSight is connected to Athena',
        check(nodes, edges) {
          const athenaNodes = getNodesOfType(nodes, 'athena')
          const qsNodes = getNodesOfType(nodes, 'quicksight')
          return athenaNodes.some(a => qsNodes.some(qs => hasEdgeBetween(edges, a.id, qs.id)))
        },
      },
    ],
  },
  {
    id: 'automated-pipeline',
    trafficAnimation: { bubbleCount: 6, bubbleSpeed: 1.5 },
    message: "ROCKSTAR. problem. the ETL pipeline is manual and i keep forgetting to run it. half the time the dashboards are showing LAST WEEK's numbers and the board thinks sparkling water sales are flat when they are actually up 40%. set up EventBridge to trigger the Glue Job on a schedule so this thing runs itself. i should never have to think about this again.",
    validate(nodes, edges) {
      const s3Nodes = getNodesOfType(nodes, 's3')
      const crawlers = getNodesOfType(nodes, 'glue-crawler')
      const jobs = getNodesOfType(nodes, 'glue-job')
      const athenaNodes = getNodesOfType(nodes, 'athena')
      const qsNodes = getNodesOfType(nodes, 'quicksight')
      const ebNodes = getNodesOfType(nodes, 'eventbridge')
      if (s3Nodes.length === 0 || crawlers.length === 0 || jobs.length === 0 ||
          athenaNodes.length === 0 || qsNodes.length === 0 || ebNodes.length === 0) return false
      if (!s3Nodes.some(n => n.parentId === 'public-subnet')) return false
      if (!crawlers.some(n => n.parentId === 'private-subnet')) return false
      if (!jobs.some(n => n.parentId === 'private-subnet')) return false
      if (!athenaNodes.some(n => n.parentId === 'private-subnet')) return false
      if (!qsNodes.some(n => n.parentId === 'private-subnet')) return false
      if (!ebNodes.some(n => n.parentId === 'private-subnet')) return false
      if (!s3Nodes.some(s3 => isReachableFromIgw(nodes, edges, s3.id))) return false
      if (!s3Nodes.some(s3 => crawlers.some(c => hasEdgeBetween(edges, s3.id, c.id)))) return false
      if (!crawlers.some(c => jobs.some(j => hasEdgeBetween(edges, c.id, j.id)))) return false
      if (!s3Nodes.some(s3 => athenaNodes.some(a => hasEdgeBetween(edges, s3.id, a.id)))) return false
      if (!athenaNodes.some(a => qsNodes.some(qs => hasEdgeBetween(edges, a.id, qs.id)))) return false
      return ebNodes.some(eb => jobs.some(j => hasEdgeBetween(edges, eb.id, j.id)))
    },
    objectives: [
      {
        label: 'EventBridge is in the private subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'eventbridge').some(n => n.parentId === 'private-subnet')
        },
      },
      {
        label: 'EventBridge is connected to Glue Job',
        check(nodes, edges) {
          const ebNodes = getNodesOfType(nodes, 'eventbridge')
          const jobs = getNodesOfType(nodes, 'glue-job')
          return ebNodes.some(eb => jobs.some(j => hasEdgeBetween(edges, eb.id, j.id)))
        },
      },
    ],
  },
]
