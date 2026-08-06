# Gameplay Mechanics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use the `implementing` skill to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the full gameplay loop - scenario selection, cumulative ticket-based validation, 2-second traffic animation on submit, and a result modal with optional objectives - layered on top of the existing React Flow gameboard.

**System Architecture:** Frontend-only React + TypeScript + Vite SPA. No backend or persistence. React Router v7 (already installed at v7.18.2) handles routing via `BrowserRouter` in `main.tsx` + `Routes`/`Route` in `App.tsx`. Zustand holds all game state. Validation is pure TypeScript functions operating on the React Flow node/edge graph. The `traffic-flow` CSS keyframe for edge animation already exists in `index.css`.

**Tech Stack:** React 18, TypeScript, Vite, @xyflow/react, Zustand, react-router-dom v7, Radix UI, Tailwind CSS, Vitest, shadcn/ui (Dialog component to be added)

## Global Constraints

- All source files live under `frontend/src/`; all imports use the `@/` alias (maps to `frontend/src/`)
- Tailwind classes only - no inline style objects except React Flow positional overrides already in the codebase
- No new npm packages; `react-router-dom` is already installed; `@radix-ui/react-dialog` is already installed as a transitive dep; `npx shadcn@latest add dialog` adds only the component wrapper file
- Subnet placement is NEVER required to pass a ticket - only ever an optional objective
- Ticket messages must be quoted verbatim from this plan - no rewriting or added hints
- Run tests from the `frontend/` directory: `npx vitest run`

---

### Task 1: Core types, scenario data, and validation engine

**Files:**
- Create: `frontend/src/types/scenario.ts`
- Create: `frontend/src/scenarios/sparkling-water/validation/utils.ts`
- Create: `frontend/src/scenarios/sparkling-water/validation/utils.test.ts`
- Create: `frontend/src/scenarios/sparkling-water/tickets.ts`
- Create: `frontend/src/scenarios/sparkling-water/answer.ts`
- Create: `frontend/src/scenarios/sparkling-water/index.ts`
- Create: `frontend/src/scenarios/index.ts`
- Create: `frontend/src/scenarios/engine.ts`

**Interfaces:**
- Produces: `ScenarioDefinition`, `Ticket`, `Objective`, `ValidationResult` types (used by Tasks 2-4)
- Produces: `ALL_SCENARIOS: Record<string, ScenarioDefinition>` (used by Tasks 3-4)
- Produces: `submitDesign(scenarioId, ticketIndex, nodes, edges): ValidationResult` pure function (used by Task 4)
- Produces: graph helpers `getNodesOfType`, `getNodesInSubnet`, `hasEdgeBetween`, `hasPathBetween`, `isReachableFromIgw` in `validation/utils.ts`

- [ ] **Step 1.1: Write `frontend/src/types/scenario.ts`**

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
  answerNodes: Node[]
  answerEdges: Edge[]
}

export interface ValidationResult {
  passed: boolean
  objectives: { label: string; met: boolean }[]
}
```

- [ ] **Step 1.2: Write `frontend/src/scenarios/sparkling-water/validation/utils.ts`**

```ts
import type { Node, Edge } from '@xyflow/react'
import type { ServiceNodeData, ServiceType } from '@/types/game'

export function getNodesOfType(nodes: Node[], ...types: ServiceType[]): Node[] {
  return nodes.filter(
    n => n.type === 'serviceNode' && types.includes((n.data as ServiceNodeData).serviceType)
  )
}

export function getNodesInSubnet(nodes: Node[], subnetId: string): Node[] {
  return nodes.filter(n => n.type === 'serviceNode' && n.parentId === subnetId)
}

export function hasEdgeBetween(edges: Edge[], idA: string, idB: string): boolean {
  return edges.some(
    e => (e.source === idA && e.target === idB) || (e.source === idB && e.target === idA)
  )
}

export function hasPathBetween(_nodes: Node[], edges: Edge[], sourceId: string, targetId: string): boolean {
  if (sourceId === targetId) return true
  const visited = new Set<string>()
  const queue = [sourceId]
  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === targetId) return true
    if (visited.has(current)) continue
    visited.add(current)
    for (const e of edges) {
      if (e.source === current && !visited.has(e.target)) queue.push(e.target)
      if (e.target === current && !visited.has(e.source)) queue.push(e.source)
    }
  }
  return false
}

export function isReachableFromIgw(nodes: Node[], edges: Edge[], targetId: string): boolean {
  return hasPathBetween(nodes, edges, 'igw', targetId)
}
```

- [ ] **Step 1.3: Write `frontend/src/scenarios/sparkling-water/validation/utils.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import type { Node, Edge } from '@xyflow/react'
import type { ServiceNodeData } from '@/types/game'
import {
  getNodesOfType,
  getNodesInSubnet,
  hasEdgeBetween,
  hasPathBetween,
  isReachableFromIgw,
} from './utils'

