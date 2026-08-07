# Scenario System Spec

## Overview

Each scenario is a self-contained folder under `src/scenarios/<slug>/` with three files:
`tickets.ts`, `answer.ts`, and `index.ts`.
Scenarios are registered in `src/scenarios/index.ts`.

## ScenarioDefinition shape

```ts
interface ScenarioDefinition {
  id: string
  title: string
  description: string
  tickets: Ticket[]
  answerNodes: Node[]
  answerEdges: Edge[]
  sidebarItems: SidebarItem[]   // services available to the player in this scenario
}
```

## Sidebar items

Each scenario owns its sidebar service list via `sidebarItems`.
The store loads it atomically when `startScenario(scenario)` is called.
No global `SIDEBAR_ITEMS` constant exists.

## Validation utilities

Shared graph helpers live in `src/scenarios/validation/utils.ts`:
- `getNodesOfType(nodes, serviceType)`
- `getNodesInSubnet(nodes, subnetId)`
- `hasEdgeBetween(edges, idA, idB)` - symmetric (undirected)
- `hasPathBetween(nodes, edges, fromId, toId)`
- `isReachableFromIgw(nodes, edges, targetId)`

Use directed `edges.some(e => e.source === a && e.target === b)` when edge direction matters (e.g. producer/consumer queues).

## Store actions

`startScenario(scenario: ScenarioDefinition)` atomically resets the board and loads sidebar items.
It is the single entry point for beginning a scenario - no separate `setScenario` action exists.

## Node data

`ServiceNodeData` carries `extraHandles?: HandleConfig[]`, baked in at drop time from the scenario's sidebar item definition.
`AnswerPage` nodes must include `extraHandles` directly in their data objects (not derived from store state).

## Cumulative validation

`submitDesign(scenarioId, ticketIndex, nodes, edges)` in `engine.ts` runs all validators from ticket 0 through `ticketIndex` in order.
The first failure stops evaluation.
Every ticket's requirements implicitly include all prior tickets.

## Scenarios

| Slug | Title | Tickets |
|------|-------|---------|
| `sparkling-water` | Sparkling Secret | 5 - classic VPC web app (EC2/ECS, ALB, ASG, WAF, NAT, RDS) |
| `spooderman-api` | Spooderman API | 5 - serverless API (API Gateway, Lambda, DynamoDB, SQS, Cognito, WAF) |
