# AWS Architect Game

A browser-based learning game where you architect AWS solutions by dragging services onto a canvas and wiring them up, then submit your design to see how it holds up against real-world requirements.

## What It Is

You play as a cloud architect receiving tickets from "Bossman."
Each ticket asks you to solve a business problem - hosting a website, adding a database, surviving Black Friday traffic, locking down against attackers - without telling you the answer.
You drag AWS service icons into the correct subnets, connect them with edges, and hit Submit.
The game animates traffic flowing through your design and tells you whether it works.

Tickets build on each other: your design must satisfy every previous ticket's requirements too, not just the latest one.
You can always try again after seeing your results - optional objectives hint at AWS best practices without blocking your progress.

## Running Locally

```bash
docker compose up
```

Open `http://localhost:3000`.

There is no backend.
The game is a fully client-side React SPA.

## Project Structure

```
frontend/
  src/
    pages/           # Route-level components (Home, Gameplay, Answer)
    components/
      gameboard/     # Ticket banner, sidebar, result modal
        canvas/      # React Flow canvas, node/edge types
    scenarios/       # Game content lives here
      sparkling-water/   # The first scenario
        tickets.ts   # Ticket definitions and validators
        answer.ts    # Reference architecture for /answer/:id
      index.ts       # Scenario registry (add new scenarios here)
      engine.ts      # Cumulative validation logic
    store/           # Zustand game state
    types/           # Shared TypeScript types
```

## Adding a New Scenario

1. Create `src/scenarios/<your-scenario>/` with two files:
   - `tickets.ts` - exports an array of `Ticket` objects (id, message, validate, objectives, optional trafficAnimation)
   - `answer.ts` - exports `ANSWER_NODES` and `ANSWER_EDGES` for the `/answer/:id` reference page

2. Register it in `src/scenarios/index.ts`:
   ```ts
   import { ANSWER_NODES, ANSWER_EDGES } from './your-scenario/answer'
   import { TICKETS } from './your-scenario/tickets'

   export const ALL_SCENARIOS: Record<string, ScenarioDefinition> = {
     'your-scenario': {
       id: 'your-scenario',
       title: 'Your Title',
       description: 'One sentence description',
       tickets: TICKETS,
       answerNodes: ANSWER_NODES,
       answerEdges: ANSWER_EDGES,
     },
     // ...existing scenarios
   }
   ```

3. Add a card for it in `src/pages/HomePage.tsx`.

That is all.
The validation engine, traffic animation, cumulative checking, and result modal all work with any scenario automatically.

## Ticket Shape

```ts
interface Ticket {
  id: string
  message: string                                           // What Bossman says - no hints!
  validate: (nodes: Node[], edges: Edge[]) => boolean      // Pass/fail logic
  objectives: Objective[]                                   // Optional best-practice checks
  trafficAnimation?: {
    bubbleCount?: number    // default 3
    bubbleColor?: string    // default primary brand colour
    bubbleSpeed?: number    // seconds per loop, default 2
  }
}
```

Validators receive the full React Flow node and edge arrays.
Use the helper functions in `src/scenarios/sparkling-water/validation/utils.ts` as a starting point - they cover common checks like "does a node of type X exist", "is there an edge between X and Y", and "is a node inside subnet Z".

## Cumulative Validation

`submitDesign(scenarioId, ticketIndex, nodes, edges)` in `engine.ts` runs the validator for every ticket from 0 to `ticketIndex` in order.
The first failure stops evaluation and reports the failing ticket's objectives.
This means a player who perfectly solved ticket 1 but then deleted the frontend when solving ticket 3 will be caught.

## Reference Architecture

Each scenario has a hidden `/answer/:scenarioId` route that renders the ideal final architecture on a read-only canvas.
Use it for development and sanity-checking: if you place the answer architecture at the start of a new scenario, it should pass every ticket.

## Canvas Layout

The canvas uses a fixed slot grid inside each subnet.
Constants in `src/types/game.ts` control the layout:

| Constant | Value | Effect |
|---|---|---|
| `SLOTS_PER_ROW` | 7 | Columns per subnet row |
| `SLOT_WIDTH` | 92px | Horizontal slot spacing |
| `SLOT_HEIGHT` | 104px | Vertical slot spacing |
| `SLOT_START_X/Y` | 24/52px | Subnet padding |

`SUBNET_WIDTH` and `SUBNET_HEIGHT` are derived automatically.
Changing `SLOTS_PER_ROW` widens both subnets and the VPC proportionally.

## Traffic Animation

When you hit Submit, animated bubble particles flow along every edge for two seconds before the result appears.
The animation is powered by SVG `animateMotion` with `mpath` path references - no CSS keyframes.
Ticket-level `trafficAnimation` config overrides the defaults per-ticket (e.g. red bubbles for the security ticket, many bubbles for the Black Friday ticket).

## Tech Stack

- React 18 + TypeScript + Vite
- React Flow (`@xyflow/react`) for the interactive canvas
- Zustand for game state
- React Router DOM v7 for routing
- shadcn/ui + Tailwind CSS for UI components
- Vitest for unit tests

## Tests

```bash
cd frontend
npx vitest run
```

Tests cover the validation utility functions and the Zustand store's node/slot management.
