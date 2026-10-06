# AWS Architect Game

A browser-based learning game where you architect AWS solutions by dragging services onto a canvas and wiring them up, then submit your design to see how it holds up against real-world requirements.

## What It Is

You play as a cloud architect receiving tickets from "Bossman."
Each ticket asks you to solve a business problem - hosting a website, adding a database, surviving Black Friday traffic, locking down against attackers - without telling you the answer.
You drag AWS service icons into the correct subnets, connect them with edges, and hit Submit.
The game animates traffic flowing through your design and tells you whether it works.

Tickets build on each other: your design must satisfy every previous ticket's requirements too, not just the latest one.
You can always try again after seeing your results - optional objectives hint at AWS best practices without blocking your progress.

## Running Locally

```bash
docker compose up
```

Open `http://localhost:3003`.

There is no backend.
The game is a fully client-side React SPA.

Alternatively, without Docker:

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
frontend/
  src/
    pages/                  # Route-level components
      ScenarioSelectPage.tsx    # Scenario picker (renders cards from ALL_SCENARIOS)
      GameplayPage.tsx          # Gameplay canvas + sidebar + ticket banner
      AnswerPage.tsx            # Read-only reference architecture viewer
    components/
      gameboard/             # Ticket banner, sidebar, result modal
        canvas/              # React Flow canvas, node/edge types
      ui/                    # shadcn/ui primitives (button, card, tooltip, etc.)
    scenarios/               # Game content lives here
      sparkling-water/       # Scenario 1: three-tier web architecture
      spooderman-api/        # Scenario 2: serverless API with Lambda, API Gateway, SQS
      hydration-initiative/  # Scenario 3: Kinesis data pipeline with real-time processing
      data-lake-analytics/   # Scenario 4: S3 data lake with Glue, Athena, QuickSight
      validation/
        utils.ts             # Shared validation helpers (getNodesOfType, hasEdgeBetween, etc.)
      index.ts               # Scenario registry (ALL_SCENARIOS map)
      engine.ts              # Cumulative validation logic
    store/
      useGameStore.ts        # Zustand game state (nodes, edges, sidebar, ticket index)
    types/
      game.ts                # ServiceType union, SidebarItem, slot grid constants
      scenario.ts            # Ticket, Objective, ScenarioDefinition, ValidationResult
```

## Scenarios

| # | Slug | Title | What it teaches |
|---|------|-------|-----------------|
| 1 | `sparkling-water` | Sparkling Secret | Classic three-tier web architecture: EC2, ALB, RDS, ASG, CloudFront, WAF |
| 2 | `spooderman-api` | Spooderman API | Serverless API: API Gateway, Lambda, DynamoDB, SQS, Cognito |
| 3 | `hydration-initiative` | The Hydration Initiative | Real-time data pipeline: Kinesis Data Streams, Firehose, Lambda, DynamoDB, S3, CloudWatch |
| 4 | `data-lake-analytics` | The Data Lake | S3 data lake pipeline: Glue Crawler, Glue Job, Athena, QuickSight, EventBridge |

## Adding a New Scenario

1. Create `src/scenarios/<your-scenario>/` with three files:

   **`tickets.ts`** - exports a `Ticket[]` array with validators and objectives:
   ```ts
   import type { Ticket } from '@/types/scenario'
   import { getNodesOfType, hasEdgeBetween, isReachableFromIgw } from '@/scenarios/validation/utils'

   export const tickets: Ticket[] = [
     {
       id: 'first-ticket',
       message: "What Bossman says - no hints!",
       validate(nodes, edges) {
         // Return true when the player's design satisfies this ticket
         const myNodes = getNodesOfType(nodes, 'my-service-type')
         return myNodes.length > 0
       },
       objectives: [
         {
           label: 'My service is in the private subnet',
           check(nodes) {
             return getNodesOfType(nodes, 'my-service-type').some(n => n.parentId === 'private-subnet')
           },
         },
       ],
     },
   ]
   ```

   **`answer.ts`** - exports `ANSWER_NODES` and `ANSWER_EDGES` for the `/answer/:scenarioId` reference page.

   **`index.ts`** - wires everything together and defines the sidebar:
   ```ts
   import type { ScenarioDefinition } from '@/types/scenario'
   import type { SidebarItem } from '@/types/game'
   import { tickets } from './tickets'
   import { ANSWER_NODES, ANSWER_EDGES } from './answer'

   const sidebarItems: SidebarItem[] = [
     {
       serviceType: 'my-service-type',
       label: 'My Service',
       iconSrc: '/aws-icons/my-service.svg',
       tooltip: 'Description shown on hover in the sidebar',
     },
   ]

   export const myScenario: ScenarioDefinition = {
     id: 'my-scenario',
     title: 'My Scenario',
     description: 'One sentence shown on the scenario select card.',
     tickets,
     answerNodes: ANSWER_NODES,
     answerEdges: ANSWER_EDGES,
     sidebarItems,
   }
   ```

2. Register it in `src/scenarios/index.ts`:
   ```ts
   import { myScenario } from './my-scenario'

   export const ALL_SCENARIOS: Record<string, ScenarioDefinition> = {
     // ...existing scenarios
     [myScenario.id]: myScenario,
   }
   ```

3. If your scenario uses new AWS service types, add them to the `ServiceType` union in `src/types/game.ts` and place the corresponding icon SVGs in `frontend/public/aws-icons/`.

That is all.
The scenario select page renders cards automatically from `ALL_SCENARIOS`.
The validation engine, traffic animation, cumulative checking, and result modal all work with any scenario automatically.

## Key Types

```ts
interface Ticket {
  id: string
  message: string                                       // What Bossman says
  validate: (nodes: Node[], edges: Edge[]) => boolean   // Pass/fail logic
  objectives: Objective[]                               // Checklist items shown in the result modal
  trafficAnimation?: TrafficAnimationConfig             // Override bubble count/color/speed
}

