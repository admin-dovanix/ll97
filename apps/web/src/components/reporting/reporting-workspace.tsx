"use client";

import {
  activateReportingModuleAction,
  calculateReportingCycleAction,
  extractReportingDocumentAction,
  saveReportingInputValueAction,
  updateArticle321PecmAction,
  updateReportingAttestationAction,
  uploadReportingDocumentAction,
  reviewReportingInputValueAction
} from "../../app/actions";
import { ActionButton } from "../ui/action-button";
import { SectionContainer } from "../ui/section-container";
import { StatusBadge } from "../ui/status-badge";
import { formatCurrency, formatDate, formatDateTime } from "../../lib/utils";

type FieldDefinition = {
  key: string;
  label: string;
  family: string;
  inputHint: string;
  manualConfirmationRequired?: boolean;
};

type ModuleRow = {
  id: string;
  moduleType: string;
  status: string;
  dueDate: string;
  prerequisiteState: string;
  blockingReason?: string;
};

type DocumentRow = {
  id: string;
  documentType: string;
  documentCategory: string;
  fileUrl?: string | null;
  parsedStatus: string;
};

type InputValueRow = {
  id: string;
  fieldKey: string;
  fieldFamily: string;
  valueJson: string;
  sourceType: string;
  sourceRef?: string;
  confidenceScore?: number;
  reviewStatus: string;
  reviewedAt?: string;
};

type AttestationRow = {
  id: string;
  role: "owner" | "rdp" | "rcxa";
  signerName?: string;
  ownerOfRecordMatchStatus: string;
  completionStatus: string;
};

type PecmRow = {
  id: string;
  pecmKey: string;
  pecmLabel: string;
  applicability: string;
  complianceStatus: string;
  evidenceState: string;
  reviewerRole: "owner" | "rdp" | "rcxa";
  notes?: string;
};

type CalculationRunRow = {
  missingRequiredInputs: string[];
  needsReview: string[];
  warnings: string[];
  calculationOutputs: Record<string, unknown>;
  createdAt: string;
};

function renderValue(valueJson: string) {
  try {
    const parsed = JSON.parse(valueJson) as unknown;
    return typeof parsed === "string" ? parsed : JSON.stringify(parsed);
  } catch {
    return valueJson;
  }
}

