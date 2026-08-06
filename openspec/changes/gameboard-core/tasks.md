# Gameboard Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use the `implementing` skill to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive AWS architecture gameboard - a locked React Flow canvas with a draggable service sidebar, subnet slot grids, user-drawn Bezier edges, mid-edge node insertion, and hover tooltips.

**System Architecture:** Single-page React frontend (Vite + TypeScript). No backend. React Flow parent/child node system for subnet grouping; Zustand v5 for all canvas state; all icons served as local SVGs from `public/aws-icons/`.

**Tech Stack:** `@xyflow/react` v12, Zustand v5, shadcn/ui, Radix Tooltip (via `components/ui/tooltip.tsx`), Tailwind CSS, `lucide-react`, TypeScript.

## Global Constraints

- All internal imports use the `@/` alias resolving to `frontend/src/`. Never use `../../` across feature boundaries.
- All class composition must use `cn()` from `@/lib/utils`. Never concatenate Tailwind strings directly.
- All colors use CSS HSL variables (`bg-background`, `text-foreground`, `border-border`, etc.). No raw hex or slate/gray classes.
- React Flow imports come from `@xyflow/react`, never from `reactflow`.
- Child nodes inside parent nodes require `parentId` (not `parentNode`) and `extent: 'parent'`.
- Zustand v5 store is created with `create<State>()()` (curried generic form).
- shadcn tooltip components are imported from `@/components/ui/tooltip`, not from `@radix-ui/react-tooltip` directly.
- Lucide icons (`X`, `ChevronLeft`, `ChevronRight`) for all icon buttons - no inline SVG for UI chrome.
- All commits omit co-author lines (project preference).

---

### Task 1: Foundation - Types, Store, and CSS

**Files:**
- Create: `frontend/src/types/game.ts`
- Create: `frontend/src/store/useGameStore.ts`
- Create: `frontend/src/store/useGameStore.test.ts`
- Modify: `frontend/src/index.css` (prepend React Flow stylesheet import)

**Interfaces:**
- Produces: `ServiceType`, `SidebarItem`, `ServiceNodeData`, `SubnetNodeData`, `getSlotPosition()`, `SIDEBAR_ITEMS`, `useGameStore` with `addServiceNode`, `removeNode`, `onNodesChange`, `onEdgesChange`, `onConnect`, `splitEdge`

- [ ] **Step 1: Prepend the React Flow stylesheet to `frontend/src/index.css`**

Open `frontend/src/index.css`. Add this as the very first line (before any existing content):

```css
@import '@xyflow/react/dist/style.css';
```

- [ ] **Step 2: Write `frontend/src/types/game.ts`**

