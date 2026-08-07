# Spooderman API Scenario Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use the `implementing` skill to execute this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a second game scenario (serverless API Gateway + Lambda), make sidebars per-scenario, move shared validation utils, rename scenario 1, and fix two tooltip bugs.

**System Architecture:** Pure client-side React SPA; no backend. All game state lives in a Zustand store. Scenarios are self-contained TypeScript modules registered in a central index. The canvas is a locked React Flow instance with fixed structural nodes.

**Tech Stack:** React 18, TypeScript, Vite, React Flow (`@xyflow/react`), Zustand, React Router DOM v7, shadcn/ui + Tailwind, Vitest.

## Global Constraints

- All source files live under `frontend/src/`; icons under `frontend/public/aws-icons/`.
- The `aws-icon-packages/` folder must not be deleted or modified.
- Ticket message strings are placeholder text; user will hand-craft copy later.
- Run `cd frontend && npx vitest run` to execute the test suite.
- Run `cd frontend && npx tsc --noEmit` to check TypeScript without building.
- Commit after every task using `git add <specific files> && git commit -m "..."`. Do not use `git add -A`.

---

### Task 1: Copy icon assets

**Files:**
- Create: `frontend/public/aws-icons/api-gateway.svg`
- Create: `frontend/public/aws-icons/lambda.svg`
- Create: `frontend/public/aws-icons/dynamodb.svg`
- Create: `frontend/public/aws-icons/sqs.svg`
- Create: `frontend/public/aws-icons/cognito.svg`

**Interfaces:**
- Produces: five icon paths consumed by Tasks 4 and 6 sidebar item definitions.

- [x] **Step 1: Copy the five SVGs from the package folder**

```bash
cp "aws-icon-packages/Architecture-Service-Icons_04302026/Arch_Networking-Content-Delivery/48/Arch_Amazon-API-Gateway_48.svg" "frontend/public/aws-icons/api-gateway.svg"
cp "aws-icon-packages/Architecture-Service-Icons_04302026/Arch_Compute/48/Arch_AWS-Lambda_48.svg" "frontend/public/aws-icons/lambda.svg"
cp "aws-icon-packages/Architecture-Service-Icons_04302026/Arch_Databases/48/Arch_Amazon-DynamoDB_48.svg" "frontend/public/aws-icons/dynamodb.svg"
cp "aws-icon-packages/Architecture-Service-Icons_04302026/Arch_Application-Integration/48/Arch_Amazon-Simple-Queue-Service_48.svg" "frontend/public/aws-icons/sqs.svg"
cp "aws-icon-packages/Architecture-Service-Icons_04302026/Arch_Security-Identity/48/Arch_Amazon-Cognito_48.svg" "frontend/public/aws-icons/cognito.svg"
```

- [x] **Step 2: Verify all five files landed**

```bash
ls frontend/public/aws-icons/
```

Expected: `alb.svg  api-gateway.svg  asg.svg  cognito.svg  dynamodb.svg  ec2.svg  ecs.svg  igw.svg  lambda.svg  nat.svg  private-subnet.svg  public-subnet.svg  rds.svg  sqs.svg  vpc.svg  waf.svg`

- [x] **Step 3: Commit**

```bash
git add frontend/public/aws-icons/api-gateway.svg frontend/public/aws-icons/lambda.svg frontend/public/aws-icons/dynamodb.svg frontend/public/aws-icons/sqs.svg frontend/public/aws-icons/cognito.svg
git commit -m "feat: add api-gateway, lambda, dynamodb, sqs, cognito icon assets"
```

---

### Task 2: Type system foundation + shared validation utils

**Files:**
- Modify: `frontend/src/types/game.ts` (add 5 ServiceType values; do NOT remove `SIDEBAR_ITEMS` yet - that happens in Task 3)
- Modify: `frontend/src/types/scenario.ts` (add `sidebarItems` field to `ScenarioDefinition`)
- Create: `frontend/src/scenarios/validation/utils.ts`
- Modify: `frontend/src/scenarios/sparkling-water/validation/utils.ts` (replace body with re-exports)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `ServiceType` union now includes `'api-gateway' | 'lambda' | 'dynamodb' | 'sqs' | 'cognito'`
  - `ScenarioDefinition.sidebarItems: SidebarItem[]` (required field)
  - `src/scenarios/validation/utils.ts` exports: `getNodesOfType`, `getNodesInSubnet`, `hasEdgeBetween`, `hasPathBetween`, `isReachableFromIgw` - same signatures as before

