# AirWise Monorepo

AirWise is a multi-tenant SaaS platform for:

- LL97 covered-building compliance workflows
- portfolio and building data consolidation
- ventilation monitoring and recommendations
- supervised BAS write-back for approved pilot systems

## Workspace layout

```text
apps/
  web/       Next.js UI for owners, operators, and compliance users
  api/       Fastify API for compliance, documents, telemetry, and commands
  workers/   Background jobs for imports, discovery, and rule execution
packages/
  config/    Shared runtime configuration
  database/  SQL schema seeds and migration assets
  domain/    Shared domain models and types
  rules/     Deterministic LL97, penalty, PECM, and point-taxonomy rules
  ui/        Shared React UI primitives
infra/
  docker/    Local infrastructure helpers
  terraform/ Deployment placeholders
scripts/
  import/    Data import helpers
  seed/      Seed helpers
  verify/    Rule verification scripts
docs/        Strategy, architecture, pilot, and founder operations documents
```

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Run the web app:

```bash
npm run dev:web
```

3. Run the API:

```bash
npm run dev:api
```

4. Run workers:

```bash
npm run dev:workers
```

5. Verify the repo state:

```bash
npm run typecheck
npm run build
```

The local dev database is created automatically at `/Users/karan/Documents/LL97/.airwise-data/airwise.db`.
Node currently prints an experimental warning for `node:sqlite`; that is expected in this repo.

## Current status

This repo now includes a working local MVP path for the first pilot workflow:

- shared SQLite-backed building graph and seed portfolio
- portfolio creation and building import
- public-source record import, matching, and source-driven coverage resolution
- config-driven LL97 requirement generation for Article 320 and Article 321 tracks
- document attachment, evidence binding, and audit trail workspace
- ventilation monitoring issue workspace with worker-backed normalization and issue refresh
- operator action tracking with before/after comparisons
- supervised BAS command request, simulated execution, expiry, and rollback flow
- dev-mode role gating for owner/operator/RDP/RCxA workflows
- worker jobs for coverage refresh, discovery, issue detection, and command expiry
- shared API and web data layer backed by the same package logic

The repo still does not include:

- production auth
- real NYC public data imports
- real BACnet connectivity
- production-grade Postgres or object storage
- queue-backed background job orchestration beyond the local worker app

## Core flows available in the UI

- `/portfolios`
  - create a portfolio
  - import a building
- `/buildings/:id/overview`
  - resolve coverage for the filing year
  - review and auto-match public-source candidates
- `/buildings/:id/compliance`
  - generate LL97 requirements for the reporting year
- `/buildings/:id/documents`
  - attach document metadata
  - bind documents to compliance requirements
  - review building-level audit events
- `/buildings/:id/monitoring`
  - start BAS discovery and review monitoring issues
- `/buildings/:id/recommendations`
  - create operator actions
  - update action status
  - review before/after summaries
- `/commands`
  - create and approve supervised command requests

## Importing public source files

Use the CSV importer from the repo root:

```bash
npm run import:public -- /absolute/path/to/source.csv dataset_name 2026-04-14
```

The importer normalizes common NYC source columns such as `Address`, `BBL`, `BIN`, `Compliance Pathway`, and `Gross Square Feet` into `public_building_records`.

## Key docs

- [Technical implementation plan](/Users/karan/Documents/LL97/docs/technical_implementation_plan.md)
- [LL97 compliance spec](/Users/karan/Documents/LL97/docs/ll97_compliance_spec.md)
- [Ventilation + BACnet spec](/Users/karan/Documents/LL97/docs/ventilation_bacnet_spec.md)
- [90-day roadmap](/Users/karan/Documents/LL97/docs/90_day_engineering_roadmap.md)