```typescript
import type { Node, Edge } from '@xyflow/react'

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

export interface SidebarItem {
  serviceType: ServiceType
  label: string
  iconSrc: string
  tooltip: string
}

export interface ServiceNodeData extends Record<string, unknown> {
  serviceType: ServiceType
  label: string
  iconSrc: string
  tooltip: string
  slotIndex: number
}

export interface SubnetNodeData extends Record<string, unknown> {
  subnetType: 'public' | 'private'
  label: string
  occupiedSlots: Record<number, string>
}

export interface VpcNodeData extends Record<string, unknown> {
  label: string
}

export type AppNode = Node<ServiceNodeData, 'serviceNode'>
  | Node<SubnetNodeData, 'subnetNode'>
  | Node<VpcNodeData, 'vpcNode'>
  | Node<Record<string, unknown>, 'internetNode'>
  | Node<Record<string, unknown>, 'igwNode'>

export type AppEdge = Edge

// Slot grid constants
export const SLOTS_PER_ROW = 5
export const SLOT_WIDTH = 76
export const SLOT_HEIGHT = 90
export const SLOT_START_X = 20
export const SLOT_START_Y = 50

export function getSlotPosition(slotIndex: number): { x: number; y: number } {
  const col = slotIndex % SLOTS_PER_ROW
  const row = Math.floor(slotIndex / SLOTS_PER_ROW)
  return {
    x: SLOT_START_X + col * SLOT_WIDTH,
    y: SLOT_START_Y + row * SLOT_HEIGHT,
  }
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { serviceType: 'frontend-ec2', label: 'Frontend EC2', iconSrc: '/aws-icons/ec2.svg', tooltip: 'Virtual server hosting the frontend web application' },
  { serviceType: 'backend-ec2', label: 'Backend EC2', iconSrc: '/aws-icons/ec2.svg', tooltip: 'Virtual server hosting the backend API' },
  { serviceType: 'frontend-ecs', label: 'Frontend ECS', iconSrc: '/aws-icons/ecs.svg', tooltip: 'Containerised frontend application managed by ECS' },
  { serviceType: 'backend-ecs', label: 'Backend ECS', iconSrc: '/aws-icons/ecs.svg', tooltip: 'Containerised backend API managed by ECS' },
  { serviceType: 'asg', label: 'Auto Scaling Group', iconSrc: '/aws-icons/asg.svg', tooltip: 'Automatically adjusts compute capacity based on demand' },
  { serviceType: 'waf', label: 'WAF', iconSrc: '/aws-icons/waf.svg', tooltip: 'Web Application Firewall - filters and monitors HTTP traffic' },
  { serviceType: 'nat', label: 'NAT Gateway', iconSrc: '/aws-icons/nat.svg', tooltip: 'Enables private subnet resources to reach the internet' },
  { serviceType: 'rds', label: 'RDS', iconSrc: '/aws-icons/rds.svg', tooltip: 'Managed relational database service' },
  { serviceType: 'alb', label: 'ALB', iconSrc: '/aws-icons/alb.svg', tooltip: 'Application Load Balancer - distributes incoming traffic across targets' },
]

// --- Initial canvas layout ---
// These live here so the Zustand store can use them as its initial state,
// avoiding the useEffect timing problem (fitView fires before nodes exist).

const SUBNET_WIDTH = SLOT_START_X * 2 + SLOTS_PER_ROW * SLOT_WIDTH
const SUBNET_HEIGHT = SLOT_START_Y + 2 * SLOT_HEIGHT + 20
const APP_VPC_WIDTH = SUBNET_WIDTH + 60
const APP_VPC_HEIGHT = SUBNET_HEIGHT * 2 + 80

export const INITIAL_NODES: Node[] = [
  { id: 'internet', type: 'internetNode', position: { x: 40, y: 300 }, data: {}, draggable: false, deletable: false, selectable: false },
  { id: 'internet-vpc', type: 'vpcNode', position: { x: 220, y: 200 }, data: { label: 'Internet VPC' }, draggable: false, deletable: false, selectable: false, style: { width: 200, height: 180 } },
  { id: 'igw', type: 'igwNode', position: { x: 60, y: 55 }, parentId: 'internet-vpc', extent: 'parent', data: {}, draggable: false, deletable: false, selectable: false },
  { id: 'app-vpc', type: 'vpcNode', position: { x: 490, y: 80 }, data: { label: 'Application VPC' }, draggable: false, deletable: false, selectable: false, style: { width: APP_VPC_WIDTH, height: APP_VPC_HEIGHT } },
  { id: 'public-subnet', type: 'subnetNode', position: { x: 30, y: 70 }, parentId: 'app-vpc', extent: 'parent', data: { subnetType: 'public', label: 'Public Subnet', occupiedSlots: {} }, draggable: false, deletable: false, selectable: false },
  { id: 'private-subnet', type: 'subnetNode', position: { x: 30, y: SUBNET_HEIGHT + 100 }, parentId: 'app-vpc', extent: 'parent', data: { subnetType: 'private', label: 'Private Subnet', occupiedSlots: {} }, draggable: false, deletable: false, selectable: false },
]

export const INITIAL_EDGES: Edge[] = [
  { id: 'internet-to-igw', source: 'internet', target: 'igw', type: 'trafficEdge' },
  { id: 'igw-to-public-subnet', source: 'igw', target: 'public-subnet', type: 'default' },
]
```

- [ ] **Step 3: Write the failing store tests in `frontend/src/store/useGameStore.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '@/store/useGameStore'
import type { ServiceType } from '@/types/game'

const makeServiceNode = (id: string, serviceType: ServiceType = 'waf') => ({
  id,
  type: 'serviceNode' as const,
  position: { x: 0, y: 0 },
  parentId: 'public-subnet',
  extent: 'parent' as const,
  data: { serviceType, label: 'WAF', iconSrc: '/aws-icons/waf.svg', tooltip: 'WAF', slotIndex: 0 },
})

describe('useGameStore', () => {
  beforeEach(() => {
    useGameStore.setState({
      nodes: [],
      edges: [],
    })
  })

  it('addServiceNode inserts a node into state', () => {
    const node = makeServiceNode('n1')
    useGameStore.getState().addServiceNode(node)
    expect(useGameStore.getState().nodes).toHaveLength(1)
    expect(useGameStore.getState().nodes[0].id).toBe('n1')
  })

  it('removeNode deletes the node and all connected edges', () => {
    const node = makeServiceNode('n1')
    useGameStore.setState({
      nodes: [node],
      edges: [
        { id: 'e1', source: 'n1', target: 'igw' },
        { id: 'e2', source: 'igw', target: 'n1' },
        { id: 'e3', source: 'igw', target: 'internet' },
      ],
    })
    useGameStore.getState().removeNode('n1')
    expect(useGameStore.getState().nodes).toHaveLength(0)
    expect(useGameStore.getState().edges).toHaveLength(1)
    expect(useGameStore.getState().edges[0].id).toBe('e3')
  })

  it('splitEdge replaces one edge with two routed through a new node', () => {
    useGameStore.setState({
      nodes: [],
      edges: [{ id: 'e1', source: 'igw', target: 'ec2-1' }],
    })
    useGameStore.getState().splitEdge('e1', 'waf-1')
    const { edges } = useGameStore.getState()
    expect(edges.find(e => e.id === 'e1')).toBeUndefined()
    expect(edges.find(e => e.source === 'igw' && e.target === 'waf-1')).toBeDefined()
    expect(edges.find(e => e.source === 'waf-1' && e.target === 'ec2-1')).toBeDefined()
  })
})
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/store/useGameStore.test.ts
```

