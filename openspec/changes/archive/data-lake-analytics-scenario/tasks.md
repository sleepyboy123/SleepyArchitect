# Data Lake & Analytics Scenario - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use the `implementing` skill to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Scenario 4 (Data Lake & Analytics) to the AWS Architect game, teaching Glue, Athena, QuickSight, and EventBridge through 5 progressive tickets.

**System Architecture:** Follows the established scenario pattern - a `ScenarioDefinition` export with sidebarItems, tickets (cumulative validation), and a reference answer (nodes + edges). The game engine and all UI components are fully generic and require zero changes.

**Tech Stack:** TypeScript, React, @xyflow/react

## Global Constraints

- New `ServiceType` literals must be lowercase-kebab-case (matching existing: `kinesis-data-streams`, `lambda-processor`, etc.)
- Icon paths follow convention: `/aws-icons/<service-type>.svg`
- Ticket validation is cumulative - each ticket re-validates all prior constraints
- Slot positions use `getSlotPosition(slotIndex)` - 7 columns per subnet row
- All scenario files go in `frontend/src/scenarios/data-lake-analytics/`

---

### Task 1: Add ServiceType values and create SVG icons

**Files:**
- Modify: `frontend/src/types/game.ts:4-28` (ServiceType union)
- Create: `frontend/public/aws-icons/glue-crawler.svg`
- Create: `frontend/public/aws-icons/glue-job.svg`
- Create: `frontend/public/aws-icons/athena.svg`
- Create: `frontend/public/aws-icons/quicksight.svg`
- Create: `frontend/public/aws-icons/eventbridge.svg`

**Interfaces:**
- Consumes: nothing (foundation task)
- Produces: 5 new `ServiceType` literals (`glue-crawler`, `glue-job`, `athena`, `quicksight`, `eventbridge`) usable throughout the codebase; 5 SVG icon files at `/aws-icons/<name>.svg`

- [x] **Step 1: Add 5 new ServiceType values to the union**

In `frontend/src/types/game.ts`, add these 5 literals to the `ServiceType` union, after the existing `'cloudfront'` entry:

```typescript
  | 'glue-crawler'
  | 'glue-job'
  | 'athena'
  | 'quicksight'
  | 'eventbridge'
```

- [x] **Step 2: Create SVG icons for the 5 new services**

Create 5 SVG icon files in `frontend/public/aws-icons/`. Each should be a clean, recognizable icon at the same viewport size as existing icons (check an existing icon like `s3.svg` for the viewport dimensions and style conventions, then match them).

Source official AWS Architecture Icons for these services:
- `glue-crawler.svg` - AWS Glue Crawler
- `glue-job.svg` - AWS Glue (ETL job)
- `athena.svg` - Amazon Athena
- `quicksight.svg` - Amazon QuickSight
- `eventbridge.svg` - Amazon EventBridge

If official icons are not available to embed, create simple colored SVG placeholders (distinct color per service, service name abbreviated in the center) matching the viewport size of existing icons. These can be swapped for official icons later.

- [x] **Step 3: Verify type-check passes**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors (new types are valid additions to the union, nothing references them yet)

- [x] **Step 4: Commit**

```
git add frontend/src/types/game.ts frontend/public/aws-icons/glue-crawler.svg frontend/public/aws-icons/glue-job.svg frontend/public/aws-icons/athena.svg frontend/public/aws-icons/quicksight.svg frontend/public/aws-icons/eventbridge.svg
git commit -m "feat: add ServiceType values and icons for data lake scenario"
```

---

### Task 2: Create scenario definition and tickets

**Files:**
- Create: `frontend/src/scenarios/data-lake-analytics/index.ts`
- Create: `frontend/src/scenarios/data-lake-analytics/tickets.ts`

**Interfaces:**
- Consumes: `ServiceType` values from Task 1 (`s3`, `glue-crawler`, `glue-job`, `athena`, `quicksight`, `eventbridge`); `SidebarItem` type from `@/types/game`; `Ticket` type from `@/types/scenario`; validation helpers `getNodesOfType`, `hasEdgeBetween`, `isReachableFromIgw` from `@/scenarios/validation/utils`
- Produces: `dataLakeAnalytics: ScenarioDefinition` (used by Task 3 for registration); `tickets: Ticket[]` (used by the scenario definition)

- [x] **Step 1: Create `tickets.ts` with all 5 tickets**

Create `frontend/src/scenarios/data-lake-analytics/tickets.ts`. Follow the hydration-initiative pattern exactly: import validation utils, export a `tickets` array of `Ticket` objects.

Each ticket has: `id` (kebab-case string), `message` (bossman voice), `validate(nodes, edges)` (returns boolean), and `objectives` (array of `{ label, check(nodes, edges) }`).

Validation is **cumulative** - each ticket re-validates everything from all prior tickets plus its own new requirements.

**Ticket 1: `raw-data-landing`**

