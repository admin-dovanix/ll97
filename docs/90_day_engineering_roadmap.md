# AirWise 90-Day Engineering Roadmap

Last updated: 2026-04-14

## Objective

Use the first 90 days to move from planning artifacts to a pilot-ready MVP for:

- LL97 compliance workflows for `Article 320 + Article 321`
- portfolio and building workspaces
- ventilation telemetry and issue detection
- operator recommendations
- limited supervised BACnet write-back for approved pilot systems

This roadmap assumes a small founding team:

- `Technical founder`: product, frontend, backend, data model, infra, AI/document workflows
- `Domain/GTM cofounder`: pilot intake, building/customer coordination, workflow validation, requirements review
- `Specialist support as needed`: BACnet/gateway contractor, RDP/RCxA advisors, design partner staff

## Delivery principles

- Ship the compliance engine before advanced monitoring.
- Keep all rules traceable and configuration-driven.
- Use deterministic workflows before AI-heavy automation.
- Pilot with one or two real buildings before broadening support.
- Treat BACnet writes as privileged operations with explicit approval and rollback.

## Success criteria by Day 90

- one portfolio imported and mapped into the system of record
- at least one `Article 320` building and one `Article 321` building represented correctly
- live or replayed telemetry running for at least one ventilation system
- issue detector generating actionable recommendations
- building scorecards and portfolio dashboard usable in pilot meetings
- supervised write-back working only for whitelisted pilot points

## Week-by-week roadmap

### Weeks 1-2: Foundation and rules setup

#### Technical founder

- create repo structure and environment setup
- stand up frontend, backend, database, object storage, auth, and job runner
- define initial schema for portfolios, buildings, coverage records, requirements, documents, telemetry, recommendations, and commands
- create seed/config tables for:
  - LL97 pathways
  - deadlines
  - penalty formulas
  - PECM metadata
  - emissions-limit references
- implement tenant-aware auth and role model

#### Domain/GTM cofounder

- finalize pilot building intake template
- gather target pilot building roster
- collect sample documents:
  - utility bills
  - ESPM exports
  - engineering reports
  - Article 321 proof docs
- confirm building archetypes and target systems with design partner

#### Acceptance

- local and staging environments run
- schema can represent Article 320 and 321 buildings
- rule/config tables are loaded
- pilot intake template is usable

### Weeks 3-4: Building graph and identity resolution

#### Technical founder

- implement portfolio creation and building import flow
- build `BBL + BIN + address` resolver
- store public-source and owner-source identity separately
- create confidence and conflict model for mismatched records
- implement building overview page

#### Domain/GTM cofounder

- validate imported buildings against real owner rosters
- identify conflicts requiring manual review
- confirm which buildings are pilot candidates for monitoring

#### Acceptance

- imported building roster resolves into canonical building records
- unresolved conflicts are visible and actionable
- building overview page is usable for pilot intake review

### Weeks 5-6: Compliance engine MVP

#### Technical founder

- implement covered-building and pathway resolver
- generate compliance requirements by reporting year
- create Article 320 workspace:
  - pathway
  - GFA/property-use data
  - emissions/limit placeholders
  - evidence checklist
  - penalty estimate fields
- create Article 321 workspace:
  - performance vs prescriptive branch
  - PECM status grid
  - attestation roles
  - evidence checklist
- create portfolio compliance dashboard

#### Domain/GTM cofounder

- validate building outputs against public docs and known building facts
- review Article 321 PECM applicability on pilot buildings
- confirm owner-facing terminology and workflow order

#### Acceptance

- at least one Article 320 and one Article 321 building render correctly
- portfolio dashboard ranks buildings by readiness and blockers
- missing-data and evidence gaps are clearly visible

### Weeks 7-8: Document and evidence workflow

#### Technical founder

- implement document upload and storage
- add document classification statuses
- build evidence attachment flow from document to requirement
- add audit trail entries for changes to requirements and evidence
- create document/evidence workspace

#### Domain/GTM cofounder

- upload sample real-world documents
- verify required evidence categories per building
- identify document types that need manual fallback handling

#### Acceptance

- users can upload and attach documents to requirements
- readiness changes as evidence is added or rejected
- audit trail is visible for pilot review

