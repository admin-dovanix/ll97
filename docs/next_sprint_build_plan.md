# AirWise Next Sprint Build Plan

Last updated: 2026-04-15

## 1. Sprint objective

Turn `no-sensor` and `BAS-only` buildings into first-class product entry paths.

This sprint should make AirWise usable for buildings that do not yet have live telemetry by improving:

- owner-file and intake workflow
- BAS presence and access capture
- building readiness classification
- operational hypothesis generation from static data
- monitoring recommendation output

## 2. Why this sprint now

AirWise already has:

- strong local MVP coverage for LL97 compliance
- document and evidence workflows
- public-source import and matching
- monitoring and command scaffolding for connected pilots

The highest-value gap is not more automation. It is making the product genuinely useful for buildings with:

- no sensors
- incomplete BAS access
- early-stage owner data

Closing that gap broadens the entry wedge, improves pilot readiness, and reduces dependence on immediate controls integration.

## 3. Sprint scope

### In scope

- building intake fields for BAS presence, BAS access, and system inventory
- owner-file intake and normalization status
- readiness classification per building
- operational hypothesis cards for data-light buildings
- monitoring recommendation output per building
- portfolio-level visibility into readiness status

### Out of scope

- new protocol support beyond the current BACnet-first model
- autonomous optimization
- deeper supervised control expansion
- production auth and SSO
- production infrastructure migration

## 4. Sprint deliverables

By the end of the sprint, a user should be able to onboard a building with no telemetry and receive:

- a usable compliance workspace
- a visible data-readiness and BAS-readiness profile
- a readiness classification
- a list of operational hypotheses with confidence and supporting inputs
- a recommended next path:
  - `compliance-only`
  - `needs BAS review`
  - `gateway-ready`
  - `needs instrumentation`

## 5. Build slices

### Slice 1: Building intake and BAS readiness profile

Goal:

Capture the minimum structured information needed to classify a building before telemetry exists.

Build:

- add building-level fields for:
  - BAS present: yes / no / unknown
  - BAS vendor
  - BAS protocol
  - BAS access state
  - point list available: yes / no / unknown
  - schedules available: yes / no / unknown
  - ventilation system archetype
  - equipment inventory status
- add UI section in building overview for BAS and systems profile
- add update actions and persistence

Acceptance criteria:

- a user can update BAS and system-readiness fields from the building overview
- the building record stores enough information to support readiness classification

### Slice 2: Owner-file intake and normalization status

Goal:

Make it obvious what data exists, what is missing, and how usable the current building record is.

Build:

- define file categories:
  - utility bills
  - Portfolio Manager export
  - LL87 / engineering report
  - capex plan
  - equipment schedule
  - BAS exports
- add per-building intake summary showing:
  - files uploaded by category
  - missing recommended categories
  - normalization status
  - unresolved data gaps
- connect document metadata into the intake summary

Acceptance criteria:

- a user can see which core intake categories are complete or missing
- the product surfaces a clear gap list for a no-sensor building

### Slice 3: Readiness classification engine

Goal:

Assign every building to a concrete next-step status.

Build:

- add deterministic readiness logic that classifies buildings as:
  - `compliance-only`
  - `needs BAS review`
  - `gateway-ready`
  - `needs instrumentation`
  - `monitoring active`
  - `supervised control pilot`
- store the classification and the reasoning inputs
- expose classification in:
  - building overview
  - portfolio list
  - portfolio rollups

Initial logic should use:

- BAS presence and access
- point-list availability
- schedules availability
- gateway registration state
- telemetry presence
- system archetype

Acceptance criteria:

- every building in the portfolio has one visible readiness classification
- the classification is explainable from stored inputs

### Slice 4: Operational hypothesis cards

Goal:

Give useful operational guidance even when live telemetry does not exist.

Build:

- create a building-level hypothesis model with:
  - title
  - summary
  - confidence
  - supporting inputs
  - missing confirming data
  - recommended next action
- generate initial deterministic hypotheses from:
  - pathway/article
  - use type
  - BAS profile
  - equipment/system inventory
  - uploaded file categories
  - public-source and owner-data gaps

