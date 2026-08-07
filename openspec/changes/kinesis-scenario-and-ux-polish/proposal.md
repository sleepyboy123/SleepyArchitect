# Proposal: Kinesis Scenario + UX Polish

## Scoping Gate

- **Tool type:** Frontend (browser-based game)
- **Audience / maturity:** Personal learning tool / proof-of-concept
- **Scale:** Single user (personal)

## Problem

Three independent UX gaps and a content gap in the AWS Architect game:

1. **Ticket transition is invisible.** When a ticket completes and the next one is assigned, the `TicketBanner` remounts silently. There is no visual signal that the content changed - players can miss that they have a new objective.

2. **Sidebar service items have no rich tooltip.** The `tooltip` field on each `SidebarItem` is wired only as a native HTML `title` attribute. Players have no way to read a service description before committing to dragging it onto the canvas.

3. **No data pipeline scenario.** The game currently teaches classic web architecture (Scenario 1) and serverless API architecture (Scenario 2). There is no scenario covering real-time data ingestion - a common and important AWS pattern the author wants to learn.

## Scope

This change delivers all three fixes as one unit - they share a release but are independent of each other in implementation.

**In scope:**
- Ticket banner slide-in + "NEW" badge animation on ticket advance
- Radix `Tooltip` on sidebar service tiles, right-side placement
- New Scenario 3: "Current Events" - a 5-ticket Kinesis data pipeline scenario
- New AWS icons: Kinesis Data Streams, Data Firehose, S3, CloudWatch (copied from `aws-icon-packages/`)
- New `ServiceType` entries for the four new services

**Out of scope:**
- Changes to the scenario select page layout
- Any modification to Scenarios 1 or 2
- Kinesis Data Analytics / Apache Flink (too advanced for a learning scenario)
- VPC-level changes to the canvas layout (new scenario reuses the existing public/private subnet canvas)