function svc(id: string, serviceType: string, parentId?: string): Node {
  return {
    id,
    type: 'serviceNode',
    position: { x: 0, y: 0 },
    ...(parentId ? { parentId } : {}),
    data: { serviceType, label: id, iconSrc: '', tooltip: '', slotIndex: 0 } as ServiceNodeData & Record<string, unknown>,
  }
}

function edge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target }
}

describe('getNodesOfType', () => {
  it('returns nodes matching a single type', () => {
    const nodes = [svc('a', 'frontend-ec2'), svc('b', 'backend-ec2')]
    expect(getNodesOfType(nodes, 'frontend-ec2').map(n => n.id)).toEqual(['a'])
  })
  it('returns nodes matching multiple types', () => {
    const nodes = [svc('a', 'frontend-ec2'), svc('b', 'frontend-ecs'), svc('c', 'rds')]
    expect(getNodesOfType(nodes, 'frontend-ec2', 'frontend-ecs')).toHaveLength(2)
  })
  it('returns empty array when no match', () => {
    expect(getNodesOfType([svc('a', 'rds')], 'waf')).toHaveLength(0)
  })
})

describe('getNodesInSubnet', () => {
  it('returns only nodes in the specified subnet', () => {
    const nodes = [svc('a', 'frontend-ec2', 'public-subnet'), svc('b', 'backend-ec2', 'private-subnet')]
    expect(getNodesInSubnet(nodes, 'public-subnet').map(n => n.id)).toEqual(['a'])
  })
})

describe('hasEdgeBetween', () => {
  it('returns true for a direct edge source→target', () => {
    expect(hasEdgeBetween([edge('igw', 'fe')], 'igw', 'fe')).toBe(true)
  })
  it('returns true for the reverse direction', () => {
    expect(hasEdgeBetween([edge('igw', 'fe')], 'fe', 'igw')).toBe(true)
  })
  it('returns false when no edge exists', () => {
    expect(hasEdgeBetween([], 'a', 'b')).toBe(false)
  })
})

describe('hasPathBetween', () => {
  it('finds a direct path', () => {
    expect(hasPathBetween([], [edge('a', 'b')], 'a', 'b')).toBe(true)
  })
  it('finds a multi-hop path', () => {
    expect(hasPathBetween([], [edge('a', 'b'), edge('b', 'c')], 'a', 'c')).toBe(true)
  })
  it('returns false when no path exists', () => {
    expect(hasPathBetween([], [edge('a', 'b')], 'a', 'c')).toBe(false)
  })
  it('returns true when source equals target', () => {
    expect(hasPathBetween([], [], 'a', 'a')).toBe(true)
  })
})

describe('isReachableFromIgw', () => {
  it('returns true when target is reachable from igw', () => {
    expect(isReachableFromIgw([], [edge('igw', 'fe')], 'fe')).toBe(true)
  })
  it('returns false when target is not connected', () => {
    expect(isReachableFromIgw([], [], 'fe')).toBe(false)
  })
})
```

- [ ] **Step 1.4: Run the tests and verify they pass**

```bash
cd frontend && npx vitest run src/scenarios/sparkling-water/validation/utils.test.ts
```

Expected: all tests PASS.

- [ ] **Step 1.5: Write `frontend/src/scenarios/sparkling-water/tickets.ts`**

```ts
import type { Ticket } from '@/types/scenario'
import {
  getNodesOfType,
  hasEdgeBetween,
  hasPathBetween,
  isReachableFromIgw,
} from './validation/utils'

const STRUCTURAL_IDS = new Set(['internet', 'igw', 'internet-vpc', 'app-vpc', 'public-subnet', 'private-subnet'])

