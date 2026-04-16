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

2. Start the common local stack:

```bash
npm run dev:stack
```

This starts:

- shared package watch builds
- the API
- the web app

If you prefer split terminals, run:

```bash
npm run dev:packages
npm run dev:api
```

```bash
npm run dev:web
```

3. Run workers:

```bash
npm run dev:workers
```

4. Run the gateway agent:

```bash
AIRWISE_GATEWAY_ID=<gateway-id> \
AIRWISE_GATEWAY_TOKEN=<gateway-token> \
npm run dev:gateway-agent
```

5. Run the reference gateway bridge:

```bash
npm run dev:gateway-bridge
```

6. Verify the repo state:

```bash
npm run typecheck
npm run build
```

The local dev database is created automatically at `/Users/karan/Documents/LL97/.airwise-data/airwise.db`.
Node currently prints an experimental warning for `node:sqlite`; that is expected in this repo.

## Dev runtime notes

- The supported local startup flow is `npm run dev:stack` or the split-terminal version using `dev:packages`, `dev:api`, and `dev:web`.
- Shared workspace packages resolve from `dist/index.js`, so `dev:packages` must be running during local development or app processes can load stale package exports.
- The old `tsx src/main.ts` launcher is no longer the supported path for app dev scripts.

## Troubleshooting

- If an app starts but looks like it is using stale shared code, make sure `npm run dev:packages` is running.
- If you want to see the raw startup error without the watcher wrapper, run `npm run dev:once --workspace @airwise/api` or the equivalent workspace command for another app.
- If the local database schema is stale or corrupted, delete `/Users/karan/Documents/LL97/.airwise-data/airwise.db` and restart the dev processes.
- If the filing page still returns a 404 after startup, restart the API and web processes after confirming the package watchers are running.

## Current status

This repo now includes a working local MVP path for the first pilot workflow:

- shared SQLite-backed building graph and seed portfolio
- portfolio creation and building import
- NYC public-source import pipeline with import-run tracking, matching, and source-driven coverage resolution
- config-driven LL97 requirement generation for Article 320 and Article 321 tracks
- document attachment, evidence binding, and audit trail workspace
- ventilation monitoring workspace with gateway-backed BACnet snapshot discovery, token-authenticated runtime ingestion, and issue refresh
- operator action tracking with before/after comparisons
- supervised BAS command request, gateway dispatch outbox, runtime heartbeat/poll contract, simulated loopback execution, expiry, and rollback flow
- server-side session auth with portfolio-scoped owner/operator/RDP/RCxA memberships
- worker jobs for coverage refresh, discovery, issue detection, command expiry, dispatch processing, and gateway runtime health
- shared API and web data layer backed by the same package logic

The repo still does not include:

- production-grade auth, SSO, or external identity integration
- scheduled remote fetching of NYC public data feeds
- continuous BACnet polling through an external gateway runtime
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
  - register a BACnet gateway
  - import discovery snapshots, review discovered systems, runtime health, and monitoring issues
  - configure runtime mode, poll interval, and retrieve the ingest token needed for gateway webhooks
  - review gateway dispatch history and delivery failures
- `/buildings/:id/recommendations`
  - create operator actions
  - update action status
  - review before/after summaries
- `/commands`
  - create and approve supervised command requests
  - review dispatch status, delivery attempts, and gateway failures per command
- `/imports`
  - review dataset freshness, import-run history, and de-duplication outcomes for NYC public-source loads

## Importing public source files

Use the public-data importer from the repo root:

```bash
npm run import:public -- /absolute/path/to/source.csv dataset_name 2026-04-14
```

You can also point it at a directory and optionally chain post-import actions:

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

The importer now:

- accepts a file or directory of CSV/TSV exports
- normalizes common NYC fields such as `Address`, `BBL`, `BIN`, `Borough/Block/Lot`, `Compliance Pathway`, and `Gross Square Feet`
- stores import-run history in `public_import_runs`
- de-duplicates public records by source record key and normalized building identity
- can auto-match imported records to buildings and refresh coverage/requirements in the same run

## Gateway runtime contract

Registered BACnet gateways now support a token-authenticated runtime contract:

- `POST /api/gateways/:id/runtime/heartbeat`
  - report long-running agent liveness, version, queue depth, and runtime status
- `POST /api/gateways/:id/runtime/poll`
  - start a poll cycle, receive pending command dispatches, and get the next due poll time
