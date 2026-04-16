# AirWise Next Sprint Ticket Backlog

Last updated: 2026-04-15

## 1. Purpose

This document converts the next sprint build plan into a dev-ready backlog with:

- epics
- stories
- dependencies
- acceptance criteria
- implementation notes

It is optimized for the next sprint goal:

- make `no-sensor` and `BAS-only` buildings first-class product entry paths

## 2. Epic summary

### Epic A: BAS and building readiness profile

Goal:

Capture enough structured building context to classify buildings before live telemetry exists.

### Epic B: Owner-file intake and normalization visibility

Goal:

Make intake completeness visible so the team and the customer can see what is missing.

### Epic C: Readiness classification engine

Goal:

Assign each building to a clear next-step status based on deterministic rules.

### Epic D: Operational hypothesis generation

Goal:

Produce useful data-light operational guidance even without telemetry.

### Epic E: Monitoring recommendation output

Goal:

Translate readiness and hypotheses into an actionable next implementation path.

### Epic F: Portfolio readiness views

Goal:

Expose readiness state and blockers at the portfolio level for planning and prioritization.

## 3. Backlog structure

Priority scale:

- `P0`: required for sprint success
- `P1`: strongly preferred in sprint
- `P2`: useful if time remains

Story status defaults:

- `todo`

## 4. Epic A: BAS and building readiness profile

### AIR-NS-001: Add BAS profile fields to the data model

Priority: `P0`

Story:

As the system, AirWise needs to store BAS and system-readiness fields so buildings can be classified before telemetry exists.

Acceptance criteria:

- the building record can persist:
  - `bas_present`
  - `bas_vendor`
  - `bas_protocol`
  - `bas_access_state`
  - `point_list_available`
  - `schedules_available`
  - `ventilation_system_archetype`
  - `equipment_inventory_status`
- nullable and enum-like fields support `unknown` cleanly
- existing buildings migrate without data loss

Implementation notes:

- prefer config-backed enums where the set may expand
- keep the values simple and operator-readable

Dependencies:

- none

### AIR-NS-002: Add BAS profile domain types and shared read/write methods

Priority: `P0`

Story:

As engineering, we need shared domain types and database methods so the web and API layers use one readiness profile model.

Acceptance criteria:

- domain types exist for BAS profile fields
- shared package methods can read and update BAS profile fields
- tests or verification scripts cover round-trip persistence

Dependencies:

- `AIR-NS-001`

### AIR-NS-003: Add BAS/system profile section to building overview

Priority: `P0`

Story:

As a user, I want to review and update BAS/system readiness information from the building overview so I can prepare the building for classification.

Acceptance criteria:

- building overview shows BAS/system fields
- user can submit updates from the UI
- updated values persist and render correctly after refresh
- unknown or missing values are visually distinguishable from explicit `no`

Dependencies:

- `AIR-NS-001`
- `AIR-NS-002`

### AIR-NS-004: Add audit events for BAS profile updates

Priority: `P1`

Story:

As an operator, I want profile changes to be auditable so readiness decisions can be traced back to data changes.

Acceptance criteria:

- BAS profile updates generate audit events
- audit event includes actor, building, changed field set, and timestamp

Dependencies:

- `AIR-NS-003`

## 5. Epic B: Owner-file intake and normalization visibility

### AIR-NS-005: Define document intake categories

Priority: `P0`

Story:

As the product, AirWise needs stable intake categories so building document completeness can be measured consistently.

Acceptance criteria:

- supported categories include:
  - `utility_bills`
  - `portfolio_manager_export`
  - `ll87_or_engineering_report`
  - `capex_plan`
  - `equipment_schedule`
  - `bas_exports`
- categories are available in shared config or domain logic
- categories can be applied to document metadata

Dependencies:

- none

### AIR-NS-006: Extend document metadata to support intake categories and normalization state

Priority: `P0`

Story:

As engineering, we need document records to carry intake category and normalization state so intake rollups can be generated.

Acceptance criteria:

- documents can store category
- documents can store normalization state
- existing documents remain valid after migration

