# AirWise Current Capabilities and No-Sensor Building Strategy

Last updated: 2026-04-15

## 1. Purpose

This document answers two planning questions:

- what AirWise can already do today
- what AirWise can productively do for buildings that have no sensors yet

The answer is important because the product should not depend on day-one instrumentation to create value. Many NYC buildings will begin as `compliance-first` or `data-light` accounts before they become `monitoring` or `supervised control` accounts.

## 2. Current product capabilities

AirWise currently operates as a `local pilot MVP` across six capability groups.

### 2.1 Building and portfolio system of record

Current capabilities:

- create portfolios
- import buildings
- store canonical building identity around `address`, `BBL`, and `BIN`
- maintain a shared building graph used by compliance, documents, monitoring, and commands
- support portfolio-scoped memberships and session-based role gating for `owner`, `operator`, `RDP`, and `RCxA` users

Current value:

- a customer can move out of disconnected spreadsheets
- portfolio data can be reviewed in one place
- later compliance and monitoring workflows have a common source of truth

### 2.2 LL97 compliance engine

Current capabilities:

- resolve covered-building status
- map buildings to LL97 compliance pathways
- support `Article 320` and `Article 321` requirement generation
- generate building-level compliance requirements and blocker lists
- estimate penalty surfaces for late filing and emissions-over-limit scenarios
- show pathway, article, blockers, readiness state, and evidence gaps in a building workspace
- rank buildings in a portfolio compliance view

Current value:

- a user can understand what filing track a building is on
- the system can generate a current-year action checklist
- the portfolio can be prioritized without manual spreadsheet assembly

### 2.3 Document and evidence workspace

Current capabilities:

- attach document metadata to buildings
- bind documents to individual compliance requirements
- track evidence counts and evidence state by requirement
- show building-level audit history for uploads, evidence links, coverage resolution, requirement generation, and command actions

Current value:

- AirWise can act as an evidence workflow, not just a dashboard
- compliance readiness is tied to actual supporting artifacts

### 2.4 Public-source import and matching

Current capabilities:

- import NYC public-source files
- store import-run history and de-duplication outcomes
- normalize common columns such as `Address`, `BBL`, `BIN`, `Borough`, `Block`, `Lot`, `Compliance Pathway`, and `Gross Square Feet`
- match imported public records to buildings
- use source-driven coverage resolution as part of the overview workflow
- review dataset freshness and import history in `/imports`

Current value:

- AirWise can create value before the customer uploads perfect internal data
- the system can bootstrap building context from public records

### 2.5 Monitoring and recommendations

Current capabilities:

- register gateways
- import discovery snapshots
- store BAS points and point mappings
- accept telemetry ingest
- detect deterministic ventilation issues
- create recommendations and operator actions
- track action status
- show before/after summaries tied to completed actions
- show gateway runtime health and dispatch history

Current value:

- AirWise can already support an operational pilot on one or more centrally controlled systems
- recommendation workflows are measurable, not just advisory

### 2.6 Supervised command workflow

Current capabilities:

- maintain a whitelisted point registry
- create command requests
- route commands through approval flow
- dispatch commands to gateways
- support simulated loopback execution
- expire and roll back commands
- keep audit and delivery history

Current value:

- AirWise has the control-plane skeleton for supervised automation
- write-back is governed and auditable rather than ad hoc

## 3. What the product is today

Today AirWise is strongest as:

- a `compliance workspace`
- a `building data system of record`
- an `evidence and audit workflow`
- a `monitoring and recommendation workspace`
- a `supervised control foundation`

It is not yet best described as:

- a full building automation platform
- a fully autonomous optimization system
- a filing-signoff authority
- a sensor-dependent product

## 4. What we can do for buildings with no sensors yet

Buildings with no sensors are still valid AirWise customers.

The product can create value for them in three layers.

### 4.1 Compliance-first value

Even with no sensors, AirWise can deliver:

- covered-building determination
- pathway assignment
- filing-readiness workspace
- evidence checklist
- blocker tracking
- penalty exposure estimate
- building scorecards
- portfolio prioritization

