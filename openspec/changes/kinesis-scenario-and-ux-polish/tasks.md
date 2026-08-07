# Kinesis Scenario + UX Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use the `implementing` skill to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ticket transition animation, sidebar service tooltips, and a new 5-ticket Kinesis data pipeline scenario ("Current Events") to the AWS Architect game.

**System Architecture:** All three features extend the existing React + ReactFlow frontend in `frontend/src/`. No new build tooling, backend, or routing changes are needed. The new scenario follows the identical file structure as `spooderman-api`: an `index.ts`, `tickets.ts`, `answer.ts`, and registration in `scenarios/index.ts`.

**Tech Stack:** React 18, TypeScript, Vite, ReactFlow (`@xyflow/react`), Zustand, Radix UI, Tailwind CSS + `tailwindcss-animate`.

## Global Constraints

- All new service types must be added to the `ServiceType` union in `frontend/src/types/game.ts` before any scenario files reference them.
- Icon files go in `frontend/public/aws-icons/` and are referenced as `/aws-icons/<name>.svg`.
- Scenario slugs in `ScenarioDefinition.id` must be kebab-case and match the directory name under `frontend/src/scenarios/`.
- No tests exist in this project — verification is done by running `npm run dev` inside `frontend/` and checking visually in the browser.
- Do not touch Scenarios 1 or 2.

---

### Task 1: Icons + ServiceTypes

Build the foundation that all subsequent tasks depend on: copy the four new AWS icons into the public assets directory and extend the `ServiceType` union.

**Files:**
- Create: `frontend/public/aws-icons/kinesis-data-streams.svg`
- Create: `frontend/public/aws-icons/firehose.svg`
- Create: `frontend/public/aws-icons/s3.svg`
- Create: `frontend/public/aws-icons/cloudwatch.svg`
- Modify: `frontend/src/types/game.ts` (lines 4–20, the `ServiceType` union)

**Interfaces:**
- Produces: `ServiceType` variants `'kinesis-data-streams' | 'kinesis-firehose' | 'lambda-processor' | 's3' | 'cloudwatch'` — Tasks 2 and 5 reference these exact strings in `serviceType` fields.

- [ ] **Step 1: Copy the four icons**

Run from the project root (`/Users/matthew/Desktop/aws-architect-game`):

```bash
cp "aws-icon-packages/Architecture-Service-Icons_04302026/Arch_Analytics/32/Arch_Amazon-Kinesis-Data-Streams_32.svg" frontend/public/aws-icons/kinesis-data-streams.svg
cp "aws-icon-packages/Architecture-Service-Icons_04302026/Arch_Analytics/32/Arch_Amazon-Data-Firehose_32.svg" frontend/public/aws-icons/firehose.svg
cp "aws-icon-packages/Architecture-Service-Icons_04302026/Arch_Storage/32/Arch_Amazon-Simple-Storage-Service_32.svg" frontend/public/aws-icons/s3.svg
cp "aws-icon-packages/Architecture-Service-Icons_04302026/Arch_Management-Tools/32/Arch_Amazon-CloudWatch_32.svg" frontend/public/aws-icons/cloudwatch.svg
```

- [ ] **Step 2: Verify icons were copied**

```bash
ls frontend/public/aws-icons/ | grep -E "kinesis|firehose|s3|cloudwatch"
```

Expected: four filenames printed — `cloudwatch.svg`, `firehose.svg`, `kinesis-data-streams.svg`, `s3.svg`.

- [ ] **Step 3: Add new ServiceTypes to `game.ts`**

Current union in `frontend/src/types/game.ts` (lines 4–20):
```ts
export type ServiceType =
  | 'frontend-ec2'
  | 'backend-ec2'
  | 'frontend-ecs'
  | 'backend-ecs'
  | 'asg'
  | 'waf'
  | 'nat'
  | 'rds'
  | 'alb'
  | 'api-gateway'
  | 'lambda'
  | 'lambda-handler'
  | 'lambda-worker'
  | 'dynamodb'
  | 'sqs'
  | 'cognito'
```

