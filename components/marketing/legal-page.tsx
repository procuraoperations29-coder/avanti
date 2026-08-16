import { getAuthUser } from '@/lib/auth';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

export interface LegalSection { heading: string; paragraphs: string[]; bullets?: string[] }

/**
 * Shared layout for public legal/policy pages (terms, privacy, cookies).
 * Editorial paper/ink theme, marketing chrome.
 */
export async function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  const user = await getAuthUser();
  return (
    <div className="min-h-dvh bg-paper">
      <SiteHeader isSignedIn={Boolean(user)} />
      <main className="mx-auto max-w-3xl px-6 pt-12 pb-20">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">{title}</h1>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">Last updated · {updated}</p>
        <p className="mt-6 font-body text-base leading-relaxed text-ink-muted">{intro}</p>

        <div className="mt-10 space-y-8">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="font-display text-xl font-semibold tracking-tight text-ink">{i + 1}. {s.heading}</h2>
              {s.paragraphs.map((p, j) => (
                <p key={j} className="mt-3 font-body text-[15px] leading-relaxed text-ink">{p}</p>
              ))}
              {s.bullets && s.bullets.length > 0 && (
                <ul className="mt-3 space-y-1.5 pl-5">
                  {s.bullets.map((b, k) => (
                    <li key={k} className="list-disc font-body text-[15px] leading-relaxed text-ink">{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-line pt-6 font-body text-[13px] text-ink-muted">
          This document is provided for transparency and does not constitute legal advice. For questions, contact us using the details above.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
