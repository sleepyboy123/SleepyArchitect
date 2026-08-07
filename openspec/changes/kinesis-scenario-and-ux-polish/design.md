# Design: Kinesis Scenario + UX Polish

## Feature 1: Ticket Transition Animation

### Approach chosen: Slide-in from top + "NEW" badge

`TicketBanner` is already keyed by `ticket.id`, so React unmounts and remounts it on every ticket advance.
We exploit this by adding a CSS entry animation to the banner on mount - no extra state needed.

**Implementation:**
- Add a `animate-ticket-enter` Tailwind keyframe class (or inline `@keyframes` in `index.css`) that transitions from `translateY(-24px) opacity-0` to `translateY(0) opacity-1` over `350ms` with a spring-style easing curve.
- Render a `<span>` badge reading "NEW" absolutely above the banner. It pops in (`scale-0 → scale-110 → scale-100`) via a separate animation with a `150ms` delay, then fades out at `1.2s` via a delayed opacity transition.
- The badge auto-hides after its fade - no JS timer needed; pure CSS `animation-fill-mode: forwards`.

**Why this over alternatives:**
- A flash/highlight (Option B) would require JS state to re-trigger on an already-mounted component - more complexity.
- A toast (Option C) adds a new UI layer and positioning concern.
- Slide + badge (Option D, chosen) uses only CSS on a component that already remounts, which is the simplest possible mechanism.

---

## Feature 2: Sidebar Service Tooltips

### Approach chosen: Radix `Tooltip`, placement `side="right"`

The `TooltipProvider` already wraps the entire app in `App.tsx` with `delayDuration={300}`.
`ServiceNode` already uses `<Tooltip><TooltipTrigger asChild><TooltipContent>` from `components/ui/tooltip.tsx`.

**Implementation:**
- In `SidebarItem.tsx`, wrap the existing tile `div` in `<Tooltip><TooltipTrigger asChild>`.
- Add `<TooltipContent side="right" className="max-w-48 text-center">` with `{item.tooltip}`.
- Remove the native `title={item.tooltip}` attribute (now redundant and would double-show).

**Why `side="right"`:** The sidebar is on the left edge of the screen. Right-side placement floats the tooltip over the canvas, away from the sidebar's own layout, and avoids viewport clipping.

**No provider changes needed.** No new dependencies. Exact same animated Radix tooltip that nodes already use.

---

## Feature 3: Scenario 3 - "Current Events"

### Narrative

A media startup's web application generates user engagement events (article reads, clicks, shares).
The boss wants a real-time pipeline to process these events, maintain live counters for a dashboard, and archive raw events for later analysis.

The name "Current Events" is a double meaning: news (current events) and electrical/water current (data stream).

### Architecture (corrected standard AWS pattern)

```
Internet (data producer)
    → IGW
    → Kinesis Data Streams        [public subnet, slot 0]
        ├── → Lambda Processor    [private subnet, slot 0]  (real-time path)
        │       → DynamoDB        [private subnet, slot 1]  (live counters)
        └── → Data Firehose       [private subnet, slot 2]  (delivery path)
                → S3              [private subnet, slot 3]  (data lake)

CloudWatch                        [private subnet, slot 7]  (monitoring)
    ← KDS metrics + Lambda errors
```

**Key educational insight:** Kinesis Data Streams supports multiple independent consumers simultaneously.
Lambda and Firehose are peers consuming the same stream - not a chain.
This fan-out pattern is the core of the Kinesis mental model.

### New service types

| ServiceType | Label | Icon source |
|---|---|---|
| `kinesis-data-streams` | Kinesis Data Streams | `Arch_Analytics/32/Arch_Amazon-Kinesis-Data-Streams_32.svg` |
| `kinesis-firehose` | Data Firehose | `Arch_Analytics/32/Arch_Amazon-Data-Firehose_32.svg` |
| `s3` | S3 | `Arch_Storage/32/Arch_Amazon-Simple-Storage-Service_32.svg` |
| `cloudwatch` | CloudWatch | `Arch_Management-Tools/32/Arch_Amazon-CloudWatch_32.svg` |

Icons are copied to `frontend/public/aws-icons/` as `kinesis-data-streams.svg`, `firehose.svg`, `s3.svg`, `cloudwatch.svg`.

### 5-ticket progression

**Ticket 1 - "Wire up the stream"**
> "Hey! Our app is generating thousands of engagement events every minute but we're just throwing them away. Can you set up Kinesis Data Streams so we can start capturing them?"

Objective: Place Kinesis Data Streams in the public subnet, connected from the IGW.
Teaches: What a shard is, why a buffer/queue matters before processing.

**Ticket 2 - "Start processing"**
> "Great - data is flowing in! Now I need you to hook up a Lambda function to read from the stream and process each batch. We'll figure out where to store things next."

Objective: Place Lambda Processor in the private subnet, connected from KDS.
Teaches: Lambda event source mapping, KDS as a trigger, batch processing concept.

**Ticket 3 - "Live dashboard counters"**
> "The CEO wants a live dashboard showing read counts per article. Connect Lambda to DynamoDB so we can store real-time aggregations."

Objective: Place DynamoDB in the private subnet, connected from Lambda.
Teaches: Hot-path pattern, DynamoDB as a low-latency counter store.

**Ticket 4 - "Archive everything"**
> "Legal needs us to retain all raw events for 7 years. Set up Kinesis Data Firehose reading directly from the stream and delivering to S3. Don't route it through Lambda - Firehose does this natively."

Objective: Place Firehose + S3 in the private subnet; Firehose connects from KDS (not Lambda).
Teaches: The critical distinction - Firehose is a KDS consumer, not a Lambda sink. Fan-out from one stream to two consumers.

**Ticket 5 - "We need visibility"**
> "We had a stream outage yesterday and didn't know for 2 hours. Add CloudWatch so we can alarm on IteratorAge (stream lag) and Lambda error rates."

Objective: Place CloudWatch connected from KDS.
Teaches: IteratorAge metric (stream consumer lag), observability for streaming systems.

### Validation approach

Each ticket validates cumulatively (same as existing scenarios):
- T1: KDS in public subnet, edge from igw → kds
- T2: T1 + Lambda in private subnet, edge from kds → lambda
- T3: T2 + DynamoDB in private subnet, edge from lambda → dynamodb
- T4: T3 + Firehose in private subnet with edge from **kds** (not lambda) → firehose; S3 with edge from firehose → s3
- T5: T4 + CloudWatch in private subnet, edge from kds → cloudwatch

Ticket 4's validator explicitly checks that there is NO edge from lambda → firehose (teaching the correct pattern, not just accepting any connection).

### Sidebar items available to player

All five new service tiles are available from the start:
- Kinesis Data Streams: "Managed real-time data stream. Captures and buffers event records from producers at high throughput."
- Data Firehose: "Fully managed delivery stream. Reads directly from Kinesis Data Streams and delivers to S3, Redshift, or OpenSearch - no code needed."
- Lambda (Processor): "Serverless function triggered by Kinesis. Reads batches of stream records and runs your processing logic."
- DynamoDB: "NoSQL key-value store. Used here for low-latency real-time counters updated by Lambda on each batch."
- S3: "Object storage for the data lake. Receives archived event records from Firehose for long-term retention and batch analytics."
- CloudWatch: "AWS monitoring service. Tracks stream metrics (IteratorAge, PutRecord throttles) and Lambda error rates."
