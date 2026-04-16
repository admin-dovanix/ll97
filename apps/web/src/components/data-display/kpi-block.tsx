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
        "min-w-0 border-b border-border px-5 py-4 md:border-r md:border-b-0",
        emphasize ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/58">{label}</p>
      <div className="mt-1 flex items-end gap-2">
        <p className="text-[2.1rem] font-semibold leading-none tracking-tight text-foreground">{value}</p>
        {trend ? (
          <span
            className={cn(
              "pb-0.5 font-mono text-[10px] uppercase tracking-[0.18em]",
              trend === "up" ? "text-danger" : trend === "down" ? "text-success" : "text-muted-foreground"
            )}
          >
            {trend}
          </span>
        ) : null}
      </div>
      {detail ? <p className="mt-1 text-xs leading-5 text-foreground/68">{detail}</p> : null}
    </div>
  );
}
