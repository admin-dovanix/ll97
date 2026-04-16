"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../../lib/utils";

export type SidebarItem = {
  href: string;
  label: string;
  section: string;
};

export function SidebarNav({
  items,
  workspaceLabel
}: {
  items: SidebarItem[];
  workspaceLabel: string;
}) {
  const pathname = usePathname();
  const sections = items.reduce<Record<string, SidebarItem[]>>((groups, item) => {
    groups[item.section] = groups[item.section] ?? [];
    groups[item.section].push(item);
    return groups;
  }, {});

  return (
    <aside className="border-b border-[hsl(var(--sidebar-border))] bg-sidebar text-sidebarForeground lg:fixed lg:inset-y-0 lg:left-0 lg:w-[220px] lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col">
        <div className="border-b border-[hsl(var(--sidebar-border))] px-6 py-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-sidebarForeground/38">AirWise</p>
          <h1 className="mt-5 text-[15px] font-medium tracking-[-0.02em] text-sidebarForeground/94">
            Building intelligence platform
          </h1>
          <p className="mt-2 text-[13px] text-sidebarForeground/50">{workspaceLabel}</p>
        </div>
        <nav className="flex flex-col gap-1 overflow-x-auto px-0 py-4 lg:overflow-visible">
          {Object.entries(sections).map(([section, sectionItems]) => (
            <div key={section} className="px-0 py-2">
              <p className="px-6 pb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-sidebarForeground/28">
                {section}
              </p>
              <div className="grid gap-0.5">
                {sectionItems.map((item) => {
                  const buildingSection = item.href.startsWith("/buildings/") ? item.href.split("/").at(-1) : null;
                  const isActive = buildingSection
                    ? pathname.endsWith(`/${buildingSection}`)
                    : pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      className={cn(
                        "flex min-h-10 items-center gap-3 border-l-2 px-6 py-2 text-[13px] font-normal transition-colors duration-150",
                        isActive
                          ? "border-sidebarActive bg-white/8 text-sidebarForeground"
                          : "border-transparent text-sidebarForeground/58 hover:bg-white/4 hover:text-sidebarForeground/84"
                      )}
                      href={item.href}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