export const tickets: Ticket[] = [
  {
    id: 'host-website',
    message: "hey rockstar, bossman wants to host their website on the internet. I don't know what those funny words mean, but I trust you can get it done~",
    validate(nodes, edges) {
      const frontends = getNodesOfType(nodes, 'frontend-ec2', 'frontend-ecs')
      return frontends.length > 0 && frontends.some(f => isReachableFromIgw(nodes, edges, f.id))
    },
    objectives: [
      {
        label: 'Frontend is in the public subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'frontend-ec2', 'frontend-ecs').some(f => f.parentId === 'public-subnet')
        },
      },
      {
        label: 'IGW is connected to at least one service',
        check(_nodes, edges) {
          return edges.some(e => {
            const neighbor = e.source === 'igw' ? e.target : e.target === 'igw' ? e.source : null
            return neighbor !== null && !STRUCTURAL_IDS.has(neighbor)
          })
        },
      },
    ],
  },
  {
    id: 'backend-apis',
    message: "hey rockstar, bossman really liked your design man! but they realised it doesnt do anything. They were asking for some backend apis? whatever that means. Anyways get to it~",
    validate(nodes, edges) {
      const backends = getNodesOfType(nodes, 'backend-ec2', 'backend-ecs')
      const frontends = getNodesOfType(nodes, 'frontend-ec2', 'frontend-ecs')
      if (backends.length === 0 || frontends.length === 0) return false
      return backends.some(b => frontends.some(f => hasPathBetween(nodes, edges, f.id, b.id)))
    },
    objectives: [
      {
        label: 'Frontend is in the public subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'frontend-ec2', 'frontend-ecs').some(f => f.parentId === 'public-subnet')
        },
      },
      {
        label: 'Backend is in the private subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'backend-ec2', 'backend-ecs').some(b => b.parentId === 'private-subnet')
        },
      },
    ],
  },
  {
    id: 'database',
    message: "hey rockstar, bossman really likes the ehh-pee-eye that you built. Really some cutting-edge shit. Now he is wondering if he can get in on some of that database hype he has been hearing about.",
    validate(nodes, edges) {
      const rdsList = getNodesOfType(nodes, 'rds')
      const backends = getNodesOfType(nodes, 'backend-ec2', 'backend-ecs')
      if (rdsList.length === 0 || backends.length === 0) return false
      return rdsList.some(rds => backends.some(b => hasEdgeBetween(edges, rds.id, b.id)))
    },
    objectives: [
      {
        label: 'RDS is in the private subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'rds').some(r => r.parentId === 'private-subnet')
        },
      },
    ],
  },
  {
    id: 'scaling',
    message: "hey rockstar, bossman suspects that his sparkling water is going to be all the rage this black friday. people are going to be swamping the site to get some of that spicy water... would be a shame if the site crashes.",
    validate(nodes, edges) {
      const albs = getNodesOfType(nodes, 'alb')
      const asgs = getNodesOfType(nodes, 'asg')
      const computes = getNodesOfType(nodes, 'frontend-ec2', 'frontend-ecs', 'backend-ec2', 'backend-ecs')
      if (albs.length === 0 || asgs.length === 0) return false
      const albToAsg = albs.some(alb => asgs.some(asg => hasEdgeBetween(edges, alb.id, asg.id)))
      if (!albToAsg) return false
      return asgs.some(asg => computes.some(c => hasEdgeBetween(edges, asg.id, c.id)))
    },
    objectives: [
      {
        label: 'ASG fans out to both a frontend and a backend node',
        check(nodes, edges) {
          const asgs = getNodesOfType(nodes, 'asg')
          const frontends = getNodesOfType(nodes, 'frontend-ec2', 'frontend-ecs')
          const backends = getNodesOfType(nodes, 'backend-ec2', 'backend-ecs')
          return asgs.some(asg =>
            frontends.some(f => hasEdgeBetween(edges, asg.id, f.id)) &&
            backends.some(b => hasEdgeBetween(edges, asg.id, b.id))
          )
        },
      },
      {
        label: 'ALB is in the public subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'alb').some(a => a.parentId === 'public-subnet')
        },
      },
    ],
  },
  {
    id: 'security',
    message: "hey rockstar, bossman has been doing some shady shit recently... real sussy baka... anyways i heard that a couple of hackers are targeting him so we might want to lock shit down if you know what i mean.",
    validate(nodes, edges) {
      const wafs = getNodesOfType(nodes, 'waf')
      if (wafs.length === 0) return false
      const wafReachable = wafs.some(waf => isReachableFromIgw(nodes, edges, waf.id))
      if (!wafReachable) return false
      return wafs.some(waf =>
        edges.some(e => {
          const neighbor = e.source === waf.id ? e.target : e.target === waf.id ? e.source : null
          return neighbor !== null && !STRUCTURAL_IDS.has(neighbor)
        })
      )
    },
    objectives: [
      {
        label: 'WAF is in the public subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'waf').some(w => w.parentId === 'public-subnet')
        },
      },
      {
        label: 'WAF is the first service after IGW',
        check(nodes, edges) {
          return getNodesOfType(nodes, 'waf').some(w => hasEdgeBetween(edges, 'igw', w.id))
        },
      },
    ],
  },
]
```

- [ ] **Step 1.6: Write `frontend/src/scenarios/sparkling-water/answer.ts`**

Note: `getSlotPosition` is imported from `@/types/game`. Slot 0 = top-left of each subnet. The `occupiedSlots` on the subnet nodes must match the answer service nodes so the slot grid renders correctly on the answer page.

```ts
import type { Node, Edge } from '@xyflow/react'
import { INITIAL_NODES, INITIAL_EDGES, getSlotPosition } from '@/types/game'

