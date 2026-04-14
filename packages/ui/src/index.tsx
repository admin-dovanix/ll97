import type { PropsWithChildren } from "react";

export function Panel({
  title,
  children
}: PropsWithChildren<{ title: string }>) {
  return (
    <section
      style={{
        border: "1px solid rgba(128, 128, 128, 0.2)",
        borderRadius: 16,
        padding: 20,
        background: "rgba(255, 255, 255, 0.7)"
      }}
    >
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {children}
    </section>
  );
}

export function Badge({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid rgba(38, 63, 53, 0.2)",
        background: "#ebf4ef",
        color: "#1d4738",
        fontSize: 12,
        fontWeight: 600
      }}
    >
      {label}
    </span>
  );
}
