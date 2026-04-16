import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  status,
  className
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  status?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "grid gap-4 border-b border-border pb-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end",
        className
      )}
    >
      <div className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/62">{eyebrow}</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground lg:text-[2rem]">{title}</h1>
          {status}
        </div>
        {description ? <p className="max-w-3xl text-sm leading-6 text-foreground/78 lg:text-[15px]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : null}
    </header>
  );
}
