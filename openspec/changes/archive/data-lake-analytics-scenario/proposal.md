# Scenario 4: Data Lake & Analytics

## Scoping Gate

1. **Tool type:** Frontend (TypeScript/React)
2. **Audience/maturity:** Proof-of-concept/experiment (educational game)
3. **Scale:** Personal

## Why

The game currently teaches three AWS domains: classical web (VPC/EC2/RDS), serverless (API Gateway/Lambda/DynamoDB), and streaming (Kinesis/Firehose).
A data lake and analytics scenario is the natural next step, introducing the AWS analytics stack (Glue, Athena, QuickSight) and scheduled automation (EventBridge).
It builds on S3, which was introduced in Scenario 3, and teaches a genuinely different domain rather than rehashing prior patterns.

## Scope

- Add a new 5-ticket scenario following the established pattern from Scenarios 1-3
- Add 5 new ServiceType values and corresponding SVG icons
- Register the scenario in the scenario index
- No changes to game engine, validation utilities, or UI components
