# AirWise Building Capability Tiers Roadmap

Last updated: 2026-04-15

## 1. Purpose

This roadmap defines how AirWise should serve buildings at different levels of technical maturity:

- `sensorless buildings`
- `BAS-only buildings`
- `gateway-connected buildings`
- `fully monitored buildings`

The point is to avoid a one-size-fits-all product strategy. Different buildings should enter AirWise through different workflows while still converging on the same platform.

## 2. Tier model

### Tier A: Sensorless buildings

Definition:

- no live sensors in AirWise
- no telemetry feed
- BAS may be absent or inaccessible
- primary inputs are public data and owner-provided records

What AirWise should do:

- portfolio and building intake
- public-source matching
- coverage and pathway resolution
- LL97 requirement generation
- evidence checklist creation
- penalty/risk surfacing
- building scorecards
- operational hypothesis generation from static records
- monitoring-readiness recommendation

Success outcome:

- customer receives a compliance workspace and a clear next-step plan even without telemetry

### Tier B: BAS-only buildings

Definition:

- building has a BAS or exported controls data
- no direct live integration into AirWise yet
- point lists, schedules, screenshots, or exports are available

What AirWise should do:

- everything in Tier A
- capture BAS vendor, version, protocol, and access method
- store point inventory or exported schedules
- identify candidate systems for ventilation pilot
- identify likely writable points and safety boundaries
- recommend gateway-only integration or minimal instrumentation

Success outcome:

- customer understands whether the building is integration-ready and which systems to target first

### Tier C: Gateway-connected buildings

Definition:

- a gateway or runtime can exchange discovery, telemetry, and command data with AirWise
- initial data may still be limited to a few systems or points

What AirWise should do:

- everything in Tier A and Tier B
- discovery import
- point mapping
- runtime health monitoring
- deterministic issue detection
- recommendation workflow
- operator action tracking
- before/after comparisons
- supervised command dispatch for approved pilot points

Success outcome:

- one or more systems produce measurable issues, recommended actions, and controlled operator or command outcomes

### Tier D: Fully monitored buildings

Definition:

- multiple systems or zones are feeding live telemetry
- AirWise has enough signal coverage for repeatable operational workflows
- command safety boundaries are understood

What AirWise should do:

- everything in lower tiers
- broader issue coverage across systems
- recurring recommendation programs
- command policy by system/building
- portfolio reporting on operational outcomes
- stronger rollout decisions on where supervised control is worth expanding

Success outcome:

- the building becomes a repeatable operating account, not just a compliance account

## 3. Cross-tier foundation

All building tiers should share the same platform primitives:

- canonical building identity
- portfolio membership
- coverage and pathway resolution
- compliance requirements
- document and evidence workflow
- audit trail
- role-based access and approvals

This keeps the product coherent as buildings move from lower to higher tiers over time.

## 4. Feature roadmap by tier

### 4.1 Tier A roadmap: sensorless buildings

#### What exists now

- building import
- public-source import and matching
- compliance workspace
- evidence workflow
- blocker and penalty views

#### What to build next

- stronger owner-file intake and normalization
- intake forms for BAS presence and equipment inventory
- operational hypothesis cards based on static data
- building readiness classification
- monitoring recommendation output per building

#### Acceptance criteria

- a user can onboard a building with no telemetry and still receive a compliance workspace plus a monitoring-readiness recommendation

### 4.2 Tier B roadmap: BAS-only buildings

#### What exists now

- shared building graph
- monitoring workspace structure
- gateway and BAS concepts in the model

#### What to build next

- BAS profile capture in the building overview
- point-list upload or import workflow
- schedule export ingestion
- candidate-system mapping by ventilation archetype
- point safety review workflow before any live runtime is connected

#### Acceptance criteria

- a BAS-only building can be classified as `not ready`, `gateway-ready`, or `needs instrumentation` without requiring live telemetry first

### 4.3 Tier C roadmap: gateway-connected buildings

#### What exists now

- gateway registration
- runtime contract
- discovery snapshot import
- telemetry ingest
- issue detection
- recommendation actions
- before/after comparison
- supervised command dispatch skeleton

#### What to build next

- stronger runtime observability
- better point and system grouping
- issue confidence tuning
- command guardrails per system type
- richer operator feedback loop on completed actions

#### Acceptance criteria

- a connected building can move from discovery to issue detection to action to measured outcome with minimal manual intervention

### 4.4 Tier D roadmap: fully monitored buildings

#### What exists now

- partial scaffolding only

#### What to build later

- multi-system scorecards
- recurring operational campaign workflows
- portfolio rollups of recommendation conversion and operational impact
- automation expansion decision framework
- support for additional protocols only after BACnet workflows are reliable

#### Acceptance criteria

- a portfolio operator can manage recurring operational programs across multiple connected buildings from one workspace

## 5. Recommended sequencing

The roadmap should not jump directly from compliance into broad automation.

Recommended order:

1. strengthen Tier A so no-sensor buildings are a first-class product entry
2. strengthen Tier B to classify BAS-only buildings accurately
3. stabilize Tier C so connected pilots create measurable value
4. expand selectively into Tier D only after pilot outcomes justify it

This sequence matches the likely market reality of NYC portfolios, where many buildings will begin with incomplete controls access and uneven monitoring coverage.

## 6. What to build in the next planning cycle

Highest-priority planning slice:

- `No-sensor and BAS-only readiness workflow`

Specific product additions:

- BAS presence and access questionnaire
- equipment/system inventory capture
- monitoring readiness score
- recommended next integration path
- operational hypothesis cards driven by static documents and building archetype

Second-priority planning slice:

- `Connected pilot hardening`

Specific product additions:

- clearer gateway runtime health dashboards
- stricter command policy controls
- richer system grouping and asset views
- recommendation conversion metrics

## 7. Practical planning rule

Every building should leave onboarding with one of these statuses:

- `Compliance-only`
- `Needs BAS review`
- `Gateway-ready`
- `Needs instrumentation`
- `Monitoring active`
- `Supervised control pilot`

That status should drive the next workflow, the next commercial motion, and the next technical implementation step.

## 8. Decision framework by building type

### Sensorless building

Recommended action:

- sell compliance and building intelligence first
- do not block the account on missing sensors

### BAS-only building

Recommended action:

- assess exports, schedules, point inventory, and gateway feasibility
- decide whether BAS-only integration is enough or minimal instrumentation is needed

### Gateway-connected building

Recommended action:

- focus on a narrow, measurable ventilation pilot
- prove issue detection and operator follow-through before broadening scope

### Fully monitored building

Recommended action:

- expand from point pilot to repeatable operational program
- use measured outcomes to justify wider rollout or future automation
