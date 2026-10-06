# Fix Floating Node Drag

## Scoping Gate
- **Tool type:** Web application (React + TypeScript + Vite frontend)
- **Audience/maturity:** Personal tool
- **Scale:** A handful

## Why

On the sparkling-water level, when a CloudFront + WAF node is dropped onto the
internet-to-igw edge, it is placed as a floating node with no `parentId` and
`slotIndex: -1` at `CLOUDFRONT_SNAP_POSITION`.
When the user drags this node a second time, `onNodeDragStop` fires.
Since the node is not inside any subnet, `resolveSubnetSlot` returns null,
which triggers the snap-back path calling `moveNodeToSlot(nodeId, -1)`.
`getSlotPosition(-1)` computes to `{x: -68, y: -52}`, causing the node to fly
off to the top-left corner of the canvas.

## Root Cause

`onNodeDragStop` assumes every `serviceNode` belongs to a subnet slot.
Floating nodes (placed between structural nodes like Internet and IGW) have no
parent and no valid slot index, but the handler does not account for them.

## Scope

One guard clause in `FlowCanvas.tsx`'s `onNodeDragStop` callback: if the node
has no `parentId`, return early without calling `moveNodeToSlot`.
Floating nodes are freely repositionable since they are not grid-constrained.

## Files

| File | Change |
|------|--------|
| `frontend/src/components/gameboard/canvas/FlowCanvas.tsx` | Guard clause in `onNodeDragStop` for floating nodes |

## Verification

- Drop a CloudFront node on the internet-to-igw edge
- Drag the placed node to a new position
- Confirm it stays where dropped instead of flying to the corner
- Confirm subnet-parented nodes still snap to grid slots as before