Examples:

- schedule data missing for centrally ventilated building
- likely ventilation review candidate based on archetype and BAS presence
- compliance-ready but monitoring-not-ready
- possible gateway-only path due to BAS and schedule availability

Acceptance criteria:

- a no-sensor building shows at least one useful hypothesis card when enough static inputs exist
- every hypothesis includes confidence and missing confirming data

### Slice 5: Monitoring recommendation output

Goal:

Turn readiness and hypotheses into a concrete next implementation path.

Build:

- add per-building recommendation output:
  - remain compliance-only
  - perform BAS review
  - request point list and schedules
  - register gateway
  - deploy minimal sensor package
- display the recommendation in the overview and compliance contexts
- include short rationale and blockers

Acceptance criteria:

- every classified building has a next-step recommendation
- recommendation language is careful for no-sensor buildings and does not imply measured outcomes

### Slice 6: Portfolio readiness visibility

Goal:

Make no-sensor and BAS-only planning visible at the portfolio level.

Build:

- add readiness counts and filters to portfolio views
- add groupings by:
  - compliance-only
  - needs BAS review
  - gateway-ready
  - monitoring active
- surface buildings blocked on missing docs vs missing BAS info vs missing telemetry

Acceptance criteria:

- an owner can scan a portfolio and identify which buildings are ready for what next step

## 6. Founder ownership for this sprint

### Product / CEO

Own:

- intake workflow design
- readiness taxonomy
- hypothesis card language
- recommendation output UX
- acceptance criteria and demo narrative

### Engineering

Own:

- schema changes
- persistence and classification logic
- UI implementation across overview, documents, and portfolio surfaces
- deterministic hypothesis generation

### Pilot ops

Own:

- define the intake checklist mapped to the new categories
- validate readiness logic against real pilot buildings
- test whether outputs are credible to operators and engineering partners

### Sales / GTM

Own:

- position the no-sensor workflow as a commercial entry wedge
- use readiness outputs to structure pilot scoping conversations
- gather objections from owners who do not have BAS or sensor coverage yet

## 7. Suggested sprint sequence

### Days 1-2

- finalize readiness taxonomy
- add schema and domain types
- add BAS profile and intake category definitions

### Days 3-4

- implement building overview updates for BAS/system profile
- implement intake summary from document categories

### Days 5-6

- implement readiness classification logic
- expose classifications in building and portfolio views

### Days 7-8

- implement hypothesis card generation and storage
- add recommendation outputs and rationale

### Days 9-10

- polish portfolio readiness views
- run end-to-end testing with sample no-sensor and BAS-only buildings
- prepare sprint demo showing:
  - one sensorless building
  - one BAS-only building
  - one gateway-connected building for contrast

## 8. Definition of done

This sprint is done when:

- a building with no telemetry can still be onboarded into a complete compliance and readiness workflow
- a BAS-only building can be differentiated from a truly sensorless building
- readiness classification is visible and explainable
- recommendation output gives a credible next path without overstating monitoring capability
- the portfolio view makes next-step planning obvious

## 9. Demo narrative

The sprint demo should tell one simple story:

`AirWise is not only useful after sensors are installed. It is useful from the moment a building enters the portfolio.`

Demo flow:

1. import or open a sensorless building
2. review pathway and compliance workspace
3. review missing intake categories and BAS profile
4. show readiness classification and operational hypotheses
5. show recommended next integration path
6. compare against a BAS-only or gateway-connected building to show progression

## 10. Risks and guardrails

### Risks

- trying to infer too much from too little data
- creating recommendation language that sounds more certain than it is
- mixing operational hypotheses with measured findings
- overbuilding forms before the readiness logic is validated

### Guardrails

- use deterministic, explainable rules
- always show confidence and missing confirming inputs
- clearly distinguish `modeled` or `data-light` findings from telemetry-backed findings
- keep the taxonomy small and operationally useful

## 11. Likely follow-on sprint

If this sprint lands well, the next sprint should focus on:

- BAS-only onboarding depth
- point-list and schedule import
- candidate system mapping
- stronger connected-pilot observability
- recommendation conversion metrics
