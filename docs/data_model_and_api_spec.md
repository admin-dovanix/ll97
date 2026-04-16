# AirWise Data Model and API Specification

Last updated: 2026-04-15

## Purpose

This spec reflects the current codebase, not an aspirational future schema.

## Current data model

### Core platform tables

- `portfolios`
- `buildings`
- `coverage_records`
- `compliance_requirements`
- `documents`
- `document_evidence_links`
- `audit_events`

### Monitoring and controls tables

- `monitoring_assets`
- `bas_points`
- `telemetry_events`
- `recommendations`
- `recommendation_actions`
- `control_commands`
- `bacnet_gateways`
- `bacnet_gateway_discovery_runs`
- `gateway_command_dispatches`

### Public-source and import tables

- `public_building_records`
- `building_public_matches`
- `public_import_runs`

### Auth and access tables

- `app_users`
- `user_portfolio_memberships`
- `app_sessions`

### Reporting and filing tables

- `reporting_cycles`
- `reporting_input_packages`
- `input_values`
- `document_extractions`
- `filing_modules`
- `attestations`
- `article_321_pecm_statuses`
- `calculation_runs`

## Important model details

### Buildings

Buildings now include BAS-readiness fields in addition to identity and pathway fields:

- `bas_present`
- `bas_vendor`
- `bas_protocol`
- `bas_access_state`
- `point_list_available`
- `schedules_available`
- `ventilation_system_archetype`
- `equipment_inventory_status`

### Documents

Documents now serve both general evidence workflow and filing workflow. They include:

- `document_type`
- `file_url`
- `document_category`
- `reporting_year`
- `parsed_status`
- `parser_type`
- `parser_version`

### Gateways

Gateways now include runtime-contract fields:

- `ingest_token`
- `runtime_mode`
- `command_endpoint`
- `agent_version`
- `last_heartbeat_at`
- `heartbeat_status`
- `poll_interval_seconds`
- `last_poll_requested_at`
- `last_poll_completed_at`
- `next_poll_due_at`
- `runtime_metadata_json`

### Reporting cycles

Reporting is modeled as a year-scoped package per building:

- `reporting_cycles` captures filing-year state
- `reporting_input_packages` groups reviewed inputs
- `input_values` stores manual, extracted, carryforward, or public-record values
- `filing_modules` models optional workflow branches
- `attestations` models owner / RDP / RCxA status
- `article_321_pecm_statuses` tracks prescriptive PECM review state
- `calculation_runs` stores calculated outputs and blocker summaries

## Current web product routes

- `/portfolios`
- `/buildings/:id/overview`
- `/buildings/:id/filing`
- `/buildings/:id/compliance`
- `/buildings/:id/documents`
- `/buildings/:id/monitoring`
- `/buildings/:id/recommendations`
- `/commands`
- `/imports`

## Current API surface

### Portfolio and building routes

- `GET /api/portfolios`
- `POST /api/portfolios`
- `POST /api/portfolios/:id/buildings/import`
- `GET /api/buildings/:id`
- `POST /api/buildings/:id/bas-profile`

### Public-source and coverage routes

- `POST /api/public-building-records/import`
- `GET /api/buildings/:id/public-sources`
- `POST /api/buildings/:id/public-sources/auto-match`
- `POST /api/buildings/:id/coverage/resolve`

### Compliance routes

- `GET /api/buildings/:id/compliance`
- `POST /api/buildings/:id/compliance/requirements/generate`

### Reporting routes

- `POST /api/buildings/:id/reporting-cycles`
- `GET /api/buildings/:id/reporting-cycles/:year`
- `GET /api/reporting/fields`
- `POST /api/reporting-cycles/:id/documents`
- `POST /api/documents/:id/extract`
- `GET /api/reporting-cycles/:id/input-values`
- `POST /api/reporting-cycles/:id/input-values`
- `POST /api/reporting-cycles/:id/input-values/review`
- `POST /api/reporting-cycles/:id/modules/:moduleType/activate`
- `POST /api/reporting-cycles/:id/attestations`
- `POST /api/reporting-cycles/:id/pecms/:pecmKey`
- `POST /api/reporting-cycles/:id/calculate`
- `GET /api/reporting-cycles/:id/calculation-runs/latest`

### Documents routes

- `GET /api/buildings/:id/documents`
- `POST /api/buildings/:id/documents`
- `POST /api/buildings/:id/evidence-links`

### Monitoring and gateway routes

- `POST /api/telemetry/sensor`
- `POST /api/bas/discovery-runs`
- `GET /api/buildings/:id/gateways`
- `POST /api/buildings/:id/gateways`
- `POST /api/buildings/:id/gateway-discovery`
- `GET /api/buildings/:id/monitoring/issues`
- `GET /api/buildings/:id/recommendations`
- `GET /api/buildings/:id/bas-points`
- `GET /api/buildings/:id/telemetry`
- `POST /api/bas-points/:id/mapping`

### Gateway runtime contract

- `GET /api/gateways/:id/runtime`
- `POST /api/gateways/:id/runtime/heartbeat`
- `POST /api/gateways/:id/runtime/discovery`
- `POST /api/gateways/:id/runtime/telemetry`
- `POST /api/gateways/:id/runtime/poll`
- `POST /api/gateways/:id/runtime/poll/complete`
- `GET /api/gateways/:id/runtime/commands`
- `POST /api/gateways/:id/runtime/commands/dispatch`
- `POST /api/gateways/runtime/health/refresh`
- `POST /api/gateways/:id/runtime/commands/:dispatchId/ack`

### Monitoring review and command routes

- `GET /api/commands`
- `POST /api/commands`
- `POST /api/recommendations/:id/actions`
- `POST /api/recommendation-actions/:id/status`
- `POST /api/commands/:id/approve`

## Access model

The web app currently uses cookie-backed app sessions stored in SQLite. Access is portfolio-scoped via:

- `owner`
- `operator`
- `rdp`
- `rcxa`

This is a local pilot auth model, not production SSO.