Replace with:
```ts
export type ServiceType =
  | 'frontend-ec2'
  | 'backend-ec2'
  | 'frontend-ecs'
  | 'backend-ecs'
  | 'asg'
  | 'waf'
  | 'nat'
  | 'rds'
  | 'alb'
  | 'api-gateway'
  | 'lambda'
  | 'lambda-handler'
  | 'lambda-worker'
  | 'dynamodb'
  | 'sqs'
  | 'cognito'
  | 'kinesis-data-streams'
  | 'kinesis-firehose'
  | 'lambda-processor'
  | 's3'
  | 'cloudwatch'
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors. If errors appear, they are pre-existing (check `git diff HEAD -- src/types/game.ts` to confirm only the union changed).

- [ ] **Step 5: Commit**

```bash
git add frontend/public/aws-icons/kinesis-data-streams.svg \
        frontend/public/aws-icons/firehose.svg \
        frontend/public/aws-icons/s3.svg \
        frontend/public/aws-icons/cloudwatch.svg \
        frontend/src/types/game.ts
git commit -m "feat: add Kinesis/S3/CloudWatch icons and ServiceTypes"
```

<!-- END TASK 1 -->

### Task 2: Answer Key + Scenario Scaffold

Create the `current-events` scenario files and register it so the answer page is immediately viewable in the game. The tickets file is stubbed here with ticket 1 only; the full 5-ticket implementation happens in Task 5.

**Files:**
- Create: `frontend/src/scenarios/current-events/answer.ts`
- Create: `frontend/src/scenarios/current-events/index.ts`
- Modify: `frontend/src/scenarios/index.ts` (register `currentEvents`)

**Interfaces:**
- Consumes: `ServiceType` variants from Task 1 (`'kinesis-data-streams'`, `'kinesis-firehose'`, `'lambda-processor'`, `'s3'`, `'cloudwatch'`).
- Produces: `currentEvents` exported from `current-events/index.ts` with `id: 'current-events'`, `answerNodes: ANSWER_NODES`, `answerEdges: ANSWER_EDGES` — registered in `ALL_SCENARIOS` and navigable at `/scenario/current-events`.

**Canvas layout:**
```
Public subnet:   [slot 0] Kinesis Data Streams
Private subnet:  [slot 0] Lambda Processor   [slot 1] DynamoDB
                 [slot 2] Data Firehose       [slot 3] S3
                 [slot 7] CloudWatch
```

Edges: `igw → kds`, `kds → lambda`, `kds → firehose` (fan-out), `lambda → dynamodb`, `firehose → s3`, `kds → cloudwatch`.

- [ ] **Step 1: Create `frontend/src/scenarios/current-events/answer.ts`**

```ts
import type { Node, Edge } from '@xyflow/react'
import { INITIAL_NODES, INITIAL_EDGES, getSlotPosition } from '@/types/game'

const SERVICE_NODES: Node[] = [
  {
    id: 'ans-kds', type: 'serviceNode', parentId: 'public-subnet', extent: 'parent',
    position: getSlotPosition(0), draggable: false,
    data: { serviceType: 'kinesis-data-streams', label: 'Kinesis Data Streams', iconSrc: '/aws-icons/kinesis-data-streams.svg', tooltip: 'Managed real-time data stream', slotIndex: 0 },
  },
  {
    id: 'ans-lambda', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(0), draggable: false,
    data: { serviceType: 'lambda-processor', label: 'Lambda Processor', iconSrc: '/aws-icons/lambda.svg', tooltip: 'Stream consumer and processor', slotIndex: 0 },
  },
  {
    id: 'ans-dynamodb', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(1), draggable: false,
    data: { serviceType: 'dynamodb', label: 'DynamoDB', iconSrc: '/aws-icons/dynamodb.svg', tooltip: 'Real-time counter storage', slotIndex: 1 },
  },
  {
    id: 'ans-firehose', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(2), draggable: false,
    data: { serviceType: 'kinesis-firehose', label: 'Data Firehose', iconSrc: '/aws-icons/firehose.svg', tooltip: 'Managed delivery stream to S3', slotIndex: 2 },
  },
  {
    id: 'ans-s3', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(3), draggable: false,
    data: { serviceType: 's3', label: 'S3', iconSrc: '/aws-icons/s3.svg', tooltip: 'Data lake for archived events', slotIndex: 3 },
  },
  {
    id: 'ans-cloudwatch', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(7), draggable: false,
    data: { serviceType: 'cloudwatch', label: 'CloudWatch', iconSrc: '/aws-icons/cloudwatch.svg', tooltip: 'Stream and Lambda monitoring', slotIndex: 7 },
  },
]

