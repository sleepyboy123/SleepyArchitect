# Sparkling Secret Validation Fixes

## Scoping Gate
- **Tool type:** Web application (React + TypeScript + Vite frontend)
- **Audience/maturity:** Personal tool
- **Scale:** A handful

## Why

The Sparkling Secret scenario has several bugs where ticket validation logic
does not match the stated objectives, and the engine gives misleading feedback
on regressions.
Players can pass tickets with architecturally incorrect designs, and when a
previous ticket regresses, they see all-green objectives with a "Not quite right"
message and no indication of what actually broke.

## Scope

Five fixes, all within existing files:

### Fix 1 - Engine regression feedback
When `submitDesign` detects a previous ticket's `validate` failure, it currently
returns the *current* ticket's objectives.
Change it to return the *failing* ticket's objectives and index.
Extend `ValidationResult` with `failedTicketIndex?`.
Update `ResultModal` to show a regression hint when this field is present.

### Fix 2 - ASG fan-out too permissive
Ticket 4's validate accepts ASG connected to any single compute node.
The objective and answer key expect ASG to fan out to both a frontend and a
backend node (EC2 or ECS variants accepted for each).
Tighten the validate to require connections to both tiers.

### Fix 3 - CDN bypass not blocked
Ticket 6's validate checks internet-to-CloudFront-to-igw exists, but does not
verify the direct internet-to-igw structural edge was removed.
Add a `!hasEdgeBetween(edges, 'internet', 'igw')` guard so traffic cannot
bypass CloudFront.

### Fix 4 - WAF position not enforced
Ticket 5's validate uses undirected BFS reachability from IGW, meaning a WAF
connected anywhere on the graph passes.
Require a direct edge between IGW and WAF, matching the objective ("WAF is the
first service after IGW").

### Fix 5 - Validate/objectives alignment
Fixes 2-4 tighten validates to match their objectives.
Fix 1 ensures players see the correct objectives on regression.
No additional structural change needed.

## Files

| File | Change |
|------|--------|
| `frontend/src/scenarios/engine.ts` | Return failing ticket index + objectives on regression |
| `frontend/src/types/scenario.ts` | Add `failedTicketIndex?` to `ValidationResult` |
| `frontend/src/components/gameboard/ResultModal.tsx` | Show regression hint |
| `frontend/src/scenarios/sparkling-water/tickets.ts` | Tighten validates for tickets 4, 5, 6 |

## Verification

- Run existing unit tests (vitest) for regressions
- Verify the answer key's architecture satisfies every tightened validate
- Reason through edge cases against the new validation logic
