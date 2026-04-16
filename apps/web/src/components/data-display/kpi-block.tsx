import { cn } from "../../lib/utils";

export function KPIBlock({
  label,
  value,
  detail,
  trend,
  emphasize = false,
  tone = "default"
}: {
  label: string;
  value: string;
  detail?: string;
  trend?: "up" | "down" | "flat";
  emphasize?: boolean;
  tone?: "default" | "danger" | "warning" | "success" | "accent";
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border border-border bg-panel px-5 py-5",
        emphasize ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <p className="table-header">{label}</p>
      <div className="mt-2 flex items-end gap-2">
        <p
          className={cn(
            "text-[28px] font-medium leading-none tracking-[-0.02em]",
            tone === "danger"
              ? "text-danger"
              : tone === "warning"
                ? "text-warning"
              : tone === "success"
                ? "text-success"
                : tone === "accent"
                  ? "text-accent"
                  : "text-foreground"
          )}
        >
          {value}
        </p>
        {trend ? (
          <span
            className={cn(
              "pb-0.5 font-mono text-[10px] uppercase tracking-[0.14em]",
              trend === "up" ? "text-danger" : trend === "down" ? "text-success" : "text-muted-foreground"
            )}
          >
            {trend}
          </span>
        ) : null}
      </div>
      {detail ? <p className="mt-1 text-xs leading-5 text-foreground/58">{detail}</p> : null}
    </div>
  );
}
