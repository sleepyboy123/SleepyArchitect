# Proposal: Gameboard Core

## Why This Change

This is the first phase of an AWS architecture teaching game.
Players will eventually be given tickets/objectives and must build a correct AWS architecture to complete them.
This change delivers the interactive gameboard - the canvas where players place and connect AWS services.
The ticket system and scoring come in later phases.

## Scope

Build the gameboard UI only.
This includes the fixed structural layout (Internet, VPC, subnets), the draggable AWS service sidebar, the slot-based placement system inside subnets, and edge drawing between nodes.
No backend, no game logic, no ticket/objective system in this phase.

## Scoping Gate Answers

- **Tool type:** Frontend - React application (Vite + TypeScript, already scaffolded)
- **Audience/maturity:** Educational tool, PoC quality for now but built cleanly enough to extend
- **Scale:** Team/org-wide (CSA context), single player per session