const SERVICE_NODES: Node[] = [
  {
    id: 'ans-waf', type: 'serviceNode', parentId: 'public-subnet', extent: 'parent',
    position: getSlotPosition(0), draggable: false,
    data: { serviceType: 'waf', label: 'WAF', iconSrc: '/aws-icons/waf.svg', tooltip: 'Web Application Firewall', slotIndex: 0 },
  },
  {
    id: 'ans-alb', type: 'serviceNode', parentId: 'public-subnet', extent: 'parent',
    position: getSlotPosition(1), draggable: false,
    data: { serviceType: 'alb', label: 'ALB', iconSrc: '/aws-icons/alb.svg', tooltip: 'Application Load Balancer', slotIndex: 1 },
  },
  {
    id: 'ans-asg', type: 'serviceNode', parentId: 'public-subnet', extent: 'parent',
    position: getSlotPosition(2), draggable: false,
    data: { serviceType: 'asg', label: 'ASG', iconSrc: '/aws-icons/asg.svg', tooltip: 'Auto Scaling Group', slotIndex: 2 },
  },
  {
    id: 'ans-frontend', type: 'serviceNode', parentId: 'public-subnet', extent: 'parent',
    position: getSlotPosition(3), draggable: false,
    data: { serviceType: 'frontend-ecs', label: 'Frontend ECS', iconSrc: '/aws-icons/ecs.svg', tooltip: 'Frontend container', slotIndex: 3 },
  },
  {
    id: 'ans-backend', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(0), draggable: false,
    data: { serviceType: 'backend-ecs', label: 'Backend ECS', iconSrc: '/aws-icons/ecs.svg', tooltip: 'Backend container', slotIndex: 0 },
  },
  {
    id: 'ans-rds', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(1), draggable: false,
    data: { serviceType: 'rds', label: 'RDS', iconSrc: '/aws-icons/rds.svg', tooltip: 'Managed database', slotIndex: 1 },
  },
]

const SERVICE_EDGES: Edge[] = [
  { id: 'igw-to-ans-waf', source: 'igw', target: 'ans-waf', type: 'default' },
  { id: 'ans-waf-to-ans-alb', source: 'ans-waf', target: 'ans-alb', type: 'default' },
  { id: 'ans-alb-to-ans-asg', source: 'ans-alb', target: 'ans-asg', type: 'default' },
  { id: 'ans-asg-to-ans-frontend', source: 'ans-asg', target: 'ans-frontend', sourceHandle: 'to-frontend', type: 'default' },
  { id: 'ans-asg-to-ans-backend', source: 'ans-asg', target: 'ans-backend', sourceHandle: 'to-backend', type: 'default' },
  { id: 'ans-backend-to-ans-rds', source: 'ans-backend', target: 'ans-rds', type: 'default' },
]

export const ANSWER_NODES: Node[] = [
  ...INITIAL_NODES.map(n => {
    if (n.id === 'public-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 0: 'ans-waf', 1: 'ans-alb', 2: 'ans-asg', 3: 'ans-frontend' } } }
    }
    if (n.id === 'private-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 0: 'ans-backend', 1: 'ans-rds' } } }
    }
    return n
  }),
  ...SERVICE_NODES,
]

export const ANSWER_EDGES: Edge[] = [...INITIAL_EDGES, ...SERVICE_EDGES]
```

- [ ] **Step 1.7: Write `frontend/src/scenarios/sparkling-water/index.ts`**

```ts
import type { ScenarioDefinition } from '@/types/scenario'
import { tickets } from './tickets'
import { ANSWER_NODES, ANSWER_EDGES } from './answer'

export const sparklingWater: ScenarioDefinition = {
  id: 'sparkling-water',
  title: 'The Sparkling Water Co.',
  description: 'Help bossman get his sparkling water empire online, one ticket at a time.',
  tickets,
  answerNodes: ANSWER_NODES,
  answerEdges: ANSWER_EDGES,
}
```

- [ ] **Step 1.8: Write `frontend/src/scenarios/index.ts`**

```ts
import type { ScenarioDefinition } from '@/types/scenario'
import { sparklingWater } from './sparkling-water'

export const ALL_SCENARIOS: Record<string, ScenarioDefinition> = {
  [sparklingWater.id]: sparklingWater,
}
```

- [ ] **Step 1.9: Write `frontend/src/scenarios/engine.ts`**

```ts
import type { Node, Edge } from '@xyflow/react'
import type { ValidationResult } from '@/types/scenario'
import { ALL_SCENARIOS } from './index'