### Weeks 9-10: Monitoring ingestion and BACnet discovery

#### Technical founder

- implement `SensorIngest API`
- implement telemetry store and normalized event pipeline
- build BACnet discovery runner
- store discovered devices and points
- create point taxonomy mapping UI or admin workflow
- support read-only polling for pilot building systems

#### Specialist support

- validate gateway/network assumptions
- help classify writable vs non-writable points
- confirm safe candidate point types for later write-back

#### Domain/GTM cofounder

- coordinate BAS access and point list review with customer
- verify target systems are in scope for the wedge

#### Acceptance

- at least one pilot building has telemetry flowing
- BACnet devices/points are discovered and stored
- candidate point mappings exist for at least one ventilation system

### Weeks 11-12: Issue detection and recommendations

#### Technical founder

- implement deterministic issue rules:
  - after-hours runtime
  - schedule mismatch
  - high CO2 / low ventilation
  - stale override
  - sensor fault
- create recommendation generation workflow
- add operator action tracking and status changes
- add before/after comparison view for executed actions

#### Domain/GTM cofounder

- validate recommendations with operator or engineer feedback
- refine thresholds for pilot building behavior
- document acceptable owner/operator actions

#### Acceptance

- the system detects at least three real issue types
- recommendations include evidence and next-step actions
- before/after view works for at least one completed intervention

### Weeks 13-14: Supervised command workflow

#### Technical founder

- implement point whitelist model
- implement command request, approval, execution, expiry, and rollback
- add role-gated approvals
- log before/after values and execution status
- disable commands by default outside approved pilot buildings

#### Specialist support

- validate safe write categories and rollback behavior
- review approval workflow against BAS realities

#### Domain/GTM cofounder

- align customer-side governance for who may approve commands
- confirm building-specific write restrictions

#### Acceptance

- whitelisted points only
- approved schedule or setpoint change can execute and rollback
- full audit log is recorded

### Weeks 15-16: Pilot hardening and packaging

#### Technical founder

- fix critical bugs from pilot use
- tighten dashboards and scorecards
- add KPI summaries:
  - readiness
  - issues detected
  - recommendation conversion
  - intervention outcomes
- prepare export/report views for customer meetings

#### Domain/GTM cofounder

- run pilot review with customer
- collect objections, gaps, and workflow friction
- convert outcomes into next-phase product priorities

#### Acceptance

- pilot narrative is usable in a customer meeting
- compliance + monitoring value is visible in one product
- next-step backlog is prioritized from real usage

## Critical path

The critical path is:

1. environment and schema
2. building graph
3. pathway resolver
4. compliance workspaces
5. evidence workflow
6. telemetry ingestion
7. issue detection
8. supervised commands

Do not delay compliance work for BAS complexity. The compliance engine is the core wedge.

## Dependencies

### External dependencies

- pilot building roster
- ESPM / utility / engineering sample data
- BAS access or export
- sensor or gateway vendor cooperation
- RDP/RCxA interpretation support as needed

### Internal dependencies

- rule tables must exist before compliance generator
- canonical building IDs must exist before telemetry and documents attach cleanly
- point mapping must exist before issue detection is trustworthy
- whitelist policy must exist before commands are enabled

## Risk controls

- If BAS access slips, continue with replayed data and recommendation workflows.
- If Article 321 edge cases slow development, ship the common pathways first but keep the schema complete.
- If document classification is noisy, use manual review states rather than blocking the workflow.
- If telemetry quality is poor, suppress automated write eligibility for affected systems.

## Weekly operating cadence

### Engineering review

- demo current build every week
- review blockers and architecture changes
- track schema, API, and rules changes in docs

### Product/domain review

- review one real building each week
- compare product outputs against external truth
- refine thresholds and task language with customer feedback

### Pilot operations review

- track building access, documents, telemetry quality, and pending approvals

## Definition of MVP complete

MVP is complete when:

- a real customer can use AirWise as the primary system of record for pilot buildings
- Article 320 and Article 321 workflows are understandable and actionable
- ventilation issues are detectable from live or replayed telemetry
- operator actions and supervised commands are tracked with evidence
- no unsafe BACnet write path exists outside approved pilot conditions