Message theme: sales team emailing CSV spreadsheets, need S3 landing zone accessible from outside.

Validation:
- S3 exists in public subnet
- S3 is reachable from IGW

```typescript
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
```

**Ticket 2: `etl-pipeline`**

Message theme: raw CSV data is garbage, need Glue Crawler to discover schema and Glue Job to transform.

Validation (cumulative - re-checks ticket 1 state):
- S3 in public, reachable from IGW (prior state)
- Glue Crawler in private subnet
- Glue Job in private subnet
- Glue Crawler connected to S3
- Glue Crawler connected to Glue Job

```typescript
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
```

**Ticket 3: `query-layer`**

Message theme: bossman just discovered SQL, wants to query sales data directly.

Validation (cumulative):
- All ticket 1+2 state
- Athena in private subnet
- Athena connected to S3

```typescript
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
```

**Ticket 4: `dashboards`**

Message theme: SQL is cool but bossman needs pretty charts for the board meeting.

Validation (cumulative):
- All ticket 1+2+3 state
- QuickSight in private subnet
- QuickSight connected to Athena

```typescript
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
```

**Ticket 5: `automated-pipeline`**

Message theme: ETL is manual, dashboards show stale data, need EventBridge to schedule it. Include traffic animation (final ticket).

Validation (cumulative):
- All ticket 1+2+3+4 state
- EventBridge in private subnet
- EventBridge connected to Glue Job

```typescript
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
```

- [x] **Step 2: Create `index.ts` with ScenarioDefinition**

Create `frontend/src/scenarios/data-lake-analytics/index.ts`:

```typescript
import type { ScenarioDefinition } from '@/types/scenario'
import type { SidebarItem } from '@/types/game'
import { tickets } from './tickets'
import { ANSWER_NODES, ANSWER_EDGES } from './answer'

const sidebarItems: SidebarItem[] = [
  { serviceType: 's3', label: 'S3', iconSrc: '/aws-icons/s3.svg', tooltip: 'Object storage. The landing zone where raw sales CSV data arrives from the internet.' },
  { serviceType: 'glue-crawler', label: 'Glue Crawler', iconSrc: '/aws-icons/glue-crawler.svg', tooltip: 'Discovers the schema of raw data in S3 and populates the Glue Data Catalog so other services know what columns exist.' },
  { serviceType: 'glue-job', label: 'Glue Job', iconSrc: '/aws-icons/glue-job.svg', tooltip: 'Serverless ETL engine. Reads raw data from S3, cleans and transforms it, and writes analysis-ready output back to S3.' },
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
```

- [x] **Step 3: Verify type-check passes (tickets + index, answer not yet created)**

This step will fail because `answer.ts` does not exist yet. That is expected - just confirm the only error is the missing `./answer` import. If there are other errors, fix them before proceeding.

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`

- [x] **Step 4: Commit**

```
git add frontend/src/scenarios/data-lake-analytics/index.ts frontend/src/scenarios/data-lake-analytics/tickets.ts
git commit -m "feat: add data lake scenario definition and tickets"
```

---

### Task 3: Create reference architecture and register scenario

**Files:**
- Create: `frontend/src/scenarios/data-lake-analytics/answer.ts`
- Modify: `frontend/src/scenarios/index.ts`

**Interfaces:**
- Consumes: `INITIAL_NODES`, `INITIAL_EDGES`, `getSlotPosition` from `@/types/game`; `Node`, `Edge` types from `@xyflow/react`; `ScenarioDefinition` from `@/types/scenario`; `dataLakeAnalytics` from Task 2's `index.ts`
- Produces: `ANSWER_NODES: Node[]` and `ANSWER_EDGES: Edge[]` (the complete reference architecture); scenario registered in `ALL_SCENARIOS`

- [x] **Step 1: Create `answer.ts` with reference architecture**

Create `frontend/src/scenarios/data-lake-analytics/answer.ts`.

Layout:
- Public subnet: S3 at slot 2 (centered, directly above Athena)
- Private subnet: Glue Crawler at slot 0, Glue Job at slot 1, Athena at slot 2, QuickSight at slot 3, EventBridge at slot 4

```typescript
import type { Node, Edge } from '@xyflow/react'
import { INITIAL_NODES, INITIAL_EDGES, getSlotPosition } from '@/types/game'

