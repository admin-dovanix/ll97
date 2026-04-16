# LL97 2026 Reporting Gap Analysis

Last updated: 2026-04-15

## 1. Source analyzed

- Government presentation: `/Users/karan/Desktop/overview_of_the_2026_ll97_reporting_process.pdf`
- Presentation title: `PART 2: LL97 2026 Reporting Year Kickoff`
- Presentation date: `March 30, 2026`
- Presenting body: `DOB Sustainability Bureau`

## 2. Executive summary

The 2026 reporting deck confirms that AirWise is directionally aligned with the filing workflow, but the current product only covers the top layer of the process:

- coverage and pathway resolution
- requirement generation
- lightweight evidence binding
- simple penalty estimation
- Article 321 PECM catalog scaffolding

The platform does **not** yet implement the 2026 filing process deeply enough to function as a true LL97 reporting operating system. The biggest gaps are:

- year-specific filing workflow and deadlines
- BEAM/DOB NOW/ESPM process state tracking
- report-type and ticket-type modeling
- Article 320 and Article 321 calculation detail
- deductions / alternatives / adjustments / campus workflows
- owner-of-record and attestation validation
- manual-input forms for filing-specific questions
- import and validation of ESPM / utility / GFA data

## 3. Structured extraction from the DOB presentation

### 3.1 Core deadlines for 2026 reporting

- `LL84 Report`: due `May 1, 2026`
- `LL88 Report`: due `May 1, 2026`
- `LL97 Report or LL97 Extension Request`: due `June 30, 2026`
- If extension is filed by `June 30, 2026`, `LL97 Report` due date becomes `August 29, 2026`

### 3.2 Primary systems in the reporting flow

- `DOB NOW`
  - pay LL97 / LL88 filing fees
  - owner profile required
  - building owner must match DOF or HPD owner of record
  - calendar year must be selected as `CY2025` for 2026 reporting
- `BEAM`
  - filing workflow and ticket submission system
  - BEAM access depends on DOB NOW email associations
  - prior-year access largely carries forward
  - ticket inventory surfaces audit status and labels
- `ESPM` / `Energy Star Portfolio Manager`
  - property must be shared with the city
  - CY2025 data is used for 2026 filing
  - ESPM ID is required on LL97 ticket submission
  - duplicate ESPM IDs must be resolved before filing
  - BEAM data transfer occurs nightly
  - submitting some ticket types pauses ESPM transfer into BEAM

### 3.3 Key account and identity rules

- ESPM property data administrator email must be associated with owner or owner representative
- service providers may not be listed as the owner in DOB NOW
- incorrect owner information can cause rejection and failure-to-file penalties
- BEAM user updates overwrite prior user fields if populated and remove them if blank
- newly covered BBLs/BINs require DOB NOW access first, then BEAM Ticket `#14`
- BBL/BIN cross-linking exists between CY2024 and CY2025, but newly added buildings have no carryover

### 3.4 Data carried forward from prior year

The DOB deck says the following can carry from `CY2024` into `CY2025`:

- user access
- GFA by property type, if previously entered in Ticket `#4` or `#5`
- LL88 compliance status
- adjusted emissions limits from `320.7`, `320.8`, and `320.9`
- fee exempt status

### 3.5 2026 process / validation requirements surfaced in the deck

- covered buildings should verify data against the `2026 Covered Buildings List`
- users may need to submit a `CBL dispute`
- filing requires `CY2025` ESPM data
- if owner unshared ESPM property, it must be reshared with `NYCGOVLL84`
- some report types require explicit comparison to prior-year compliance status
- some report types require documentation of methods used to come into compliance
- attestation forms were updated and require valid DOF/HPD owner information
- unresolved attestation issues can prevent audit closure and trigger failure-to-file exposure

### 3.6 Audit and BEAM inventory statuses described in the deck

#### Waiting on DOB action

- audit steps completed, no further action
- attestation review remaining
- compliance pathway confirmation remaining
- fee exempt status verification remaining

#### Awaiting applicant response with 14-day turnaround

