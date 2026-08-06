# Proposal: Gameplay Mechanics

## Why This Change

The gameboard canvas is complete.
This change layers the full game loop on top of it: scenario selection, tickets, validation, and results.
Without this, the app is an interactive diagram tool with no educational purpose.

## Scope

Add the complete game loop for one scenario ("The Sparkling Water Co.") with five cumulative tickets.
Architecture the system so adding future scenarios requires only a new folder and one import line.

## Scoping Gate Answers

- **Tool type:** Frontend web app (React + TypeScript + Vite)
- **Audience / maturity:** Proof-of-concept / demo
- **Scale:** Personal / small demo

## What Is In Scope

- React Router with three routes: `/`, `/play/:scenarioId`, `/answer/:scenarioId`
- Scenario select page at `/`
- Gameplay page at `/play/:scenarioId` with pinned ticket banner and Submit button
- Result modal (pass / fail, optional objectives, Esc to close, Try Again / Next Ticket)
- Traffic animation on submit (edges animate from Internet outward before modal appears)
- Cumulative validation engine: ticket N requires tickets 0..N-1 to also pass
- One scenario: five tickets, imperative graph validators, optional objectives per ticket
- Hidden `/answer/:scenarioId` dev route showing the reference architecture
- Edge deletion via Backspace or Delete key

## What Is Out of Scope

- Backend, persistence, or user accounts
- More than one scenario in this round
- Undo / redo
- Mobile layout