Expected: 3 failures - `Cannot find module '@/store/useGameStore'`

- [ ] **Step 5: Write `frontend/src/store/useGameStore.ts`**

```typescript
import { create } from 'zustand'
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react'
import type { ServiceNodeData, SubnetNodeData } from '@/types/game'
import { INITIAL_NODES, INITIAL_EDGES } from '@/types/game'

interface GameStore {
  nodes: Node[]
  edges: Edge[]
  addServiceNode: (node: Node) => void
  removeNode: (nodeId: string) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  splitEdge: (edgeId: string, newNodeId: string) => void
}

export const useGameStore = create<GameStore>()((set, get) => ({
  nodes: INITIAL_NODES,
  edges: INITIAL_EDGES,

  addServiceNode: (node) => {
    set(state => {
      // Mark slot as occupied in the parent subnet node
      const subnetId = node.parentId
      const slotIndex = (node.data as ServiceNodeData).slotIndex
      const updatedNodes = state.nodes.map(n => {
        if (n.id === subnetId) {
          return {
            ...n,
            data: {
              ...n.data,
              occupiedSlots: {
                ...(n.data as SubnetNodeData).occupiedSlots,
                [slotIndex]: node.id,
              },
            },
          }
        }
        return n
      })
      return { nodes: [...updatedNodes, node] }
    })
  },

  removeNode: (nodeId) => {
    set(state => {
      // Free the slot in the parent subnet
      const removedNode = state.nodes.find(n => n.id === nodeId)
      const subnetId = removedNode?.parentId
      const slotIndex = removedNode ? (removedNode.data as ServiceNodeData).slotIndex : undefined

      const updatedNodes = state.nodes
        .filter(n => n.id !== nodeId)
        .map(n => {
          if (n.id === subnetId && slotIndex !== undefined) {
            const slots = { ...(n.data as SubnetNodeData).occupiedSlots }
            delete slots[slotIndex]
            return { ...n, data: { ...n.data, occupiedSlots: slots } }
          }
          return n
        })

      const updatedEdges = state.edges.filter(
        e => e.source !== nodeId && e.target !== nodeId
      )
      return { nodes: updatedNodes, edges: updatedEdges }
    })
  },

  onNodesChange: (changes) => {
    set(state => ({ nodes: applyNodeChanges(changes, state.nodes) }))
  },

  onEdgesChange: (changes) => {
    set(state => ({ edges: applyEdgeChanges(changes, state.edges) }))
  },

  onConnect: (connection) => {
    set(state => ({
      edges: addEdge({ ...connection, type: 'default' }, state.edges),
    }))
  },

  splitEdge: (edgeId, newNodeId) => {
    set(state => {
      const edge = state.edges.find(e => e.id === edgeId)
      if (!edge) return state
      const remaining = state.edges.filter(e => e.id !== edgeId)
      const newEdges: Edge[] = [
        { id: `${edge.source}-to-${newNodeId}`, source: edge.source, target: newNodeId, type: 'default' },
        { id: `${newNodeId}-to-${edge.target}`, source: newNodeId, target: edge.target, type: 'default' },
      ]
      return { edges: [...remaining, ...newEdges] }
    })
  },
}))
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/store/useGameStore.test.ts
```

Expected: 3 passing

- [ ] **Step 7: Commit**

```bash
cd frontend && git add src/types/game.ts src/store/useGameStore.ts src/store/useGameStore.test.ts src/index.css
git commit -m "feat: add game types, Zustand store, and React Flow CSS"
```

---

### Task 2: Structural Node Renderers

**Files:**
- Create: `frontend/src/components/gameboard/canvas/nodes/InternetNode.tsx`
- Create: `frontend/src/components/gameboard/canvas/nodes/IgwNode.tsx`
- Create: `frontend/src/components/gameboard/canvas/nodes/VpcNode.tsx`
- Create: `frontend/src/components/gameboard/canvas/nodes/SubnetNode.tsx`

**Interfaces:**
- Consumes: `SubnetNodeData`, `VpcNodeData` from `@/types/game`; `getSlotPosition`, `SLOTS_PER_ROW` from `@/types/game`
- Produces: `InternetNode`, `IgwNode`, `VpcNode`, `SubnetNode` - React Flow custom node components registered in `FlowCanvas` in Task 3