- initial report incomplete
- GFA information incomplete
- compliance pathway check
- duplicate PMID check
- duplicate ticket check
- ticket / ESPM setup consistency check
- payment verification issues
- building data in ESPM incorrect
- energy use data in ESPM incorrect
- emissions and limits verification issues
- gross floor area verification issues

### 3.7 Data quality labels described in the deck

Property-level labels:

- incorrect number of buildings
- did not report whole-building energy data
- incorrect number of meters
- incorrect site EUI
- ineligible property type for LL97

Tax-lot / campus labels:

- campus child not connected to BEAM
- child parent not connected to BEAM
- campus active meters excluded
- child active meters excluded
- campus number of buildings not aggregated
- child incorrect number of buildings
- campus active meters not aggregated
- campus energy use not aggregated
- campus incorrect site EUI
- campus property-type GFAs not aggregated

### 3.8 Compliance status labels described in the deck

- `Exceeds Limit`
  - Article 320 or Article 321 performance buildings with excess emissions
- `PECM Incomplete`
  - Article 321 prescriptive buildings with incomplete PECM implementation

## 4. 2026 ticket matrix extracted from the presentation

### 4.1 Ticket #3: LL97 Extension Request

- Optional yearly submission
- Payment in DOB NOW: `$60`
- Submitted in BEAM as `03. 2026 LL97 Extension Request`
- Deadline: `June 30, 2026`
- Extends LL97 deadline to `August 29, 2026`
- No attestation required
- Reason for extension removed
- Bulk extensions not accepted in 2026

### 4.2 Ticket #4: Article 320 compliance report

- Individual building workflow
- Requires 2026 CBL review and possible dispute
- Requires DOB NOW compliance payment
- Requires ESPM connection for `CY2025`
- If owner unshared, property must be reshared with the city
- BEAM report name: `04. 2026 LL97 Building Emissions Limit & RDP Attestation (Article 320)`

2026-specific updates:

- BBL, ESPM ID, and ESPM property name auto-populate from BIN
- filer attests to `CY2025` data tied to ESPM property ID
- compliance status compared to last year is required
- documentation on methods used to come into compliance is required
- allows inclusion of `CY2024` GFA data if previously input in Ticket `#4`

### 4.3 Ticket #5: Article 321 compliance report

Scenarios:

- filed noncompliant Article 321 report in CY2025 and now demonstrating compliance
- first-time Article 321 filing

Performance pathway:

- requires 2026 CBL review and possible dispute
- requires DOB NOW compliance payment
- requires ESPM connection for `CY2025`
- requires reshare with city if owner unshared

PECM pathway:

- requires 2026 CBL review and possible dispute
- requires DOB NOW compliance payment
- requires completion of all PECM measures

2026-specific updates:

- BBL, ESPM ID, and ESPM property name auto-populate from BIN
- if using 2030 emissions limit option, filer attests to CY2025 ESPM data
- allows inclusion of CY2024 GFA data only if previously entered in Ticket `#5`

### 4.4 Ticket #6: Deductions and alternatives for standalone properties

- Yearly resubmission
- Requires Ticket `#4` or Ticket `#5` to be submitted first
- BEAM report name: `06. 2026 - LL97 Deductions and Alternatives to Calculating Annual Building Emissions`

2026-specific updates:

- BBL, ESPM ID, and ESPM property name auto-populate from BIN
- filer attests to CY2025 data tied to ESPM property ID
- beneficial electrification banking questions added
- deductions template updated with CY2025 `TOU` and `TES` coefficient data

### 4.5 Ticket #6a: Aggregate deductions and alternatives for campus properties

- Yearly resubmission
- Requires Ticket `#15` first
- BEAM report name: `06a. 2026 LL97 Aggregate Deductions and Alternatives to Calculating Annual Building Emissions`

2026-specific updates:

- BBL pairing based on entire BBL string on campus profile
- ESPM parent ID and parent property name auto-populate from BBL
- filer attests to campus-wide CY2025 data tied to ESPM parent property ID
- deductions template updated with CY2025 TOU and TES coefficient data

### 4.6 Ticket #7: Emissions allocation by BIN