- [x] **Step 1: Add 5 new ServiceType values to `frontend/src/types/game.ts`**

Find the `ServiceType` export (line 4) and extend the union:

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
  | 'dynamodb'
  | 'sqs'
  | 'cognito'
```

- [x] **Step 2: Add `sidebarItems` field to `ScenarioDefinition` in `frontend/src/types/scenario.ts`**

Current import line (line 2):
```ts
import type { TrafficAnimationConfig } from '@/types/game'
```

Change to:
```ts
import type { TrafficAnimationConfig, SidebarItem } from '@/types/game'
```

Then add the field at the bottom of `ScenarioDefinition`:
```ts
export interface ScenarioDefinition {
  id: string
  title: string
  description: string
  tickets: Ticket[]
  answerNodes: Node[]
  answerEdges: Edge[]
  sidebarItems: SidebarItem[]
}
```

- [x] **Step 3: Create `frontend/src/scenarios/validation/utils.ts` (shared)**

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

- [x] **Step 4: Replace `frontend/src/scenarios/sparkling-water/validation/utils.ts` with a re-export**

Replace the entire file contents with:

```ts
export {
  getNodesOfType,
  getNodesInSubnet,
  hasEdgeBetween,
  hasPathBetween,
  isReachableFromIgw,
} from '@/scenarios/validation/utils'
```

- [x] **Step 5: Run existing tests to confirm nothing broke**

```bash
cd frontend && npx vitest run
```

Expected: all existing tests pass. The `utils.test.ts` file imports from `./utils` which now re-exports - this is transparent to the test runner.

- [x] **Step 6: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [x] **Step 7: Commit**

```bash
git add frontend/src/types/game.ts frontend/src/types/scenario.ts frontend/src/scenarios/validation/utils.ts frontend/src/scenarios/sparkling-water/validation/utils.ts
git commit -m "refactor: add new ServiceTypes, ScenarioDefinition.sidebarItems, and shared validation utils"
```

---

### Task 3: Store + Sidebar refactor

**Files:**
- Modify: `frontend/src/store/useGameStore.ts`
- Modify: `frontend/src/components/gameboard/Sidebar.tsx`
- Modify: `frontend/src/types/game.ts` (NOW remove `SIDEBAR_ITEMS` export - Sidebar no longer imports it)
- Modify: `frontend/src/store/useGameStore.test.ts`

**Interfaces:**
- Consumes: `ScenarioDefinition` from `@/types/scenario`; `SidebarItem` from `@/types/game` (both exist after Task 2).
- Produces:
  - `useGameStore` state: `sidebarItems: SidebarItem[]` (defaults to `[]`)
  - `useGameStore` action: `setScenario(scenario: ScenarioDefinition): void` - sets `sidebarItems` from the scenario
  - `Sidebar` reads `sidebarItems` from the store instead of the removed `SIDEBAR_ITEMS` constant

- [x] **Step 1: Write failing tests for `setScenario` in `frontend/src/store/useGameStore.test.ts`**

Append this block at the bottom of the file (after the existing `advanceTicket` describe block):

```ts
describe('setScenario', () => {
  beforeEach(() => {
    useGameStore.setState({ sidebarItems: [] })
  })

  it('sets sidebarItems from the scenario definition', () => {
    const mockScenario = {
      id: 'test-scenario',
      title: 'Test',
      description: 'Test scenario',
      tickets: [],
      answerNodes: [],
      answerEdges: [],
      sidebarItems: [
        { serviceType: 'waf' as ServiceType, label: 'WAF', iconSrc: '/aws-icons/waf.svg', tooltip: 'WAF' },
        { serviceType: 'rds' as ServiceType, label: 'RDS', iconSrc: '/aws-icons/rds.svg', tooltip: 'RDS' },
      ],
    }
    useGameStore.getState().setScenario(mockScenario)
    expect(useGameStore.getState().sidebarItems).toHaveLength(2)
    expect(useGameStore.getState().sidebarItems[0].serviceType).toBe('waf')
  })

  it('replaces existing sidebarItems when scenario changes', () => {
    useGameStore.setState({
      sidebarItems: [{ serviceType: 'alb' as ServiceType, label: 'ALB', iconSrc: '/aws-icons/alb.svg', tooltip: 'ALB' }],
    })
    const mockScenario = {
      id: 'test-scenario-2',
      title: 'Test 2',
      description: 'Test 2',
      tickets: [],
      answerNodes: [],
      answerEdges: [],
      sidebarItems: [
        { serviceType: 'lambda' as ServiceType, label: 'Lambda', iconSrc: '/aws-icons/lambda.svg', tooltip: 'Lambda' },
      ],
    }
    useGameStore.getState().setScenario(mockScenario)
    expect(useGameStore.getState().sidebarItems).toHaveLength(1)
    expect(useGameStore.getState().sidebarItems[0].serviceType).toBe('lambda')
  })
})
```

- [x] **Step 2: Run tests to confirm the new tests fail**

```bash
cd frontend && npx vitest run
```

Expected: the two new `setScenario` tests fail with "sidebarItems is not a function" or similar.

- [x] **Step 3: Add `sidebarItems` state and `setScenario` action to `frontend/src/store/useGameStore.ts`**

Add these imports at the top (after the existing imports from `@/types/game`):

```ts
import type { SidebarItem } from '@/types/game'
import type { ScenarioDefinition } from '@/types/scenario'
```

Add `sidebarItems` and `setScenario` to the `GameStore` interface:

```ts
interface GameStore {
  nodes: Node[]
  edges: Edge[]
  sidebarItems: SidebarItem[]
  currentScenarioId: string | null
  currentTicketIndex: number
  addServiceNode: (node: Node) => void
  removeNode: (nodeId: string) => void
  moveNodeToSlot: (nodeId: string, newSlotIndex: number) => void
  clearBoard: () => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  splitEdge: (edgeId: string, newNodeId: string) => void
  startScenario: (scenarioId: string) => void
  setScenario: (scenario: ScenarioDefinition) => void
  advanceTicket: () => void
}
```

In the `create(...)` call, add `sidebarItems: []` to the initial state and the `setScenario` action. Place `sidebarItems` right after `edges`:

```ts
export const useGameStore = create<GameStore>()((set, _get) => ({
  nodes: INITIAL_NODES,
  edges: INITIAL_EDGES,
  sidebarItems: [],
  currentScenarioId: null,
  currentTicketIndex: 0,
  // ... all existing actions unchanged ...
  setScenario: (scenario) => set({ sidebarItems: scenario.sidebarItems }),
}))
```

Add `setScenario` before or after `advanceTicket` - either position is fine.

- [x] **Step 4: Run tests to confirm `setScenario` tests now pass**

```bash
cd frontend && npx vitest run
```

Expected: all tests pass, including the two new `setScenario` tests.

- [x] **Step 5: Update `frontend/src/components/gameboard/Sidebar.tsx` to read from store**

Replace the import line:
```ts
import { SIDEBAR_ITEMS } from '@/types/game'
```
with:
```ts
import { useGameStore } from '@/store/useGameStore'
```

Inside `Sidebar()`, add at the top of the function body:
```ts
const sidebarItems = useGameStore(s => s.sidebarItems)
```

Replace both occurrences of `SIDEBAR_ITEMS` (the filter and the fallback) with `sidebarItems`. The `filtered` variable becomes:
```ts
const filtered = query.trim()
  ? sidebarItems.filter(item =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.serviceType.toLowerCase().includes(query.toLowerCase())
    )
  : sidebarItems
