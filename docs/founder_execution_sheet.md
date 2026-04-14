# AirWise Founder Execution Sheet

Last updated: 2026-04-14

## Objective

Translate the 90-day roadmap into a founder operating sheet that assigns weekly ownership across:

- product
- engineering
- pilot operations
- sales / GTM

This assumes two founders:

- `Technical Founder / CEO`: product strategy, engineering, infrastructure, UX, delivery, data model, AI/document workflows
- `Domain / GTM Cofounder`: customer access, pilot execution, building operations context, workflow validation, sales pipeline

Optional support:

- `BACnet / controls contractor`
- `RDP / RCxA advisor`
- `design partner building staff`

## Operating rules

- Every week must end with one demoable artifact.
- Product decisions should be validated against at least one real building.
- Sales activity should always be tied to pilot readiness, not detached outreach.
- Engineering should not block on perfect BAS integration if compliance workflows can keep moving.
- Any write-back capability requires explicit customer-side governance before activation.

## Weekly execution sheet

| Week | Product Owner | Engineering Owner | Pilot Ops Owner | Sales / GTM Owner | Weekly Deliverable |
|---|---|---|---|---|---|
| 1 | Define MVP workflow and screens for portfolio, building, compliance, documents | Set up repo, environments, auth, DB, queue, storage | Create pilot intake checklist and customer data request list | Confirm pilot target account, stakeholders, and decision-maker map | MVP scope doc + pilot intake pack |
| 2 | Finalize information architecture and data model priorities | Create initial schema and config tables for pathways, penalties, PECMs, limits | Gather sample building roster and sample docs | Lock pilot discovery meetings and request BAS/sensor access info | Schema v1 + sample intake data |
| 3 | Define building overview and portfolio import UX | Build portfolio import and building resolver | Validate imported buildings against owner truth | Advance pilot discussion toward committed test buildings | Imported pilot roster with conflicts list |
| 4 | Define confidence/conflict UX and manual review flow | Implement identity resolution, review states, building overview page | Resolve address/BBL/BIN mismatches with customer | Confirm which buildings are in compliance pilot vs monitoring pilot | Canonical building graph for pilot set |
| 5 | Define compliance workspace layout for Article 320 and 321 | Build pathway resolver and requirement generator | Review outputs against DOB docs and owner records | Position AirWise around compliance workflow value in pilot conversations | Compliance workspace skeleton |
| 6 | Define portfolio compliance dashboard and blocker visibility | Implement Article 320 + 321 workspaces and dashboard | Validate pathway results, PECM applicability, and terminology | Convert design-partner interest into pilot scope and commercial terms | Real building readiness dashboard |
| 7 | Define document/evidence UX and audit trail | Build upload, classification state, evidence links, audit entries | Collect and upload representative real documents | Use demo to support pilot close and stakeholder confidence | Evidence workflow v1 |
| 8 | Refine requirement/evidence states based on real documents | Implement readiness recalculation and document review states | Review missing evidence and assign follow-ups | Finalize pilot SOW / success criteria / access plan | Compliance + evidence demo using real docs |
| 9 | Define monitoring overview, issue cards, and operator task UX | Build telemetry ingest, time-series store, BACnet discovery pipeline | Coordinate BAS or gateway access and point list availability | Keep pilot stakeholders aligned on monitoring scope and building access | First telemetry and discovery ingest |
| 10 | Define point mapping review workflow and system detail page | Store devices/points, implement mapping admin flow, polling | Validate mapped systems with operator/contractor | Prepare pilot narrative for monitoring value, not just compliance | Mapped pilot ventilation system |
| 11 | Define issue detection outputs and recommendation UX | Implement issue rules and recommendation generation | Review issues with operator/engineer and tune thresholds | Use live issues as proof of operational insight in customer conversations | Recommendations v1 |
| 12 | Define before/after workflow and intervention logging UX | Implement intervention tracking and before/after reporting | Get operator follow-through on recommended actions | Convert recommendation evidence into expansion narrative | First completed recommendation outcome |
| 13 | Define command request/approval UX and safety notices | Implement whitelist model, command request flow, approval roles | Confirm customer-side approval chain and restricted systems | Align customer expectations on supervised control vs automation | Command workflow v1 |
| 14 | Define rollback and command audit UX | Implement execution, expiry, rollback, and logs | Validate approved write categories with BAS specialist | Use controlled write-back as trust-building pilot milestone | Successful supervised test command |
| 15 | Prioritize pilot polish, KPI summaries, and reporting outputs | Fix critical bugs, improve dashboards, add KPI summaries | Collect pilot feedback and unresolved blockers | Prepare pilot review deck and expansion path | Pilot review build |
| 16 | Define next-phase roadmap from actual usage | Close critical bugs, stabilize exports, package learnings | Run pilot retrospective with customer and partners | Push for annual contract / expansion / next portfolio | Customer-ready pilot outcome package |

