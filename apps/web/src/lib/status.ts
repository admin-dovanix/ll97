export type StatusTone = "success" | "warning" | "danger" | "neutral" | "accent";

export function complianceStatusTone(
  status: "non-compliant" | "at-risk" | "compliant" | "unknown"
): StatusTone {
  switch (status) {
    case "non-compliant":
      return "danger";
    case "at-risk":
      return "warning";
    case "compliant":
      return "success";
    default:
      return "neutral";
  }
}

export function buildingComplianceStatus(input: {
  blockerCount?: number;
  penalty?: number | null;
  evidenceGapCount?: number;
}) {
  if ((input.penalty ?? 0) > 0 || (input.blockerCount ?? 0) > 0) {
    return "non-compliant" as const;
  }

  if ((input.evidenceGapCount ?? 0) > 0) {
    return "at-risk" as const;
  }

  return "compliant" as const;
}

export function requirementStatusTone(status: string): StatusTone {
  if (status === "complete" || status === "accepted") {
    return "success";
  }

  if (status === "blocked" || status === "rejected" || status === "missing") {
    return "danger";
  }

  if (status === "in_progress" || status === "pending" || status === "pending_review") {
    return "warning";
  }

  return "neutral";
}

export function commandStatusTone(status: string): StatusTone {
  if (status === "executed" || status === "approved") {
    return "success";
  }

  if (status === "failed" || status === "expired" || status === "dispatch_failed") {
    return "danger";
  }

  if (status === "pending_approval" || status === "requested" || status === "dispatch_pending") {
    return "warning";
  }

  return "neutral";
}
