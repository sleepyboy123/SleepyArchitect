# Design: Gameboard Core

## Chosen Approach

React Flow (Option A) for the entire canvas.
Subnets are React Flow parent/group nodes with a custom renderer that shows a 5x2 slot grid internally.
Dropped services become child nodes positioned at the chosen slot offset within the parent.
All edges - pre-wired and user-drawn - are native React Flow edges.
This keeps the entire canvas as one coherent React Flow instance with no split paradigms.

## Why Over Alternatives

Option B (hybrid React Flow + HTML grid outside the node system) was rejected because mixing two positioning systems causes drift as features are added.
Option C (custom canvas + React Flow edges only) was rejected because it fights the library and loses native handle-based edge creation.

## Layout

Two-panel layout:
- Left sidebar (collapsible): draggable AWS service icons
- Right panel: fixed React Flow canvas (no pan, no zoom, no drag)

The canvas viewport is locked: `nodesDraggable`, `zoomOnScroll`, `panOnDrag`, and `panOnScroll` are all disabled.
Structural nodes (Internet, VPCs, subnets) are not deletable and not moveable.

## React Flow Node Types

### Structural (pre-placed, non-deletable)

| Node type | Description |
|-----------|-------------|
| `internetNode` | Cloud SVG labeled "The Internet" |
| `igwNode` | IGW SVG labeled "IGW", child of Internet VPC group |
| `internetVpcNode` | Group node wrapping IGW |
| `publicSubnetNode` | Group node with 5x2 slot grid, child of App VPC |
| `privateSubnetNode` | Group node with 5x2 slot grid, child of App VPC |
| `appVpcNode` | Group node wrapping both subnets |

### Service (user-placed, deletable)

All service nodes share a common renderer: icon (from `public/aws-icons/`) + label below, delete X button top-right, Radix Tooltip on hover, and handles on all four sides.

| Sidebar label | SVG | Tooltip |
|---------------|-----|---------|
| Frontend EC2 | ec2.svg | Virtual server hosting the frontend web application |
| Backend EC2 | ec2.svg | Virtual server hosting the backend API |
| Frontend ECS | ecs.svg | Containerised frontend app managed by ECS |
| Backend ECS | ecs.svg | Containerised backend API managed by ECS |
| ASG | asg.svg | Auto Scaling Group - adjusts compute capacity automatically |
| WAF | waf.svg | Web Application Firewall - filters HTTP traffic |
| NAT Gateway | nat.svg | Enables private subnet resources to reach the internet |
| RDS | rds.svg | Managed relational database |
| ALB | alb.svg | Application Load Balancer - distributes traffic across targets |

ASG has two labeled output handles ("to frontend", "to backend") so it can fan out to multiple targets simultaneously.

## Slot System

Each subnet node renders a 5x2 grid of 10 named slots as divs inside its custom node renderer.
Empty slots show a dashed border and act as drop targets.
On hover during a drag, the target slot highlights.
On drop, a `serviceNode` child is created in the React Flow node list with `parentId` set to the subnet and `position` set to the slot's fixed (x, y) offset within the parent.
Slot positions are stored as constants so the grid is deterministic.

## Edge Behavior

- All edges use Bezier curve type (React Flow `type: 'default'` with `curvature`)
- Pre-wired default edges:
  - Internet → IGW: `animated: true`, dashed stroke, represents inbound traffic
  - IGW → Public Subnet input handle: static edge
- User-drawn edges: drag from any node handle to any other node or handle
- Mid-edge insert: when a service is dragged from the sidebar and dropped onto an existing edge, the edge is split - the original edge is removed and two new edges are created routing through the inserted node
- Deleting a node removes all its connected edges

## State Management

Zustand store (`useGameStore`) holds:
- `nodes`: React Flow node array
- `edges`: React Flow edge array
- `sidebarItems`: static list of draggable service definitions

React Flow's `useNodesState` / `useEdgesState` are initialised from the store and kept in sync via `onNodesChange` / `onEdgesChange` callbacks.

## File Structure

```
src/
  components/
    gameboard/
      GameBoard.tsx          # Root: sidebar + canvas
      Sidebar.tsx            # Draggable icon list
      SidebarItem.tsx        # Individual draggable icon
      canvas/
        FlowCanvas.tsx       # ReactFlow wrapper, locked viewport
        nodes/
          InternetNode.tsx
          IgwNode.tsx
          VpcNode.tsx        # Reused for Internet VPC and App VPC
          SubnetNode.tsx     # 5x2 slot grid renderer
          ServiceNode.tsx    # Shared renderer for all user-placed services
        edges/
          TrafficEdge.tsx    # Animated dashed edge for Internet→IGW
  store/
    useGameStore.ts
  types/
    game.ts                  # Node/edge type definitions
```

## Tooltip Implementation

Radix `@radix-ui/react-tooltip` (already installed) wraps each `ServiceNode`.
Tooltip content is the one-line description defined in the sidebar item definition.
Tooltip triggers on hover with a 300ms delay to avoid flicker during drag.

## Mid-Edge Insert Implementation

React Flow fires `onEdgeDrop` when a node is dropped onto an edge.
The handler:
1. Removes the original edge
2. Creates two new edges: source → new node, new node → target
3. Places the new node at the midpoint of the original edge's path

## Constraints and Non-Goals

- No backend in this phase
- No game logic, tickets, scoring, or win conditions
- No undo/redo
- No saving/loading of board state
- Structural nodes cannot be repositioned or deleted
