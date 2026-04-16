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
        "min-w-0 border-b border-border px-5 py-5 md:border-r md:border-b-0",
        emphasize ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-foreground/52">{label}</p>
      <div className="mt-2 flex items-end gap-2">
        <p className={cn("text-[28px] font-medium leading-none tracking-[-0.02em]", emphasize ? "text-danger" : "text-foreground")}>
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