```

- [x] **Step 6: Remove `SIDEBAR_ITEMS` from `frontend/src/types/game.ts`**

Delete the entire `SIDEBAR_ITEMS` constant (the `export const SIDEBAR_ITEMS: SidebarItem[] = [...]` block, roughly lines 79-92 in the original file). Leave all other exports untouched.

- [x] **Step 7: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors. If `SIDEBAR_ITEMS` is still imported anywhere, the compiler will tell you which file.

- [x] **Step 8: Run full test suite**

```bash
cd frontend && npx vitest run
```

Expected: all tests pass.

- [x] **Step 9: Commit**

```bash
git add frontend/src/store/useGameStore.ts frontend/src/store/useGameStore.test.ts frontend/src/components/gameboard/Sidebar.tsx frontend/src/types/game.ts
git commit -m "refactor: per-scenario sidebar via setScenario store action; remove global SIDEBAR_ITEMS"
```

---

### Task 4: Sparkling Secret updates + GameplayPage wiring

**Files:**
- Modify: `frontend/src/scenarios/sparkling-water/index.ts`
- Modify: `frontend/src/pages/GameplayPage.tsx`

**Interfaces:**
- Consumes: `SidebarItem` from `@/types/game`; `setScenario` action from store (Task 3); `sidebarItems` field on `ScenarioDefinition` (Task 2).
- Produces: Sparkling Secret scenario conforms to the updated `ScenarioDefinition`; `GameplayPage` calls `setScenario` on mount so the sidebar populates correctly.

- [x] **Step 1: Update `frontend/src/scenarios/sparkling-water/index.ts`**

Replace the entire file with:

```ts
import type { ScenarioDefinition } from '@/types/scenario'
import type { SidebarItem } from '@/types/game'
import { tickets } from './tickets'
import { ANSWER_NODES, ANSWER_EDGES } from './answer'

