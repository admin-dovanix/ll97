import { cva } from "class-variance-authority";
import { complianceStatusTone, type StatusTone } from "../../lib/status";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex min-h-7 items-center gap-2 rounded-md border px-2.5 py-1 text-[11px] font-medium tracking-[0.04em]",
  {
    variants: {
      tone: {
        success: "border-success/18 bg-success/10 text-success",
        warning: "border-warning/24 bg-warning/10 text-warning",
        danger: "border-danger/22 bg-danger/9 text-danger",
        neutral: "border-border bg-panelAlt text-foreground/72",
        accent: "border-accent/18 bg-accent/8 text-accent"
      }
    },
    defaultVariants: {
      tone: "neutral"
    }
  }
);

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
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      <span>{resolvedLabel}</span>
    </span>
  );
}