export function submitDesign(
  scenarioId: string,
  ticketIndex: number,
  nodes: Node[],
  edges: Edge[],
): ValidationResult {
  const scenario = ALL_SCENARIOS[scenarioId]
  if (!scenario) return { passed: false, objectives: [] }

  for (let i = 0; i <= ticketIndex; i++) {
    if (!scenario.tickets[i].validate(nodes, edges)) {
      const current = scenario.tickets[ticketIndex]
      return {
        passed: false,
        objectives: current.objectives.map(obj => ({ label: obj.label, met: obj.check(nodes, edges) })),
      }
    }
  }

  const current = scenario.tickets[ticketIndex]
  return {
    passed: true,
    objectives: current.objectives.map(obj => ({ label: obj.label, met: obj.check(nodes, edges) })),
  }
}
```

- [ ] **Step 1.10: Run full test suite to confirm no regressions**

```bash
cd frontend && npx vitest run
```

Expected: all tests PASS (existing store tests + new utils tests).

- [ ] **Step 1.11: Commit**

```bash
git add frontend/src/types/scenario.ts \
        frontend/src/scenarios/ \
        && git commit -m "feat: add scenario types, sparkling water scenario, and validation engine"
```

---

### Task 2: Store extensions and routing

**Files:**
- Modify: `frontend/src/store/useGameStore.ts`
- Modify: `frontend/src/store/useGameStore.test.ts`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: nothing from Task 1 directly (store is scenario-agnostic)
- Produces: `useGameStore` fields `currentScenarioId: string | null` and `currentTicketIndex: number`
- Produces: `useGameStore` actions `startScenario(scenarioId: string)` and `advanceTicket()`
- Produces: three routes wired in `App.tsx` (`/`, `/play/:scenarioId`, `/answer/:scenarioId`)

- [ ] **Step 2.1: Add scenario state to `useGameStore.ts`**

Open `frontend/src/store/useGameStore.ts`. The existing `GameStore` interface currently has `nodes`, `edges`, and several action signatures. Add two new fields and two new actions:

In the `GameStore` interface, add after the existing fields:
```ts
currentScenarioId: string | null
currentTicketIndex: number
startScenario: (scenarioId: string) => void
advanceTicket: () => void
```

In the `create<GameStore>()` initial state object, add after `edges: INITIAL_EDGES`:
```ts
currentScenarioId: null,
currentTicketIndex: 0,
```

In the same object, add after the `clearBoard` action:
```ts
startScenario: (scenarioId) => set({
  currentScenarioId: scenarioId,
  currentTicketIndex: 0,
  nodes: INITIAL_NODES,
  edges: INITIAL_EDGES,
}),

advanceTicket: () => set(state => ({
  currentTicketIndex: state.currentTicketIndex + 1,
})),
```

- [ ] **Step 2.2: Write tests for the new store actions**

Open `frontend/src/store/useGameStore.test.ts`. Read its current content first to understand the existing test structure (imports, beforeEach setup, describe blocks). Then append the following describe blocks at the end of the file:

```ts
describe('startScenario', () => {
  beforeEach(() => {
    useGameStore.setState({
      currentScenarioId: null,
      currentTicketIndex: 5,
      nodes: [],
      edges: [],
    })
  })

  it('sets currentScenarioId', () => {
    useGameStore.getState().startScenario('sparkling-water')
    expect(useGameStore.getState().currentScenarioId).toBe('sparkling-water')
  })

  it('resets currentTicketIndex to 0', () => {
    useGameStore.getState().startScenario('sparkling-water')
    expect(useGameStore.getState().currentTicketIndex).toBe(0)
  })

  it('resets the board to initial nodes and edges', () => {
    useGameStore.getState().startScenario('sparkling-water')
    const state = useGameStore.getState()
    expect(state.nodes).toEqual(INITIAL_NODES)
    expect(state.edges).toEqual(INITIAL_EDGES)
  })
})

describe('advanceTicket', () => {
  beforeEach(() => {
    useGameStore.setState({ currentTicketIndex: 0 })
  })

  it('increments currentTicketIndex by 1', () => {
    useGameStore.getState().advanceTicket()
    expect(useGameStore.getState().currentTicketIndex).toBe(1)
  })

  it('increments again on repeated calls', () => {
    useGameStore.getState().advanceTicket()
    useGameStore.getState().advanceTicket()
    expect(useGameStore.getState().currentTicketIndex).toBe(2)
  })
})
```

Make sure `INITIAL_NODES` and `INITIAL_EDGES` are imported at the top of the test file (add to the existing import from `@/types/game` if not already there).

- [ ] **Step 2.3: Run the store tests to verify they pass**

```bash
cd frontend && npx vitest run src/store/useGameStore.test.ts
```

Expected: all tests PASS including the new ones.

- [ ] **Step 2.4: Update `frontend/src/App.tsx` to use Routes**

Replace the entire file content:

```tsx
import { Routes, Route } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ScenarioSelectPage } from '@/pages/ScenarioSelectPage'
import { GameplayPage } from '@/pages/GameplayPage'
import { AnswerPage } from '@/pages/AnswerPage'

