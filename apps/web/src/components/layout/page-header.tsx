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
        "grid gap-4 border-b border-border pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end",
        className
      )}
    >
      <div className="space-y-2.5">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-foreground/54">{eyebrow}</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] font-medium tracking-[-0.02em] text-foreground lg:text-[2.3rem]">{title}</h1>
          {status}
        </div>
        {description ? <p className="max-w-4xl text-[14px] leading-7 text-foreground/76 lg:text-[15px]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : null}
    </header>
  );
}
