# Design: Gameplay Mechanics

## Chosen Approach

Imperative per-ticket validators (Approach A).
Each ticket defines a `validate(nodes, edges): boolean` pure function and an array of `Objective` objects.
A shared `validation/utils.ts` provides graph helpers (`hasNodeOfType`, `hasPathBetween`, `getNodesInSubnet`, `hasEdgeBetween`).
Cumulative validation: when the player submits on ticket N, the engine runs validators for tickets 0..N in sequence.
All must pass. Objectives are checked independently and never block progression.

## Why Over Alternatives

Approach B (declarative constraint DSL) was rejected because designing a DSL to cover all future constraint types upfront violates YAGNI.
Complex checks (traffic splitting at ASG, WAF position in path) are awkward to express declaratively.
Approach C (hybrid typed + imperative) adds abstraction overhead for a 5-ticket PoC with no proven payoff.
Approach A keeps validators readable, trivially testable, and unambiguous.

## Routing

React Router is added. Three routes:

| Route | Component | Description |
|---|---|---|
| `/` | `ScenarioSelectPage` | Card grid of available scenarios |
| `/play/:scenarioId` | `GameplayPage` | Ticket banner + full gameboard |
| `/answer/:scenarioId` | `AnswerPage` | Read-only reference architecture (dev only) |

`App.tsx` becomes a `RouterProvider` shell.
`GameBoard` is lifted into `GameplayPage`.

## Screen Layout: `/play/:scenarioId`

```
┌─────────────────────────────────────────────────┐
│  TICKET BANNER (pinned, ~96px tall)             │
├──────────┬──────────────────────────────────────┤
│ Sidebar  │  FlowCanvas                          │
│          │                   [Clear] [Submit]   │
│          │                                      │
└──────────┴──────────────────────────────────────┘
```

The ticket banner is pinned above both panels.
It shows the ticket message verbatim - no "Ticket N" label, no hints.
Long messages collapse to a one-liner with a chevron to expand.
The Submit button sits top-right of the canvas alongside the existing Clear Board button.

## File Structure

```
src/
  scenarios/
    index.ts                        # registers all ScenarioDefinitions
    sparkling-water/
      index.ts                      # exports ScenarioDefinition
      tickets.ts                    # ordered Ticket array
      answer.ts                     # reference nodes/edges for /answer route
      validation/
        utils.ts                    # shared graph helpers
  types/
    scenario.ts                     # ScenarioDefinition, Ticket, Objective, ValidationResult
    game.ts                         # (existing, unchanged)
  store/
    useGameStore.ts                 # extended with scenario/ticket state
  pages/
    ScenarioSelectPage.tsx
    GameplayPage.tsx
    AnswerPage.tsx
  components/
    gameboard/
      GameBoard.tsx                 # (existing, unchanged)
      TicketBanner.tsx              # new
      ResultModal.tsx               # new
```

## Core Types (`src/types/scenario.ts`)

```ts
import type { Node, Edge } from '@xyflow/react'

export interface Objective {
  label: string
  check: (nodes: Node[], edges: Edge[]) => boolean
}

export interface Ticket {
  id: string
  message: string
  validate: (nodes: Node[], edges: Edge[]) => boolean
  objectives: Objective[]
}

export interface ScenarioDefinition {
  id: string
  title: string
  description: string
  tickets: Ticket[]
}

export interface ValidationResult {
  passed: boolean
  objectives: { label: string; met: boolean }[]
}
```

## Zustand Store Additions

New fields added to `useGameStore`:

```ts
currentScenarioId: string | null
currentTicketIndex: number        // player is on this ticket; 0..N-1 are implicitly passed
```

New actions:

```ts
startScenario: (scenarioId: string) => void
advanceTicket: () => void
```

`submitDesign` is NOT in the store - it runs the cumulative validator and returns a `ValidationResult` to the calling component.
The result is held in local component state on `GameplayPage` since it is transient UI.
"Try Again" simply calls `setResult(null)` to close the modal - no store action needed.

## Validation Engine

`submitDesign(scenarioId, ticketIndex, nodes, edges): ValidationResult` is a pure function (not a store action).
It runs `tickets[0].validate` through `tickets[ticketIndex].validate` in sequence.
It also collects and runs all objectives from ticket `ticketIndex` only.
If any required validator fails, `passed` is false.
Objectives never affect `passed`.

Shared graph helpers in `validation/utils.ts`:

- `hasNodeOfType(nodes, ...types)` - returns true if any node matches one of the given service types
- `hasEdgeBetween(edges, sourceId, targetId)` - direct edge check
- `hasPathBetween(nodes, edges, sourceId, targetId)` - BFS/DFS reachability check
- `getNodesInSubnet(nodes, subnetId)` - returns child nodes of a given subnet
- `isReachableFromIgw(nodes, edges, targetId)` - convenience wrapper for IGW reachability

## The Five Tickets

### Ticket 1 - "Host the website"

> "hey rockstar, bossman wants to host their website on the internet. I don't know what those funny words mean, but I trust you can get it done~"

**Required:** A frontend node (`frontend-ec2` or `frontend-ecs`) exists AND is reachable from `igw` via edges.

**Optional objectives:**
- Frontend is in the public subnet
- IGW connects directly to at least one service (not left floating with only its default edge)

---

### Ticket 2 - "Backend APIs"

> "hey rockstar, bossman really liked your design man! but they realised it doesnt do anything. They were asking for some backend apis? whatever that means. Anyways get to it~"

**Required:** A backend node (`backend-ec2` or `backend-ecs`) exists AND has an edge connecting it to a frontend node.

**Optional objectives:**
- Frontend node is in the public subnet
- Backend node is in the private subnet

---

### Ticket 3 - "Database hype"

> "hey rockstar, bossman really likes the ehh-pee-eye that you built. Really some cutting-edge shit. Now he is wondering if he can get in on some of that database hype he has been hearing about."

**Required:** An `rds` node exists AND has an edge connecting it to a backend node.

**Optional objectives:**
- RDS is in the private subnet

---

### Ticket 4 - "Black Friday"

> "hey rockstar, bossman suspects that his sparkling water is going to be all the rage this black friday. people are going to be swamping the site to get some of that spicy water... would be a shame if the site crashes."

**Required:** An `alb` node exists AND an `asg` node exists AND there is an edge from ALB to ASG AND ASG connects to at least one compute node (frontend or backend).

**Optional objectives:**
- ASG fans out to both a frontend node AND a backend node (both output handles used)
- ALB is in the public subnet

---

### Ticket 5 - "Lock it down"

> "hey rockstar, bossman has been doing some shady shit recently... real sussy baka... anyways i heard that a couple of hackers are targeting him so we might want to lock shit down if you know what i mean."

**Required:** A `waf` node exists AND IGW connects to WAF (directly or via path) AND WAF connects onward to the rest of the architecture.

**Optional objectives:**
- WAF is in the public subnet
- WAF is the first node after IGW (direct edge IGW → WAF, nothing in between)

---

## Reference Architecture (`answer.ts`)

Final target:

```
Internet → IGW → WAF (public) → ALB (public) → ASG → Frontend EC2/ECS (public)
                                                    → Backend EC2/ECS (private) → RDS (private)
```

`answer.ts` exports a pre-built `{ nodes, edges }` object with all nodes positioned in correct subnets and all edges wired.
`AnswerPage` renders a read-only `FlowCanvas` initialised from this object.
No sidebar, no Submit, no Clear buttons on this route.

## Traffic Animation

On Submit click:
1. All edges switch to `animated: true` for 2 seconds (flowing dots, same style as the existing Internet → IGW edge).
2. After 2 seconds the animation stops and the `ResultModal` opens.

Implementation: a local `isAnimating` boolean in `GameplayPage` state triggers a prop passed down to `FlowCanvas` that overrides all edge `animated` flags.

## Result Modal

Built with Radix `Dialog` (not `AlertDialog`) so that Escape key closes it by default.

**Pass state:**
- Green header
- Optional objectives listed with checkmark / cross icons
- "Next Ticket" button (or "You Win!" with confetti on ticket 5)
- "Try Again" button to close modal and keep editing

**Fail state:**
- Red header
- Brief message indicating required conditions were not met (no specific hints)
- Optional objectives listed with checkmark / cross icons
- "Try Again" button only

## Edge Deletion

`FlowCanvas` sets `deleteKeyCode={['Backspace', 'Delete']}`.
Edges are already `deletable: true` by React Flow default.
Clicking an edge selects it; pressing Backspace or Delete removes it.

## Scenario Registration

`src/scenarios/index.ts`:

```ts
import { sparklingWater } from './sparkling-water'

export const ALL_SCENARIOS: ScenarioDefinition[] = [
  sparklingWater,
]
```

Adding a new scenario: create a folder, export a `ScenarioDefinition`, add one import and one array entry.

## Constraints and Non-Goals

- No backend in this phase
- No save / load of board state
- No undo / redo
- Subnet placement is never required to pass - only ever an optional objective
- The `/answer` route is not linked from any UI - access by direct URL only