export default function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <Routes>
        <Route path="/" element={<ScenarioSelectPage />} />
        <Route path="/play/:scenarioId" element={<GameplayPage />} />
        <Route path="/answer/:scenarioId" element={<AnswerPage />} />
      </Routes>
    </TooltipProvider>
  )
}
```

Note: `main.tsx` already has `<BrowserRouter>` wrapping `<App />` - do NOT modify `main.tsx`. The `BrowserRouter` in `main.tsx` is the router provider; `App.tsx` just declares the routes.

The page components referenced here (`ScenarioSelectPage`, `GameplayPage`, `AnswerPage`) do not exist yet - the TypeScript compiler will error until Task 4. That is expected at this stage.

- [ ] **Step 2.5: Commit**

```bash
git add frontend/src/store/useGameStore.ts \
        frontend/src/store/useGameStore.test.ts \
        frontend/src/App.tsx \
        && git commit -m "feat: add scenario/ticket state to store and wire up React Router routes"
```

---

### Task 3: TicketBanner and ResultModal components

**Files:**
- Run: `npx shadcn@latest add dialog` (from inside `frontend/`)
- Create: `frontend/src/components/gameboard/TicketBanner.tsx`
- Create: `frontend/src/components/gameboard/ResultModal.tsx`

**Interfaces:**
- Consumes: `ValidationResult` from `@/types/scenario` (Task 1)
- Produces: `TicketBanner` component with `message: string` prop
- Produces: `ResultModal` component with `result`, `isLastTicket`, `onNextTicket?`, `onRetry` props

- [ ] **Step 3.1: Add the shadcn Dialog component**

Run from the `frontend/` directory:

```bash
cd frontend && npx shadcn@latest add dialog
```

This creates `frontend/src/components/ui/dialog.tsx`. The `@radix-ui/react-dialog` package is already installed as a transitive dependency so no new package is downloaded.

- [ ] **Step 3.2: Write `frontend/src/components/gameboard/TicketBanner.tsx`**

```tsx
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface TicketBannerProps {
  message: string
}