const SERVICE_EDGES: Edge[] = [
  { id: 'igw-to-ans-kds', source: 'igw', target: 'ans-kds', type: 'trafficEdge' },
  { id: 'ans-kds-to-ans-lambda', source: 'ans-kds', target: 'ans-lambda', type: 'trafficEdge' },
  { id: 'ans-kds-to-ans-firehose', source: 'ans-kds', target: 'ans-firehose', type: 'trafficEdge' },
  { id: 'ans-lambda-to-ans-dynamodb', source: 'ans-lambda', target: 'ans-dynamodb', type: 'trafficEdge' },
  { id: 'ans-firehose-to-ans-s3', source: 'ans-firehose', target: 'ans-s3', type: 'trafficEdge' },
  { id: 'ans-kds-to-ans-cloudwatch', source: 'ans-kds', target: 'ans-cloudwatch', type: 'trafficEdge' },
]

export const ANSWER_NODES: Node[] = [
  ...INITIAL_NODES.map(n => {
    if (n.id === 'public-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 0: 'ans-kds' } } }
    }
    if (n.id === 'private-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 0: 'ans-lambda', 1: 'ans-dynamodb', 2: 'ans-firehose', 3: 'ans-s3', 7: 'ans-cloudwatch' } } }
    }
    return n
  }),
  ...SERVICE_NODES,
]

export const ANSWER_EDGES: Edge[] = [...INITIAL_EDGES, ...SERVICE_EDGES]
```

- [ ] **Step 2: Create `frontend/src/scenarios/current-events/index.ts`**

This uses a single inline ticket stub so the scenario is playable. Task 5 replaces it with the real import.

```ts
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
```

- [ ] **Step 3: Register the scenario in `frontend/src/scenarios/index.ts`**

Replace the entire file with:

```ts
import type { ScenarioDefinition } from '@/types/scenario'
import { sparklingWater } from './sparkling-water'
import { spoodermanApi } from './spooderman-api'
import { currentEvents } from './current-events'

export const ALL_SCENARIOS: Record<string, ScenarioDefinition> = {
  [sparklingWater.id]: sparklingWater,
  [spoodermanApi.id]: spoodermanApi,
  [currentEvents.id]: currentEvents,
}
```

- [ ] **Step 4: Verify the answer page renders correctly**

```bash
cd frontend && npm run dev
```

1. Open `http://localhost:5173` in the browser.
2. On the scenario select page, confirm "Current Events" appears as a third card.
3. Click "Current Events" to enter gameplay. Confirm no crash and the stub ticket message is visible.
4. Click the answer/reference button (or navigate directly to `http://localhost:5173/scenario/current-events/answer`).
5. On the answer canvas, verify all six nodes are placed correctly:
   - Kinesis Data Streams in the public subnet (leftmost slot)
   - Lambda Processor, DynamoDB, Data Firehose, S3 in the first row of the private subnet
   - CloudWatch in the second row of the private subnet (first column)
6. Verify edges are visible: two edges from KDS (fan-out to Lambda and Firehose), Lambda → DynamoDB, Firehose → S3, KDS → CloudWatch.
7. Verify all AWS icons render (not broken image icons).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/scenarios/current-events/ frontend/src/scenarios/index.ts
git commit -m "feat: add Current Events scenario scaffold and answer key"
```

<!-- END TASK 2 -->

### Task 3: Ticket Transition Animation

Add a slide-in-from-top animation and an animated "NEW" badge to `TicketBanner`. Because the component is already keyed by `ticket.id` in `GameplayPage`, it remounts on every ticket advance — making pure CSS entry animations the simplest possible mechanism.

**Files:**
- Modify: `frontend/tailwind.config.ts` (add two keyframes + two animation utilities, lines 55–68)
- Modify: `frontend/src/components/gameboard/TicketBanner.tsx` (add `animate-ticket-enter` to outer div; style + animate the "New ticket" span as a badge)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `animate-ticket-enter` and `animate-badge-pop-fade` Tailwind utility classes.

- [ ] **Step 1: Add keyframes and animation utilities to `tailwind.config.ts`**

Current `keyframes` block (lines 55–63):
```ts
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
```

Replace with:
```ts
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'ticket-enter': {
          from: { transform: 'translateY(-100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'badge-pop-fade': {
          '0%':   { transform: 'scale(0)',    opacity: '0' },
          '20%':  { transform: 'scale(1.15)', opacity: '1' },
          '35%':  { transform: 'scale(1)',    opacity: '1' },
          '80%':  { transform: 'scale(1)',    opacity: '1' },
          '100%': { transform: 'scale(1)',    opacity: '0' },
        },
      },