const sidebarItems: SidebarItem[] = [
  { serviceType: 'frontend-ec2', label: 'Frontend EC2', iconSrc: '/aws-icons/ec2.svg', tooltip: 'Virtual server hosting the frontend web application' },
  { serviceType: 'backend-ec2', label: 'Backend EC2', iconSrc: '/aws-icons/ec2.svg', tooltip: 'Virtual server hosting the backend API' },
  { serviceType: 'frontend-ecs', label: 'Frontend ECS', iconSrc: '/aws-icons/ecs.svg', tooltip: 'Containerised frontend application managed by ECS' },
  { serviceType: 'backend-ecs', label: 'Backend ECS', iconSrc: '/aws-icons/ecs.svg', tooltip: 'Containerised backend API managed by ECS' },
  { serviceType: 'asg', label: 'Auto Scaling Group', iconSrc: '/aws-icons/asg.svg', tooltip: 'Automatically adjusts compute capacity based on demand', extraHandles: [
    { type: 'source', position: 'Bottom', id: 'to-frontend', style: { left: '30%' }, colorClass: '!bg-primary' },
    { type: 'source', position: 'Bottom', id: 'to-backend', style: { left: '70%' }, colorClass: '!bg-primary' },
  ] },
  { serviceType: 'waf', label: 'WAF', iconSrc: '/aws-icons/waf.svg', tooltip: 'Web Application Firewall - filters and monitors HTTP traffic' },
  { serviceType: 'nat', label: 'NAT Gateway', iconSrc: '/aws-icons/nat.svg', tooltip: 'Enables private subnet resources to reach the internet' },
  { serviceType: 'rds', label: 'RDS', iconSrc: '/aws-icons/rds.svg', tooltip: 'Managed relational database service' },
  { serviceType: 'alb', label: 'ALB', iconSrc: '/aws-icons/alb.svg', tooltip: 'Application Load Balancer - distributes incoming traffic across targets' },
]

export const sparklingWater: ScenarioDefinition = {
  id: 'sparkling-water',
  title: 'Sparkling Secret',
  description: 'Help bossman get his sparkling water empire online, one ticket at a time.',
  tickets,
  answerNodes: ANSWER_NODES,
  answerEdges: ANSWER_EDGES,
  sidebarItems,
}
```

- [x] **Step 2: Wire `setScenario` in `frontend/src/pages/GameplayPage.tsx`**

Add `setScenario` to the store subscriptions (near line 28, alongside the other `useGameStore` selectors):

```ts
const setScenario = useGameStore(s => s.setScenario)
```

Add a new `useEffect` below the existing one:

```ts
useEffect(() => {
  if (!scenario) return
  setScenario(scenario)
}, [scenario, setScenario])
```

Also add `setScenario` to the existing useEffect dependency array if a linter complains, though it is not in the existing condition logic so it does not need to be there.

- [x] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [x] **Step 4: Run full test suite**

```bash
cd frontend && npx vitest run
```

Expected: all tests pass.

- [x] **Step 5: Commit**

```bash
git add frontend/src/scenarios/sparkling-water/index.ts frontend/src/pages/GameplayPage.tsx
git commit -m "feat: rename scenario 1 to Sparkling Secret, add sidebarItems, wire setScenario on GameplayPage mount"
```

---

### Task 5: Tooltip bug fixes

**Files:**
- Modify: `frontend/src/components/gameboard/canvas/nodes/IgwNode.tsx`
- Modify: `frontend/src/components/gameboard/canvas/nodes/InternetNode.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: both canvas nodes show a tooltip on hover; no automated tests (visual verification required).

- [x] **Step 1: Fix pointer-events on `IgwNode.tsx`**