- Requires Ticket `#15` first
- BEAM report name: `07. 2026 LL97 Emissions Allocation by BIN`
- campus BBL pairing based on entire BBL string on campus profile

### 4.7 Tickets #8 and #9: Penalty mitigation

- If submitted in 2025, do not need to resubmit in 2026
- Otherwise submit:
  - `08. 2026 LL97 Penalty Mitigation (Article 320)`
  - `09. 2026 LL97 Penalty Mitigation (Article 321)`

2026-specific updates:

- edits to good-faith-efforts options
- decarbonization plans no longer allowed
- added option for previously submitted compliant annual building emissions report
- BBL, ESPM ID, and ESPM property name auto-populate from BIN
- filer attests to CY2025 data tied to ESPM property ID

### 4.8 Ticket #10: Section 320.7 adjustment

- Applies to Article 320 and Article 321
- Submit `10. 2026 LL97 Application for §320.7 Adjustment`
- financial constraints must be resubmitted every year
- external constraints last for 3 years
- if external constraints were submitted in 2025, do not refile until `2028`
- offsets up to `10% of unadjusted limit` must be purchased annually for adjustment to apply

2026-specific updates:

- BBL, ESPM ID, and ESPM property name auto-populate from BIN
- filer attests to CY2025 data tied to ESPM property ID
- external-constraints decarb plan has stronger requirements than CY2024

### 4.9 Tickets #11 and #12: LL88 lighting and submetering

- Only submit if fully compliant
- not for partial compliance
- deadline: `May 1, 2026`
- filing fee: `$115`
- one payment covers both lighting and submetering filings and combined reports
- BBL auto-populates from BIN
- compliance plan is no longer an option

### 4.10 Ticket #13: Fee exempt verification

- Yearly resubmission
- BEAM report name: `13. 2026 Verify Fee Exempt Status`
- 2026 update allows user to indicate whether status changed from previous year

### 4.11 Ticket #14: BEAM account update users

- BEAM account maintenance flow
- CY24 account users transfer to CY25
- if BBL and BIN changed, user must email DOB
- updating email fields overwrites previous values

### 4.12 Ticket #15: Aggregate emissions and emissions limit attestation

- Yearly resubmission
- requires 2026 CBL review and possible dispute
- requires DOB NOW compliance filing fee
- requires ESPM connection for `CY2025`
- requires reshare if owner unshared
- BEAM report name: `15. 2026 Aggregate Emissions and Emissions Limit Attestation`

2026-specific updates:

- BBL pairing based on entire BBL string on campus profile
- ESPM parent ID and parent property name auto-populate from BBL
- filer attests to campus-wide CY2025 data tied to ESPM parent property ID
- compliance status compared to last year is required
- documentation on methods used to come into compliance is required

### 4.13 Ticket #16: Section 320.8 / 320.9 adjustment

- `16. 2026 LL97 Application Approved for 320.8 or 320.9 Adjustment`
- used to carry approved DOB NOW data into BEAM if not submitted in 2025
- if submitted in 2025, no further action required in 2026
- no 2026 process updates listed

## 5. What the platform already has

### 5.1 Existing strengths in the repo

The current implementation already has real value in these areas:

- building / portfolio system of record
- pathway and article modeling
- coverage resolution records with source confidence
- basic requirement generation
- evidence linking and audit trail
- simple compliance workspace UI
- Article 321 PECM catalog scaffold
- simple late-filing and excess-emissions penalty estimation

### 5.2 Evidence in code

- pathway metadata and Article 320 / 321 mapping:
  - `packages/rules/src/ll97/pathways.ts`
- Article 321 PECM list:
  - `packages/rules/src/article321/pecms.ts`
- compliance requirement types and summary model:
  - `packages/domain/src/compliance/types.ts`
- requirement generation and compliance summary:
  - `packages/database/src/index.ts`
- current penalties:
  - `packages/rules/src/penalties/index.ts`
- current filing seed config:
  - `packages/database/seeds/ll97-config.json`
- current compliance workspace:
  - `apps/web/src/components/compliance/compliance-workspace.tsx`
