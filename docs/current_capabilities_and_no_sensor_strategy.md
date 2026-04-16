# AirWise Current Capabilities and No-Sensor Building Strategy

Last updated: 2026-04-15

## Purpose

This is the current-state product summary for AirWise, with emphasis on what the product can already do for buildings that do not yet have live telemetry.

## Current capability groups

### 1. Portfolio and building system of record

Implemented now:

- create portfolios
- import buildings
- maintain portfolio-scoped building records
- support session-based memberships for `owner`, `operator`, `rdp`, and `rcxa`
- expose building identity consistently across overview, compliance, filing, monitoring, and commands

### 2. Public-source matching and coverage resolution

Implemented now:

- import NYC-style public records
- normalize common address, BBL, BIN, pathway, article, and square-footage fields
- persist import-run history
- auto-match public candidates to buildings
- resolve building coverage for the reporting year

### 3. LL97 compliance workspace

Implemented now:

- generate requirements for the reporting year
- support Article 320 and Article 321 pathways
- show blockers, evidence state, ready counts, and estimated penalties
- tie evidence state back to document linkage

### 4. Filing workspace

Implemented now:

- create or refresh a reporting cycle for 2026
- manage year-scoped filing modules
- register reporting documents
- extract proposed reporting inputs from documents
- accept manual inputs
- review inputs
- update attestations
- update Article 321 PECM status
- run and inspect a calculation

### 5. Document and audit workflow

Implemented now:

- register documents against buildings
- link evidence to requirements
- track audit events for key workflow actions

### 6. Monitoring, recommendations, and commands

Implemented now:

- register gateways
- import discovery snapshots
- ingest telemetry
- detect issues deterministically
- create action records
- request, approve, dispatch, and acknowledge supervised commands

## What AirWise can do for no-sensor buildings today

Even without telemetry, AirWise already creates value by providing:

- a canonical building record
- public-source-backed coverage resolution
- LL97 requirement generation
- evidence tracking
- a filing package shell for the reporting year
- structured BAS readiness capture for future monitoring work

That means a no-sensor building is not “blocked from product use.” It enters as a compliance and filing account first, with monitoring preparation captured in the overview workspace.

## Current limitation

The product has the data fields needed for a better no-sensor onboarding story, but it does not yet expose:

- a dedicated readiness score
- explicit “needs BAS review” or “gateway-ready” product states
- operational hypothesis cards for data-light buildings

Those are the right next-step additions, but the underlying building and BAS profile data now exists in the model and UI.
