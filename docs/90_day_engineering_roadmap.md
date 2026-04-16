# AirWise 90-Day Engineering Roadmap

Last updated: 2026-04-15

## Objective

Use the next 90 days to move from a working local pilot MVP to a more operationally credible pilot platform for:

- LL97 compliance and filing workflows
- no-sensor and BAS-only building onboarding
- gateway-backed monitoring and issue detection
- supervised command delivery for approved pilot systems

## Current starting point

The current codebase already includes:

- portfolio creation and building import
- public-source import, de-duplication, matching, and coverage resolution
- Article 320 and Article 321 requirement generation
- document registration, evidence linkage, and audit events
- BAS profile capture on the building overview
- reporting-cycle creation, filing modules, attestations, PECM state, input review, and calculation runs
- BACnet gateway registration, discovery ingest, telemetry ingest, runtime heartbeat/poll flows, and dispatch tracking
- deterministic monitoring issues, recommendations, action tracking, and supervised command approval

The biggest remaining gaps are production hardening, deeper filing detail, and stronger no-sensor onboarding.

## 90-day outcomes

By the end of this period, AirWise should be able to:

- onboard a building with no telemetry and still produce a usable compliance + filing package shell
- onboard a BAS-only building and produce a clear gateway-readiness recommendation
- operate one or more gateway-connected pilot systems with stable runtime health visibility
- demonstrate a complete path from issue -> recommendation -> action -> supervised command where applicable
- reduce ambiguity between “implemented now” and “planned next” across product surfaces

## Workstreams

### Weeks 1-4: Product truth and intake hardening

- tighten docs and internal operating artifacts around the actual product surface
- improve no-sensor and BAS-only onboarding language
- harden BAS profile capture and building readiness framing
- make filing workspace expectations clearer for 2026 reporting
- expand validation around imports, coverage, and requirement generation

### Weeks 5-8: Filing depth and reviewer workflow

- deepen reporting-cycle validation and blocker logic
- improve extraction-to-review flow for reporting documents
- strengthen attestation and owner-of-record workflow
- add clearer visibility into accepted vs pending reporting inputs
- reduce ambiguity in Article 321 PECM review state

### Weeks 9-12: Monitoring reliability and pilot execution

- improve gateway config validation and runtime diagnostics
- make command dispatch and retry behavior more observable
- strengthen issue-to-action traceability
- close remaining gaps in loopback and replay verification
- package pilot-facing success metrics and operational dashboards

## Delivery principles

- keep deterministic rules ahead of AI-heavy automation
- preserve auditability for compliance and control actions
- treat no-sensor buildings as first-class, not pre-product
- keep gateway writes approval-based and explicitly scoped
- prefer current-state product truth over aspirational architecture

## Success metrics

- at least one building can complete the filing workspace setup without relying on parser output alone
- at least one building can be classified as no-sensor, BAS-only, or gateway-connected using structured profile data
- at least one gateway runtime can complete heartbeat, discovery, telemetry, and dispatch acknowledgement end to end
- command dispatch failure modes are visible enough to debug without diving into raw database state
- repo docs remain aligned with shipped routes, tables, jobs, and runtime contracts