const SERVICE_NODES: Node[] = [
  {
    id: 'ans-s3', type: 'serviceNode', parentId: 'public-subnet', extent: 'parent',
    position: getSlotPosition(2), draggable: false,
    data: { serviceType: 's3', label: 'S3', iconSrc: '/aws-icons/s3.svg', tooltip: 'Landing zone for raw sparkling water sales CSVs', slotIndex: 2 },
  },
  {
    id: 'ans-glue-crawler', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(0), draggable: false,
    data: { serviceType: 'glue-crawler', label: 'Glue Crawler', iconSrc: '/aws-icons/glue-crawler.svg', tooltip: 'Discovers schema of raw sales data in S3', slotIndex: 0 },
  },
  {
    id: 'ans-glue-job', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(1), draggable: false,
    data: { serviceType: 'glue-job', label: 'Glue Job', iconSrc: '/aws-icons/glue-job.svg', tooltip: 'Cleans and transforms raw CSV data for analysis', slotIndex: 1 },
  },
  {
    id: 'ans-athena', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(2), draggable: false,
    data: { serviceType: 'athena', label: 'Athena', iconSrc: '/aws-icons/athena.svg', tooltip: 'SQL query engine over the S3 data lake', slotIndex: 2 },
  },
  {
    id: 'ans-quicksight', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(3), draggable: false,
    data: { serviceType: 'quicksight', label: 'QuickSight', iconSrc: '/aws-icons/quicksight.svg', tooltip: 'Dashboards for the board meeting', slotIndex: 3 },
  },
  {
    id: 'ans-eventbridge', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(4), draggable: false,
    data: { serviceType: 'eventbridge', label: 'EventBridge', iconSrc: '/aws-icons/eventbridge.svg', tooltip: 'Scheduled trigger for the Glue ETL pipeline', slotIndex: 4 },
  },
]

const SERVICE_EDGES: Edge[] = [
  // IGW -> S3 (external sales data entry point)
  { id: 'igw-to-ans-s3', source: 'igw', target: 'ans-s3', targetHandle: 'left', type: 'trafficEdge' },
  // S3(bottom) -> Glue Crawler(top) - crawler reads raw data
  { id: 'ans-s3-to-ans-glue-crawler', source: 'ans-s3', sourceHandle: 'bottom', target: 'ans-glue-crawler', targetHandle: 'top', type: 'trafficEdge' },
  // Glue Crawler(right) -> Glue Job(left) - feeds discovered schema to ETL
  { id: 'ans-glue-crawler-to-ans-glue-job', source: 'ans-glue-crawler', sourceHandle: 'right', target: 'ans-glue-job', targetHandle: 'left', type: 'trafficEdge' },
  // S3(bottom) -> Athena(top) - Athena queries data directly in S3 (straight down, same column)
  { id: 'ans-s3-to-ans-athena', source: 'ans-s3', sourceHandle: 'bottom', target: 'ans-athena', targetHandle: 'top', type: 'trafficEdge' },
  // Athena(right) -> QuickSight(left) - visualization reads from query engine
  { id: 'ans-athena-to-ans-quicksight', source: 'ans-athena', sourceHandle: 'right', target: 'ans-quicksight', targetHandle: 'left', type: 'trafficEdge' },
  // EventBridge(left) -> Glue Job(right) - scheduled trigger
  { id: 'ans-eventbridge-to-ans-glue-job', source: 'ans-eventbridge', sourceHandle: 'left', target: 'ans-glue-job', targetHandle: 'right', type: 'trafficEdge' },
]

export const ANSWER_NODES: Node[] = [
  ...INITIAL_NODES.map(n => {
    if (n.id === 'public-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 2: 'ans-s3' } } }
    }
    if (n.id === 'private-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 0: 'ans-glue-crawler', 1: 'ans-glue-job', 2: 'ans-athena', 3: 'ans-quicksight', 4: 'ans-eventbridge' } } }
    }
    return n
  }),
  ...SERVICE_NODES,
]

export const ANSWER_EDGES: Edge[] = [...INITIAL_EDGES, ...SERVICE_EDGES]
```

- [x] **Step 2: Register scenario in the scenario index**

In `frontend/src/scenarios/index.ts`, add the import and registry entry:

```typescript
import { dataLakeAnalytics } from './data-lake-analytics'
```

Add to the `ALL_SCENARIOS` record:

```typescript
  [dataLakeAnalytics.id]: dataLakeAnalytics,
```

- [x] **Step 3: Full type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: zero errors

- [x] **Step 4: Dev server play-through**

Run: `cd frontend && npm run dev`

Verify in the browser:
1. Scenario 4 ("The Data Lake") appears in the scenario list
2. Selecting it shows 6 sidebar items (S3, Glue Crawler, Glue Job, Athena, QuickSight, EventBridge) with correct icons and tooltips
3. Ticket 1: place S3 in public subnet, connect from IGW - ticket passes
4. Ticket 2: place Glue Crawler and Glue Job in private subnet, connect Crawler to S3 and Crawler to Job - ticket passes
5. Ticket 3: place Athena in private subnet, connect to S3 - ticket passes
6. Ticket 4: place QuickSight in private subnet, connect to Athena - ticket passes
7. Ticket 5: place EventBridge in private subnet, connect to Glue Job - ticket passes, traffic animation plays
8. Clicking "Show Answer" displays the reference architecture with correct layout and edges

- [x] **Step 5: Commit**

```
git add frontend/src/scenarios/data-lake-analytics/answer.ts frontend/src/scenarios/index.ts
git commit -m "feat: add reference architecture and register data lake scenario"
```