The node has `selectable: false` in `INITIAL_NODES`, which causes React Flow to set `pointer-events: none` on the wrapper element. The tooltip trigger never receives hover events. Fix by adding `style={{ pointerEvents: 'all' }}` to the outermost `<div>` inside the component.

Current outer div (line 9):
```tsx
<div className="flex flex-col items-center gap-1 select-none w-20 cursor-default">
```

Replace with:
```tsx
<div className="flex flex-col items-center gap-1 select-none w-20 cursor-default" style={{ pointerEvents: 'all' }}>
```

- [x] **Step 2: Add tooltip to `InternetNode.tsx`**

Replace the entire file with:

```tsx
import { Handle, Position } from '@xyflow/react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

export function InternetNode() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center gap-1 select-none w-20" style={{ pointerEvents: 'all' }}>
            <img src="/aws-icons/vpc.svg" alt="Internet" className="w-12 h-12" />
            <span className="text-xs font-medium text-foreground">The Internet</span>
            <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-center">
          The public internet - traffic originates here before hitting the IGW
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
```

- [x] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [x] **Step 4: Visual verification**

Start the dev server (`docker compose up` or `cd frontend && npm run dev`) and open the game. Hover over the IGW node and the Internet cloud node. Both should show tooltips within ~300ms.

- [x] **Step 5: Commit**

```bash
git add frontend/src/components/gameboard/canvas/nodes/IgwNode.tsx frontend/src/components/gameboard/canvas/nodes/InternetNode.tsx
git commit -m "fix: restore IGW tooltip pointer-events; add tooltip to InternetNode"
```

---

### Task 6: Spooderman API scenario

**Files:**
- Create: `frontend/src/scenarios/spooderman-api/tickets.ts`
- Create: `frontend/src/scenarios/spooderman-api/tickets.test.ts`
- Create: `frontend/src/scenarios/spooderman-api/answer.ts`
- Create: `frontend/src/scenarios/spooderman-api/index.ts`
- Modify: `frontend/src/scenarios/index.ts`

**Interfaces:**
- Consumes: shared validation utils from `@/scenarios/validation/utils`; `INITIAL_NODES`, `INITIAL_EDGES`, `getSlotPosition` from `@/types/game`; `ScenarioDefinition`, `SidebarItem` types.
- Produces: `spooderman-api` registered in `ALL_SCENARIOS`; accessible at `/play/spooderman-api` and `/answer/spooderman-api`.

- [x] **Step 1: Write failing validator tests in `frontend/src/scenarios/spooderman-api/tickets.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import type { Node, Edge } from '@xyflow/react'
import { tickets } from './tickets'

const BASE_NODES: Node[] = [
  { id: 'igw', type: 'igwNode', position: { x: 0, y: 0 }, data: {} },
  { id: 'public-subnet', type: 'subnetNode', position: { x: 0, y: 0 }, data: { subnetType: 'public', label: 'Public', occupiedSlots: {} } },
  { id: 'private-subnet', type: 'subnetNode', position: { x: 0, y: 0 }, data: { subnetType: 'private', label: 'Private', occupiedSlots: {} } },
]

function makeService(id: string, serviceType: string, subnetId = 'public-subnet'): Node {
  return {
    id,
    type: 'serviceNode',
    parentId: subnetId,
    position: { x: 0, y: 0 },
    data: { serviceType, label: serviceType, iconSrc: '', tooltip: '', slotIndex: 0 },
  }
}

function edge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target }
}

describe('ticket 1 - api-online', () => {
  const ticket = tickets[0]

  it('fails when no api-gateway is present', () => {
    const nodes = [...BASE_NODES, makeService('lambda1', 'lambda', 'private-subnet')]
    expect(ticket.validate(nodes, [edge('igw', 'lambda1')])).toBe(false)
  })

  it('fails when api-gateway is not reachable from IGW', () => {
    const nodes = [
      ...BASE_NODES,
      makeService('apigw', 'api-gateway', 'public-subnet'),
      makeService('lambda1', 'lambda', 'private-subnet'),
    ]
    expect(ticket.validate(nodes, [edge('apigw', 'lambda1')])).toBe(false)
  })

  it('passes when api-gateway is reachable from IGW and connected to a lambda', () => {
    const nodes = [
      ...BASE_NODES,
      makeService('apigw', 'api-gateway', 'public-subnet'),
      makeService('lambda1', 'lambda', 'private-subnet'),
    ]
    expect(ticket.validate(nodes, [edge('igw', 'apigw'), edge('apigw', 'lambda1')])).toBe(true)
  })
})

describe('ticket 4 - async-processing', () => {
  const ticket = tickets[3]

  const fullSetup = (extraNodes: Node[], extraEdges: Edge[]) => {
    const nodes = [
      ...BASE_NODES,
      makeService('cognito1', 'cognito', 'public-subnet'),
      makeService('apigw', 'api-gateway', 'public-subnet'),
      makeService('dynamodb1', 'dynamodb', 'private-subnet'),
      ...extraNodes,
    ]
    const baseEdges = [
      edge('igw', 'cognito1'), edge('cognito1', 'apigw'),
    ]
    return ticket.validate(nodes, [...baseEdges, ...extraEdges])
  }

  it('fails with only one lambda', () => {
    const result = fullSetup(
      [makeService('lambda1', 'lambda', 'private-subnet'), makeService('sqs1', 'sqs', 'private-subnet')],
      [edge('apigw', 'lambda1'), edge('lambda1', 'sqs1'), edge('lambda1', 'dynamodb1')],
    )
    expect(result).toBe(false)
  })

  it('passes with two lambdas and sqs between them', () => {
    const result = fullSetup(
      [
        makeService('lambda1', 'lambda', 'private-subnet'),
        makeService('sqs1', 'sqs', 'private-subnet'),
        makeService('lambda2', 'lambda', 'private-subnet'),
      ],
      [
        edge('apigw', 'lambda1'),
        edge('lambda1', 'sqs1'),
        edge('sqs1', 'lambda2'),
        edge('lambda1', 'dynamodb1'),
      ],
    )
    expect(result).toBe(true)
  })
})
```

