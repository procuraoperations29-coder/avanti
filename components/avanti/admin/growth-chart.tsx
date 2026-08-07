interface Point {
  label: string;
  value: number; // new in period
  cumulative: number;
}

/**
 * Small server-rendered SVG chart: emerald bars for new-per-period, a soft line
 * for the cumulative total (its own scale). Fintech skin, theme-aware via tokens.
 */
export function GrowthChart({ data }: { data: Point[] }) {
  const W = 720;
  const H = 240;
  const padX = 16;
  const padTop = 16;
  const padBottom = 28;
  const n = Math.max(1, data.length);
  const maxVal = Math.max(1, ...data.map((d) => d.value));
  const maxCum = Math.max(1, ...data.map((d) => d.cumulative));
  const plotH = H - padTop - padBottom;
  const slot = (W - padX * 2) / n;
  const barW = Math.min(46, slot * 0.55);

  const barY = (v: number) => padTop + plotH - (v / maxVal) * plotH;
  const cumY = (v: number) => padTop + plotH - (v / maxCum) * plotH;
  const cx = (i: number) => padX + slot * i + slot / 2;

  const linePts = data.map((d, i) => `${cx(i)},${cumY(d.cumulative)}`).join(' ');

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="User growth over time" className="min-w-[520px]">
        {/* baseline */}
        <line x1={padX} y1={padTop + plotH} x2={W - padX} y2={padTop + plotH} strokeWidth="1" style={{ stroke: 'rgb(var(--admin-border))' }} />
        {/* bars */}
        {data.map((d, i) => {
          const h = padTop + plotH - barY(d.value);
          return (
            <g key={d.label}>
              <rect x={cx(i) - barW / 2} y={barY(d.value)} width={barW} height={Math.max(0, h)} rx="5" opacity="0.85" style={{ fill: 'rgb(var(--admin-green))' }} />
              {d.value > 0 && (
                <text x={cx(i)} y={barY(d.value) - 5} textAnchor="middle" fontSize="11" fontWeight="600" style={{ fill: 'rgb(var(--admin-text))' }}>{d.value}</text>
              )}
              <text x={cx(i)} y={H - 9} textAnchor="middle" fontSize="10.5" style={{ fill: 'rgb(var(--admin-text-muted))' }}>{d.label}</text>
            </g>
          );
        })}
        {/* cumulative line */}
        {data.length > 1 && (
          <polyline points={linePts} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" style={{ fill: 'none', stroke: 'rgb(var(--admin-navy))' }} />
        )}
        {data.map((d, i) => (
          <circle key={`c${d.label}`} cx={cx(i)} cy={cumY(d.cumulative)} r="2.5" opacity="0.7" style={{ fill: 'rgb(var(--admin-navy))' }} />
        ))}
      </svg>
      <div className="mt-2 flex items-center gap-4 font-body text-[11px] text-admin-text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-admin-green" /> New per period</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-admin-navy" /> Cumulative</span>
      </div>
    </div>
  );
}