## Function-by-function founder ownership

## Product

### Technical Founder / CEO

Owns:

- product scope and sequencing
- UX for portfolio, compliance, monitoring, and command workflows
- prioritization decisions
- requirements tradeoffs
- weekly demo narrative

Must deliver each week:

- updated MVP decision log
- current workflow spec
- clear acceptance criteria for the next build slice

### Domain / GTM Cofounder

Owns:

- validating that product workflows reflect real owner/operator behavior
- reviewing terminology, tasks, and evidence requirements
- confirming that outputs are useful in actual customer meetings

Must deliver each week:

- product feedback grounded in at least one real building or stakeholder
- list of confusing, missing, or non-credible workflow elements

## Engineering

### Technical Founder / CEO

Owns:

- architecture
- schema and APIs
- frontend implementation
- backend implementation
- telemetry and command safety logic
- infra and deployment
- observability

Must deliver each week:

- one demoable product increment
- updated docs/specs where logic changed
- visible blocker list

### BACnet / controls contractor

Owns when engaged:

- BAS access assumptions
- point classification guidance
- safe write categories
- rollback realism

Must deliver when engaged:

- reviewed point maps
- approved or rejected write candidates
- list of control risks

## Pilot Operations

### Domain / GTM Cofounder

Owns:

- building intake coordination
- document collection
- stakeholder routing
- BAS access coordination
- operator task follow-up
- pilot meeting cadence

Must deliver each week:

- current pilot status sheet
- list of blockers by building
- next actions assigned to customer or internal team

### Technical Founder / CEO

Owns support for pilot ops through:

- import tools
- evidence workflows
- dashboards
- logs and troubleshooting

Must deliver each week:

- tools that reduce manual pilot coordination
- instrumentation to see what is failing

## Sales / GTM

### Domain / GTM Cofounder

Owns:

- pilot close
- expansion path inside first account
- warm intro pipeline
- stakeholder mapping
- meeting follow-up
- commercial framing

Must deliver each week:

- account status update
- open commercial questions
- next-step asks for each stakeholder

### Technical Founder / CEO

Owns support for GTM through:

- live product demos
- technical credibility in customer meetings
- roadmap framing
- scoped answers to integration and deployment questions

Must deliver each week:

- updated demo environment
- technically credible answers to customer objections

## Weekly founder meeting template

### 1. Product review

- What shipped last week?
- What is demoable now?
- What changed in the acceptance criteria?

### 2. Pilot review

- Which buildings advanced?
- What data is missing?
- What access is blocked?
- What operator actions are pending?

### 3. Sales review

- Is the pilot moving toward commitment or expansion?
- What objections came up?
- What proof is still missing for the buyer?

### 4. Risk review

- compliance interpretation risks
- data quality risks
- BAS access risks
- customer adoption risks
- command safety risks

### 5. Next-week lock

- one product deliverable
- one pilot milestone
- one sales milestone

## Scorecard to review every Friday

### Product

- Was a demoable increment shipped?
- Is the critical path still on track?
- Were any safety or compliance assumptions changed?

### Engineering

- Are APIs/schema stable enough for the next week?
- Are there new technical blockers?
- Is observability sufficient to debug pilot issues?

### Pilot Ops

- Did at least one building advance materially?
- Did document completeness improve?
- Did telemetry / BAS access improve?

### Sales

- Did stakeholder confidence increase?
- Is pilot scope clearer?
- Is the path to paid expansion stronger?

## Founder-level KPIs

### Technical Founder / CEO

- `% roadmap tasks shipped on time`
- `% pilot blockers caused by product gaps`
- `time to resolve critical pilot bug`
- `number of demoable features shipped`

### Domain / GTM Cofounder

- `pilot stakeholder response time`
- `% requested documents received`
- `% pilot buildings with validated facts`
- `pilot progression from interest to scoped commitment`

### Shared KPIs

- `% buildings resolved to pathway`
- `% buildings with usable readiness views`
- `number of actionable ventilation issues detected`
- `recommendation acceptance rate`
- `pilot-to-expansion probability`

## Escalation rules

- If compliance facts conflict with owner data, escalate immediately and do not silently choose one source.
- If BAS access is delayed more than one week, switch to read-only/replayed data plan rather than blocking the roadmap.
- If command safety is uncertain, disable write-back and continue recommendation-only mode.
- If the pilot account stalls commercially, use the product artifacts to open the second design-partner path in parallel.
