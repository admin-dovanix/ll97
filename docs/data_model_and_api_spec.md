# AirWise Data Model and API Specification

Last updated: 2026-04-14

## 1. Data model

### Core relational entities

#### `portfolios`

- `id`
- `name`
- `owner_name`
- `primary_contact_id`
- `timezone`
- `status`

#### `buildings`

- `id`
- `portfolio_id`
- `name`
- `address_line_1`
- `city`
- `state`
- `zip`
- `borough`
- `block`
- `lot`
- `bbl`
- `bin`
- `dof_gsf`
- `reported_gfa`
- `occupancy_notes`
- `is_affordable_housing_candidate`
- `is_house_of_worship_candidate`
- `created_at`

#### `coverage_records`

- `id`
- `building_id`
- `filing_year`
- `covered_status`
- `compliance_pathway`
- `pathway_tier`
- `source_name`
- `source_version`
- `source_date`
- `is_disputed`
- `confidence_score`
- `notes`

#### `property_use_breakdowns`

- `id`
- `building_id`
- `reporting_year`
- `espm_property_type`
- `gfa_sqft`
- `source_name`
- `confidence_score`

#### `annual_energy_records`

- `id`
- `building_id`
- `calendar_year`
- `energy_source`
- `consumption_value`
- `consumption_unit`
- `emissions_factor_version`
- `emissions_tco2e`
- `source_name`

#### `compliance_requirements`

- `id`
- `building_id`
- `reporting_year`
- `requirement_type`
- `status`
- `due_date`
- `required_role`
- `blocking_reason`
- `details_json`

#### `documents`

- `id`
- `building_id`
- `document_type`
- `file_url`
- `uploaded_by`
- `uploaded_at`
- `classification_confidence`
- `status`

#### `document_evidence_links`

- `id`
- `document_id`
- `requirement_id`
- `linked_by`
- `link_status`
- `notes`

#### `pecm_statuses`

- `id`
- `building_id`
- `reporting_year`
- `pecm_number`
- `status`
- `is_applicable`
- `requires_upload`
- `reviewer_role`
- `notes`

#### `monitoring_assets`

- `id`
- `building_id`
- `system_name`
- `asset_type`
- `protocol`
- `vendor`
- `location`
- `status`

#### `bas_points`

- `id`
- `monitoring_asset_id`
- `object_identifier`
- `object_name`
- `canonical_point_type`
- `unit`
- `is_writable`
- `is_whitelisted`
- `safety_category`
- `metadata_json`

#### `telemetry_events`

- `id`
- `building_id`
- `system_id`
- `point_id`
- `timestamp`
- `value_numeric`
- `value_text`
- `unit`
- `quality_flag`

#### `recommendations`

- `id`
- `building_id`
- `system_id`
- `issue_type`
- `summary`
- `evidence_json`
- `recommended_action`
- `writeback_eligible`
- `confidence_score`
- `status`
- `assigned_to`

#### `control_commands`

- `id`
- `building_id`
- `point_id`
- `requested_by`
- `approved_by`
- `command_type`
- `previous_value`
- `requested_value`
- `requested_at`
- `expires_at`
- `rollback_policy`
- `status`
- `execution_log_json`

## 2. API surface

### Portfolio and building ingestion

#### `POST /api/portfolios`

Creates a portfolio.

#### `POST /api/portfolios/:id/buildings/import`

Imports building roster rows with address, BBL, BIN, and notes.

Response:

```json
{
  "import_id": "imp_123",
  "received": 24,
  "matched": 21,
  "needs_review": 3
}
```

#### `GET /api/buildings/:id`

Returns the canonical building graph summary.

### Compliance APIs

#### `POST /api/buildings/:id/coverage/resolve`

Runs covered-building/pathway resolution.

#### `GET /api/buildings/:id/compliance`

Returns:

```json
{
  "building_id": "bld_123",
  "covered_status": "covered",
  "pathway": "CP3",
  "article": "321",
  "requirements": [],
  "blockers": [],
  "penalties": {
    "late_report_estimate": null,
    "emissions_over_limit_estimate": null
  }
}
```

#### `POST /api/buildings/:id/compliance/requirements/generate`

Generates or refreshes the building's requirement set for a reporting year.

#### `GET /api/portfolios/:id/compliance/dashboard`

Returns portfolio-level ranking and readiness.

### Document and evidence APIs

#### `POST /api/buildings/:id/documents`

Uploads a document and triggers classification.

#### `POST /api/requirements/:id/evidence-links`

Attaches a document to a compliance requirement.

### Monitoring APIs

#### `POST /api/telemetry/sensor`

Ingests normalized sensor events.

#### `POST /api/bas/discovery-runs`

Starts a BACnet discovery job for a pilot building/system.

#### `GET /api/buildings/:id/monitoring/issues`

Returns current issue detections and recommendations.

### Command APIs

#### `POST /api/commands`

Creates an approval-required control command request.

#### `POST /api/commands/:id/approve`

Approves a whitelisted command.

#### `POST /api/commands/:id/rollback`

Immediately rolls back an active or completed command if supported.

## 3. Roles and permissions

### `owner_asset_manager`

- read all building/compliance records in tenant
- assign tasks
- view recommendations
- approve pilot commands only if granted

### `operator_facilities`

- view assigned buildings and systems
- acknowledge issues
- complete recommendation tasks
- request commands

### `rdp_rcxa`

- view evidence, pathway, and requirement data
- upload attestations
- mark review completion

### `internal_admin`

- manage mappings, rules versions, and command safety policies

## 4. Rule configuration tables

Keep these configuration-driven:

- filing deadlines by pathway/year
- official penalty formulas
- pathway mapping logic
- emissions factors version
- emissions limits by ESPM property type and period
- Article 321 PECM metadata
- BACnet point whitelist rules by pilot

## 5. Testing targets

- import and resolve buildings with mixed BBL/BIN quality
- generate Article 320 and Article 321 requirement sets
- attach evidence and update building readiness
- ingest telemetry and generate deterministic recommendations
- block unsafe command approvals

## 6. Defaults

- every compliance calculation stores a `source_version`
- every issue stores `evidence_json`
- every command stores `previous_value`
- no command endpoint is enabled for a building unless a pilot flag is set