- [x] **Step 2: Run tests to confirm they fail (tickets module does not exist yet)**

```bash
cd frontend && npx vitest run src/scenarios/spooderman-api/tickets.test.ts
```

Expected: error - cannot find module `./tickets`.

- [x] **Step 3: Create `frontend/src/scenarios/spooderman-api/tickets.ts`**

```ts
import type { Ticket } from '@/types/scenario'
import {
  getNodesOfType,
  hasEdgeBetween,
  hasPathBetween,
  isReachableFromIgw,
} from '@/scenarios/validation/utils'

const STRUCTURAL_IDS = new Set(['internet', 'igw', 'internet-vpc', 'app-vpc', 'public-subnet', 'private-subnet'])

export const tickets: Ticket[] = [
  {
    id: 'api-online',
    message: '[placeholder] Put the API on the internet.',
    validate(nodes, edges) {
      const gateways = getNodesOfType(nodes, 'api-gateway')
      const lambdas = getNodesOfType(nodes, 'lambda')
      if (gateways.length === 0 || lambdas.length === 0) return false
      const gatewayReachable = gateways.some(gw => isReachableFromIgw(nodes, edges, gw.id))
      if (!gatewayReachable) return false
      return gateways.some(gw => lambdas.some(l => hasPathBetween(nodes, edges, gw.id, l.id)))
    },
    objectives: [
      {
        label: 'API Gateway is in the public subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'api-gateway').some(n => n.parentId === 'public-subnet')
        },
      },
      {
        label: 'Lambda is in the private subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'lambda').some(n => n.parentId === 'private-subnet')
        },
      },
    ],
  },
  {
    id: 'save-data',
    message: '[placeholder] We need to save stuff.',
    validate(nodes, edges) {
      const dynamos = getNodesOfType(nodes, 'dynamodb')
      const lambdas = getNodesOfType(nodes, 'lambda')
      if (dynamos.length === 0 || lambdas.length === 0) return false
      return dynamos.some(db => lambdas.some(l => hasEdgeBetween(edges, db.id, l.id)))
    },
    objectives: [
      {
        label: 'DynamoDB is in the private subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'dynamodb').some(n => n.parentId === 'private-subnet')
        },
      },
    ],
  },
  {
    id: 'auth',
    message: '[placeholder] Users are logging in as each other.',
    validate(nodes, edges) {
      const cognitos = getNodesOfType(nodes, 'cognito')
      const gateways = getNodesOfType(nodes, 'api-gateway')
      if (cognitos.length === 0 || gateways.length === 0) return false
      const cognitoReachable = cognitos.some(c => isReachableFromIgw(nodes, edges, c.id))
      if (!cognitoReachable) return false
      return cognitos.some(c => gateways.some(gw => hasEdgeBetween(edges, c.id, gw.id)))
    },
    objectives: [
      {
        label: 'Cognito is in the public subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'cognito').some(n => n.parentId === 'public-subnet')
        },
      },
      {
        label: 'Cognito is directly connected to API Gateway',
        check(nodes, edges) {
          const cognitos = getNodesOfType(nodes, 'cognito')
          const gateways = getNodesOfType(nodes, 'api-gateway')
          return cognitos.some(c => gateways.some(gw => hasEdgeBetween(edges, c.id, gw.id)))
        },
      },
    ],
  },
  {
    id: 'async-processing',
    trafficAnimation: { bubbleCount: 8, bubbleSpeed: 1.2 },
    message: '[placeholder] Requests are timing out.',
    validate(nodes, edges) {
      const sqsList = getNodesOfType(nodes, 'sqs')
      const lambdas = getNodesOfType(nodes, 'lambda')
      if (sqsList.length === 0 || lambdas.length < 2) return false
      const lambdaToSqs = sqsList.some(sqs => lambdas.some(l => hasEdgeBetween(edges, l.id, sqs.id)))
      const sqsToLambda = sqsList.some(sqs => lambdas.some(l => hasEdgeBetween(edges, sqs.id, l.id)))
      return lambdaToSqs && sqsToLambda
    },
    objectives: [
      {
        label: 'SQS is in the private subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'sqs').some(n => n.parentId === 'private-subnet')
        },
      },
      {
        label: 'Two Lambda functions are present',
        check(nodes) {
          return getNodesOfType(nodes, 'lambda').length >= 2
        },
      },
    ],
  },
  {
    id: 'security',
    trafficAnimation: { bubbleColor: '#ef4444', bubbleCount: 6, bubbleSpeed: 1.6 },
    message: '[placeholder] Security team is breathing down our necks.',
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
        label: 'WAF is directly connected to IGW',
        check(nodes, edges) {
          return getNodesOfType(nodes, 'waf').some(w => hasEdgeBetween(edges, 'igw', w.id))
        },
      },
    ],
  },
]
```

