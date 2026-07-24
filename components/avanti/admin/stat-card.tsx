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
    default: 'border-line bg-paper-2',
    accent: 'border-green bg-green-soft',
    success: 'border-green bg-green-soft',
    warning: 'border-brass bg-brass-soft',
  }[tone];

  const labelToneClass = {
    default: 'text-ink-muted',
    accent: 'text-green-text',
    success: 'text-green-text',
    warning: 'text-brass-text',
  }[tone];

  return (
    <div className={`rounded-xl border p-5 ${toneClass}`}>
      <div className={`font-body text-[12px] font-medium uppercase tracking-wide ${labelToneClass}`}>
        {label}
      </div>
      <div className="mt-2 font-body text-[28px] font-medium leading-none text-ink">
        {value}
      </div>
      {subtext && (
        <div className="mt-2 font-body text-[12px] text-ink-muted">{subtext}</div>
      )}
    </div>
  );
}
