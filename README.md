# AirWise Monorepo

AirWise is a local pilot-stage building operations platform centered on three connected product surfaces:

- LL97 compliance and filing workflows
- portfolio and building system-of-record workflows
- ventilation monitoring, recommendations, and supervised BAS command dispatch

The repo is a TypeScript monorepo with a Next.js web app, a Fastify API, shared SQLite-backed package logic, background jobs, and two gateway-side runtimes for BACnet-style integrations.

## Workspace layout

```text
apps/
  web/             Next.js UI for portfolio, building, filing, monitoring, and command workflows
  api/             Fastify API exposing portfolio, compliance, reporting, monitoring, and runtime routes
  workers/         Background jobs for coverage, requirements, telemetry, discovery, issues, and dispatch
  gateway-agent/   Long-running runtime client that polls AirWise and publishes discovery/telemetry
  gateway-bridge/  Reference BACnet bridge process with simulated, file-feed, and SDK-backed adapters
packages/
  config/          Shared runtime configuration
  database/        SQLite schema, migrations, seeds, and core application logic
  domain/          Shared domain types for buildings, monitoring, compliance, and reporting
  rules/           Deterministic LL97, PECM, emissions-limit, penalty, and point-taxonomy rules
  ui/              Shared React primitives
infra/
  docker/          Local infrastructure helpers
  terraform/       Deployment placeholders
scripts/
  import/          Public building import helpers
  seed/            Seed helpers
  verify/          Rule verification helpers
docs/              Product, architecture, pilot, and operating docs
```

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Start the default local stack:

```bash
npm run dev:stack
```

This starts:

- shared package watch builds
- the API
- the web app

If you prefer split terminals:

```bash
npm run dev:packages
npm run dev:api
npm run dev:web
```

3. Run workers:

```bash
npm run dev:workers
```

4. Run the gateway agent against a registered gateway:

```bash
AIRWISE_GATEWAY_ID=<gateway-id> \
AIRWISE_GATEWAY_TOKEN=<gateway-token> \
npm run dev:gateway-agent
```

5. Run the reference gateway bridge:

```bash
npm run dev:gateway-bridge
```

6. Verify the repo:

```bash
npm run typecheck
npm run build
```

The local database lives at `/Users/karan/Documents/LL97/.airwise-data/airwise.db`.

## Current product state

The repo currently supports a working local MVP for a first pilot workflow.

### Shipped product areas

- Portfolio workspace
  - create portfolios
  - import buildings
  - review building-level compliance and monitoring rollups
- Building overview
  - store canonical building identity
  - review public-source candidate records and confirmed matches
  - resolve 2026 coverage
  - capture BAS and ventilation-system profile fields
- Compliance workspace
  - generate LL97 requirements for the reporting year
  - support Article 320 and Article 321 pathways
  - track evidence state, blockers, and estimated penalties
- Filing workspace
  - create a year-scoped reporting cycle
  - manage filing modules, attestations, reporting documents, extracted inputs, manual inputs, PECM state, and calculation runs
- Documents workspace
  - register documents
  - link evidence to requirements
  - review audit history
- Monitoring workspace
  - register BACnet gateways
  - import gateway discovery snapshots
  - map canonical point types
  - inspect runtime health, telemetry, issues, and dispatch history
- Recommendations workspace
  - turn deterministic issues into operator-facing recommendations
  - track action history and before/after summaries
- Commands workspace
  - create approval-based command requests
  - approve whitelisted commands
  - review dispatch attempts, failures, expiry, and rollback state
- Imports workspace
  - review public dataset freshness, record volume, and recent import runs

### API and runtime state

- Fastify routes exist for portfolios, buildings, public-source import/matching, compliance, reporting, documents, monitoring, commands, and gateway runtime traffic.
- Gateway runtime endpoints support:
  - heartbeat
  - poll / poll complete
  - discovery ingest
  - telemetry ingest
  - command pull and acknowledgement
- The gateway agent can run in simulated, snapshot-file, or bridge-backed modes.
- The gateway bridge includes simulated, file-feed, BACnet SDK, and sample provider entry points.

### Worker jobs available

- `building-import`
- `coverage-refresh`
- `requirement-generation`
- `document-classification`
- `telemetry-normalization`
- `bacnet-discovery`
- `issue-detection`
- `command-expiry`
- `gateway-command-dispatch`
- `gateway-runtime-health`

Not all jobs are equally mature yet:

- `coverage-refresh`, `requirement-generation`, `telemetry-normalization`, `bacnet-discovery`, `issue-detection`, `command-expiry`, `gateway-command-dispatch`, and `gateway-runtime-health` execute real package logic.
- `building-import` and `document-classification` are still placeholders in the worker app.

## Current web routes

- `/login`
- `/portfolios`
- `/buildings/:id/overview`
- `/buildings/:id/filing`
- `/buildings/:id/compliance`
- `/buildings/:id/documents`
- `/buildings/:id/monitoring`
- `/buildings/:id/recommendations`
- `/commands`
- `/imports`

Access is session-based and portfolio-scoped:

- `owner`
- `operator`
- `rdp`
- `rcxa`

## Public import flow

Use the importer from the repo root:

```bash
npm run import:public -- /absolute/path/to/source.csv dataset_name 2026-04-14
```

Or use the directory-oriented form:

```bash
npm run import:public -- \
  --input /absolute/path/to/nyc-public-data \
  --dataset dob_covered_buildings \
  --source-version 2026-04-14 \
  --recursive \
  --auto-match \
  --refresh-coverage \
  --generate-requirements
```

The importer currently:

- accepts CSV and TSV files
- normalizes common NYC identity and coverage fields
- records import-run history in `public_import_runs`
- de-duplicates by source record key and normalized building identity
- can chain auto-match, coverage refresh, and requirement generation

## Local development notes

- The supported local flow is `npm run dev:stack` or the split-terminal version using `dev:packages`, `dev:api`, and `dev:web`.
- Shared workspace packages resolve from built `dist` output, so `npm run dev:packages` should be running during active app development.
- The repo intentionally uses local SQLite for the default pilot workflow.

## Known boundaries

This repo does not yet provide:

- production SSO or external identity integration
- production object storage
- production Postgres
- queue-backed distributed job orchestration
- automated NYC feed scheduling
- deep filing workflow parity with every 2026 LL97 edge case
- broad protocol support beyond the current BACnet-first path

## Documentation note

The Markdown docs in `docs/` have been updated to reflect the current codebase state. Binary `.docx` copies are legacy artifacts and may lag the Markdown versions.