- [x] **Step 4: Run validator tests to confirm they pass**

```bash
cd frontend && npx vitest run src/scenarios/spooderman-api/tickets.test.ts
```

Expected: all 5 tests pass.

- [x] **Step 5: Create `frontend/src/scenarios/spooderman-api/answer.ts`**

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
    id: 'ans-cognito', type: 'serviceNode', parentId: 'public-subnet', extent: 'parent',
    position: getSlotPosition(1), draggable: false,
    data: { serviceType: 'cognito', label: 'Cognito', iconSrc: '/aws-icons/cognito.svg', tooltip: 'Managed user authentication', slotIndex: 1 },
  },
  {
    id: 'ans-apigw', type: 'serviceNode', parentId: 'public-subnet', extent: 'parent',
    position: getSlotPosition(2), draggable: false,
    data: { serviceType: 'api-gateway', label: 'API Gateway', iconSrc: '/aws-icons/api-gateway.svg', tooltip: 'Managed API entry point', slotIndex: 2 },
  },
  {
    id: 'ans-lambda-handler', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(0), draggable: false,
    data: { serviceType: 'lambda', label: 'Lambda', iconSrc: '/aws-icons/lambda.svg', tooltip: 'Request handler function', slotIndex: 0 },
  },
  {
    id: 'ans-sqs', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(1), draggable: false,
    data: { serviceType: 'sqs', label: 'SQS', iconSrc: '/aws-icons/sqs.svg', tooltip: 'Message queue', slotIndex: 1 },
  },
  {
    id: 'ans-lambda-worker', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(2), draggable: false,
    data: { serviceType: 'lambda', label: 'Lambda', iconSrc: '/aws-icons/lambda.svg', tooltip: 'Async worker function', slotIndex: 2 },
  },
  {
    id: 'ans-dynamodb', type: 'serviceNode', parentId: 'private-subnet', extent: 'parent',
    position: getSlotPosition(3), draggable: false,
    data: { serviceType: 'dynamodb', label: 'DynamoDB', iconSrc: '/aws-icons/dynamodb.svg', tooltip: 'NoSQL database', slotIndex: 3 },
  },
]

