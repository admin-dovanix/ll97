# AirWise Next Sprint Founder Execution Checklist

Last updated: 2026-04-15

## 1. Purpose

This checklist translates the next sprint build plan into a founder operating checklist.

It is designed for a sprint focused on:

- `no-sensor buildings`
- `BAS-only buildings`
- readiness classification
- monitoring recommendation outputs

The goal is to keep product, engineering, pilot ops, and GTM tightly coordinated while the team turns planning into a usable product slice.

## 2. Sprint outcome

By the end of this sprint, AirWise should be able to onboard a building with no telemetry and still produce:

- a usable compliance workspace
- a BAS/data-readiness profile
- a readiness classification
- operational hypothesis cards
- a recommended next path

## 3. Founder checklist by function

### Product / CEO checklist

#### Must define

- readiness taxonomy:
  - `compliance-only`
  - `needs BAS review`
  - `gateway-ready`
  - `needs instrumentation`
  - `monitoring active`
  - `supervised control pilot`
- BAS/data intake fields and labels
- file-intake categories and recommended minimum set
- operational hypothesis card structure
- recommendation output language and guardrails

#### Must review

- whether the readiness statuses are easy for owners to understand
- whether any labels overstate what the system knows
- whether the no-sensor flow is useful without telemetry
- whether the portfolio rollup tells a clear prioritization story

#### Must deliver

- one-page readiness taxonomy decision note
- acceptance criteria for each build slice
- sprint demo narrative
- final sign-off on wording for hypotheses and recommendations

### Engineering checklist

#### Must build

- schema support for BAS profile and system-readiness fields
- schema support for readiness classification and reasoning
- schema support for operational hypotheses and recommendation outputs
- overview-page editing for BAS/system profile
- intake-summary logic from document categories
- deterministic readiness classifier
- portfolio readiness rollups and filters

#### Must verify

- classifications are deterministic and explainable
- recommendation outputs do not require telemetry to exist
- no existing compliance or monitoring flows regress
- portfolio pages render mixed building types correctly

#### Must deliver

- merged schema and domain updates
- UI flow for BAS/data profile entry
- classification visible in building and portfolio views
- hypothesis cards and recommendation output rendered in the app

### Pilot ops checklist

#### Must collect

- real examples of:
  - sensorless buildings
  - BAS-only buildings
  - gateway-ready buildings
- actual missing-data patterns from pilot candidates
- actual BAS access constraints from operators or engineers

#### Must validate

- whether the BAS intake fields reflect reality
- whether the readiness classifier lands on credible outputs
- whether recommended next steps match what operators would actually do
- whether the hypothesis cards are helpful versus vague

#### Must deliver

- sample building set for each readiness tier
- credibility notes on each classification result
- list of confusing fields, missing fields, or bad assumptions

### Sales / GTM checklist

#### Must position

- AirWise as useful before sensors are installed
- compliance plus readiness planning as a valid first sale
- monitoring as an expansion path, not a prerequisite

#### Must test

- whether owners understand the readiness categories
- whether customers see value in `needs BAS review` and `needs instrumentation`
- whether the outputs help move a pilot conversation forward

#### Must deliver

- updated no-sensor pitch language
- pilot-scope language tied to readiness status
- list of objections and friction points from customer conversations

## 4. Weekly execution checklist

### Week 1: Taxonomy and data model

#### Product

- finalize readiness statuses
- finalize BAS/data intake fields
- finalize file-intake categories
- approve operational hypothesis template

#### Engineering

- add schema and type updates
- wire persistence for BAS/data profile
- add document-category rollup support

#### Pilot ops

- provide at least 3 example buildings:
  - one sensorless
  - one BAS-only
  - one gateway-ready

#### Sales / GTM

- test readiness labels in live conversations
- note any labels that are confusing or too technical

#### Week 1 exit criteria

- data model is stable enough to build UI against
- the team agrees on the readiness taxonomy
- sample buildings exist to validate against

### Week 2: Building workflow and classification

#### Product

- review overview-page workflow for BAS/data readiness
- approve classification logic and explanation language

#### Engineering

- implement BAS/system profile in building overview
- implement readiness classification logic
- expose classification in building and portfolio views

#### Pilot ops

- validate classifications against sample buildings
- flag false positives and missing states

#### Sales / GTM

- align pilot-scoping language to readiness outputs
- test whether classification helps structure next-step conversations

#### Week 2 exit criteria

- every sample building has a visible readiness classification
- the classification is explainable from stored fields
- the output is credible to at least one domain reviewer

### Week 3: Hypotheses and recommendations

#### Product

- approve hypothesis card language
- approve recommendation outputs and rationale format

#### Engineering

- implement operational hypothesis generation
- implement monitoring recommendation outputs
- render confidence and missing confirming data

#### Pilot ops

- review whether hypotheses are useful and believable
- validate recommended next paths per building

#### Sales / GTM

- use outputs in a pilot narrative
- gather customer reactions to the no-sensor path

#### Week 3 exit criteria

- every sample building gets at least one useful hypothesis or explicit “insufficient data” state
- each building gets a concrete next-step recommendation

### Week 4: Portfolio visibility and sprint close

#### Product

- review portfolio readiness dashboard behavior
- finalize sprint demo story

#### Engineering

- add readiness filters and rollups to portfolio views
- fix edge cases and polish mixed-tier rendering
- regression-test compliance, monitoring, and recommendation flows

#### Pilot ops

- validate portfolio output against real pilot expectations
- summarize where the workflow still breaks down operationally

#### Sales / GTM

- test portfolio view in customer or partner conversations
- refine commercial motion by readiness tier

#### Week 4 exit criteria

- portfolio view makes next-step planning obvious
- the sprint demo works end to end
- follow-on build priorities are clear

## 5. Daily founder operating checklist

Each day, the founders should be able to answer:

- what changed in the product yesterday
- what new assumption was validated or invalidated
- which building examples still break the logic
- whether the current output is credible to a real owner or operator
- whether the product language is overstating certainty
- what specific blocker needs to be removed today

## 6. Demo checklist

For the sprint review, show:

1. one `sensorless` building
2. one `BAS-only` building
3. one `gateway-ready` or connected building for comparison

Demo sequence:

1. open the building overview
2. review BAS/data profile
3. review compliance workspace
4. show readiness classification
5. show hypothesis cards
6. show recommendation output
7. roll up to portfolio view and compare building tiers

## 7. Decision checklist

Before calling the sprint successful, the founders should explicitly decide:

- are the readiness statuses correct, or is one unnecessary
- is the product better at `no-sensor intake` than it was at sprint start
- are recommendation outputs specific enough to be useful
- does the workflow create commercial value before telemetry exists
- what should the next sprint optimize:
  - BAS-only depth
  - connected-pilot hardening
  - intake automation

## 8. Red flags

The founders should treat these as immediate correction signals:

- a building cannot be classified without ad hoc explanation
- recommendation language sounds telemetry-backed when it is not
- BAS-only and sensorless buildings collapse into the same unhelpful state
- the portfolio view does not tell the user what to do next
- pilot reviewers say the workflow feels theoretical rather than actionable

## 9. End-of-sprint outputs

At sprint close, the founders should have:

- a working no-sensor onboarding flow
- a working BAS-only readiness flow
- a visible readiness classifier
- portfolio-level readiness views
- a short retrospective on what was credible, unclear, or missing

## 10. Follow-on recommendation

If this sprint lands well, the next founder checklist should focus on:

- BAS-only import depth
- schedule and point-list ingestion
- candidate system mapping
- connected-pilot observability
- recommendation conversion metrics
