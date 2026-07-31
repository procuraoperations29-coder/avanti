export function StatCard({
  label,
  value,
  subtext,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  subtext?: string;
  tone?: 'default' | 'accent' | 'success' | 'warning';
}) {
  const toneClass = {
    default: 'border-admin-border bg-admin-card',
    accent: 'border-admin-green/30 bg-admin-green-soft',
    success: 'border-admin-green/30 bg-admin-green-soft',
    warning: 'border-admin-amber/30 bg-admin-amber-soft',
  }[tone];

  const labelToneClass = {
    default: 'text-admin-text-muted',
    accent: 'text-admin-green-text',
    success: 'text-admin-green-text',
    warning: 'text-admin-amber-text',
  }[tone];

  return (
    <div className={`rounded-2xl border p-5 shadow-admin-sm ${toneClass}`}>
      <div className={`font-body text-[12px] font-medium ${labelToneClass}`}>{label}</div>
      <div className="mt-2 font-display text-[28px] font-semibold leading-none tabular-nums tracking-tight text-admin-text">
        {value}
      </div>
      {subtext && <div className="mt-2 font-body text-[12px] text-admin-text-muted">{subtext}</div>}
    </div>
  );
}
