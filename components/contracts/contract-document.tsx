import type { ContractTerms } from '@/lib/contracts/generate';

/**
 * Presentational contract document — renders the stored `terms` as a clean,
 * printable-looking document. Theme-neutral (white paper) so it reads the same
 * in the customer (fintech) and driver (editorial) areas.
 */
export function ContractDocument({
  terms,
  signature,
}: {
  terms: ContractTerms;
  signature?: { name: string; date: string } | null;
}) {
  const generated = new Date(terms.generatedAt);
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e3e6ea] bg-white text-[#1f2430] shadow-sm">
      <div className="border-b border-[#e3e6ea] px-6 py-5 md:px-8">
        <h1 className="font-display text-xl font-semibold tracking-tight md:text-2xl">{terms.title}</h1>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-[#8a93a3]">
          Ref {terms.reference} · {Number.isNaN(generated.getTime()) ? '' : generated.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="px-6 py-6 md:px-8">
        <p className="font-body text-[13px] leading-relaxed text-[#3a4150]">{terms.intro}</p>

        {terms.summary.length > 0 && (
          <div className="mt-5 overflow-hidden rounded-xl border border-[#eceef1]">
            {terms.summary.map((s, i) => (
              <div key={i} className="flex justify-between gap-4 border-b border-[#eceef1] px-4 py-2 last:border-0">
                <span className="font-body text-[12px] text-[#8a93a3]">{s.label}</span>
                <span className="text-right font-body text-[13px] font-medium text-[#1f2430]">{s.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {terms.sections.map((sec, i) => (
            <div key={i}>
              <h2 className="font-body text-[13px] font-semibold text-[#1f2430]">{sec.heading}</h2>
              <p className="mt-1 font-body text-[12.5px] leading-relaxed text-[#3a4150]">{sec.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 font-body text-[12px] italic text-[#8a93a3]">{terms.jurisdictionNote}</p>

        {signature && (
          <div className="mt-6 rounded-xl border border-[#d7efe0] bg-[#f2fbf6] px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[#2f855a]">Signed electronically</div>
            <div className="mt-1 font-body text-[13px] text-[#1f2430]">
              {signature.name} · {signature.date}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
