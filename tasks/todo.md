# New Scenario Ideas

## Scenario 4: Data Lake & Analytics

**Theme:** Bossman wants dashboards showing sparkling water sales trends.

**AWS concepts taught:** S3 data lake, Glue crawlers/ETL, Athena for queries, QuickSight for visualization.

**Ticket ideas:**
- [ ] Raw data landing zone - set up S3 bucket to receive sales data
- [ ] ETL pipeline - Glue crawler discovers schema, Glue job transforms data
- [ ] Query layer - Athena connected to the transformed data in S3
- [ ] Dashboards - QuickSight connected to Athena for visual analytics
- [ ] Access control - Lake Formation for fine-grained permissions

**New service nodes needed:** S3 (exists), Glue Crawler, Glue Job, Athena, QuickSight, Lake Formation

---

## Scenario 5: Container Orchestration (ECS/EKS)

**Theme:** Bossman wants to microservice-ify everything.

**AWS concepts taught:** ECS with Fargate, service discovery, ECR for container images, ALB routing to multiple services, task definitions.

**Ticket ideas:**
- [ ] Container registry - push images to ECR
- [ ] First service - deploy a single ECS Fargate service
- [ ] Load balancing - ALB routing traffic to the service
- [ ] Multi-service - split into multiple microservices with path-based routing
- [ ] Service discovery - internal service-to-service communication via Cloud Map
- [ ] Auto-scaling - ECS service auto-scaling based on CPU/memory

**New service nodes needed:** ECR, ECS Service, Fargate Task, Cloud Map, ALB (exists)

---

## Scenario 6: Event-Driven Architecture

**Theme:** Bossman wants things to "just happen" when stuff changes.

**AWS concepts taught:** EventBridge, SNS, SQS fan-out, Step Functions for orchestration, Lambda triggers, pub/sub vs point-to-point.

**Ticket ideas:**
- [ ] Event bus - set up EventBridge to receive events
- [ ] Simple reaction - Lambda triggered by an EventBridge rule
- [ ] Fan-out - SNS topic distributing events to multiple SQS queues
- [ ] Orchestration - Step Functions coordinating a multi-step workflow
- [ ] Dead letter queue - handle failed events gracefully
- [ ] Observability - CloudWatch monitoring the event flow

**New service nodes needed:** EventBridge, SNS, Step Functions, SQS (exists), Lambda (exists), CloudWatch (exists)
