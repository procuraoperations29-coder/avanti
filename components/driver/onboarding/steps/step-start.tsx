import { SectionLabel } from '@/components/avanti/section-label';
import { StampBadge } from '@/components/avanti/stamp-badge';
import { Shield, IdCard, CarFront, Landmark, ArrowRight } from 'lucide-react';
import type { StepProps } from '../wizard';

export function StepStart(_: StepProps) {
  return (
    <div className="space-y-6">
      <p className="font-body leading-relaxed text-ink">
        You&apos;re about to submit for verification. We&apos;ll ask for a government ID, your
        driver&apos;s licence, proof of address, and consent to run a background check. It takes
        about ten minutes if you have your documents handy.
      </p>

      <div>
        <SectionLabel>What we&apos;ll ask for</SectionLabel>
        <ul className="mt-3 space-y-2">
          <Item Icon={IdCard} label="Government ID (front, back, and a selfie holding it)" />
          <Item Icon={CarFront} label="Driver's licence, front and back" />
          <Item Icon={Landmark} label="Proof of address (utility bill or bank statement)" />
          <Item Icon={Shield} label="Consent for a background check" />
        </ul>
      </div>

      <div>
        <SectionLabel>What happens next</SectionLabel>
        <p className="mt-2 font-body text-sm text-ink-muted">
          After you submit, we review your documents (typically within one business day). Once
          verified, your tier is set based on what we could confirm.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StampBadge label="Identity verified" size="sm" />
          <StampBadge label="Background checked" size="sm" />
          <StampBadge label="Executive tier eligible" size="sm" />
        </div>
      </div>

      <div className="border-l-2 border-brass bg-brass-soft px-4 py-3">
        <p className="font-body text-sm text-ink">
          <span className="font-mono text-xs uppercase tracking-wider">Heads up</span> — you can
          leave at any point. Progress is saved after every step.
        </p>
      </div>
    </div>
  );
}

function Item({ Icon, label }: { Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string }) {
  return (
    <li className="flex items-start gap-3 border-b border-line pb-2">
      <Icon className="mt-0.5 h-4 w-4 text-ink-muted" strokeWidth={1.5} />
      <span className="font-body text-sm text-ink">{label}</span>
      <ArrowRight className="ml-auto mt-0.5 h-3.5 w-3.5 text-ink-faint" />
    </li>
  );
}