export function ReportingWorkspace({
  buildingId,
  reportingCycleId,
  reportingYear,
  filingStatus,
  filingDueDate,
  ownerOfRecordStatus,
  modules,
  documents,
  fieldDefinitions,
  inputValues,
  requiredFieldKeys,
  blockers,
  attestations,
  pecmStatuses,
  latestCalculationRun
}: {
  buildingId: string;
  reportingCycleId: string;
  reportingYear: number;
  filingStatus: string;
  filingDueDate: string;
  ownerOfRecordStatus: string;
  modules: ModuleRow[];
  documents: DocumentRow[];
  fieldDefinitions: FieldDefinition[];
  inputValues: InputValueRow[];
  requiredFieldKeys: string[];
  blockers: string[];
  attestations: AttestationRow[];
  pecmStatuses: PecmRow[];
  latestCalculationRun?: CalculationRunRow;
}) {
  const acceptedValues = inputValues.filter((value) => value.reviewStatus === "accepted");
  const proposedValues = inputValues.filter((value) => value.reviewStatus === "pending_review");
  const inputsByFamily = fieldDefinitions.reduce<Record<string, FieldDefinition[]>>((groups, definition) => {
    groups[definition.family] = groups[definition.family] ?? [];
    groups[definition.family].push(definition);
    return groups;
  }, {});
  const calculationOutputs = latestCalculationRun?.calculationOutputs ?? {};

  return (
    <>
      <SectionContainer
        title="Reporting cycle shell"
        description="The filing workspace is year-scoped so modules, due dates, and blockers stay attached to one reporting package."
      >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
            <p className="eyebrow">Reporting year</p>
            <p className="text-lg font-semibold text-foreground">{reportingYear}</p>
          </div>
          <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
            <p className="eyebrow">Filing status</p>
            <StatusBadge label={filingStatus.replaceAll("_", " ")} tone="accent" />
          </div>
          <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
            <p className="eyebrow">Due date</p>
            <p className="text-lg font-semibold text-foreground">{formatDate(filingDueDate)}</p>
          </div>
          <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
            <p className="eyebrow">Owner match</p>
            <StatusBadge label={ownerOfRecordStatus.replaceAll("_", " ")} tone={ownerOfRecordStatus === "matched" ? "success" : "warning"} />
          </div>
        </div>
      </SectionContainer>

      <SectionContainer
        title="Filing modules"
        description="Activate optional filing modules as they become relevant. Core article reporting is initialized automatically."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {modules.map((module) => (
            <div key={module.id} className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-foreground">{module.moduleType.replaceAll("_", " ")}</p>
                <StatusBadge label={module.status.replaceAll("_", " ")} tone={module.status === "complete" ? "success" : module.status === "blocked" ? "warning" : "neutral"} />
              </div>
              <p className="mt-2">Due: {formatDate(module.dueDate)}</p>
              <p>Prerequisite: {module.prerequisiteState.replaceAll("_", " ")}</p>
              {module.blockingReason ? <p>Blocker: {module.blockingReason}</p> : null}
              {module.status === "inactive" ? (
                <form action={activateReportingModuleAction} className="mt-3">
                  <input name="buildingId" type="hidden" value={buildingId} />
                  <input name="reportingCycleId" type="hidden" value={reportingCycleId} />
                  <input name="moduleType" type="hidden" value={module.moduleType} />
                  <ActionButton type="submit">Activate module</ActionButton>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      </SectionContainer>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionContainer
          title="Document intake"
          description="Files remain optional, but source documents can generate proposed inputs that a reviewer accepts into the filing package."
        >
          <form action={uploadReportingDocumentAction} className="grid gap-3 rounded-md border border-border bg-panelAlt p-4">
            <input name="buildingId" type="hidden" value={buildingId} />
            <input name="reportingCycleId" type="hidden" value={reportingCycleId} />
            <label className="grid gap-1 text-sm text-muted-foreground">
              Document type
              <input name="documentType" placeholder="CY2025 ESPM export" />
            </label>
            <label className="grid gap-1 text-sm text-muted-foreground">
              Category
              <select name="documentCategory">
                <option value="espm_export">ESPM export</option>
                <option value="utility_bill">Utility bill</option>
                <option value="prior_ll97_report">Prior LL97 report</option>
                <option value="engineering_report">Engineering / consultant package</option>
                <option value="owner_attestation">Owner / attestation document</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm text-muted-foreground">
              File URL or reference
              <input name="fileUrl" placeholder="s3://... or local reference" />
            </label>
            <ActionButton type="submit">Register document</ActionButton>
          </form>

          <div className="mt-4 grid gap-3">
            {documents.map((document) => (
              <div key={document.id} className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{document.documentType}</p>
                  <StatusBadge label={document.parsedStatus.replaceAll("_", " ")} tone="neutral" />
                </div>
                <p className="mt-2">Category: {document.documentCategory.replaceAll("_", " ")}</p>
                <p>{document.fileUrl ?? "Reference pending"}</p>
                <form action={extractReportingDocumentAction} className="mt-3">
                  <input name="buildingId" type="hidden" value={buildingId} />
                  <input name="documentId" type="hidden" value={document.id} />
                  <ActionButton type="submit">Generate proposals</ActionButton>
                </form>
              </div>
            ))}
            {documents.length === 0 ? <p className="text-sm text-muted-foreground">No reporting documents are registered yet.</p> : null}
          </div>
        </SectionContainer>

        <SectionContainer
          title="Manual input"
          description="Every calculation-critical field can be keyed in manually so the user is never blocked by parser quality."
        >
          <form action={saveReportingInputValueAction} className="grid gap-3 rounded-md border border-border bg-panelAlt p-4">
            <input name="buildingId" type="hidden" value={buildingId} />
            <input name="reportingCycleId" type="hidden" value={reportingCycleId} />
            <label className="grid gap-1 text-sm text-muted-foreground">
              Field
              <select name="fieldKey">
                {fieldDefinitions.map((definition) => (
                  <option key={definition.key} value={definition.key}>
                    {definition.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm text-muted-foreground">
              Value
              <textarea name="valueText" placeholder='Use JSON for objects like {"multifamily": 121500}' rows={4} />
            </label>
            <ActionButton type="submit">Save accepted value</ActionButton>
          </form>
        </SectionContainer>
      </div>

      <SectionContainer
        title="Input workspace"
        description="Accepted values are calculation-grade. Proposed values remain review-only until explicitly accepted."
      >
        <div className="grid gap-6">
          {Object.entries(inputsByFamily).map(([family, definitions]) => (
            <div key={family} className="rounded-md border border-border bg-panelAlt p-4">
              <p className="eyebrow">{family.replaceAll("_", " ")}</p>
              <div className="mt-3 grid gap-3">
                {definitions.map((definition) => {
                  const accepted = acceptedValues.find((value) => value.fieldKey === definition.key);
                  const proposals = proposedValues.filter((value) => value.fieldKey === definition.key);
                  const required = requiredFieldKeys.includes(definition.key);

                  return (
                    <div key={definition.key} className="rounded-md border border-border/60 bg-panel p-3 text-sm text-muted-foreground">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{definition.label}</p>
                        {required ? <StatusBadge label="required" tone="warning" /> : null}
                        {definition.manualConfirmationRequired ? <StatusBadge label="manual confirm" tone="neutral" /> : null}
                      </div>
                      <p className="mt-2">Accepted: {accepted ? renderValue(accepted.valueJson) : "None"}</p>
                      {accepted?.reviewedAt ? <p>Reviewed: {formatDateTime(accepted.reviewedAt)}</p> : null}
                      {proposals.length > 0 ? (
                        <div className="mt-3 grid gap-2">
                          {proposals.map((proposal) => (
                            <div key={proposal.id} className="rounded-md border border-border bg-panelAlt p-3">
                              <p>Proposal: {renderValue(proposal.valueJson)}</p>
                              <p>
                                Source: {proposal.sourceType}
                                {proposal.confidenceScore ? ` · ${Math.round(proposal.confidenceScore * 100)}%` : ""}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <form action={reviewReportingInputValueAction}>
                                  <input name="buildingId" type="hidden" value={buildingId} />
                                  <input name="reportingCycleId" type="hidden" value={reportingCycleId} />
                                  <input name="inputValueId" type="hidden" value={proposal.id} />
                                  <input name="reviewStatus" type="hidden" value="accepted" />
                                  <ActionButton type="submit">Accept</ActionButton>
                                </form>
                                <form action={reviewReportingInputValueAction}>
                                  <input name="buildingId" type="hidden" value={buildingId} />
                                  <input name="reportingCycleId" type="hidden" value={reportingCycleId} />
                                  <input name="inputValueId" type="hidden" value={proposal.id} />
                                  <input name="reviewStatus" type="hidden" value="rejected" />
                                  <ActionButton type="submit">Reject</ActionButton>
                                </form>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SectionContainer>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionContainer
          title="Attestations"
          description="Attestation completion is tracked separately from calculations so owner-of-record mismatches stay explicit."
        >
          <div className="grid gap-3">
            {attestations.map((attestation) => (
              <form key={attestation.id} action={updateReportingAttestationAction} className="grid gap-2 rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                <input name="buildingId" type="hidden" value={buildingId} />
                <input name="reportingCycleId" type="hidden" value={reportingCycleId} />
                <input name="role" type="hidden" value={attestation.role} />
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{attestation.role.toUpperCase()}</p>
                  <StatusBadge label={attestation.completionStatus.replaceAll("_", " ")} tone={attestation.completionStatus === "completed" ? "success" : attestation.completionStatus === "blocked" ? "warning" : "neutral"} />
                </div>
                <input defaultValue={attestation.signerName ?? ""} name="signerName" placeholder="Signer name" />
                <select defaultValue={attestation.ownerOfRecordMatchStatus} name="ownerOfRecordMatchStatus">
                  <option value="unknown">Owner match unknown</option>
                  <option value="matched">Owner matched</option>
                  <option value="mismatch">Owner mismatch</option>
                </select>
                <select defaultValue={attestation.completionStatus === "blocked" ? "pending" : attestation.completionStatus} name="completionStatus">
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
                <ActionButton type="submit">Save attestation</ActionButton>
              </form>
            ))}
          </div>
        </SectionContainer>

        <SectionContainer
          title="Calculation results"
          description="The calculation output is separated into missing inputs, review debt, warnings, and model outputs so nothing is hidden."
        >
          <form action={calculateReportingCycleAction}>
            <input name="buildingId" type="hidden" value={buildingId} />
            <input name="reportingCycleId" type="hidden" value={reportingCycleId} />
            <ActionButton type="submit">Run calculation</ActionButton>
          </form>

          {latestCalculationRun ? (
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              <p>Last run: {formatDateTime(latestCalculationRun.createdAt)}</p>
              <p>Missing required inputs: {latestCalculationRun.missingRequiredInputs.length}</p>
              <p>Needs review: {latestCalculationRun.needsReview.length}</p>
              <p>Warnings: {latestCalculationRun.warnings.length}</p>
              <div className="grid gap-2 rounded-md border border-border bg-panelAlt p-4">
                <p className="font-medium text-foreground">Outputs</p>
                <p>Actual emissions: {String(calculationOutputs.actual_emissions_tco2e ?? "Unknown")} tCO2e</p>
                <p>Adjusted actual emissions: {String(calculationOutputs.adjusted_actual_emissions_tco2e ?? "Unknown")} tCO2e</p>
                <p>Limit: {String(calculationOutputs.adjusted_emissions_limit_tco2e ?? "Unknown")} tCO2e</p>
                <p>Over limit: {String(calculationOutputs.over_limit_tco2e ?? "Unknown")} tCO2e</p>
                <p>Late penalty: {formatCurrency(Number(calculationOutputs.late_penalty_usd ?? Number.NaN))}</p>
                <p>Emissions penalty: {formatCurrency(Number(calculationOutputs.emissions_penalty_usd ?? Number.NaN))}</p>
              </div>
              {latestCalculationRun.missingRequiredInputs.length > 0 ? (
                <div className="rounded-md border border-border bg-panelAlt p-4">
                  <p className="font-medium text-foreground">Missing inputs</p>
                  <p>{latestCalculationRun.missingRequiredInputs.join(", ")}</p>
                </div>
              ) : null}
              {latestCalculationRun.needsReview.length > 0 ? (
                <div className="rounded-md border border-border bg-panelAlt p-4">
                  <p className="font-medium text-foreground">Needs review</p>
                  <p>{latestCalculationRun.needsReview.join(", ")}</p>
                </div>
              ) : null}
              {latestCalculationRun.warnings.length > 0 ? (
                <div className="rounded-md border border-border bg-panelAlt p-4">
                  <p className="font-medium text-foreground">Warnings</p>
                  <p>{latestCalculationRun.warnings.join(" ")}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No calculation run has been recorded yet.</p>
          )}
        </SectionContainer>
      </div>

      {pecmStatuses.length > 0 ? (
        <SectionContainer
          title="Article 321 PECMs"
          description="Prescriptive pathway completeness is tracked one measure at a time so filing blockers stay explicit."
        >
          <div className="grid gap-3">
            {pecmStatuses.map((pecm) => (
              <form key={pecm.id} action={updateArticle321PecmAction} className="grid gap-2 rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                <input name="buildingId" type="hidden" value={buildingId} />
                <input name="reportingCycleId" type="hidden" value={reportingCycleId} />
                <input name="pecmKey" type="hidden" value={pecm.pecmKey} />
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{pecm.pecmLabel}</p>
                  <StatusBadge label={pecm.complianceStatus.replaceAll("_", " ")} tone={pecm.complianceStatus === "in_compliance" ? "success" : "warning"} />
                </div>
                <select defaultValue={pecm.applicability} name="applicability">
                  <option value="unknown">Applicability unknown</option>
                  <option value="required">Required</option>
                  <option value="not_applicable">Not applicable</option>
                </select>
                <select defaultValue={pecm.complianceStatus} name="complianceStatus">
                  <option value="unknown">Compliance unknown</option>
                  <option value="in_compliance">In compliance</option>
                  <option value="not_in_compliance">Not in compliance</option>
                  <option value="not_applicable">Not applicable</option>
                </select>
                <select defaultValue={pecm.evidenceState} name="evidenceState">
                  <option value="missing">Evidence missing</option>
                  <option value="pending_review">Pending review</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select defaultValue={pecm.reviewerRole} name="reviewerRole">
                  <option value="owner">Owner</option>
                  <option value="rdp">RDP</option>
                  <option value="rcxa">RCxA</option>
                </select>
                <input defaultValue={pecm.notes ?? ""} name="notes" placeholder="Reviewer notes" />
                <ActionButton type="submit">Save PECM</ActionButton>
              </form>
            ))}
          </div>
        </SectionContainer>
      ) : null}

      {blockers.length > 0 ? (
        <SectionContainer title="Blockers" description="These blockers are rolled up from module state, calculation state, and attestation state.">
          <div className="grid gap-2">
            {blockers.map((blocker, index) => (
              <div key={`${blocker}-${index}`} className="rounded-md border border-border bg-panelAlt p-3 text-sm text-muted-foreground">
                {blocker}
              </div>
            ))}
          </div>
        </SectionContainer>
      ) : null}
    </>
  );
}
