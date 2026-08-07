interface MonthPoint {
  label: string;
  revenue: number;
  payouts: number;
  net: number;
}

function formatCompactNaira(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}₦${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}₦${(abs / 1_000).toFixed(0)}K`;
  return `${sign}₦${abs.toFixed(0)}`;
}

/**
 * RevenueChart — plain SVG bar + line combo, no charting library.
 *
 * Colours come from `--admin-*` tokens and are applied via inline `style` (the
 * CSS fill/stroke/stop-color property), NOT presentation attributes — Safari
 * doesn't resolve `var()` inside SVG attributes.
 */
export function RevenueChart({ data }: { data: MonthPoint[] }) {
  const width = 620;
  const height = 240;
  const padTop = 16;
  const padBottom = 28;
  const padLeft = 46;
  const padRight = 10;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const allValues = data.flatMap((d) => [d.revenue, d.payouts, d.net]);
  const domainMax = Math.max(...allValues, 1) * 1.15;
  const domainMin = Math.min(0, ...allValues);
  const span = domainMax - domainMin || 1;

  const y = (v: number) => padTop + chartH * (1 - (v - domainMin) / span);
  const zeroY = y(0);

  const groupW = chartW / data.length;
  const barW = Math.min(18, groupW * 0.26);
  const barGap = 5;

  const netPts = data.map((d, i) => ({ x: padLeft + groupW * i + groupW / 2, yv: y(d.net) }));
  const linePoints = netPts.map((p) => `${p.x},${p.yv}`).join(' ');
  const first = netPts[0];
  const last = netPts[netPts.length - 1];
  const areaPoints = first && last ? `${first.x},${zeroY} ${linePoints} ${last.x},${zeroY}` : '';

  const yTicks = [domainMin, domainMin + span / 2, domainMax];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height: 240 }}
      role="img"
      aria-label="Chart of monthly revenue, payouts, and net balance"
    >
      <title>Revenue vs payouts, last 6 months</title>
      <defs>
        <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'rgb(var(--admin-green))', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: 'rgb(var(--admin-green))', stopOpacity: 0.55 }} />
        </linearGradient>
        <linearGradient id="pay-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'rgb(var(--admin-amber))', stopOpacity: 0.95 }} />
          <stop offset="100%" style={{ stopColor: 'rgb(var(--admin-amber))', stopOpacity: 0.5 }} />
        </linearGradient>
        <linearGradient id="net-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'rgb(var(--admin-text))', stopOpacity: 0.12 }} />
          <stop offset="100%" style={{ stopColor: 'rgb(var(--admin-text))', stopOpacity: 0 }} />
        </linearGradient>
      </defs>

      {/* Gridlines */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={padLeft} x2={width - padRight} y1={y(t)} y2={y(t)} style={{ stroke: 'rgb(var(--admin-border))' }} strokeWidth={1} strokeDasharray={i === 0 ? '0' : '3 4'} />
          <text x={padLeft - 10} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={10} fontWeight={500} style={{ fill: 'rgb(var(--admin-text-muted))' }}>
            {formatCompactNaira(t)}
          </text>
        </g>
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const cx = padLeft + groupW * i + groupW / 2;
        const revH = Math.abs(y(d.revenue) - zeroY);
        const payH = Math.abs(y(d.payouts) - zeroY);
        return (
          <g key={d.label}>
            <rect x={cx - barW - barGap / 2} y={Math.min(y(d.revenue), zeroY)} width={barW} height={revH} rx={4} fill="url(#rev-grad)" />
            <rect x={cx + barGap / 2} y={Math.min(y(d.payouts), zeroY)} width={barW} height={payH} rx={4} fill="url(#pay-grad)" />
            <text x={cx} y={height - 8} textAnchor="middle" fontSize={10} fontWeight={500} style={{ fill: 'rgb(var(--admin-text-muted))' }}>
              {d.label}
            </text>
          </g>
        );
      })}

      {/* Net line + soft area */}
      {areaPoints && <polygon points={areaPoints} fill="url(#net-area)" />}
      <polyline points={linePoints} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" style={{ fill: 'none', stroke: 'rgb(var(--admin-text))' }} />
      {netPts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.yv} r={4.5} style={{ fill: 'rgb(var(--admin-card))' }} />
          <circle cx={p.x} cy={p.yv} r={3} strokeWidth={1} style={{ fill: 'rgb(var(--admin-text))', stroke: 'rgb(var(--admin-card))' }} />
        </g>
      ))}
    </svg>
  );
}
