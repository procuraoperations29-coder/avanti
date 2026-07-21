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
    accent: 'border-admin-green bg-admin-green-soft',
    success: 'border-admin-green bg-admin-green-soft',
    warning: 'border-admin-amber bg-admin-amber-soft',
  }[tone];

  const labelToneClass = {
    default: 'text-admin-text-muted',
    accent: 'text-admin-green-text',
    success: 'text-admin-green-text',
    warning: 'text-admin-amber-text',
  }[tone];

  return (
    <div className={`rounded-xl border p-5 ${toneClass}`}>
      <div className={`font-body text-[12px] font-medium uppercase tracking-wide ${labelToneClass}`}>
        {label}
      </div>
      <div className="mt-2 font-body text-[28px] font-medium leading-none text-admin-text">
        {value}
      </div>
      {subtext && (
        <div className="mt-2 font-body text-[12px] text-admin-text-muted">{subtext}</div>
      )}
    </div>
  );
}
