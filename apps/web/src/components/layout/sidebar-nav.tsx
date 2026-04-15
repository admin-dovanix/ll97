"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../../lib/utils";

export type SidebarItem = {
  href: string;
  label: string;
};

export function SidebarNav({
  items,
  workspaceLabel
}: {
  items: SidebarItem[];
  workspaceLabel: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="border-b border-border bg-panel lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col">
        <div className="border-b border-border px-5 py-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">AirWise</p>
          <h1 className="mt-2 text-lg font-semibold tracking-tight text-foreground">Building intelligence platform</h1>
          <p className="mt-2 text-sm text-muted-foreground">{workspaceLabel}</p>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-3 py-3 lg:flex-col lg:overflow-visible">
          {items.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/" && item.href !== "/portfolios" ? pathname.startsWith(item.href) : false);

            return (
              <Link
                key={item.href}
                className={cn(
                  "min-h-11 rounded-md border px-3 py-2 text-sm transition-colors duration-200",
                  isActive
                    ? "border-accent/30 bg-accent/10 text-foreground"
                    : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-panelAlt hover:text-foreground"
                )}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
