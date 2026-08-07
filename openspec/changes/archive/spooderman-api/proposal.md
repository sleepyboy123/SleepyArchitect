# Proposal: Spooderman API Scenario

## Why

The game currently has one scenario (Sparkling Secret / sparkling-water).
Adding a second scenario increases replay value, teaches a distinct AWS pattern (serverless / API Gateway + Lambda), and validates that the scenario system actually generalises.

## Scope

- Add a new five-ticket scenario called "Spooderman API" (`spooderman-api` slug).
- Refactor the sidebar so each scenario owns its own service list (prevents scenario 1 players seeing Lambda/DynamoDB they don't need).
- Move shared validation utilities out of `sparkling-water/` into a scenario-agnostic location.
- Rename scenario 1's display title from "The Sparkling Water Co." to "Sparkling Secret".
- Fix two tooltip bugs: IGW tooltip not firing (pointer-events blocked by React Flow), and InternetNode having no tooltip at all.
- Copy five new AWS icons from the local icon package.

## Scoping gate answers

- **Tool type:** Frontend (React SPA feature addition)
- **Audience / maturity:** Learning game, public-facing, small user base
- **Scale:** Public, small

## Out of scope

- Rewriting ticket message text (user will hand-craft copy later; placeholder text is used in this change).
- New canvas zones or structural node changes.
- Backend, persistence, or auth.