```

Current `animation` block (lines 65–68):
```ts
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
```

Replace with:
```ts
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'ticket-enter': 'ticket-enter 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        'badge-pop-fade': 'badge-pop-fade 2s ease-out forwards',
      },
```

- [ ] **Step 2: Update `TicketBanner.tsx` — add slide animation and badge styling**

Current outer div (line 13):
```tsx
    <div className="shrink-0 bg-amber-50 dark:bg-amber-950/40 border-b-2 border-amber-200 dark:border-amber-800 px-4 py-3">
```

Replace with (adds `animate-ticket-enter overflow-hidden`):
```tsx
    <div className="shrink-0 bg-amber-50 dark:bg-amber-950/40 border-b-2 border-amber-200 dark:border-amber-800 px-4 py-3 animate-ticket-enter overflow-hidden">
```

Current "New ticket" span (line 26):
```tsx
            <span className="text-[10px] text-amber-500/70 dark:text-amber-600 font-medium">New ticket</span>
```

Replace with (turns it into an animated amber pill badge):
```tsx
            <span className="inline-flex items-center rounded-full bg-amber-400/25 dark:bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 animate-badge-pop-fade">
              NEW
            </span>
```

- [ ] **Step 3: Verify the animation in the browser**

With the dev server running (`npm run dev` in `frontend/`):

1. Open any scenario (e.g. Spooderman API).
2. Place a service and submit to complete ticket 1.
3. When ticket 2 appears, the entire amber banner should slide in from the top with a spring ease.
4. A small amber "NEW" pill should pop into view next to "Bossman", then fade out over ~2 seconds.
5. Confirm no layout shift — the banner should not push content down during the animation (it slides into its already-reserved space).

- [ ] **Step 4: Commit**

```bash
git add frontend/tailwind.config.ts frontend/src/components/gameboard/TicketBanner.tsx
git commit -m "feat: add slide-in + NEW badge animation to TicketBanner on ticket advance"
```

<!-- END TASK 3 -->

### Task 4: Sidebar Service Tooltips

Replace the native `title` attribute on `SidebarItemTile` with a Radix `Tooltip` component, matching the styled, animated tooltip already used on placed `ServiceNode`s. The `TooltipProvider` in `App.tsx` already covers the whole app — no provider changes needed.

**Files:**
- Modify: `frontend/src/components/gameboard/SidebarItem.tsx` (full return block)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: Radix `Tooltip` on each sidebar tile, appearing to the right on hover with a 300ms delay.

- [ ] **Step 1: Update `SidebarItem.tsx` to use Radix Tooltip**

Current file (`frontend/src/components/gameboard/SidebarItem.tsx`):
```tsx
import { cn } from '@/lib/utils'
import type { SidebarItem } from '@/types/game'

interface SidebarItemProps {
  item: SidebarItem
}

export function SidebarItemTile({ item }: SidebarItemProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('serviceType', item.serviceType)
    e.dataTransfer.setData('iconSrc', item.iconSrc)
    e.dataTransfer.setData('label', item.label)
    e.dataTransfer.setData('tooltip', item.tooltip)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        'flex flex-col items-center gap-1 p-2 rounded-md border border-border',
        'cursor-grab active:cursor-grabbing bg-card hover:bg-accent transition-colors',
        'select-none w-full'
      )}
      title={item.tooltip}
    >
      <img src={item.iconSrc} alt={item.label} className="w-8 h-8" />
      <span className="text-[10px] font-medium text-center leading-tight text-foreground">
        {item.label}
      </span>
    </div>
  )
}
```

Replace the entire file with:
```tsx
import { cn } from '@/lib/utils'
import type { SidebarItem } from '@/types/game'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface SidebarItemProps {
  item: SidebarItem
}

export function SidebarItemTile({ item }: SidebarItemProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('serviceType', item.serviceType)
    e.dataTransfer.setData('iconSrc', item.iconSrc)
    e.dataTransfer.setData('label', item.label)
    e.dataTransfer.setData('tooltip', item.tooltip)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          draggable
          onDragStart={handleDragStart}
          className={cn(
            'flex flex-col items-center gap-1 p-2 rounded-md border border-border',
            'cursor-grab active:cursor-grabbing bg-card hover:bg-accent transition-colors',
            'select-none w-full'
          )}
        >
          <img src={item.iconSrc} alt={item.label} className="w-8 h-8" />
          <span className="text-[10px] font-medium text-center leading-tight text-foreground">
            {item.label}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-48 text-center">
        {item.tooltip}
      </TooltipContent>
    </Tooltip>
  )
}
```

- [ ] **Step 2: Verify the tooltip in the browser**

With the dev server running:

1. Open any scenario with a sidebar (e.g. Current Events).
2. Hover over a sidebar service tile and wait ~300ms.
3. A styled tooltip panel should appear to the right of the tile with the service description text.
4. Move the mouse away — tooltip should fade/zoom out smoothly.
5. Confirm that dragging a tile still works (the `TooltipTrigger asChild` passes through drag events).
6. Confirm no native browser `title` tooltip appears (the old `title=` attribute was removed).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/gameboard/SidebarItem.tsx
git commit -m "feat: replace native title with Radix Tooltip on sidebar service tiles"
```

