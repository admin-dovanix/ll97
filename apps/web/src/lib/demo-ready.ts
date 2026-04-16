import type { StatusTone } from "./status";

type Availability = "yes" | "no" | "unknown";
type BasProtocol = "unknown" | "bacnet_ip" | "bacnet_mstp" | "modbus" | "proprietary" | "other";
type BasAccessState = "unknown" | "no_access" | "vendor_required" | "exports_available" | "direct_access_available";
type EquipmentInventoryStatus = "unknown" | "not_started" | "partial" | "complete";

type FilingFieldDefinition = {
  key: string;
  label: string;
};

type FilingInputValue = {
  fieldKey: string;
  reviewStatus: "pending_review" | "accepted" | "rejected";
};

type FilingCalculationRun = {
  missingRequiredInputs: string[];
  needsReview: string[];
};

export type BuildingReadinessTier = "A" | "B" | "C" | "D";

export type BuildingReadiness = {
  tier: BuildingReadinessTier;
  label: string;
  shortLabel: string;
  explanation: string;
  nextActionLabel: string;
  nextActionHref: string;
  tone: StatusTone;
};

export type StartHereStep = {
  title: string;
  description: string;
  href: string;
};

export type FilingBucketItem = {
  key: string;
  label: string;
};

export type FilingReadinessSummary = {
  completionPercent: number;
  readyCount: number;
  pendingCount: number;
  missingCount: number;
  blockerCount: number;
  readyToFile: boolean;
  readinessLabel: string;
  readinessTone: StatusTone;
  acceptedInputs: FilingBucketItem[];
  pendingInputs: FilingBucketItem[];
  missingInputs: FilingBucketItem[];
  blockingReasons: string[];
};

export function getBuildingReadiness(input: {
  buildingId: string;
  basPresent: Availability;
  basVendor?: string;
  basProtocol: BasProtocol;
  basAccessState: BasAccessState;
  pointListAvailable: Availability;
  schedulesAvailable: Availability;
  equipmentInventoryStatus: EquipmentInventoryStatus;
  gatewayCount: number;
  telemetryCount: number;
  whitelistedPointCount: number;
}) {
  const hasTelemetry = input.telemetryCount > 0;
  const hasControl = input.whitelistedPointCount > 0;
  const hasKnownBas =
    input.basPresent === "yes" ||
    Boolean(input.basVendor) ||
    input.basProtocol !== "unknown" ||
    input.basAccessState !== "unknown" ||
    input.pointListAvailable === "yes" ||
    input.schedulesAvailable === "yes" ||
    input.equipmentInventoryStatus === "partial" ||
    input.equipmentInventoryStatus === "complete";

  if (hasControl) {
    return {
      tier: "D",
      label: "Tier D: Control-enabled",
      shortLabel: "Tier D",
      explanation: "Approved writable points are available, so the team can move from monitoring into supervised action.",
      nextActionLabel: "Review approved control points",
      nextActionHref: `/buildings/${input.buildingId}/monitoring`,
      tone: "accent"
    } satisfies BuildingReadiness;
  }

  if (hasTelemetry || input.gatewayCount > 0) {
    return {
      tier: "C",
      label: "Tier C: Connected",
      shortLabel: "Tier C",
      explanation: "Gateway and telemetry signals are active, so AirWise can surface issues tied to building performance.",
      nextActionLabel: "Review monitoring issues",
      nextActionHref: `/buildings/${input.buildingId}/monitoring`,
      tone: "success"
    } satisfies BuildingReadiness;
  }

  if (hasKnownBas && input.basPresent !== "no") {
    return {
      tier: "B",
      label: "Tier B: BAS-only",
      shortLabel: "Tier B",
      explanation: "A BAS is known, but no live integration is active yet, so the next move is readiness and gateway prep.",
      nextActionLabel: "Complete BAS profile",
      nextActionHref: `/buildings/${input.buildingId}/overview#bas-profile`,
      tone: "warning"
    } satisfies BuildingReadiness;
  }

  return {
    tier: "A",
    label: "Tier A: No Sensor",
    shortLabel: "Tier A",
    explanation: "No BAS or sensor connection is on record yet, so AirWise starts with compliance, documents, and filing.",
    nextActionLabel: "Review compliance",
    nextActionHref: `/buildings/${input.buildingId}/compliance`,
    tone: "neutral"
  } satisfies BuildingReadiness;
}