interface Objective {
  label: string
  check: (nodes: Node[], edges: Edge[]) => boolean
}

interface ScenarioDefinition {
  id: string
  title: string
  description: string
  tickets: Ticket[]
  answerNodes: Node[]
  answerEdges: Edge[]
  sidebarItems: SidebarItem[]
}

interface SidebarItem {
  serviceType: ServiceType
  label: string
  iconSrc: string
  tooltip: string
  extraHandles?: HandleConfig[]   // For nodes like ASG that need multiple connection points
}
```

## Validation Helpers

Shared helpers in `src/scenarios/validation/utils.ts` cover common checks:

| Helper | What it does |
|--------|-------------|
| `getNodesOfType(nodes, ...types)` | Filter nodes by `ServiceType` |
| `getNodesInSubnet(nodes, subnetId)` | Filter service nodes by parent subnet |
| `hasEdgeBetween(edges, idA, idB)` | Check for a direct edge in either direction |
| `hasPathBetween(nodes, edges, src, tgt)` | BFS reachability check (bidirectional edges) |
| `isReachableFromIgw(nodes, edges, targetId)` | Shorthand for `hasPathBetween` from `'igw'` |

Validators receive the full React Flow node and edge arrays.
Both `validate()` and objective `check()` functions should verify subnet placement via `node.parentId` - not just connectivity - to ensure nodes are in the correct subnet.

## Cumulative Validation

`submitDesign(scenarioId, ticketIndex, nodes, edges)` in `engine.ts` runs the validator for every ticket from 0 to `ticketIndex` in order.
The first failure stops evaluation and reports the failing ticket's objectives.
This means a player who perfectly solved ticket 1 but then deleted the frontend when solving ticket 3 will be caught.

## Reference Architecture

Each scenario has a hidden `/answer/:scenarioId` route that renders the ideal final architecture on a read-only canvas.
Use it for development and sanity-checking: if you place the answer architecture at the start of a new scenario, it should pass every ticket.

## Canvas Layout

The canvas uses a fixed slot grid inside each subnet.
Constants in `src/types/game.ts` control the layout:

| Constant | Value | Effect |
|---|---|---|
| `SLOTS_PER_ROW` | 7 | Columns per subnet row |
| `SLOT_WIDTH` | 92px | Horizontal slot spacing |
| `SLOT_HEIGHT` | 104px | Vertical slot spacing |
| `SLOT_START_X/Y` | 24/52px | Subnet padding |

`SUBNET_WIDTH` and `SUBNET_HEIGHT` are derived automatically.
Changing `SLOTS_PER_ROW` widens both subnets and the VPC proportionally.

Nodes like CloudFront that float outside the VPC have a fixed snap position defined in `CLOUDFRONT_SNAP_POSITION`.

## Traffic Animation

When you hit Submit, animated bubble particles flow along every edge for two seconds before the result appears.
The animation is powered by SVG `animateMotion` with `mpath` path references - no CSS keyframes.
Ticket-level `trafficAnimation` config overrides the defaults per-ticket (e.g. red bubbles for the security ticket, many bubbles for the Black Friday ticket).

## Tech Stack

- React 18 + TypeScript + Vite
- React Flow (`@xyflow/react`) for the interactive canvas
- Zustand for game state
- React Router DOM v7 for routing
- shadcn/ui + Radix UI + Tailwind CSS for UI components and tooltips
- Vitest for unit tests

## Tests

```bash
cd frontend
npx vitest run
```

Tests cover the validation utility functions, the Zustand store's node/slot management, the cumulative validation engine, and individual ticket validators for sparkling-water and spooderman-api scenarios.
