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
 * Pure presentational component (no hooks), so it renders fine as a
 * Server Component child — no "use client" needed.
 */
export function RevenueChart({ data }: { data: MonthPoint[] }) {
  const width = 600;
  const height = 220;
  const padTop = 12;
  const padBottom = 26;
  const padLeft = 44;
  const padRight = 8;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const allValues = data.flatMap((d) => [d.revenue, d.payouts, d.net]);
  const domainMax = Math.max(...allValues, 1) * 1.15;
  const domainMin = Math.min(0, ...allValues);
  const span = domainMax - domainMin || 1;

  const y = (v: number) => padTop + chartH * (1 - (v - domainMin) / span);
  const zeroY = y(0);

  const groupW = chartW / data.length;
  const barW = Math.min(20, groupW * 0.28);
  const barGap = 4;

  const linePoints = data
    .map((d, i) => {
      const cx = padLeft + groupW * i + groupW / 2;
      return `${cx},${y(d.net)}`;
    })
    .join(' ');

  const yTicks = [domainMin, domainMin + span / 2, domainMax];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height: 220 }}
      role="img"
      aria-label="Chart of monthly revenue, payouts, and net balance"
    >
      <title>Revenue vs payouts, last 6 months</title>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={padLeft}
            x2={width - padRight}
            y1={y(t)}
            y2={y(t)}
            stroke="rgb(var(--line))"
            strokeWidth={1}
          />
          <text x={padLeft - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="rgb(var(--ink-muted))">
            {formatCompactNaira(t)}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const cx = padLeft + groupW * i + groupW / 2;
        const revH = Math.abs(y(d.revenue) - zeroY);
        const payH = Math.abs(y(d.payouts) - zeroY);
        return (
          <g key={d.label}>
            <rect
              x={cx - barW - barGap / 2}
              y={Math.min(y(d.revenue), zeroY)}
              width={barW}
              height={revH}
              rx={3}
              fill="rgb(var(--green))"
            />
            <rect
              x={cx + barGap / 2}
              y={Math.min(y(d.payouts), zeroY)}
              width={barW}
              height={payH}
              rx={3}
              fill="rgb(var(--brass))"
            />
            <text
              x={cx}
              y={height - 6}
              textAnchor="middle"
              fontSize={10}
              fill="rgb(var(--ink-muted))"
            >
              {d.label}
            </text>
          </g>
        );
      })}

      <polyline points={linePoints} fill="none" stroke="rgb(var(--ink))" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => {
        const cx = padLeft + groupW * i + groupW / 2;
        return <circle key={i} cx={cx} cy={y(d.net)} r={3} fill="rgb(var(--ink))" />;
      })}
    </svg>
  );
}
