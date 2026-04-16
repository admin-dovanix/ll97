import { cva } from "class-variance-authority";
import { complianceStatusTone, type StatusTone } from "../../lib/status";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex min-h-7 items-center gap-2 rounded-sm border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em]",
  {
    variants: {
      tone: {
        success: "border-success/25 bg-success/12 text-success",
        warning: "border-warning/30 bg-warning/14 text-warning",
        danger: "border-danger/25 bg-danger/12 text-danger",
        neutral: "border-border bg-panelAlt text-foreground/78",
        accent: "border-accent/25 bg-accent/10 text-accent"
      }
    },
    defaultVariants: {
      tone: "neutral"
    }
  }
);

const statusSymbols: Record<"non-compliant" | "at-risk" | "compliant" | "unknown", string> = {
  "non-compliant": "R",
  "at-risk": "Y",
  compliant: "G",
  unknown: "N"
};

export function StatusBadge({
  label,
  tone = "neutral",
  status
}: {
  label?: string;
  tone?: StatusTone;
  status?: "non-compliant" | "at-risk" | "compliant" | "unknown";
}) {
  const resolvedTone = status ? complianceStatusTone(status) : tone;
  const resolvedLabel =
    label ??
    (status
      ? {
          "non-compliant": "Non-compliant",
          "at-risk": "At risk",
          compliant: "Compliant",
          unknown: "Unknown"
        }[status]
      : "Status");

  return (
    <span className={cn(badgeVariants({ tone: resolvedTone }))}>
      {status ? <span className="text-[10px] opacity-70">{statusSymbols[status]}</span> : null}
      <span>{resolvedLabel}</span>
    </span>
  );
}
