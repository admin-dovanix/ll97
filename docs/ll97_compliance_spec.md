# AirWise LL97 Compliance Specification

Last updated: 2026-04-15

## Goal

AirWise should answer, per building:

- is the building covered?
- which article and pathway applies?
- what requirements exist for the reporting year?
- what evidence is missing?
- what filing package should be assembled next?
- what are the current estimated penalty surfaces?

The current implementation remains deterministic and audit-oriented.

## Current compliance workflow

1. Import or create the building record.
2. Match public-source records where available.
3. Resolve covered-building status and pathway for the filing year.
4. Generate year-specific compliance requirements.
5. Register and link evidence documents.
6. Surface blockers, evidence gaps, and estimated penalties.
7. Create or refresh the filing workspace for detailed reporting work.

## Supported pathways

- `CP0`
- `CP1`
- `CP2`
- `CP3`
- `CP4`
- `UNKNOWN`

The current product supports both:

- `Article 320`
- `Article 321`

## Current compliance outputs

The compliance workspace currently surfaces:

- requirement rows
- due dates
- required role ownership
- evidence state
- blocker counts
- ready counts
- estimated late filing penalty
- estimated emissions over-limit penalty

## Evidence model

Evidence is tracked through:

- building documents
- requirement-linked evidence records
- audit events

This means the compliance engine is tied to actual artifacts, not just status flags.

## Relationship to the filing workspace

The compliance workspace answers “what must be done.”

The filing workspace answers “how this reporting-year package is being assembled.”

That split is now part of the product:

- compliance = requirement and readiness view
- filing = input package, modules, attestations, PECMs, and calculation view

## Current boundaries

The current implementation does not yet provide:

- full external filing-system workflow state
- full legal interpretation coverage for every LL97 edge case
- full automation of Article 320 calculation inputs
- full automation of Article 321 PECM compliance proof