- [ ] **Step 1: Create `frontend/src/components/gameboard/canvas/nodes/InternetNode.tsx`**

```typescript
import { Handle, Position } from '@xyflow/react'

export function InternetNode() {
  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <img src="/aws-icons/vpc.svg" alt="Internet" className="w-12 h-12" />
      <span className="text-xs font-medium text-foreground">The Internet</span>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/src/components/gameboard/canvas/nodes/IgwNode.tsx`**

```typescript
import { Handle, Position } from '@xyflow/react'

export function IgwNode() {
  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      <img src="/aws-icons/igw.svg" alt="Internet Gateway" className="w-12 h-12" />
      <span className="text-xs font-medium text-foreground">IGW</span>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
  )
}
```

- [ ] **Step 3: Create `frontend/src/components/gameboard/canvas/nodes/VpcNode.tsx`**

`VpcNode` is reused for both the Internet VPC and the Application VPC. It renders a labelled container box; its children (IGW node, subnet nodes) are positioned inside by React Flow's parent/child system.

```typescript
import type { NodeProps } from '@xyflow/react'
import type { VpcNodeData } from '@/types/game'
import { cn } from '@/lib/utils'

export function VpcNode({ data, selected }: NodeProps) {
  const { label } = data as VpcNodeData
  return (
    <div
      className={cn(
        'w-full h-full rounded-lg border-2 border-dashed border-border bg-muted/20',
        selected && 'border-primary'
      )}
    >
      <div className="px-2 py-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `frontend/src/components/gameboard/canvas/nodes/SubnetNode.tsx`**

Each subnet renders a 5x2 grid of 10 numbered slot divs. Occupied slots show nothing (the child `serviceNode` renders on top). Empty slots show a dashed drop-target box. The `isDragOver` CSS class is toggled by a drag state passed via props when the canvas detects a drag-over event.

```typescript
import { useState } from 'react'
import type { NodeProps } from '@xyflow/react'
import type { SubnetNodeData } from '@/types/game'
import {
  SLOTS_PER_ROW,
  SLOT_WIDTH,
  SLOT_HEIGHT,
  SLOT_START_X,
  SLOT_START_Y,
  getSlotPosition,
} from '@/types/game'
import { cn } from '@/lib/utils'

const TOTAL_SLOTS = 10

export function SubnetNode({ data }: NodeProps) {
  const { label, subnetType, occupiedSlots } = data as SubnetNodeData
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null)

  const subnetWidth = SLOT_START_X * 2 + SLOTS_PER_ROW * SLOT_WIDTH
  const subnetHeight = SLOT_START_Y + 2 * SLOT_HEIGHT + 20

  return (
    <div
      className={cn(
        'rounded-md border-2 border-dashed relative',
        subnetType === 'public' ? 'border-green-500/60 bg-green-50/30 dark:bg-green-950/20' : 'border-blue-500/60 bg-blue-50/30 dark:bg-blue-950/20'
      )}
      style={{ width: subnetWidth, height: subnetHeight }}
    >
      <div className="flex items-center gap-1 px-2 py-1">
        <img
          src={subnetType === 'public' ? '/aws-icons/public-subnet.svg' : '/aws-icons/private-subnet.svg'}
          alt={label}
          className="w-4 h-4 shrink-0"
        />
        <span className={cn(
          'text-xs font-semibold uppercase tracking-wide',
          subnetType === 'public' ? 'text-green-700 dark:text-green-400' : 'text-blue-700 dark:text-blue-400'
        )}>
          {label}
        </span>
      </div>

      {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
        const pos = getSlotPosition(i)
        const isOccupied = i in occupiedSlots
        const isHovered = hoveredSlot === i

        return (
          <div
            key={i}
            data-slot-index={i}
            className={cn(
              'absolute rounded border border-dashed transition-colors',
              isOccupied
                ? 'border-transparent'
                : 'border-border/40',
              isHovered && !isOccupied && 'border-primary bg-primary/10',
            )}
            style={{
              left: pos.x,
              top: pos.y,
              width: SLOT_WIDTH - 8,
              height: SLOT_HEIGHT - 8,
            }}
            onDragEnter={() => !isOccupied && setHoveredSlot(i)}
            onDragLeave={() => setHoveredSlot(null)}
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: Verify renderers compile without errors**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors (components exist and types match)

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/components/gameboard/canvas/nodes/
git commit -m "feat: add structural node renderers (Internet, IGW, VPC, Subnet)"
```

---

### Task 3: FlowCanvas and TrafficEdge

**Files:**
- Create: `frontend/src/components/gameboard/canvas/edges/TrafficEdge.tsx`
- Create: `frontend/src/components/gameboard/canvas/FlowCanvas.tsx`

**Interfaces:**
- Consumes: `InternetNode`, `IgwNode`, `VpcNode`, `SubnetNode` from Task 2; `useGameStore` from Task 1
- Produces: `FlowCanvas` component - the locked React Flow wrapper that renders the full structural layout with pre-wired edges. `GameBoard` (Task 6) renders this.

- [ ] **Step 1: Create `frontend/src/components/gameboard/canvas/edges/TrafficEdge.tsx`**

The traffic edge is an animated dashed Bezier curve used only on the Internet → IGW pre-wired connection.

```typescript
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react'

export function TrafficEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke: 'hsl(var(--primary))',
        strokeWidth: 2,
        strokeDasharray: '6 3',
        animation: 'traffic-flow 1s linear infinite',
      }}
    />
  )
}
```

Then add the keyframe animation to `frontend/src/index.css` (append after existing content):

```css
@keyframes traffic-flow {
  from { stroke-dashoffset: 18; }
  to   { stroke-dashoffset: 0; }
}
```

- [ ] **Step 2: Create `frontend/src/components/gameboard/canvas/FlowCanvas.tsx`**

The canvas renders the full structural layout. The viewport is locked. Custom node/edge types are registered here. `ReactFlowProvider` wraps the inner component so hooks like `useReactFlow` can be used inside.

The store is already seeded with `INITIAL_NODES`/`INITIAL_EDGES` (Task 1), so no `useEffect` is needed here - nodes are available on the first render, which means `fitView` works correctly.

```typescript
import { ReactFlow, ReactFlowProvider, Background } from '@xyflow/react'
import { useGameStore } from '@/store/useGameStore'
import { InternetNode } from './nodes/InternetNode'
import { IgwNode } from './nodes/IgwNode'
import { VpcNode } from './nodes/VpcNode'
import { SubnetNode } from './nodes/SubnetNode'
import { TrafficEdge } from './edges/TrafficEdge'