Dependencies:

- `AIR-NS-005`

### AIR-NS-007: Add intake summary by building

Priority: `P0`

Story:

As a user, I want to see which recommended file categories are present or missing so I know what to request next.

Acceptance criteria:

- per-building intake summary shows:
  - present categories
  - missing categories
  - normalization state counts
  - unresolved data gaps
- summary uses document metadata, not manual notes only

Dependencies:

- `AIR-NS-005`
- `AIR-NS-006`

### AIR-NS-008: Render intake summary in documents or overview workflow

Priority: `P1`

Story:

As a user, I want intake completeness visible in the main workflow so I do not have to inspect raw documents one by one.

Acceptance criteria:

- intake summary appears in a user-facing page
- missing categories are easy to scan
- summary supports no-sensor buildings cleanly

Dependencies:

- `AIR-NS-007`

## 6. Epic C: Readiness classification engine

### AIR-NS-009: Define readiness classifier rules

Priority: `P0`

Story:

As the product, AirWise needs deterministic rules for readiness status so the output is explainable and consistent.

Acceptance criteria:

- statuses supported:
  - `compliance-only`
  - `needs BAS review`
  - `gateway-ready`
  - `needs instrumentation`
  - `monitoring active`
  - `supervised control pilot`
- rule inputs are explicitly documented
- rules prefer deterministic branching over scoring where possible

Dependencies:

- `AIR-NS-001`
- `AIR-NS-005`

### AIR-NS-010: Implement readiness classification persistence

Priority: `P0`

Story:

As engineering, we need the system to store readiness status and reasoning so the classification is visible and inspectable.

Acceptance criteria:

- building can store current readiness classification
- system stores reasoning inputs or explanation payload
- classification can be recalculated after relevant profile changes

Dependencies:

- `AIR-NS-009`

### AIR-NS-011: Show readiness classification in building overview

Priority: `P0`

Story:

As a user, I want to see the building’s readiness status and why it was assigned so I know the next step.

Acceptance criteria:

- building overview displays readiness status
- UI shows short explanation or contributing factors
- missing data that blocks higher readiness is visible

Dependencies:

- `AIR-NS-010`

### AIR-NS-012: Recompute readiness after building/profile/document changes

Priority: `P1`

Story:

As the system, AirWise should refresh readiness when relevant building inputs change so the status stays current.

Acceptance criteria:

- readiness recomputes after:
  - BAS profile update
  - gateway registration
  - telemetry presence change
  - relevant document intake changes
- stale statuses are not left behind after major input changes

Dependencies:

- `AIR-NS-010`

## 7. Epic D: Operational hypothesis generation

### AIR-NS-013: Define hypothesis model

Priority: `P0`

Story:

As the product, AirWise needs a structured hypothesis model so static-data findings are consistent and auditable.

Acceptance criteria:

- hypothesis record supports:
  - title
  - summary
  - confidence
  - supporting_inputs
  - missing_confirming_data
  - recommended_next_action
- model distinguishes between data-light hypotheses and telemetry-backed issues

Dependencies:

- none

### AIR-NS-014: Implement deterministic hypothesis generator

Priority: `P0`

Story:

As a user, I want AirWise to generate useful operational hypotheses from static data so the platform helps before sensors exist.

Acceptance criteria:

- generator can use:
  - pathway/article
  - building use type
  - BAS profile
  - equipment/system inventory
  - document intake completeness
  - public-data gaps
- at least 3 initial hypotheses are supported
- each hypothesis includes confidence and missing confirming data

Dependencies:

- `AIR-NS-001`
- `AIR-NS-007`
- `AIR-NS-013`

### AIR-NS-015: Render hypothesis cards in building workflow

Priority: `P0`

Story:

As a user, I want to see hypothesis cards in the building workflow so I can act on likely opportunities or data gaps.

Acceptance criteria:

- at least one page shows hypothesis cards for eligible buildings
- cards distinguish hypotheses from measured findings
- empty state is explicit when data is insufficient

Dependencies:

- `AIR-NS-014`

## 8. Epic E: Monitoring recommendation output

