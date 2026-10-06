# Sparkling Secret Validation Fixes - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use the `implementing` skill to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 validation bugs in the Sparkling Secret scenario so ticket validates match their objectives and regression failures show the correct feedback.

**Tech Stack:** React, TypeScript, Vite, Vitest, @xyflow/react, Zustand

## Global Constraints

- All ticket validate functions must pass when run against the answer key in `sparkling-water/answer.ts`
- Shared validation utils in `scenarios/validation/utils.ts` must not be modified (changes are scoped to the engine and sparkling-water tickets)
- The `ValidationResult` type change affects all 4 scenarios via the shared engine - ensure no regressions

---

### Task 1: Engine regression feedback and ResultModal hint

**Files:**
- Modify: `frontend/src/types/scenario.ts:29-32`
- Modify: `frontend/src/scenarios/engine.ts:5-29`
- Modify: `frontend/src/components/gameboard/ResultModal.tsx:13-19,21-79`
- Create: `frontend/src/scenarios/engine.test.ts`

**Interfaces:**
- Consumes: `ValidationResult` type from `types/scenario.ts`, `ALL_SCENARIOS` from `scenarios/index.ts`
- Produces: `ValidationResult` with new optional `failedTicketIndex?: number` field; `submitDesign` returns failing ticket's objectives and index on regression; `ResultModal` displays a regression hint when `failedTicketIndex` is defined

- [x] **Step 1: Add `failedTicketIndex` to `ValidationResult`**

In `frontend/src/types/scenario.ts`, add the optional field to the interface:

```typescript
export interface ValidationResult {
  passed: boolean
  objectives: { label: string; met: boolean }[]
  failedTicketIndex?: number
}
```

- [x] **Step 2: Fix `submitDesign` to return failing ticket info on regression**

In `frontend/src/scenarios/engine.ts`, change the failure branch in the `for` loop to return the failing ticket's objectives and index instead of the current ticket's:

```typescript
export function submitDesign(
  scenarioId: string,
  ticketIndex: number,
  nodes: Node[],
  edges: Edge[],
): ValidationResult {
  if (!Object.hasOwn(ALL_SCENARIOS, scenarioId)) return { passed: false, objectives: [] }
  const scenario = ALL_SCENARIOS[scenarioId]

  for (let i = 0; i <= ticketIndex; i++) {
    if (!scenario.tickets[i].validate(nodes, edges)) {
      const failedTicket = scenario.tickets[i]
      return {
        passed: false,
        objectives: failedTicket.objectives.map(obj => ({ label: obj.label, met: obj.check(nodes, edges) })),
        failedTicketIndex: i < ticketIndex ? i : undefined,
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

Key change: `failedTicket = scenario.tickets[i]` (not `scenario.tickets[ticketIndex]`), and `failedTicketIndex` is set only when `i < ticketIndex` (a previous ticket failed, not the current one).

- [x] **Step 3: Update ResultModal to show regression hint**

In `frontend/src/components/gameboard/ResultModal.tsx`, add a warning line above the objectives when `failedTicketIndex` is defined:

```tsx
{result.failedTicketIndex !== undefined && (
  <p className="text-sm text-amber-600 dark:text-amber-400 pb-1">
    Ticket {result.failedTicketIndex + 1} requirements are no longer met.
  </p>
)}
```

Insert this inside the `DialogContent`, just above the `{result.objectives.length > 0 && (` block.

- [x] **Step 4: Write engine tests**

Create `frontend/src/scenarios/engine.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { submitDesign } from './engine'
import type { Node, Edge } from '@xyflow/react'
import type { ServiceNodeData } from '@/types/game'

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

describe('submitDesign', () => {
  it('returns passed: false for unknown scenario', () => {
    const result = submitDesign('nonexistent', 0, [], [])
    expect(result.passed).toBe(false)
    expect(result.objectives).toEqual([])
  })

  it('returns failedTicketIndex when a previous ticket regresses', () => {
    // Sparkling-water ticket 0 (host-website) requires a frontend reachable from IGW.
    // Submit ticket 1 (backend-apis) with a backend but no frontend - ticket 0 should fail.
    const nodes = [svc('be', 'backend-ec2', 'private-subnet')]
    const edges = [edge('igw', 'be')]
    const result = submitDesign('sparkling-water', 1, nodes, edges)
    expect(result.passed).toBe(false)
    expect(result.failedTicketIndex).toBe(0)
  })

  it('does not set failedTicketIndex when the current ticket itself fails', () => {
    // Ticket 0 requires a frontend reachable from IGW. Submit with no frontend.
    const result = submitDesign('sparkling-water', 0, [], [])
    expect(result.passed).toBe(false)
    expect(result.failedTicketIndex).toBeUndefined()
  })

  it('returns the failing tickets objectives, not the current tickets', () => {
    // Ticket 0 objectives include "Frontend is in the correct subnet".
    // Submit ticket 1 with no frontend - ticket 0 fails.
    const nodes = [svc('be', 'backend-ec2', 'private-subnet')]
    const edges = [edge('igw', 'be')]
    const result = submitDesign('sparkling-water', 1, nodes, edges)
    expect(result.objectives.some(o => o.label.includes('Frontend is in the correct subnet'))).toBe(true)
    // Ticket 1's objective "Backend is in the private subnet" should NOT appear
    expect(result.objectives.some(o => o.label.includes('Backend is in the private subnet'))).toBe(false)
  })
})
```

- [x] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/scenarios/engine.test.ts --reporter=verbose`
Expected: All 4 tests PASS.

- [x] **Step 6: Run full test suite to check for regressions**

Run: `cd frontend && npx vitest run --reporter=verbose`
Expected: All existing tests still pass.

- [x] **Step 7: Commit**

```bash
git add frontend/src/types/scenario.ts frontend/src/scenarios/engine.ts frontend/src/scenarios/engine.test.ts frontend/src/components/gameboard/ResultModal.tsx
git commit -m "fix: show correct ticket feedback on validation regression"
```

---

### Task 2: Tighten sparkling-water ticket validates

**Files:**
- Modify: `frontend/src/scenarios/sparkling-water/tickets.ts:91-99,131-142,162-168`
- Create: `frontend/src/scenarios/sparkling-water/tickets.test.ts`

**Interfaces:**
- Consumes: `getNodesOfType`, `hasEdgeBetween` from `./validation/utils`; `Ticket` type from `@/types/scenario`
- Produces: Tightened `validate` functions for tickets 3 (scaling), 4 (security), and 5 (cdn) that match their stated objectives

- [x] **Step 1: Write failing tests for the three buggy validates**

Create `frontend/src/scenarios/sparkling-water/tickets.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import type { Node, Edge } from '@xyflow/react'
import type { ServiceNodeData } from '@/types/game'
import { tickets } from './tickets'

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

const scalingTicket = tickets[3]
const securityTicket = tickets[4]
const cdnTicket = tickets[5]

describe('scaling ticket (index 3)', () => {
  const baseNodes = [
    svc('alb-1', 'alb', 'public-subnet'),
    svc('asg-1', 'asg', 'public-subnet'),
    svc('fe', 'frontend-ecs', 'private-subnet'),
    svc('be', 'backend-ecs', 'private-subnet'),
  ]
  const baseEdges = [
    edge('alb-1', 'asg-1'),
  ]

  it('rejects when ASG connects to only a frontend', () => {
    const edges = [...baseEdges, edge('asg-1', 'fe')]
    expect(scalingTicket.validate(baseNodes, edges)).toBe(false)
  })

  it('rejects when ASG connects to only a backend', () => {
    const edges = [...baseEdges, edge('asg-1', 'be')]
    expect(scalingTicket.validate(baseNodes, edges)).toBe(false)
  })

  it('accepts when ASG connects to both frontend and backend', () => {
    const edges = [...baseEdges, edge('asg-1', 'fe'), edge('asg-1', 'be')]
    expect(scalingTicket.validate(baseNodes, edges)).toBe(true)
  })
})

describe('security ticket (index 4)', () => {
  it('rejects WAF that is reachable from IGW but not directly connected', () => {
    const nodes = [svc('waf-1', 'waf', 'public-subnet'), svc('alb-1', 'alb', 'public-subnet')]
    const edges = [edge('igw', 'alb-1'), edge('alb-1', 'waf-1')]
    expect(securityTicket.validate(nodes, edges)).toBe(false)
  })

  it('accepts WAF directly connected to IGW with a downstream connection', () => {
    const nodes = [svc('waf-1', 'waf', 'public-subnet'), svc('alb-1', 'alb', 'public-subnet')]
    const edges = [edge('igw', 'waf-1'), edge('waf-1', 'alb-1')]
    expect(securityTicket.validate(nodes, edges)).toBe(true)
  })
})

describe('cdn ticket (index 5)', () => {
  it('rejects when direct internet-to-igw edge still exists', () => {
    const nodes = [svc('cf', 'cloudfront')]
    const edges = [
      edge('internet', 'igw'),
      edge('internet', 'cf'),
      edge('cf', 'igw'),
    ]
    expect(cdnTicket.validate(nodes, edges)).toBe(false)
  })

  it('accepts when CloudFront intercepts and direct edge is removed', () => {
    const nodes = [svc('cf', 'cloudfront')]
    const edges = [
      edge('internet', 'cf'),
      edge('cf', 'igw'),
    ]
    expect(cdnTicket.validate(nodes, edges)).toBe(true)
  })
})
```

- [x] **Step 2: Run tests to verify the buggy ones fail**

Run: `cd frontend && npx vitest run src/scenarios/sparkling-water/tickets.test.ts --reporter=verbose`
Expected: 3 tests FAIL (the rejection cases for scaling-frontend-only, scaling-backend-only, security-not-direct, and cdn-bypass), 3 tests PASS (the acceptance cases).

- [x] **Step 3: Fix scaling ticket validate (index 3)**

In `frontend/src/scenarios/sparkling-water/tickets.ts`, replace the scaling ticket's validate (lines 91-99):

Old:
```typescript
    validate(nodes, edges) {
      const albs = getNodesOfType(nodes, 'alb')
      const asgs = getNodesOfType(nodes, 'asg')
      const computes = getNodesOfType(nodes, 'frontend-ec2', 'frontend-ecs', 'backend-ec2', 'backend-ecs')
      if (albs.length === 0 || asgs.length === 0) return false
      const albToAsg = albs.some(alb => asgs.some(asg => hasEdgeBetween(edges, alb.id, asg.id)))
      if (!albToAsg) return false
      return asgs.some(asg => computes.some(c => hasEdgeBetween(edges, asg.id, c.id)))
    },
```

New:
```typescript
    validate(nodes, edges) {
      const albs = getNodesOfType(nodes, 'alb')
      const asgs = getNodesOfType(nodes, 'asg')
      const frontends = getNodesOfType(nodes, 'frontend-ec2', 'frontend-ecs')
      const backends = getNodesOfType(nodes, 'backend-ec2', 'backend-ecs')
      if (albs.length === 0 || asgs.length === 0) return false
      const albToAsg = albs.some(alb => asgs.some(asg => hasEdgeBetween(edges, alb.id, asg.id)))
      if (!albToAsg) return false
      return asgs.some(asg =>
        frontends.some(f => hasEdgeBetween(edges, asg.id, f.id)) &&
        backends.some(b => hasEdgeBetween(edges, asg.id, b.id))
      )
    },
```

- [x] **Step 4: Fix security ticket validate (index 4)**

In `frontend/src/scenarios/sparkling-water/tickets.ts`, replace the security ticket's validate (lines 131-142):

Old:
```typescript
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
```

New:
```typescript
    validate(nodes, edges) {
      const wafs = getNodesOfType(nodes, 'waf')
      if (wafs.length === 0) return false
      return wafs.some(waf =>
        hasEdgeBetween(edges, 'igw', waf.id) &&
        edges.some(e => {
          const neighbor = e.source === waf.id ? e.target : e.target === waf.id ? e.source : null
          return neighbor !== null && !STRUCTURAL_IDS.has(neighbor) && neighbor !== 'igw'
        })
      )
    },
```

- [x] **Step 5: Fix cdn ticket validate (index 5)**

In `frontend/src/scenarios/sparkling-water/tickets.ts`, replace the cdn ticket's validate (lines 162-168):

Old:
```typescript
    validate(nodes, edges) {
      const cloudfronts = getNodesOfType(nodes, 'cloudfront')
      if (cloudfronts.length === 0) return false
      return cloudfronts.some(cf =>
        hasEdgeBetween(edges, 'internet', cf.id) &&
        hasEdgeBetween(edges, cf.id, 'igw')
      )
    },
```

New:
```typescript
    validate(nodes, edges) {
      const cloudfronts = getNodesOfType(nodes, 'cloudfront')
      if (cloudfronts.length === 0) return false
      if (hasEdgeBetween(edges, 'internet', 'igw')) return false
      return cloudfronts.some(cf =>
        hasEdgeBetween(edges, 'internet', cf.id) &&
        hasEdgeBetween(edges, cf.id, 'igw')
      )
    },
```

- [x] **Step 6: Remove unused `isReachableFromIgw` import**

The security ticket no longer calls `isReachableFromIgw`. Check if any other ticket in this file still uses it. If not, remove it from the import statement at the top of `tickets.ts` (line 6):

Old:
```typescript
import {
  getNodesOfType,
  hasEdgeBetween,
  hasPathBetween,
  isReachableFromIgw,
} from './validation/utils'
```

Check: `hasPathBetween` is used by ticket 1 (backend-apis). `isReachableFromIgw` is used by ticket 0 (host-website). Both are still needed - keep the import unchanged.

- [x] **Step 7: Run ticket tests to verify all pass**

Run: `cd frontend && npx vitest run src/scenarios/sparkling-water/tickets.test.ts --reporter=verbose`
Expected: All 7 tests PASS.

- [x] **Step 8: Run full test suite to check for regressions**

Run: `cd frontend && npx vitest run --reporter=verbose`
Expected: All tests pass including the new engine tests from Task 1.

- [x] **Step 9: Verify answer key passes all tightened validates**

Run the engine test or manually verify: the answer key in `sparkling-water/answer.ts` defines:
- ASG (ans-asg) connects to both ans-frontend and ans-backend via edges - scaling passes
- WAF (ans-waf) has a direct edge from igw (igw-to-ans-waf) and connects to ans-alb - security passes
- internet-to-igw edge is filtered out, CloudFront has internet and igw edges - cdn passes

This is covered by the acceptance test cases in Step 1. No additional verification needed.

- [x] **Step 10: Commit**

```bash
git add frontend/src/scenarios/sparkling-water/tickets.ts frontend/src/scenarios/sparkling-water/tickets.test.ts
git commit -m "fix: tighten scaling, security, and cdn ticket validates to match objectives"
```