const nodeTypes = {
  internetNode: InternetNode,
  igwNode: IgwNode,
  vpcNode: VpcNode,
  subnetNode: SubnetNode,
}

const edgeTypes = {
  trafficEdge: TrafficEdge,
}

function FlowCanvasInner() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useGameStore()

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={{ type: 'default' }}
      nodesDraggable={false}
      panOnDrag={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      panOnScroll={false}
      preventScrolling={false}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      className="bg-background"
    >
      <Background />
    </ReactFlow>
  )
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  )
}
```

- [ ] **Step 3: Verify the canvas compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/components/gameboard/canvas/
git commit -m "feat: add FlowCanvas with structural layout and animated traffic edge"
```

---

### Task 4: ServiceNode Renderer

**Files:**
- Create: `frontend/src/components/gameboard/canvas/nodes/ServiceNode.tsx`

**Interfaces:**
- Consumes: `ServiceNodeData` from `@/types/game`; `useGameStore` (for `removeNode`); `Tooltip`, `TooltipTrigger`, `TooltipContent` from `@/components/ui/tooltip`; `X` from `lucide-react`
- Produces: `ServiceNode` component registered in `FlowCanvas`'s `nodeTypes` map (Task 3 must be updated to include `serviceNode: ServiceNode`)

- [ ] **Step 1: Create `frontend/src/components/gameboard/canvas/nodes/ServiceNode.tsx`**

ASG gets two labeled output handles (`to-frontend` and `to-backend`). All other nodes get a single top target handle and a single bottom source handle plus left/right handles.

```typescript
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { X } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useGameStore } from '@/store/useGameStore'
import type { ServiceNodeData } from '@/types/game'
import { cn } from '@/lib/utils'

export function ServiceNode({ id, data, selected }: NodeProps) {
  const { label, iconSrc, tooltip, serviceType } = data as ServiceNodeData
  const removeNode = useGameStore(s => s.removeNode)
  const isAsg = serviceType === 'asg'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'relative flex flex-col items-center gap-1 p-2 rounded-md border bg-card shadow-sm select-none w-16',
            selected && 'border-primary ring-1 ring-primary',
            !selected && 'border-border'
          )}
        >
          {/* Delete button */}
          <button
            className="absolute -top-2 -right-2 z-10 rounded-full bg-destructive text-destructive-foreground w-4 h-4 flex items-center justify-center hover:bg-destructive/80 transition-colors"
            onClick={(e) => { e.stopPropagation(); removeNode(id) }}
            aria-label={`Remove ${label}`}
          >
            <X className="w-2.5 h-2.5" />
          </button>

          {/* Icon */}
          <img src={iconSrc} alt={label} className="w-8 h-8" />

          {/* Label */}
          <span className="text-[10px] font-medium text-center leading-tight text-foreground line-clamp-2">
            {label}
          </span>

          {/* Handles - standard */}
          <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
          <Handle type="target" position={Position.Left} id="left" className="!bg-muted-foreground" />
          <Handle type="source" position={Position.Right} id="right" className="!bg-muted-foreground" />

          {/* ASG gets two labeled bottom output handles; others get one */}
          {isAsg ? (
            <>
              <Handle
                type="source"
                position={Position.Bottom}
                id="to-frontend"
                style={{ left: '30%' }}
                className="!bg-primary"
              />
              <Handle
                type="source"
                position={Position.Bottom}
                id="to-backend"
                style={{ left: '70%' }}
                className="!bg-primary"
              />
            </>
          ) : (
            <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-48 text-center">
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
}
```

