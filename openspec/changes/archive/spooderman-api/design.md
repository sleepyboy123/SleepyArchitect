# Design: Spooderman API Scenario

## Chosen approach

Approach B: scenario-scoped sidebars + shared validation utilities.
Each `ScenarioDefinition` carries its own `sidebarItems` array.
The store loads sidebar items from the active scenario on mount.
Generic validation helpers live in `src/scenarios/validation/utils.ts` (shared), not under any one scenario folder.

## Why over alternatives

- **Approach A (global sidebar):** Rejected. Adding Lambda/DynamoDB/SQS to the global list means Sparkling Secret players see irrelevant services. Confusing for a learning game.
- **Approach C (per-scenario validation namespaces):** Rejected. `getNodesOfType`, `hasEdgeBetween`, `hasPathBetween`, `isReachableFromIgw` are generic graph utilities with no scenario-specific logic. Duplicating them is pure noise.

## Files changed

| File | Change |
|------|--------|
| `src/types/game.ts` | Add 5 `ServiceType` values; remove global `SIDEBAR_ITEMS` export |
| `src/types/scenario.ts` | Add `sidebarItems: SidebarItem[]` to `ScenarioDefinition` |
| `src/store/useGameStore.ts` | Add `setScenario(scenario)` action; drop static sidebar init |
| `src/scenarios/validation/utils.ts` | New shared location for validation helpers |
| `src/scenarios/sparkling-water/validation/utils.ts` | Update imports to point at shared location |
| `src/scenarios/sparkling-water/index.ts` | Add `sidebarItems`; rename title to `'Sparkling Secret'` |
| `src/scenarios/spooderman-api/tickets.ts` | New - 5 tickets with validators |
| `src/scenarios/spooderman-api/answer.ts` | New - reference architecture |
| `src/scenarios/spooderman-api/index.ts` | New - scenario definition |
| `src/scenarios/index.ts` | Register spooderman-api |
| `src/pages/GameplayPage.tsx` | Call `setScenario` on mount |
| `src/components/gameboard/canvas/nodes/IgwNode.tsx` | Fix pointer-events |
| `src/components/gameboard/canvas/nodes/InternetNode.tsx` | Add tooltip |
| `frontend/public/aws-icons/` | 5 new SVGs |

## Type system changes

### `ServiceType` (game.ts)

Five values added to the union:

```
'api-gateway' | 'lambda' | 'dynamodb' | 'sqs' | 'cognito'
```

### `ScenarioDefinition` (scenario.ts)

New required field:

```ts
sidebarItems: SidebarItem[]
```

`SIDEBAR_ITEMS` is removed from `game.ts`.
Sparkling Secret's sidebar items move into `sparkling-water/index.ts`.
Spooderman API defines its own sidebar: API Gateway, Lambda, DynamoDB, SQS, Cognito, WAF.

### Store

`useGameStore` gains a `setScenario(scenario: ScenarioDefinition)` action that writes `scenario.sidebarItems` into store state.
`GameplayPage` calls `setScenario` on mount (after resolving the scenario from `ALL_SCENARIOS`).
The static `sidebarItems: SIDEBAR_ITEMS` initialiser is replaced with an empty array as the default (no scenario active).

## Shared validation utilities

`src/scenarios/validation/utils.ts` is the new home for:
- `getNodesOfType`
- `getNodesInSubnet`
- `hasEdgeBetween`
- `hasPathBetween`
- `isReachableFromIgw`

`sparkling-water/validation/utils.ts` is updated to import from the shared path.
The file itself can stay as a thin re-export or be deleted if all internal imports are updated directly.

## Spooderman API scenario

### Narrative

A startup replacing their monolith with serverless (Bossman has been reading Medium articles).
Company: Spooderman API.
Ticket text is placeholder - user will hand-craft final copy.

### Sidebar items

| Label | ServiceType | Icon |
|-------|-------------|------|
| API Gateway | `api-gateway` | `/aws-icons/api-gateway.svg` |
| Lambda | `lambda` | `/aws-icons/lambda.svg` |
| DynamoDB | `dynamodb` | `/aws-icons/dynamodb.svg` |
| SQS | `sqs` | `/aws-icons/sqs.svg` |
| Cognito | `cognito` | `/aws-icons/cognito.svg` |
| WAF | `waf` | `/aws-icons/waf.svg` |

### Ticket arc

All validators are cumulative (engine runs 0..N in order).

**Ticket 1 - `api-online`**
Validate: an `api-gateway` node exists and is reachable from IGW; a `lambda` node exists and is connected (directly or via path) to the api-gateway.
Objectives: API Gateway in public subnet; Lambda in private subnet.
Traffic animation: default.

**Ticket 2 - `save-data`**
Validate: all of #1 + a `dynamodb` node exists + there is an edge between a lambda and the dynamodb.
Objectives: DynamoDB in private subnet.
Traffic animation: default.

**Ticket 3 - `auth`**
Validate: all of #2 + a `cognito` node exists + cognito is reachable from IGW + there is an edge between cognito and an api-gateway.
Objectives: Cognito in public subnet; Cognito has a path to API Gateway.
Traffic animation: default.

**Ticket 4 - `async-processing`**
Validate: all of #3 + an `sqs` node exists + there are at least 2 `lambda` nodes + at least one lambda→sqs edge exists + at least one sqs→lambda edge exists.
Objectives: SQS in private subnet; at least two Lambda functions present.
Traffic animation: `{ bubbleCount: 8, bubbleSpeed: 1.2 }` (async queue feel).

**Ticket 5 - `security`**
Validate: all of #4 + a `waf` node exists + waf is reachable from IGW + waf has at least one edge to a non-structural node.
Objectives: WAF in public subnet; WAF directly connected to IGW.
Traffic animation: `{ bubbleColor: '#ef4444', bubbleCount: 6, bubbleSpeed: 1.6 }` (security incident feel).

### Reference architecture (`answer.ts`)

**Public subnet (slots 0-2):** WAF → Cognito → API Gateway

**Private subnet (slots 0-3):** Lambda handler (slot 0), SQS (slot 1), Lambda worker (slot 2), DynamoDB (slot 3)

**Edges:**
```
igw → waf → cognito → api-gateway → lambda-handler
lambda-handler → sqs
sqs → lambda-worker
lambda-handler → dynamodb
```

## Bug fixes

### IGW tooltip not showing

React Flow sets `pointer-events: none` on nodes where `selectable: false`.
The `TooltipTrigger` never receives hover events.
Fix: add `style={{ pointerEvents: 'all' }}` to the outer `<div>` in `IgwNode.tsx`.

### InternetNode has no tooltip

Add a `TooltipProvider` / `Tooltip` / `TooltipContent` matching the IgwNode pattern.
Content: `"The public internet - traffic originates here before hitting the IGW"`.

## Icons

Source: `aws-icon-packages/Architecture-Service-Icons_04302026/` (48px Arch_ variants).

| Source file | Destination |
|-------------|-------------|
| `Arch_Networking-Content-Delivery/.../Arch_Amazon-API-Gateway_48.svg` | `public/aws-icons/api-gateway.svg` |
| `Arch_Compute/.../Arch_AWS-Lambda_48.svg` | `public/aws-icons/lambda.svg` |
| `Arch_Databases/.../Arch_Amazon-DynamoDB_48.svg` | `public/aws-icons/dynamodb.svg` |
| `Arch_Application-Integration/.../Arch_Amazon-Simple-Queue-Service_48.svg` | `public/aws-icons/sqs.svg` |
| `Arch_Security-Identity/.../Arch_Amazon-Cognito_48.svg` | `public/aws-icons/cognito.svg` |
