import type { PropsWithChildren, ReactNode } from "react";
import Link from "next/link";
import { DevSessionBadge } from "./dev-session-badge";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/portfolios", label: "Portfolios" },
  { href: "/commands", label: "Commands" }
];

export function PageShell({
  title,
  eyebrow,
  children,
  aside
}: PropsWithChildren<{
  title: string;
  eyebrow: string;
  aside?: ReactNode;
}>) {
  return (
    <main>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gap: 24
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 24
          }}
        >
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 style={{ margin: 0, fontSize: 40 }}>{title}</h1>
            <nav style={{ display: "flex", gap: 14, marginTop: 16, flexWrap: "wrap" }}>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(22, 50, 39, 0.12)",
                    background: "rgba(255, 255, 255, 0.72)"
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
            <DevSessionBadge />
            {aside}
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