const SERVICE_EDGES: Edge[] = [
  { id: 'igw-to-ans-waf', source: 'igw', target: 'ans-waf', type: 'trafficEdge' },
  { id: 'ans-waf-to-ans-cognito', source: 'ans-waf', target: 'ans-cognito', type: 'trafficEdge' },
  { id: 'ans-cognito-to-ans-apigw', source: 'ans-cognito', target: 'ans-apigw', type: 'trafficEdge' },
  { id: 'ans-apigw-to-ans-lambda-handler', source: 'ans-apigw', target: 'ans-lambda-handler', type: 'trafficEdge' },
  { id: 'ans-lambda-handler-to-ans-sqs', source: 'ans-lambda-handler', target: 'ans-sqs', type: 'trafficEdge' },
  { id: 'ans-sqs-to-ans-lambda-worker', source: 'ans-sqs', target: 'ans-lambda-worker', type: 'trafficEdge' },
  { id: 'ans-lambda-handler-to-ans-dynamodb', source: 'ans-lambda-handler', target: 'ans-dynamodb', type: 'trafficEdge' },
]

export const ANSWER_NODES: Node[] = [
  ...INITIAL_NODES.map(n => {
    if (n.id === 'public-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 0: 'ans-waf', 1: 'ans-cognito', 2: 'ans-apigw' } } }
    }
    if (n.id === 'private-subnet') {
      return { ...n, data: { ...n.data, occupiedSlots: { 0: 'ans-lambda-handler', 1: 'ans-sqs', 2: 'ans-lambda-worker', 3: 'ans-dynamodb' } } }
    }
    return n
  }),
  ...SERVICE_NODES,
]

export const ANSWER_EDGES: Edge[] = [...INITIAL_EDGES, ...SERVICE_EDGES]
```

- [x] **Step 6: Create `frontend/src/scenarios/spooderman-api/index.ts`**

```ts
import type { ScenarioDefinition } from '@/types/scenario'
import type { SidebarItem } from '@/types/game'
import { tickets } from './tickets'
import { ANSWER_NODES, ANSWER_EDGES } from './answer'

const sidebarItems: SidebarItem[] = [
  { serviceType: 'api-gateway', label: 'API Gateway', iconSrc: '/aws-icons/api-gateway.svg', tooltip: 'Managed API entry point - routes HTTP requests to backend services' },
  { serviceType: 'lambda', label: 'Lambda', iconSrc: '/aws-icons/lambda.svg', tooltip: 'Serverless function - runs code without provisioning servers' },
  { serviceType: 'dynamodb', label: 'DynamoDB', iconSrc: '/aws-icons/dynamodb.svg', tooltip: 'Managed NoSQL database - fast, flexible, serverless-native' },
  { serviceType: 'sqs', label: 'SQS', iconSrc: '/aws-icons/sqs.svg', tooltip: 'Simple Queue Service - decouples components with managed message queuing' },
  { serviceType: 'cognito', label: 'Cognito', iconSrc: '/aws-icons/cognito.svg', tooltip: 'Managed user authentication and authorisation' },
  { serviceType: 'waf', label: 'WAF', iconSrc: '/aws-icons/waf.svg', tooltip: 'Web Application Firewall - filters and monitors HTTP traffic' },
]

export const spoodermanApi: ScenarioDefinition = {
  id: 'spooderman-api',
  title: 'Spooderman API',
  description: "Bossman has been reading Medium articles. Time to go serverless.",
  tickets,
  answerNodes: ANSWER_NODES,
  answerEdges: ANSWER_EDGES,
  sidebarItems,
}
```

- [x] **Step 7: Register the scenario in `frontend/src/scenarios/index.ts`**

Replace the entire file with:

```ts
import type { ScenarioDefinition } from '@/types/scenario'
import { sparklingWater } from './sparkling-water'
import { spoodermanApi } from './spooderman-api'

export const ALL_SCENARIOS: Record<string, ScenarioDefinition> = {
  [sparklingWater.id]: sparklingWater,
  [spoodermanApi.id]: spoodermanApi,
}
```

- [x] **Step 8: Run full test suite**

```bash
cd frontend && npx vitest run
```

Expected: all tests pass, including the new validator tests.

- [x] **Step 9: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [x] **Step 10: Commit**

```bash
git add frontend/src/scenarios/spooderman-api/tickets.ts frontend/src/scenarios/spooderman-api/tickets.test.ts frontend/src/scenarios/spooderman-api/answer.ts frontend/src/scenarios/spooderman-api/index.ts frontend/src/scenarios/index.ts
git commit -m "feat: add Spooderman API scenario (5 tickets, serverless API Gateway + Lambda pattern)"
```
