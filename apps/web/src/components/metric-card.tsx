export function MetricCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article
      style={{
        border: "1px solid rgba(22, 50, 39, 0.12)",
        borderRadius: 18,
        padding: 18,
        background: "rgba(255, 255, 255, 0.78)"
      }}
    >
      <p className="eyebrow" style={{ marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>{value}</p>
      <p className="muted" style={{ marginBottom: 0 }}>
        {detail}
      </p>
    </article>
  );
}