- `POST /api/gateways/:id/runtime/poll/complete`
  - report the outcome of a poll cycle back into AirWise
- `POST /api/gateways/:id/runtime/discovery`
  - import a discovery snapshot from an external gateway process
- `POST /api/gateways/:id/runtime/telemetry`
  - push live telemetry updates keyed by asset and point identity
- `GET /api/gateways/:id/runtime/commands`
  - pull pending supervised command dispatches from the outbox
- `POST /api/gateways/:id/runtime/commands/:dispatchId/ack`
  - acknowledge command success or failure back into AirWise

For local verification, gateways can be registered in `loopback` mode so approved commands automatically round-trip through the dispatch path without requiring a live external runtime.

## Gateway agent

The repo now includes a small long-running gateway agent at [apps/gateway-agent/src/main.ts](/Users/karan/Documents/LL97/apps/gateway-agent/src/main.ts).

It connects to the AirWise runtime contract and will:

- send recurring heartbeats
- start and complete poll cycles
- publish discovery snapshots
- publish telemetry from local point state
- acknowledge delivered command dispatches

The agent now uses a pluggable adapter layer:

- `simulated`
  - the default adapter; keeps an in-memory point model and generates telemetry locally
- `snapshot-file`
  - reads discovery/telemetry state from a JSON file so an external process can feed the agent without changing the AirWise runtime contract
- `bacnet-bridge`
  - connects the agent to an external bridge service over HTTP for discovery, telemetry, and command application

Useful environment variables:

- `AIRWISE_GATEWAY_API_BASE_URL`
  - defaults to `http://localhost:4000`
- `AIRWISE_GATEWAY_ID`
  - required gateway id from the monitoring workspace
- `AIRWISE_GATEWAY_TOKEN`
  - required ingest token from the monitoring workspace
- `AIRWISE_GATEWAY_AGENT_VERSION`
  - optional version string reported in heartbeats
- `AIRWISE_GATEWAY_ADAPTER`
  - optional adapter type: `simulated`, `snapshot-file`, or `bacnet-bridge`
- `AIRWISE_GATEWAY_HEARTBEAT_INTERVAL_MS`
  - optional heartbeat cadence
- `AIRWISE_GATEWAY_DEFAULT_POLL_INTERVAL_MS`
  - fallback poll cadence if the runtime has no next poll timestamp
- `AIRWISE_GATEWAY_DISCOVERY_FILE`
  - optional path to a JSON discovery snapshot; otherwise the agent uses a built-in sample
- `AIRWISE_GATEWAY_TELEMETRY_FILE`
  - optional path to a JSON telemetry/discovery snapshot for the `snapshot-file` adapter
- `AIRWISE_GATEWAY_BRIDGE_BASE_URL`
  - required for the `bacnet-bridge` adapter
- `AIRWISE_GATEWAY_BRIDGE_API_KEY`
  - optional shared secret sent to the bridge service
- `AIRWISE_GATEWAY_BRIDGE_API_KEY_HEADER`
  - optional header name for the bridge API key; defaults to `x-bridge-api-key`
- `AIRWISE_GATEWAY_BRIDGE_DISCOVERY_PATH`
  - optional bridge discovery path; defaults to `/discovery`
- `AIRWISE_GATEWAY_BRIDGE_TELEMETRY_PATH`
  - optional bridge telemetry path; defaults to `/telemetry`
- `AIRWISE_GATEWAY_BRIDGE_COMMAND_PATH`
  - optional bridge command path; defaults to `/commands`
- `AIRWISE_GATEWAY_DISABLE_DISCOVERY`
  - disable discovery publishing
- `AIRWISE_GATEWAY_DISABLE_TELEMETRY`
  - disable telemetry publishing

Example `snapshot-file` run:

```bash
AIRWISE_GATEWAY_ADAPTER=snapshot-file \
AIRWISE_GATEWAY_DISCOVERY_FILE=/Users/karan/Documents/LL97/apps/gateway-agent/examples/snapshot.json \
AIRWISE_GATEWAY_TELEMETRY_FILE=/Users/karan/Documents/LL97/apps/gateway-agent/examples/snapshot.json \
AIRWISE_GATEWAY_ID=<gateway-id> \
AIRWISE_GATEWAY_TOKEN=<gateway-token> \
npm run dev:gateway-agent
```

