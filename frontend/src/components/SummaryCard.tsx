import { formatCurrency } from "../utils/format";


interface SummaryCardProps {
  label: string;
  value: number;
  accent: "teal" | "amber" | "slate";
  subtitle: string;
}

export function SummaryCard({ label, value, accent, subtitle }: SummaryCardProps) {
  return (
    <article className={`summary-card summary-card-${accent}`}>
      <span className="eyebrow">{label}</span>
      <strong>{formatCurrency(value)}</strong>
      <p>{subtitle}</p>
    </article>
  );
}

