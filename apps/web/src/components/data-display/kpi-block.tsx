import { cn } from "../../lib/utils";

export function KPIBlock({
  label,
  value,
  detail,
  trend,
  emphasize = false
}: {
  label: string;
  value: string;
  detail?: string;
  trend?: "up" | "down" | "flat";
  emphasize?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 border-r border-border pr-4 last:border-r-0 last:pr-0",
        emphasize ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-end gap-2">
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        {trend ? (
          <span
            className={cn(
              "pb-1 font-mono text-[11px] uppercase tracking-[0.18em]",
              trend === "up" ? "text-danger" : trend === "down" ? "text-success" : "text-muted-foreground"
            )}
          >
            {trend}
          </span>
        ) : null}
      </div>
      {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}