Example `bacnet-bridge` run:

```bash
AIRWISE_GATEWAY_ADAPTER=bacnet-bridge \
AIRWISE_GATEWAY_BRIDGE_BASE_URL=http://localhost:8080 \
AIRWISE_GATEWAY_BRIDGE_API_KEY=demo-bridge-key \
AIRWISE_GATEWAY_ID=<gateway-id> \
AIRWISE_GATEWAY_TOKEN=<gateway-token> \
npm run dev:gateway-agent
```

Expected bridge service contract:

- `GET /discovery`
  - returns a gateway snapshot payload with `assets`
- `GET /telemetry`
  - returns either `{ "events": [...] }` or the same snapshot shape as discovery
- `POST /commands`
  - receives `{ dispatchId, commandId, pointId, command }`
  - may return `{ success, appliedValue, errorMessage, responseJson }`

## Reference gateway bridge

The repo now includes a small reference bridge service at [apps/gateway-bridge/src/main.ts](/Users/karan/Documents/LL97/apps/gateway-bridge/src/main.ts).

It provides the same bridge contract the `bacnet-bridge` adapter expects:

- `GET /health`
- `GET /discovery`
- `GET /telemetry`
- `POST /commands`

The bridge now uses a pluggable backend layer:

- `simulated`
  - default backend; in-memory device model for local validation
- `file-feed`
  - reads discovery/telemetry from JSON files and keeps command overrides in a local overlay
  - useful as the first non-demo path when another process exports gateway state to files
- `bacnet-sdk`
  - runtime-loads a provider module that implements discovery, telemetry, and command application
  - this is the seam for a real BACnet client or gateway SDK integration

This means the bridge contract stays stable while we swap the backend from simulated data to a real export feed or BACnet SDK integration.

The monitoring workspace now also includes:

- gateway config validation for bridge backend, SDK module path, SDK config JSON, and dispatch retry policy
- one-click replay scenarios for `high_co2_low_ventilation`, `after_hours_runtime`, `schedule_mismatch`, `stale_override`, and `sensor_fault`
- a gateway dispatch board so retried, failed, and dead-letter traffic is visible without leaving the building monitoring page

Useful environment variables:

- `AIRWISE_GATEWAY_BRIDGE_BACKEND`
  - optional backend type: `simulated`, `file-feed`, or `bacnet-sdk`
- `AIRWISE_GATEWAY_BRIDGE_PORT`
  - defaults to `8080`
- `AIRWISE_GATEWAY_BRIDGE_API_KEY`
  - optional shared secret required by the bridge
- `AIRWISE_GATEWAY_BRIDGE_API_KEY_HEADER`
  - optional auth header name; defaults to `x-bridge-api-key`
- `AIRWISE_GATEWAY_BRIDGE_DISCOVERY_FILE`
  - optional discovery snapshot path for the `file-feed` backend
- `AIRWISE_GATEWAY_BRIDGE_TELEMETRY_FILE`
  - optional telemetry snapshot path for the `file-feed` backend
- `AIRWISE_GATEWAY_BRIDGE_SDK_MODULE_PATH`
  - required for the `bacnet-sdk` backend; path to a provider module file
- `AIRWISE_GATEWAY_BRIDGE_SDK_EXPORT_NAME`
  - optional provider export name; defaults to `createBacnetSdkProvider`
- `AIRWISE_GATEWAY_BRIDGE_SDK_CONFIG_JSON`
  - optional JSON object passed into the SDK provider factory
- `AIRWISE_GATEWAY_BRIDGE_LOG_COMMANDS`
  - optional command logging toggle; defaults to `true`

Example `file-feed` bridge run:

```bash
AIRWISE_GATEWAY_BRIDGE_BACKEND=file-feed \
AIRWISE_GATEWAY_BRIDGE_DISCOVERY_FILE=/Users/karan/Documents/LL97/apps/gateway-bridge/examples/snapshot.json \
AIRWISE_GATEWAY_BRIDGE_TELEMETRY_FILE=/Users/karan/Documents/LL97/apps/gateway-bridge/examples/snapshot.json \
npm run dev:gateway-bridge
```

Example `bacnet-sdk` bridge run in dev mode:

