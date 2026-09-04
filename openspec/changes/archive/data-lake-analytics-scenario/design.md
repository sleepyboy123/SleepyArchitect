# Design: Data Lake & Analytics Scenario

## Theme

Bossman wants dashboards showing sparkling water sales trends.
The sales team has been emailing CSV spreadsheets, and bossman needs a proper analytics pipeline.

## New Service Types

Add to `ServiceType` union in `frontend/src/types/game.ts`:
- `glue-crawler`
- `glue-job`
- `athena`
- `quicksight`
- `eventbridge`

## New SVG Icons

Create in `frontend/public/aws-icons/`:
- `glue-crawler.svg`
- `glue-job.svg`
- `athena.svg`
- `quicksight.svg`
- `eventbridge.svg`

## Files to Create

### `frontend/src/scenarios/data-lake-analytics/index.ts`

ScenarioDefinition with:
- id: `data-lake-analytics`
- title: something bossman-themed
- 6 sidebar items: S3 (reused), Glue Crawler, Glue Job, Athena, QuickSight, EventBridge

### `frontend/src/scenarios/data-lake-analytics/tickets.ts`

5 tickets with cumulative validation (each ticket validates all previous state still holds):

**Ticket 1 - S3 Landing Zone**
- Place S3 in public subnet so external sales data can land
- Validate: S3 in public subnet, reachable from IGW

**Ticket 2 - Glue ETL Pipeline**
- Place Glue Crawler and Glue Job in private subnet
- Connect Crawler to S3 (reads raw data), Crawler to Job (feeds schema)
- Validate: both in private, connected to S3, connected to each other

**Ticket 3 - Athena Query Layer**
- Place Athena in private subnet
- Connect Athena to S3 (queries data directly)
- Validate: Athena in private, connected to S3

**Ticket 4 - QuickSight Dashboards**
- Place QuickSight in private subnet
- Connect QuickSight to Athena (visualization reads from query engine)
- Validate: QuickSight in private, connected to Athena

**Ticket 5 - Automated Pipeline (EventBridge)**
- Place EventBridge in private subnet
- Connect EventBridge to Glue Job (scheduled trigger)
- Validate: EventBridge in private, connected to Glue Job
- This ticket includes the traffic animation (final ticket, like Scenario 3)

### `frontend/src/scenarios/data-lake-analytics/answer.ts`

Reference architecture layout:

```
Public subnet:   [S3 = slot 2]
Private subnet:  [GlueCrawler=0] [GlueJob=1] [Athena=2] [QuickSight=3] [EventBridge=4]
```

Reference edges:
- IGW -> S3 (left handle, entry point)
- S3(bottom) -> GlueCrawler(top) - crawler reads data
- GlueCrawler(right) -> GlueJob(left) - feeds schema to job
- S3(bottom) -> Athena(top) - queries data directly (straight down, same column)
- Athena(right) -> QuickSight(left) - viz reads from query engine
- EventBridge(left) -> GlueJob(right) - scheduled trigger

## Files to Modify

- `frontend/src/types/game.ts` - add 5 ServiceType values
- `frontend/src/scenarios/index.ts` - import and register the new scenario

## Alternatives Considered

- **Lake Formation as final ticket** - rejected because IAM/permissions is less satisfying as a capstone and doesn't fit the game's visual architecture style
- **Four tickets only (no EventBridge)** - workable but the "automate it" finale is a better learning arc and more satisfying ending
- **Redshift as final ticket** - rejected because it would feel like "do the same thing again but with a different box" relative to Athena

## Verification

- TypeScript type-check passes (`tsc --noEmit` or `npm run build`)
- Manual play-through of all 5 tickets in the browser
- All objectives checkable via drag-and-connect
