# AirWise Building Capability Tiers Roadmap

Last updated: 2026-04-15

## Purpose

AirWise now supports buildings at multiple levels of technical maturity. This document maps those tiers to the current product instead of treating every building as telemetry-ready.

## Tier model

### Tier A: Compliance-first / no-sensor buildings

Definition:

- no live telemetry in AirWise
- BAS may be absent, inaccessible, or unknown
- primary inputs are public records and owner-provided documents

Current product support:

- portfolio and building onboarding
- public-source import and matching
- coverage resolution
- Article 320 / 321 requirement generation
- document registration and evidence linkage
- filing workspace shell with manual inputs and reporting modules
- BAS/system profile capture on the overview page

Current gap:

- readiness classification is still implicit rather than a dedicated product status

### Tier B: BAS-only buildings

Definition:

- BAS exists, but AirWise does not yet have a live runtime connection
- exports, point lists, or schedules may exist

Current product support:

- everything in Tier A
- BAS vendor, protocol, access state, point-list availability, schedule availability, archetype, and inventory capture
- gateway registration and discovery bootstrap paths
- monitoring workspace that can be populated from imported discovery snapshots

Current gap:

- the product does not yet generate a first-class “gateway-ready vs needs instrumentation” recommendation object

### Tier C: Gateway-connected buildings

Definition:

- a gateway runtime can exchange discovery, telemetry, and command data with AirWise

Current product support:

- gateway registration and runtime token contract
- runtime heartbeat and polling
- discovery import
- telemetry ingest
- issue detection
- recommendation workflow
- supervised dispatch queue and acknowledgement

Current gap:

- runtime orchestration is still local-process oriented rather than production distributed infrastructure

### Tier D: Supervised control pilot buildings

Definition:

- approved writable points exist
- owner/operator governance allows supervised command execution

Current product support:

- whitelisted point model
- command request and owner approval workflow
- dispatch tracking
- loopback execution path
- expiry and rollback fields

Current gap:

- support remains intentionally narrow and pilot-scoped

## Product implication

AirWise should continue presenting a unified product, but the entry path must match the building tier:

- Tier A starts in overview, compliance, documents, and filing
- Tier B adds BAS readiness capture and discovery preparation
- Tier C activates monitoring and recommendations
- Tier D adds commands for approved pilot points