```bash
AIRWISE_GATEWAY_BRIDGE_BACKEND=bacnet-sdk \
AIRWISE_GATEWAY_BRIDGE_SDK_MODULE_PATH=/Users/karan/Documents/LL97/apps/gateway-bridge/src/providers/sample-bacnet-sdk.ts \
AIRWISE_GATEWAY_BRIDGE_SDK_CONFIG_JSON='{"deviceName":"Sample BACnet Device","vendorName":"AirWise SDK Stub"}' \
npm run dev:gateway-bridge
```

Example real `@bacnet-js/client` provider run in dev mode:

```bash
AIRWISE_GATEWAY_BRIDGE_BACKEND=bacnet-sdk \
AIRWISE_GATEWAY_BRIDGE_SDK_MODULE_PATH=/Users/karan/Documents/LL97/apps/gateway-bridge/src/providers/bacnet-js-provider.ts \
AIRWISE_GATEWAY_BRIDGE_SDK_CONFIG_JSON='{
  "targetAddress": "192.168.1.50:47808",
  "deviceInstance": 25001,
  "systemName": "Corridor AHU",
  "location": "Roof",
  "discoveryTimeoutMs": 3000,
  "writePriority": 8,
  "client": {
    "interface": "192.168.1.10",
    "broadcastAddress": "192.168.1.255",
    "apduTimeout": 6000
  },
  "points": [
    {
      "pointKey": "corridor_fan_status",
      "objectIdentifier": "binary-input,5",
      "canonicalPointType": "fan_status",
      "readProperty": "present_value"
    },
    {
      "pointKey": "corridor_manual_override",
      "objectIdentifier": "binary-value,14",
      "canonicalPointType": "manual_override",
      "isWritable": true,
      "isWhitelisted": true,
      "valueType": "binary"
    },
    {
      "pointKey": "corridor_occupancy_mode",
      "objectIdentifier": "multi-state-value,9",
      "canonicalPointType": "occupancy_mode",
      "isWritable": true,
      "isWhitelisted": true,
      "valueType": "enumerated",
      "enumMap": {
        "unoccupied": 1,
        "occupied": 2,
        "standby": 3
      }
    },
    {
      "pointKey": "corridor_co2",
      "objectIdentifier": "analog-input,18",
      "canonicalPointType": "co2",
      "unit": "ppm",
      "valueType": "real"
    }
  ]
}' \
npm run dev:gateway-bridge
```

Notes for the real `bacnet-js` provider:

- `targetAddress`
  - required BACnet device address used for `Who-Is`, `ReadPropertyMultiple`, and `WriteProperty`
- `deviceInstance`
  - optional but strongly recommended; narrows discovery and lets the provider read the device `object_name`
- `points`
  - each point must include `pointKey` and `objectIdentifier`
  - optional `readProperty` and `writeProperty` default to `present_value`
- `valueType`
  - supported values: `auto`, `real`, `double`, `signed`, `unsigned`, `boolean`, `character_string`, `enumerated`, `binary`
- `enumMap`
  - strongly recommended for multi-state and schedule-like points so AirWise gets readable states like `occupied` and `unoccupied` instead of raw integers
- `skipWhoIs`
  - optional escape hatch when discovery replies are blocked; the provider will still use the configured point list for snapshot generation

For compiled runs, point `AIRWISE_GATEWAY_BRIDGE_SDK_MODULE_PATH` at the built JS file in `dist`, not the TypeScript source file.

## Key docs

- [Technical implementation plan](/Users/karan/Documents/LL97/docs/technical_implementation_plan.md)
- [LL97 compliance spec](/Users/karan/Documents/LL97/docs/ll97_compliance_spec.md)
- [Ventilation + BACnet spec](/Users/karan/Documents/LL97/docs/ventilation_bacnet_spec.md)
- [Current capabilities and no-sensor strategy](/Users/karan/Documents/LL97/docs/current_capabilities_and_no_sensor_strategy.md)
- [Building capability tiers roadmap](/Users/karan/Documents/LL97/docs/building_capability_tiers_roadmap.md)
- [Next sprint build plan](/Users/karan/Documents/LL97/docs/next_sprint_build_plan.md)
- [Next sprint founder execution checklist](/Users/karan/Documents/LL97/docs/next_sprint_founder_execution_checklist.md)
- [Next sprint ticket backlog](/Users/karan/Documents/LL97/docs/next_sprint_ticket_backlog.md)
- [90-day roadmap](/Users/karan/Documents/LL97/docs/90_day_engineering_roadmap.md)