- current documents workspace:
  - `apps/web/src/components/documents/documents-workspace.tsx`

## 6. Gap analysis: current platform vs 2026 reporting requirements

### 6.1 Workflow and process orchestration

Already present:

- building-level compliance workspace
- requirement checklist generation
- evidence tracking at requirement level

Missing:

- explicit ticket model for `#3`, `#4`, `#5`, `#6`, `#6a`, `#7`, `#8`, `#9`, `#10`, `#11`, `#12`, `#13`, `#14`, `#15`, `#16`
- workflow dependency engine between tickets
- extension workflow and extension-adjusted due dates
- BEAM / DOB NOW / ESPM process-state tracking
- audit response states and 14-day turnaround tracking
- carry-forward logic from prior year

### 6.2 Article 320 reporting

Already present:

- Article 320 requirement row
- simple excess-emissions penalty estimate

Missing:

- CY2025 ESPM data import and attestation state
- year-over-year compliance status input
- methods-used-to-comply documentation workflow
- calculation engine based on real energy use, emissions factors, and property-type GFA
- adjusted emissions limit handling from `320.7`, `320.8`, `320.9`
- owner-of-record validation and RDP attestation package validation

### 6.3 Article 321 reporting

Already present:

- Article 321 performance vs prescriptive branching
- PECM catalog
- RCxA / RDP attestation requirement rows

Missing:

- per-PECM applicability, status, evidence type, reviewer role, and notes persistence
- PECM completion workflow across all 13 measures
- 2030 emissions limit option logic
- CY2025 ESPM attestation for performance pathway
- noncompliant-last-year to compliant-this-year scenario handling
- `PECM Incomplete` and other BEAM-style compliance labels

### 6.4 Deductions, alternatives, and adjustments

Already present:

- internal spec mentions future `deductions_alternatives_module` and `penalty_mitigation_module`

Missing:

- Ticket `#6` and `#6a` deduction workflows
- beneficial electrification banking fields
- TOU / TES coefficient application
- Ticket `#10` section 320.7 logic
- Ticket `#16` section 320.8 / 320.9 carry-forward and approval handling
- annual offset purchase tracking
- three-year external-constraint persistence

### 6.5 Campus / aggregate workflows

Already present:

- almost none beyond generic building/portfolio modeling

Missing:

- campus profile / parent-child tax-lot model
- Ticket `#15` aggregate emissions and emissions limit attestation
- Ticket `#6a` campus deductions workflow
- Ticket `#7` emissions allocation by BIN
- campus aggregation and disaggregation logic
- campus-specific data quality labels

### 6.6 LL88 and fee-exempt adjacencies

Already present:

- none in product workflow beyond generic document handling

Missing:

- LL88 filing status and due-date tracking
- Ticket `#11` lighting workflow
- Ticket `#12` submetering workflow
- Ticket `#13` fee exempt verification workflow
- carry-forward of prior fee-exempt status

### 6.7 Data quality and audit operations

Already present:

- simple evidence accepted / pending / rejected states
- audit log for evidence links and requirement generation

Missing:

- duplicate PMID detection
- duplicate ticket detection
- ESPM setup consistency checks
- whole-building-energy completeness checks
- meter-count checks
- site EUI reasonability checks
- GFA vs GSF validation checks
- review queues tied to 14-day applicant response windows
- BEAM-style inventory labels and audit status model

## 7. Calculation engines that need to exist

### 7.1 Emissions calculation engine

Needed inputs:

- CY2025 energy use by fuel / source
- property-type-level GFA
- official emissions factors version
- aggregation / allocation modifiers where applicable
- deductions / alternatives inputs where applicable

Outputs:

- actual annual emissions
- emissions limit
- over-limit amount
- penalty estimate
- source trace by input and rule version

### 7.2 Requirement / filing orchestration engine

Needed inputs:

- pathway
- article
- building vs campus status
- prior-year filing history
- ticket submission history
- extension status
- fee exempt status
- adjustment / mitigation eligibility

Outputs:

- required tickets
- prerequisites and dependency graph
- due dates
- status by filing artifact
- responsible role
- blocker list