### AIR-NS-016: Define recommendation taxonomy for no-sensor and BAS-only buildings

Priority: `P0`

Story:

As the product, AirWise needs a constrained recommendation set so next steps are specific and consistent.

Acceptance criteria:

- supported recommendation types include:
  - `remain_compliance_only`
  - `perform_bas_review`
  - `request_point_list_and_schedules`
  - `register_gateway`
  - `deploy_minimal_sensor_package`
- language does not imply telemetry-backed proof where none exists

Dependencies:

- none

### AIR-NS-017: Generate recommendation outputs from readiness and hypotheses

Priority: `P0`

Story:

As a user, I want the system to translate readiness and hypotheses into a recommended next step so I know how to move the building forward.

Acceptance criteria:

- each classified building gets one primary recommendation
- recommendation includes rationale and blockers
- output is consistent with readiness status

Dependencies:

- `AIR-NS-010`
- `AIR-NS-014`
- `AIR-NS-016`

### AIR-NS-018: Show recommendation outputs in building workflow

Priority: `P1`

Story:

As a user, I want recommendation outputs visible in the overview and compliance contexts so planning is easy.

Acceptance criteria:

- recommendation appears in at least the overview page
- recommendation can also be surfaced in compliance context or linked from it
- rationale is visible without reading internal rule logic

Dependencies:

- `AIR-NS-017`

## 9. Epic F: Portfolio readiness views

### AIR-NS-019: Add readiness rollups to portfolio view

Priority: `P0`

Story:

As a portfolio user, I want rollups by readiness category so I can prioritize buildings for compliance, BAS review, or monitoring expansion.

Acceptance criteria:

- portfolio view shows counts by readiness status
- buildings can be grouped or summarized by readiness
- mixed-tier portfolios render without breaking existing views

Dependencies:

- `AIR-NS-010`

### AIR-NS-020: Add readiness filters and blocker views

Priority: `P1`

Story:

As a portfolio user, I want to filter by readiness and blocker type so I can decide what to do next across the portfolio.

Acceptance criteria:

- portfolio supports filters for readiness status
- portfolio can surface buildings blocked by:
  - missing docs
  - missing BAS info
  - missing telemetry
- filter behavior is stable with seeded and mixed data

Dependencies:

- `AIR-NS-019`
- `AIR-NS-007`

## 10. Suggested sprint cut

### Must-have sprint cut

- `AIR-NS-001` through `AIR-NS-003`
- `AIR-NS-005` through `AIR-NS-007`
- `AIR-NS-009` through `AIR-NS-011`
- `AIR-NS-013` through `AIR-NS-015`
- `AIR-NS-016` and `AIR-NS-017`
- `AIR-NS-019`

### Nice-to-have sprint cut

- `AIR-NS-004`
- `AIR-NS-008`
- `AIR-NS-012`
- `AIR-NS-018`
- `AIR-NS-020`

## 11. Suggested implementation order

1. `AIR-NS-001`
2. `AIR-NS-002`
3. `AIR-NS-005`
4. `AIR-NS-006`
5. `AIR-NS-003`
6. `AIR-NS-007`
7. `AIR-NS-009`
8. `AIR-NS-010`
9. `AIR-NS-011`
10. `AIR-NS-013`
11. `AIR-NS-014`
12. `AIR-NS-015`
13. `AIR-NS-016`
14. `AIR-NS-017`
15. `AIR-NS-019`
16. stretch items

## 12. Engineering notes

- keep readiness rules deterministic and inspectable
- show `unknown` explicitly instead of collapsing it into `no`
- separate telemetry-backed issues from static-data hypotheses in both schema and UI
- avoid recommendation language that sounds like measured proof
- prefer extending existing overview, documents, and portfolio pages instead of creating a new disconnected workflow

## 13. Definition of sprint success

The sprint is successful if:

- a building with no sensors can still receive a useful next-step recommendation
- a BAS-only building is visibly differentiated from a truly sensorless building
- the portfolio view makes readiness state and blockers obvious
- engineering can point to deterministic rules behind all major outputs