export function getStartHereSteps(buildingId: string, readiness: BuildingReadiness): StartHereStep[] {
  switch (readiness.tier) {
    case "A":
      return [
        {
          title: "Review compliance",
          description: "Confirm coverage, see blockers, and understand the filing exposure first.",
          href: `/buildings/${buildingId}/compliance`
        },
        {
          title: "Upload documents",
          description: "Attach the evidence package so the filing story starts with real source material.",
          href: `/buildings/${buildingId}/documents`
        },
        {
          title: "Set up filing workspace",
          description: "Move the building into accepted inputs, attestations, and a year-scoped filing package.",
          href: `/buildings/${buildingId}/filing`
        }
      ];
    case "B":
      return [
        {
          title: "Complete BAS profile",
          description: "Capture vendor, access, and readiness so the operating path is explicit.",
          href: `/buildings/${buildingId}/overview#bas-profile`
        },
        {
          title: "Import point list if available",
          description: "Bring in point inventory or discovery context before live telemetry starts.",
          href: `/buildings/${buildingId}/monitoring`
        },
        {
          title: "Prepare for gateway",
          description: "Validate the gateway path so the building can move from BAS-only to connected.",
          href: `/buildings/${buildingId}/monitoring`
        }
      ];
    case "C":
      return [
        {
          title: "View monitoring issues",
          description: "Start with the live queue of issues affecting comfort, runtime, or ventilation performance.",
          href: `/buildings/${buildingId}/monitoring`
        },
        {
          title: "Review recommendations",
          description: "Translate detected issues into operator-ready next steps and follow-through.",
          href: `/buildings/${buildingId}/recommendations`
        },
        {
          title: "Take action",
          description: "Track operator actions and resolve issues before they become compliance or emissions drift.",
          href: `/buildings/${buildingId}/recommendations`
        }
      ];
    case "D":
      return [
        {
          title: "Review approved control points",
          description: "Confirm which writable points are approved for supervised intervention.",
          href: `/buildings/${buildingId}/monitoring`
        },
        {
          title: "Execute supervised commands",
          description: "Move from recommendation into governed command execution with approval and traceability.",
          href: "/commands"
        },
        {
          title: "Track outcomes",
          description: "Use actions, telemetry, and issue status to confirm the intervention actually improved performance.",
          href: `/buildings/${buildingId}/recommendations`
        }
      ];
  }
}

export function getFilingReadinessSummary(input: {
  requiredFieldKeys: string[];
  fieldDefinitions: FilingFieldDefinition[];
  inputValues: FilingInputValue[];
  blockers: string[];
  latestCalculationRun?: FilingCalculationRun;
  filingStatus: string;
}) {
  const requiredKeys = Array.from(new Set(input.requiredFieldKeys));
  const labelsByKey = new Map(input.fieldDefinitions.map((definition) => [definition.key, definition.label] as const));
  const acceptedKeys = new Set(
    input.inputValues.filter((value) => value.reviewStatus === "accepted").map((value) => value.fieldKey)
  );
  const pendingKeys = new Set(
    input.inputValues.filter((value) => value.reviewStatus === "pending_review").map((value) => value.fieldKey)
  );
  const rejectedKeys = new Set(
    input.inputValues.filter((value) => value.reviewStatus === "rejected").map((value) => value.fieldKey)
  );

  const acceptedInputs: FilingBucketItem[] = [];
  const pendingInputs: FilingBucketItem[] = [];
  const missingInputs: FilingBucketItem[] = [];

  for (const key of requiredKeys) {
    const item = {
      key,
      label: labelsByKey.get(key) ?? key.replaceAll("_", " ")
    };

    if (acceptedKeys.has(key)) {
      acceptedInputs.push(item);
      continue;
    }

    if (pendingKeys.has(key)) {
      pendingInputs.push(item);
      continue;
    }

    missingInputs.push(item);
  }

  const blockingReasons = Array.from(
    new Set(
      [
        ...input.blockers,
        ...missingInputs.map((item) => `${item.label} is still missing.`),
        ...pendingInputs.map((item) => `${item.label} is waiting for review before filing can proceed.`),
        ...Array.from(rejectedKeys)
          .filter((key) => requiredKeys.includes(key) && !acceptedKeys.has(key))
          .map((key) => `${labelsByKey.get(key) ?? key.replaceAll("_", " ")} was rejected and needs replacement.`),
        ...(input.latestCalculationRun?.missingRequiredInputs ?? []).map(
          (key) => `${labelsByKey.get(key) ?? key.replaceAll("_", " ")} is missing from the latest calculation run.`
        ),
        ...(input.latestCalculationRun?.needsReview ?? []).map(
          (key) => `${labelsByKey.get(key) ?? key.replaceAll("_", " ")} still needs review.`
        )
      ].filter(Boolean)
    )
  );

  const completionPercent = requiredKeys.length === 0 ? 100 : Math.round((acceptedInputs.length / requiredKeys.length) * 100);
  const readyToFile =
    missingInputs.length === 0 &&
    pendingInputs.length === 0 &&
    blockingReasons.length === 0 &&
    input.filingStatus === "ready";

  return {
    completionPercent,
    readyCount: acceptedInputs.length,
    pendingCount: pendingInputs.length,
    missingCount: missingInputs.length,
    blockerCount: blockingReasons.length,
    readyToFile,
    readinessLabel: readyToFile ? "Ready to file" : "Not ready to file",
    readinessTone: readyToFile ? "success" : "danger",
    acceptedInputs,
    pendingInputs,
    missingInputs,
    blockingReasons
  } satisfies FilingReadinessSummary;
}
