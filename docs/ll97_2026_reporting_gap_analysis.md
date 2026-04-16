# LL97 2026 Reporting Gap Analysis

Last updated: 2026-04-15

## Purpose

This document compares the current AirWise filing workspace against the 2026 LL97 reporting process. It reflects the product as currently implemented in this repo.

## Current coverage in AirWise

AirWise now implements a meaningful filing-package shell for 2026 reporting:

- year-scoped reporting cycle creation
- filing due date and filing status tracking
- owner-of-record status tracking
- filing module activation
- reporting document registration
- extracted input proposals
- manual reporting inputs
- input review state
- owner / RDP / RCxA attestations
- Article 321 PECM status tracking
- calculation runs with missing-input and warning output

This is materially ahead of a simple compliance checklist, but it is still not full filing-system parity.

## What is covered well enough for pilot use

- organize work by reporting year
- centralize filing inputs and review state
- distinguish accepted vs pending values
- support both Article 320 and Article 321 package setup
- expose blockers before final calculation

## Main remaining gaps

### 1. External-system process tracking

Still missing or shallow:

- DOB NOW workflow state
- BEAM ticket lifecycle tracking
- fee-payment state
- nightly ESPM transfer dependencies

### 2. Detailed 2026 form logic

Still missing or shallow:

- full ticket-type modeling
- deeper extension workflow state
- all deduction / adjustment edge cases
- richer carryforward logic

### 3. Filing identity and governance depth

Still missing or shallow:

- stronger owner-of-record validation workflows
- clearer multi-party attestation controls
- explicit external submission readiness checks

### 4. Source-data ingestion depth

Still missing or shallow:

- purpose-built ESPM import flows
- structured utility-bill ingestion by fuel and year
- stronger GFA/property-type workflows
- richer validation before calculation

## Practical conclusion

AirWise can currently serve as:

- a filing preparation workspace
- a reporting-package shell
- an internal reviewer workflow

AirWise cannot yet serve as:

- a complete substitute for the DOB/BEAM submission process
- a full 2026 filing operating system with every edge case implemented

That means the right product framing today is:

- “prepare and organize the filing package”
- not “fully submit and manage every external filing dependency”