- [ ] **Step 2: Register `ServiceNode` in `FlowCanvas.tsx`**

Open `frontend/src/components/gameboard/canvas/FlowCanvas.tsx`.

Add this import after the existing node imports:
```typescript
import { ServiceNode } from './nodes/ServiceNode'
```

Add `serviceNode: ServiceNode` to the `nodeTypes` object:
```typescript
const nodeTypes = {
  internetNode: InternetNode,
  igwNode: IgwNode,
  vpcNode: VpcNode,
  subnetNode: SubnetNode,
  serviceNode: ServiceNode,
}
```

- [ ] **Step 3: Verify types compile**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/components/gameboard/canvas/nodes/ServiceNode.tsx src/components/gameboard/canvas/FlowCanvas.tsx
git commit -m "feat: add ServiceNode renderer with tooltip, delete button, and ASG dual handles"
```

---

### Task 5: Sidebar

**Files:**
- Create: `frontend/src/components/gameboard/SidebarItem.tsx`
- Create: `frontend/src/components/gameboard/Sidebar.tsx`

**Interfaces:**
- Consumes: `SidebarItem`, `SIDEBAR_ITEMS` from `@/types/game`
- Produces: `Sidebar` component consumed by `GameBoard` in Task 6. Drag payload set on `dataTransfer` must use the key `serviceType` with the `ServiceType` string as value - `FlowCanvas` reads this key in Task 7.

- [ ] **Step 1: Create `frontend/src/components/gameboard/SidebarItem.tsx`**

On drag start, the service type and icon source are written to `dataTransfer` so `FlowCanvas` can read them on drop.

```typescript
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

- [ ] **Step 2: Create `frontend/src/components/gameboard/Sidebar.tsx`**

The sidebar is collapsible. When collapsed it shows only a chevron button; when expanded it shows the full icon grid. Width transitions are handled by Tailwind `transition-all`.

```typescript
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { SIDEBAR_ITEMS } from '@/types/game'
import { SidebarItemTile } from './SidebarItem'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={cn(
        'relative flex flex-col h-full border-r border-border bg-card transition-all duration-200',
        collapsed ? 'w-8' : 'w-40'
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-4 z-10 rounded-full border border-border bg-card p-0.5 hover:bg-accent transition-colors shadow-sm"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-2 p-2 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-1 pt-1">
            Services
          </p>
          {SIDEBAR_ITEMS.map(item => (
            <SidebarItemTile key={item.serviceType} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify types compile**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/components/gameboard/SidebarItem.tsx src/components/gameboard/Sidebar.tsx
git commit -m "feat: add collapsible sidebar with draggable AWS service tiles"
```

---

### Task 6: GameBoard Root and App Wiring

**Files:**
- Create: `frontend/src/components/gameboard/GameBoard.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `Sidebar` from Task 5; `FlowCanvas` from Task 3
- Produces: `GameBoard` - the root component mounted by `App`. After this task the app renders the full layout at `http://localhost:3003`.

- [ ] **Step 1: Create `frontend/src/components/gameboard/GameBoard.tsx`**

```typescript
import { Sidebar } from './Sidebar'
import { FlowCanvas } from './canvas/FlowCanvas'

export function GameBoard() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 relative">
        <FlowCanvas />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Modify `frontend/src/App.tsx`**

Replace the file's entire content with:

```typescript
import { TooltipProvider } from '@/components/ui/tooltip'
import { GameBoard } from '@/components/gameboard/GameBoard'

export default function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <GameBoard />
    </TooltipProvider>
  )
}
```

- [ ] **Step 3: Start the dev server and verify the layout renders**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3003`. You should see:
- Left sidebar with AWS service icons listed vertically
- A collapse/expand chevron on the sidebar's right edge
- The React Flow canvas filling the right panel with the structural nodes: Internet cloud → IGW (inside Internet VPC box) → Public Subnet and Private Subnet (inside App VPC box)
- An animated dashed edge from Internet to IGW
- A static edge from IGW to Public Subnet
- No zooming or panning possible