<!-- END TASK 4 -->

### Task 5: Scenario Tickets + Finalization

Create all five tickets with validators and update `current-events/index.ts` to use the real import, replacing the stub from Task 2.

**Files:**
- Create: `frontend/src/scenarios/current-events/tickets.ts`
- Modify: `frontend/src/scenarios/current-events/index.ts` (replace inline stub with `import { tickets } from './tickets'`)

**Interfaces:**
- Consumes: `ServiceType` variants `'kinesis-data-streams'`, `'kinesis-firehose'`, `'lambda-processor'`, `'s3'`, `'cloudwatch'` from Task 1; `getNodesOfType`, `hasEdgeBetween`, `isReachableFromIgw` from `@/scenarios/validation/utils`.
- Produces: `tickets` array exported from `current-events/tickets.ts` — 5 `Ticket` objects with `id`, `message`, `validate()`, and `objectives[]`.

- [ ] **Step 1: Create `frontend/src/scenarios/current-events/tickets.ts`**

```ts
import type { Ticket } from '@/types/scenario'
import {
  getNodesOfType,
  hasEdgeBetween,
  isReachableFromIgw,
} from '@/scenarios/validation/utils'

export const tickets: Ticket[] = [
  {
    id: 'wire-up-stream',
    message: "hey team, our app is generating thousands of engagement events every minute but we're just throwing them away. can you set up kinesis data streams so we can start capturing them?",
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
    message: "nice work! data is flowing in. now we need something to actually read and process those events. can you hook up a lambda function to consume from the stream?",
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
    message: "the ceo wants a live dashboard showing read counts per article. can you connect lambda to dynamodb so we can store real-time aggregations?",
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
    message: "legal says we need to retain all raw events for 7 years. set up kinesis data firehose reading DIRECTLY from the stream and delivering to s3. don't route it through lambda - firehose can do this natively.",
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
    message: "we had a stream outage yesterday and didn't know for 2 hours. can you add cloudwatch so we can alarm on stream lag and lambda errors before customers notice?",
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
    ],
  },
]
```

- [ ] **Step 2: Update `frontend/src/scenarios/current-events/index.ts`** — replace the stub with the real import

Replace the entire file with:

```ts
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

export const currentEvents: ScenarioDefinition = {
  id: 'current-events',
  title: 'Current Events',
  description: 'Build a real-time data pipeline to ingest and process user engagement events at scale.',
  tickets,
  answerNodes: ANSWER_NODES,
  answerEdges: ANSWER_EDGES,
  sidebarItems,
}
```

- [ ] **Step 3: Verify the full scenario plays end-to-end**

With the dev server running:

1. Navigate to "Current Events" and confirm ticket 1 message is: "hey team, our app is generating..."
2. Drag Kinesis Data Streams to the public subnet. Connect it from the IGW. Submit — should pass ticket 1 and advance to ticket 2 with the slide+NEW animation.
3. Drag Lambda Processor to the private subnet. Connect KDS → Lambda. Submit — should pass ticket 2.
4. Add DynamoDB to private subnet. Connect Lambda → DynamoDB. Submit — should pass ticket 3.
5. Add Data Firehose to private subnet. Connect **KDS → Firehose** (NOT Lambda → Firehose). Add S3. Connect Firehose → S3. Submit — should pass ticket 4. (If you mistakenly connect Lambda → Firehose, the validator should reject it.)
6. Add CloudWatch to the private subnet. Connect KDS → CloudWatch. Submit — should pass ticket 5 and show the final result modal.
7. Navigate to the answer page and confirm the canvas matches what you built.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/scenarios/current-events/tickets.ts \
        frontend/src/scenarios/current-events/index.ts
git commit -m "feat: add Current Events scenario tickets and validation"
```

<!-- END TASK 5 -->