This is already enough for a real design-partner or pilot offer.

### 4.2 Data-light building intelligence

Even without live telemetry, AirWise can use:

- owner-provided utility bills
- ENERGY STAR Portfolio Manager exports
- equipment schedules
- prior LL87 or engineering reports
- capex plans
- public DOB / CBL / property data
- BAS exports if available, even without adding new hardware

From those sources, the product can support:

- rough emissions profile
- likely data gaps
- likely compliance blockers
- likely operational inefficiencies based on schedules and system type
- monitoring-readiness assessment
- recommended next actions by building

This is a `diagnose and prioritize` workflow rather than a `measure and automate` workflow.

### 4.3 Monitoring-readiness assessment

For no-sensor buildings, AirWise can still answer:

- does this building already have a BAS worth integrating
- is a gateway-only deployment enough
- what minimum points matter first
- which systems are good candidates for monitoring
- whether the building should remain compliance-only for now

This creates a practical expansion path instead of forcing all customers into instrumentation up front.

## 5. No-sensor mode product strategy

AirWise should treat no-sensor buildings as a first-class operating mode.

### 5.1 No-sensor building workflow

Recommended workflow:

1. import building and portfolio data
2. match public-source records
3. resolve coverage and pathway
4. generate requirements and evidence checklist
5. collect owner documents and normalize missing fields
6. produce building scorecard and portfolio priority ranking
7. classify the building into one of:
   - compliance-only
   - monitoring-ready
   - gateway-ready
   - instrumentation candidate

### 5.2 Product surfaces needed for no-sensor buildings

AirWise should continue to strengthen four workspaces for this mode:

- `Compliance workspace`
  - deadlines, blockers, penalties, evidence state, next actions
- `Building intake workspace`
  - uploaded owner files, public-source matches, BAS availability, system inventory
- `Operational hypothesis workspace`
  - likely issues, confidence level, missing confirming data, recommended review steps
- `Monitoring recommendation workspace`
  - whether to stay compliance-only, integrate BAS, deploy gateway, or add minimal sensors

### 5.3 Language and claims for no-sensor buildings

For this building class, AirWise should say:

- `modeled opportunity`
- `data-light diagnosis`
- `confidence based on available records`
- `recommended next instrumentation or BAS steps`

AirWise should not say:

- `real-time optimization`
- `measured ventilation performance`
- `automated savings`
- `verified control outcome`

unless live telemetry actually exists.

## 6. What we cannot honestly do yet for no-sensor buildings

Without telemetry, BAS feeds, or installed instrumentation, AirWise cannot honestly claim:

- real-time issue detection
- measured ventilation performance
- before/after operational proof
- supervised write-back value
- closed-loop control

Those require at least one of:

- BAS connectivity
- gateway access
- imported time-series data
- new sensors

## 7. Commercial strategy for no-sensor buildings

The product should not require sensors to start.

Recommended commercial ladder:

### Tier 1: Compliance and building intelligence

- LL97 workspace
- building/public-data consolidation
- evidence tracking
- portfolio ranking
- next-step action plan

### Tier 2: Monitoring readiness

- BAS/connectivity review
- minimal instrumentation plan
- target system selection
- gateway feasibility review

### Tier 3: Monitoring and recommendations

- live telemetry
- issue detection
- operator actions
- before/after reporting

### Tier 4: Supervised control

- approved write-back
- rollback and expiry
- pilot safety controls

This allows AirWise to land on `compliance pain`, then expand into `operations` and later into `supervised automation`.

## 8. Planning implications

### 8.1 Near-term product priority

Near-term, AirWise should improve the no-sensor path in parallel with monitored pilots by strengthening:

- public-data imports
- owner file intake and normalization
- BAS availability capture
- operational hypothesis generation from static data
- monitoring-readiness recommendations

### 8.2 Success condition

A building with no sensors should still be able to produce:

- a usable compliance workspace
- an evidence checklist
- a prioritized action plan
- a recommendation on whether and how to instrument later

If the product can do that cleanly, no-sensor buildings become a valid entry wedge rather than a blocked account type.