If the canvas is blank, check the browser console for React Flow warnings about missing parent node dimensions or stylesheet.

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/components/gameboard/GameBoard.tsx src/App.tsx
git commit -m "feat: wire GameBoard root and TooltipProvider into App"
```

---

### Task 7: Drop-to-Slot Placement

**Files:**
- Modify: `frontend/src/components/gameboard/canvas/FlowCanvas.tsx`

**Interfaces:**
- Consumes: `addServiceNode` from `useGameStore`; `getSlotPosition`, `SLOT_WIDTH`, `SLOT_HEIGHT`, `SLOT_START_X`, `SLOT_START_Y`, `SLOTS_PER_ROW` from `@/types/game`; `useReactFlow` from `@xyflow/react`
- Produces: Full drag-and-drop placement - dragging a sidebar item onto an empty subnet slot creates a `serviceNode` child at that slot's position

Note: `useReactFlow` is only callable inside a `ReactFlowProvider` tree. `FlowCanvasInner` is already inside `ReactFlowProvider` (via the `FlowCanvas` wrapper), so `useReactFlow` can be called in `FlowCanvasInner`.

- [ ] **Step 1: Add the drop handler helpers to `FlowCanvas.tsx`**

First, add these imports to the top of `FlowCanvas.tsx` (alongside the existing imports):

```typescript
import { useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'
import {
  SLOT_START_X,
  SLOT_START_Y,
  SLOTS_PER_ROW,
  SLOT_WIDTH,
  SLOT_HEIGHT,
  getSlotPosition,
  type SubnetNodeData,
  type ServiceNodeData,
} from '@/types/game'
import type { Node } from '@xyflow/react'
```

Then add this helper function at the module level (outside the component), after the imports:

```typescript
function getAbsoluteNodePosition(nodeId: string, allNodes: Node[]): { x: number; y: number } {
  const node = allNodes.find(n => n.id === nodeId)
  if (!node) return { x: 0, y: 0 }
  if (!node.parentId) return { x: node.position.x, y: node.position.y }
  const parentPos = getAbsoluteNodePosition(node.parentId, allNodes)
  return { x: parentPos.x + node.position.x, y: parentPos.y + node.position.y }
}
```

- [ ] **Step 2: Add `onDragOver` and `onDrop` to `FlowCanvasInner`**

Add the following inside `FlowCanvasInner`, after the `useGameStore` call:

```typescript
const { screenToFlowPosition } = useReactFlow()
const addServiceNode = useGameStore(s => s.addServiceNode)

const onDragOver = useCallback((e: React.DragEvent) => {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'copy'
}, [])

const onDrop = useCallback((e: React.DragEvent) => {
  e.preventDefault()
  const serviceType = e.dataTransfer.getData('serviceType')
  const iconSrc = e.dataTransfer.getData('iconSrc')
  const label = e.dataTransfer.getData('label')
  const tooltip = e.dataTransfer.getData('tooltip')
  if (!serviceType) return

  const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY })

  const allNodes = useGameStore.getState().nodes
  const subnetIds = ['public-subnet', 'private-subnet']

  for (const subnetId of subnetIds) {
    const subnetNode = allNodes.find(n => n.id === subnetId)
    if (!subnetNode) continue

    const absPos = getAbsoluteNodePosition(subnetId, allNodes)
    const subnetW = SLOT_START_X * 2 + SLOTS_PER_ROW * SLOT_WIDTH
    const subnetH = SLOT_START_Y + 2 * SLOT_HEIGHT + 20

    if (
      flowPos.x >= absPos.x &&
      flowPos.x <= absPos.x + subnetW &&
      flowPos.y >= absPos.y &&
      flowPos.y <= absPos.y + subnetH
    ) {
      // Convert to subnet-relative coordinates
      const relX = flowPos.x - absPos.x
      const relY = flowPos.y - absPos.y
      const col = Math.floor((relX - SLOT_START_X) / SLOT_WIDTH)
      const row = Math.floor((relY - SLOT_START_Y) / SLOT_HEIGHT)

      if (col < 0 || col >= SLOTS_PER_ROW || row < 0 || row > 1) return

      const slotIndex = row * SLOTS_PER_ROW + col
      const occupied = (subnetNode.data as SubnetNodeData).occupiedSlots
      if (slotIndex in occupied) return // slot taken

      const slotPos = getSlotPosition(slotIndex)
      const nodeId = `${serviceType}-${Date.now()}`

      addServiceNode({
        id: nodeId,
        type: 'serviceNode',
        position: slotPos,
        parentId: subnetId,
        extent: 'parent',
        draggable: false,
        data: { serviceType, label, iconSrc, tooltip, slotIndex },
      })
      return
    }
  }
}, [screenToFlowPosition, addServiceNode])
```

- [ ] **Step 3: Wire `onDragOver` and `onDrop` into the `<ReactFlow>` component**

In `FlowCanvasInner`, add these two props to the `<ReactFlow>` element:

```tsx
onDragOver={onDragOver}
onDrop={onDrop}
```

- [ ] **Step 4: Manually verify placement in the browser**

Start the dev server if not running (`cd frontend && npm run dev`). Drag "WAF" from the sidebar and hover over the Public Subnet. The slot grid divs should highlight when hovered. Drop it on an empty slot. A WAF service node should appear at that slot inside the Public Subnet.

Drag a second service to confirm a different slot fills correctly. Attempt to drop on an occupied slot - it should silently reject the drop.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/gameboard/canvas/FlowCanvas.tsx
git commit -m "feat: implement drag-from-sidebar drop-to-subnet-slot placement"
```