export function TicketBanner({ message }: TicketBannerProps) {
  const [expanded, setExpanded] = useState(true)
  const isLong = message.length > 120

  return (
    <div className="border-b bg-card px-6 py-3 flex items-start gap-3 shrink-0 min-h-[52px]">
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-relaxed ${!expanded && isLong ? 'line-clamp-1' : ''}`}>
          {message}
        </p>
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={expanded ? 'Collapse ticket' : 'Expand ticket'}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3.3: Write `frontend/src/components/gameboard/ResultModal.tsx`**

`Dialog` from shadcn closes on Esc by default - this is the correct behavior (the `onOpenChange` callback fires with `false` when the user presses Esc, which calls `onRetry` to clear the result).

```tsx
import { CheckCircle2, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ValidationResult } from '@/types/scenario'

interface ResultModalProps {
  result: ValidationResult
  isLastTicket: boolean
  onNextTicket?: () => void
  onRetry: () => void
}

export function ResultModal({ result, isLastTicket, onNextTicket, onRetry }: ResultModalProps) {
  const navigate = useNavigate()

  const title = result.passed && isLastTicket
    ? 'You Win! 🎉'
    : result.passed
    ? 'Ticket Passed!'
    : 'Not quite right'

  const titleColor = result.passed ? 'text-green-500' : 'text-red-500'

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onRetry() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={titleColor}>{title}</DialogTitle>
        </DialogHeader>

        {result.objectives.length > 0 && (
          <div className="space-y-2 py-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Objectives
            </p>
            {result.objectives.map((obj) => (
              <div key={obj.label} className="flex items-center gap-2 text-sm">
                {obj.met
                  ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  : <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                }
                <span className={obj.met ? '' : 'text-muted-foreground'}>{obj.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onRetry}>
            Try Again
          </Button>
          {result.passed && (
            isLastTicket
              ? <Button onClick={() => navigate('/')}>Back to Scenarios</Button>
              : <Button onClick={onNextTicket}>Next Ticket</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3.4: Run the full test suite to confirm no regressions**

```bash
cd frontend && npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 3.5: Commit**

```bash
git add frontend/src/components/ui/dialog.tsx \
        frontend/src/components/gameboard/TicketBanner.tsx \
        frontend/src/components/gameboard/ResultModal.tsx \
        && git commit -m "feat: add TicketBanner and ResultModal components"
```

---

### Task 4: Pages, GameBoard wiring, and FlowCanvas edge deletion

**Files:**
- Create: `frontend/src/pages/ScenarioSelectPage.tsx`
- Create: `frontend/src/pages/GameplayPage.tsx`
- Create: `frontend/src/pages/AnswerPage.tsx`
- Modify: `frontend/src/components/gameboard/GameBoard.tsx`
- Modify: `frontend/src/components/gameboard/canvas/FlowCanvas.tsx`

**Interfaces:**
- Consumes: `ALL_SCENARIOS` from `@/scenarios` (Task 1)
- Consumes: `submitDesign` from `@/scenarios/engine` (Task 1)
- Consumes: `ValidationResult` from `@/types/scenario` (Task 1)
- Consumes: `startScenario`, `advanceTicket`, `currentScenarioId`, `currentTicketIndex` from `useGameStore` (Task 2)
- Consumes: `TicketBanner` from `@/components/gameboard/TicketBanner` (Task 3)
- Consumes: `ResultModal` from `@/components/gameboard/ResultModal` (Task 3)

- [ ] **Step 4.1: Create `frontend/src/pages/ScenarioSelectPage.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { ALL_SCENARIOS } from '@/scenarios'

export function ScenarioSelectPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-2">AWS Architect</h1>
      <p className="text-muted-foreground mb-12">Choose a scenario to begin</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl w-full">
        {Object.values(ALL_SCENARIOS).map(scenario => (
          <Card key={scenario.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{scenario.title}</CardTitle>
              <CardDescription>{scenario.description}</CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto pt-4">
              <Button className="w-full" onClick={() => navigate(`/play/${scenario.id}`)}>
                Play
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4.2: Create `frontend/src/pages/GameplayPage.tsx`**

Key behaviors:
- On mount, calls `startScenario(scenarioId)` if the store's `currentScenarioId` does not match the URL param (handles direct navigation and page refresh)
- Submit triggers a 2-second animation (all edges animate) then evaluates and shows the result modal
- "Try Again" closes the modal without changing game state (`setResult(null)`)
- "Next Ticket" calls `advanceTicket()` then closes the modal
- "Back to Scenarios" (shown on last ticket win) navigates to `/`
- Redirects to `/` if `scenarioId` is not in `ALL_SCENARIOS`

```tsx
import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useGameStore } from '@/store/useGameStore'
import { ALL_SCENARIOS } from '@/scenarios'
import { submitDesign } from '@/scenarios/engine'
import { GameBoard } from '@/components/gameboard/GameBoard'
import { TicketBanner } from '@/components/gameboard/TicketBanner'
import { ResultModal } from '@/components/gameboard/ResultModal'
import type { ValidationResult } from '@/types/scenario'

export function GameplayPage() {
  const { scenarioId } = useParams<{ scenarioId: string }>()
  const currentScenarioId = useGameStore(s => s.currentScenarioId)
  const currentTicketIndex = useGameStore(s => s.currentTicketIndex)
  const nodes = useGameStore(s => s.nodes)
  const edges = useGameStore(s => s.edges)
  const startScenario = useGameStore(s => s.startScenario)
  const advanceTicket = useGameStore(s => s.advanceTicket)

  const [result, setResult] = useState<ValidationResult | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  const scenario = scenarioId ? ALL_SCENARIOS[scenarioId] : null

  useEffect(() => {
    if (!scenarioId || !scenario) return
    // Also resets when the player has completed all tickets and navigates back to replay
    if (scenarioId !== currentScenarioId || currentTicketIndex >= scenario.tickets.length) {
      startScenario(scenarioId)
    }
  }, [scenarioId, currentScenarioId, currentTicketIndex, scenario, startScenario])

  if (!scenario) return <Navigate to="/" replace />

  const ticket = scenario.tickets[currentTicketIndex]
  const isLastTicket = currentTicketIndex === scenario.tickets.length - 1

  function handleSubmit() {
    if (!scenarioId) return
    setIsAnimating(true)
    setTimeout(() => {
      setIsAnimating(false)
      setResult(submitDesign(scenarioId!, currentTicketIndex, nodes, edges))
    }, 2000)
  }

  function handleNextTicket() {
    advanceTicket()
    setResult(null)
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      {ticket && <TicketBanner message={ticket.message} />}
      <div className="flex-1 overflow-hidden">
        <GameBoard onSubmit={handleSubmit} animateAllEdges={isAnimating} />
      </div>
      {result && (
        <ResultModal
          result={result}
          isLastTicket={isLastTicket}
          onNextTicket={result.passed ? handleNextTicket : undefined}
          onRetry={() => setResult(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4.3: Create `frontend/src/pages/AnswerPage.tsx`**

This is a dev-only reference page. It renders a read-only React Flow canvas using the scenario's pre-built answer nodes and edges. No sidebar, no submit button, no store involvement.

```tsx
import { useParams, Navigate } from 'react-router-dom'
import { ReactFlow, ReactFlowProvider, Background } from '@xyflow/react'
import { ALL_SCENARIOS } from '@/scenarios'
import { InternetNode } from '@/components/gameboard/canvas/nodes/InternetNode'
import { IgwNode } from '@/components/gameboard/canvas/nodes/IgwNode'
import { VpcNode } from '@/components/gameboard/canvas/nodes/VpcNode'
import { SubnetNode } from '@/components/gameboard/canvas/nodes/SubnetNode'
import { ServiceNode } from '@/components/gameboard/canvas/nodes/ServiceNode'
import { TrafficEdge } from '@/components/gameboard/canvas/edges/TrafficEdge'

const nodeTypes = {
  internetNode: InternetNode,
  igwNode: IgwNode,
  vpcNode: VpcNode,
  subnetNode: SubnetNode,
  serviceNode: ServiceNode,
}

const edgeTypes = { trafficEdge: TrafficEdge }

export function AnswerPage() {
  const { scenarioId } = useParams<{ scenarioId: string }>()
  const scenario = scenarioId ? ALL_SCENARIOS[scenarioId] : null
  if (!scenario) return <Navigate to="/" replace />

  return (
    <div className="h-screen w-screen bg-background">
      <ReactFlowProvider>
        <ReactFlow
          nodes={scenario.answerNodes}
          edges={scenario.answerEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false}
          nodesConnectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          className="bg-background"
        >
          <Background />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}
```

- [ ] **Step 4.4: Modify `frontend/src/components/gameboard/GameBoard.tsx`**

Three changes:
1. Add `GameBoardProps` interface with `onSubmit?` and `animateAllEdges?`
2. Change `h-screen w-screen` to `h-full w-full` (GameBoard is now inside a flex container in GameplayPage)
3. Add a Submit button in the top-right controls area (shown only when `onSubmit` is provided)
4. Pass `animateAllEdges` to `FlowCanvas`

The existing Clear Board `AlertDialog` is kept unchanged. Read the current file first, then apply these specific edits.

Replace the `export function GameBoard()` signature and opening with:
```tsx
interface GameBoardProps {
  onSubmit?: () => void
  animateAllEdges?: boolean
}

export function GameBoard({ onSubmit, animateAllEdges = false }: GameBoardProps) {
```

Replace `<div className="flex h-screen w-screen overflow-hidden bg-background">` with:
```tsx
<div className="flex h-full w-full overflow-hidden bg-background">
```

Replace `<FlowCanvas />` with:
```tsx
<FlowCanvas animateAllEdges={animateAllEdges} />
```

Replace `<div className="absolute top-4 right-4 z-10">` with:
```tsx
<div className="absolute top-4 right-4 z-10 flex gap-2">
```

Add the Submit button immediately inside that div, before the `<AlertDialog>`:
```tsx
{onSubmit && (
  <Button variant="default" size="sm" className="gap-1.5 shadow-sm" onClick={onSubmit}>
    Submit
  </Button>
)}
```

- [ ] **Step 4.5: Modify `frontend/src/components/gameboard/canvas/FlowCanvas.tsx`**

Two changes:
1. Add `animateAllEdges?: boolean` prop threading through `FlowCanvas` → `FlowCanvasInner`
2. Add `deleteKeyCode={['Backspace', 'Delete']}` to the `<ReactFlow>` element
3. When `animateAllEdges` is true, map all edges to `{ ...e, animated: true }` before passing to `<ReactFlow>`

Add the interface above `FlowCanvasInner`:
```tsx
interface FlowCanvasProps {
  animateAllEdges?: boolean
}
```

Change `function FlowCanvasInner()` to:
```tsx
function FlowCanvasInner({ animateAllEdges = false }: FlowCanvasProps) {
```

After the existing destructure of `useGameStore` in `FlowCanvasInner`, add:
```tsx
const displayEdges = animateAllEdges
  ? edges.map(e => ({ ...e, animated: true }))
  : edges
```

In the `<ReactFlow>` element, change `edges={edges}` to `edges={displayEdges}` and add `deleteKeyCode={['Backspace', 'Delete']}` as a prop.

Change `export function FlowCanvas()` to:
```tsx
export function FlowCanvas({ animateAllEdges = false }: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner animateAllEdges={animateAllEdges} />
    </ReactFlowProvider>
  )
}
```

- [ ] **Step 4.6: Run the full test suite**

```bash
cd frontend && npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 4.7: Build the project to check for TypeScript errors**

```bash
cd frontend && npm run build
```

Expected: build completes with no TypeScript errors. If there are errors, fix them before committing.

- [ ] **Step 4.8: Commit**

```bash
git add frontend/src/pages/ \
        frontend/src/components/gameboard/GameBoard.tsx \
        frontend/src/components/gameboard/canvas/FlowCanvas.tsx \
        && git commit -m "feat: add scenario select, gameplay, and answer pages; wire submit and edge deletion"
```