### 7.3 Adjustment and deductions engine

Needed inputs:

- 320.7 financial / external constraint data
- 320.8 or 320.9 approval state
- offsets purchased
- TOU / TES coefficients
- beneficial electrification banking data

Outputs:

- adjusted emissions limit
- eligible deduction values
- carry-forward / resubmission logic
- evidence and attestation requirements

### 7.4 Article 321 PECM engine

Needed inputs:

- PECM applicability
- PECM completion state
- evidence package
- RCxA / reviewer sign-off state

Outputs:

- per-PECM compliance posture
- prescriptive pathway completeness
- `PECM Incomplete` label when applicable
- filing blockers

### 7.5 Audit / validation rules engine

Needed inputs:

- ESPM building metadata
- meter counts
- building counts
- GSF vs GFA values
- campus relationships
- ticket and ESPM pairing

Outputs:

- data quality labels
- audit issue list
- applicant-response queue
- recommended remediation action

## 8. Inputs the product needs, separated by extraction vs manual entry

### 8.1 Best-effort extracted / imported data

- building identity:
  - BBL
  - BIN
  - address
- public-source compliance context:
  - covered status
  - pathway
  - article
  - CBL version
- ESPM metadata:
  - ESPM property ID
  - property name
  - parent property ID for campus workflows
  - property types
  - GFA by property type
  - annual energy usage by meter / fuel
- prior-year carry-forward values:
  - prior GFA entries
  - prior LL88 status
  - prior adjustments
  - fee-exempt status
- owner-of-record data from DOF / HPD
- ticket submission history and audit statuses if accessible

### 8.2 Manual user input that will still be required

- owner rep and filing contacts
- confirmation that ESPM sharing is correct
- comparison to last year compliance status
- narrative or structured documentation on methods used to come into compliance
- extension request decision
- Article 321 pathway choice where not deterministically inferable
- PECM applicability and completion details
- good-faith-efforts / mitigation selections
- beneficial electrification banking responses
- financial or external constraint details for 320.7
- evidence review outcomes and reviewer notes

### 8.3 Hybrid inputs: import first, user validate

- GFA by property type
- campus parent-child relationships
- building count and meter count
- owner-of-record match
- duplicate ESPM ID conflicts
- fee-exempt carry-forward
- prior-year filing carry-forward fields

## 9. Recommended product features to build next

### 9.1 Phase 1: 2026 filing foundation

- model LL97 filing `tickets` as first-class entities
- move deadlines into year-specific config with extension logic
- store filing-year process state for DOB NOW, BEAM, and ESPM
- add owner-of-record validation fields
- add manual-input forms for 2026-specific questions on Ticket `#4`, `#5`, and `#15`

### 9.2 Phase 2: data ingestion and validation

- import ESPM building metadata and annual energy data
- add property-type GFA intake and validation
- add GFA vs GSF checks
- add duplicate PMID detection and ESPM setup checks
- build data quality labels and audit-response queues

### 9.3 Phase 3: calculation engines

- replace placeholder emissions estimates with real calculation engine
- implement Article 321 PECM state machine
- implement deductions / alternatives / 320.7 / 320.8 / 320.9 logic
- add campus aggregation, allocation, and disaggregation support

### 9.4 Phase 4: filing operations workspace

- add ticket-by-ticket filing workspace
- show prerequisites and missing steps
- track extension, fee exemption, LL88, mitigation, and adjustments
- surface 14-day audit response countdowns
- support prior-year carry-forward review and approval

## 10. Practical interpretation for AirWise

The current product is already credible as:

- a compliance readiness workspace
- an evidence and audit spine
- a building data system of record

It is **not yet** a credible end-to-end 2026 LL97 filing platform because it lacks:

- filing-ticket orchestration
- real calculation engines
- ESPM-centered data import and validation
- adjustment / deduction / campus workflows
- year-specific operational workflow states

The best near-term wedge is:

1. keep the current readiness and evidence UX
2. add a `2026 filing operating layer` on top of it
3. prioritize Ticket `#4`, `#5`, `#3`, and `#15` first
4. then add deductions / adjustments / campus complexity
