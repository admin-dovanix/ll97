# AirWise LL97 Compliance Specification

Last updated: 2026-04-14

## 1. Compliance engine goal

For each building in a portfolio, AirWise must answer:

- Is this building covered by LL97?
- Which pathway applies?
- What must be filed or demonstrated?
- Who must attest?
- What evidence is still missing?
- What are the current penalty risks?

The engine is deterministic and evidence-driven. AI may assist with document classification or summary generation later, but the compliance decisioning path must be rules-based.

## 2. Canonical compliance workflow

Per building:

1. Resolve `BBL`, `BIN`, address, owner, and gross square footage context.
2. Look up the building/lot on the current DOB Covered Buildings List.
3. Determine compliance pathway using the highest applicable tier on the CBL matrix.
4. Generate building requirements for the current filing year.
5. Attach evidence requirements, attestation role, and deadlines.
6. Compute filing readiness, blocker list, and penalty exposure.
7. Render building and portfolio workspaces.

## 3. Coverage and pathway model

### Core concepts

- `GSF` determines covered-building status.
- `GFA` is used for LL97 reporting and emissions limits.
- `BBL` is tax-lot identity.
- `BIN` is building identity.
- Coverage is determined at lot level but compliance is ultimately demonstrated at building level.

### Supported pathways

- `CP0`: Article 320 beginning 2024
- `CP1`: Article 320 beginning 2026 for certain rent-regulated properties
- `CP2`: Article 320 beginning 2035 for certain income-restricted properties
- `CP3`: Article 321
- `CP4`: city buildings / NYCHA class

Implementation rule:

- If a building could match multiple pathways, apply the highest-numbered applicable tier and preserve the source record for audit.

## 4. Article 320 requirements

### V1 workflow support

- annual emissions report tracking
- emissions limit estimation
- actual emissions estimation
- filing-readiness checklist
- evidence binding
- RDP attestation requirement
- penalty estimation

### Required data

- building identity and covered status
- GFA by ESPM property type
- annual energy consumption by fuel/source
- emissions factors version
- evidence set for owner, RDP, and internal reviewer

### Key rules

- Article 320 covered buildings file annual reports.
- Reports are certified by a `registered design professional`.
- Missing report penalty is modeled as `floor area x $0.50 per month`.
- Emissions over-limit penalty is modeled as `(actual emissions - limit) x $268 per year`.

### V1 exclusions

- open-ended deductions and alternatives engine
- free-text exception processing
- automated legal interpretation of edge cases

## 5. Article 321 requirements

### V1 workflow support

Support both Article 321 paths:

- `performance-based pathway`
- `prescriptive pathway`

### Performance-based pathway requirements

- building flagged as Article 321
- pathway choice recorded
- ESPM-sharing / data availability state
- GFA by ESPM property type
- emissions-limit comparison against the required Article 321 performance framework
- deductions/offset flags as structured fields
- RDP review and attestation workflow

### Prescriptive pathway requirements

Store and surface all 13 PECMs:

1. Temperature set points
2. Repair leaks
3. Heating system function
4. Radiator temperature controls
5. Piping insulation
6. Water tank insulation
7. Indoor/outdoor temperature sensors
8. Steam traps
9. Master steam system venting
10. Lighting
11. Building envelope
12. Exhaust fan timers
13. Radiant barriers

Per PECM record:

- applicability
- status: `in_compliance | not_in_compliance | not_applicable | unknown`
- evidence required
- attestation-only vs upload-required
- reviewer role
- notes and remediation tasks

### Specific implementation note for AirWise wedge

`PECM #12 Exhaust fan timers` should be modeled as a first-class bridge between compliance and monitoring because it connects directly to the ventilation wedge. AirWise should support:

- manual documentation of existing timers or schedule controls
- BAS-backed evidence where a BMS or gateway exposes schedules/runtime
- recommendation workflow when current runtime patterns appear inconsistent with prescriptive expectations

AirWise should not auto-certify PECM #12 compliance from telemetry alone. It should provide evidence and operator workflow.

## 6. Data sources and confidence model

### Public sources

- DOB Covered Buildings List
- CBL pathway logic and FAQs
- official emissions limit tables
- public guidance and filing process docs

### Owner / consultant sources

- utility bills
- Portfolio Manager exports
- property use and GFA schedules
- engineering reports
- RDP and RCxA documents
- proof for affordable housing and pathway status

### Confidence handling

Every derived compliance output should have:

- `source_type`: public / owner / consultant / inferred
- `source_ref`
- `confidence_score`
- `blocking_flag`

Examples:

- public CBL says `CP3` but owner claims Article 320 -> low confidence, create dispute task
- GSF present but GFA missing -> filing blocked for Article 320 estimates
- Article 321 performance pathway chosen but no ESPM data -> filing blocked

## 7. Building-level requirement generator

Generate one or more `ComplianceRequirement` rows per building/year. Minimum types:

- `coverage_verification`
- `pathway_verification`
- `article_320_emissions_report`
- `article_321_performance_report`
- `article_321_prescriptive_report`
- `attestation_rdp`
- `attestation_rcxa`
- `deductions_alternatives_module`
- `penalty_mitigation_module`
- `eecp_module`

Fields:

- `building_id`
- `reporting_year`
- `requirement_type`
- `status`
- `due_date`
- `required_role`
- `blocking_reason`
- `source_basis`

## 8. Compliance UI surfaces

### Portfolio compliance view

Columns:

- building
- pathway
- due date
- readiness
- risk
- missing inputs
- estimated penalty exposure
- assigned owner

### Building compliance workspace

Tabs:

- Overview
- Coverage & pathway
- Energy & emissions
- PECMs / pathway requirements
- Documents & evidence
- Tasks & deadlines
- Audit trail

### Evidence workspace

Functions:

- upload file
- auto-classify document type
- attach to requirement
- record reviewer
- mark accepted / rejected / needs follow-up

## 9. Non-functional requirements

- all compliance decisions are traceable to a source
- rule tables are versioned
- annual filing logic is configurable by year
- penalties are explicit calculations, not opaque labels
- data conflicts are surfaced, not silently overwritten

## 10. Implementation order

1. Building identity resolver
2. Coverage/pathway resolver
3. Requirement generator
4. Article 320 workspace
5. Article 321 workspace
6. Evidence binding
7. Portfolio dashboard

## 11. Source anchors

- <https://www.nyc.gov/site/buildings/codes/ll97-greenhouse-gas-emissions-reductions.page>
- <https://www.nyc.gov/site/buildings/codes/ll97-buildings-emissions-limits.page>
- <https://www.nyc.gov/site/buildings/codes/ll97-cbl-faq.page>
- <https://www.nyc.gov/site/buildings/codes/greenhouse-gas-emissions-reductions-violations.page>
- <https://www.nyc.gov/assets/buildings/pdf/321_filing_guide.pdf>
- <https://www.nyc.gov/assets/buildings/pdf/article321_temp_instr.pdf>
- <https://home4.nyc.gov/assets/buildings/pdf/cbl_mn26.pdf>
- <https://www.nyc.gov/site/hpd/services-and-information/ll97-guidance-for-affordable-housing.page>
