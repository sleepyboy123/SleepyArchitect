# Fix Floating Node Drag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use the `implementing` skill to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent floating service nodes (e.g. CloudFront placed between Internet and IGW) from flying to the corner of the canvas when dragged a second time.

**Tech Stack:** React, TypeScript, @xyflow/react, Zustand

## Global Constraints

- No new dependencies
- No changes to subnet-parented node drag behavior

---

### Task 1: Fix onNodeDragStop for floating nodes

**Files:**
- Modify: `frontend/src/components/gameboard/canvas/FlowCanvas.tsx:267-278`
- Test: Manual verification (drag interaction not unit-testable without a full React Flow environment)

**Interfaces:**
- Consumes: `onNodeDragStop` callback, `Node.parentId`, `ServiceNodeData.slotIndex`
- Produces: No interface changes

- [x] **Step 1: Add guard clause for floating nodes**

In `FlowCanvas.tsx`, inside the `onNodeDragStop` callback, add an early return after the `node.type` check for nodes that have no `parentId`. These are floating nodes (like CloudFront placed between Internet and IGW) that are not grid-constrained and should be freely repositionable.

```typescript
const onNodeDragStop = useCallback((_event: MouseEvent | TouchEvent, node: Node) => {
    if (node.type !== 'serviceNode') return
    if (!node.parentId) return
    // ... rest of existing handler unchanged
```

- [x] **Step 2: Verify the fix**

Run: `cd frontend && npx tsc --noEmit`
Expected: No type errors

- [x] **Step 3: Run existing tests**

Run: `cd frontend && npx vitest run`
Expected: All existing tests pass

- [x] **Step 4: Commit**

```bash
git add frontend/src/components/gameboard/canvas/FlowCanvas.tsx
git commit -m "fix: prevent floating nodes from flying to corner on drag"
```