---

### Task 8: Edge Drawing and Mid-Edge Node Insertion

**Files:**
- Modify: `frontend/src/components/gameboard/canvas/FlowCanvas.tsx`

**Interfaces:**
- Consumes: `onConnect`, `splitEdge` from `useGameStore`; `useReactFlow` from `@xyflow/react`
- Produces: Users can drag from any node handle to another to draw a Bezier edge. Dropping a sidebar item near the midpoint of an existing edge splits that edge and routes it through the new node.

- [ ] **Step 1: Add mid-edge detection helper to `FlowCanvas.tsx`**

Add this helper at module level after `getAbsoluteNodePosition`:

```typescript
function distanceToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
}
```

- [ ] **Step 2: Extend the `onDrop` handler in `FlowCanvasInner` to detect mid-edge drops**

Add `splitEdge` to the `useGameStore` selector in `FlowCanvasInner` (alongside the existing `addServiceNode` line from Task 7):
```typescript
const splitEdge = useGameStore(s => s.splitEdge)
```

Then, inside the `onDrop` callback, **before** the subnet loop, add the mid-edge detection block:

```typescript
// --- Mid-edge insertion check ---
const MID_EDGE_THRESHOLD = 60
const allEdges = useGameStore.getState().edges
const allNodesSnap = useGameStore.getState().nodes

for (const edge of allEdges) {
  const sourceNode = allNodesSnap.find(n => n.id === edge.source)
  const targetNode = allNodesSnap.find(n => n.id === edge.target)
  if (!sourceNode || !targetNode) continue

  const srcAbs = getAbsoluteNodePosition(edge.source, allNodesSnap)
  const tgtAbs = getAbsoluteNodePosition(edge.target, allNodesSnap)
  const midX = (srcAbs.x + tgtAbs.x) / 2
  const midY = (srcAbs.y + tgtAbs.y) / 2

  const dist = distanceToSegment(flowPos, srcAbs, tgtAbs)

  if (dist < MID_EDGE_THRESHOLD) {
    // Drop is on this edge - insert the node at the edge midpoint
    const nodeId = `${serviceType}-${Date.now()}`
    const newNode = {
      id: nodeId,
      type: 'serviceNode',
      position: { x: midX - 30, y: midY - 40 },
      draggable: false,
      data: { serviceType, label, iconSrc, tooltip, slotIndex: -1 },
    }
    addServiceNode(newNode)
    splitEdge(edge.id, nodeId)
    return
  }
}
// --- End mid-edge check ---
```

Note: nodes inserted mid-edge are not slotted into a subnet (they sit on the canvas at the edge midpoint). Their `slotIndex` is `-1` to signal no slot ownership. The `addServiceNode` store function handles this: when `slotIndex === -1`, it skips the subnet slot update.

- [ ] **Step 3: Guard `addServiceNode` in the store against `slotIndex === -1`**

Open `frontend/src/store/useGameStore.ts`. In the `addServiceNode` mutator, wrap the slot-update map with a guard:

```typescript
addServiceNode: (node) => {
  set(state => {
    const slotIndex = (node.data as ServiceNodeData).slotIndex
    const subnetId = node.parentId

    const updatedNodes = slotIndex !== -1 && subnetId
      ? state.nodes.map(n => {
          if (n.id === subnetId) {
            return {
              ...n,
              data: {
                ...n.data,
                occupiedSlots: {
                  ...(n.data as SubnetNodeData).occupiedSlots,
                  [slotIndex]: node.id,
                },
              },
            }
          }
          return n
        })
      : state.nodes

    return { nodes: [...updatedNodes, node] }
  })
},
```

- [ ] **Step 4: Verify edge connection by running the dev server**

```bash
cd frontend && npm run dev
```

1. Drag two service nodes into the Public Subnet slots.
2. Hover over one node's bottom handle - a crosshair cursor appears.
3. Drag from that handle to the second node - a Bezier edge should connect them.
4. Drag a third service (e.g. WAF) from the sidebar and drop it approximately on the midpoint of that edge. The edge should disappear and two new edges should appear routing through the WAF node.

- [ ] **Step 5: Run the full test suite to confirm no regressions**

```bash
cd frontend && npx vitest run
```

Expected: all 3 store tests pass

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/components/gameboard/canvas/FlowCanvas.tsx src/store/useGameStore.ts
git commit -m "feat: enable user edge drawing and mid-edge node insertion"
```
