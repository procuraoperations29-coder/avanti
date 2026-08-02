import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { monthlySalaryForTier } from '@/lib/permanent/salary';
import { issueUpfrontInvoice, deriveBillingDay } from '@/lib/permanent/billing';
import type { TierLevel } from '@/components/avanti/tier-badge';

const bodySchema = z.object({
  status: z.enum(['new', 'reviewing', 'introduced', 'matched', 'closed', 'declined']),
});

function isPlacementAdmin(roles: string[]): boolean {
  return (
    roles.includes('admin_support') ||
    roles.includes('admin_verifier') ||
    roles.includes('super_admin')
  );
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ enquiryId: string }> }
) {
  try {
    const user = await requireAuthUser();
    if (!isPlacementAdmin(user.roles)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { enquiryId } = await ctx.params;

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const admin = createServiceRoleClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: enquiry, error: fetchError } = await (admin as any)
      .from('placement_enquiries')
      .select('id, driver_id, customer_user_id, preferred_start_date, status')
      .eq('id', enquiryId)
      .single();

    if (fetchError || !enquiry) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (admin as any)
      .from('placement_enquiries')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('id', enquiryId);

    if (updateError) {
      return NextResponse.json({ error: 'update_failed', message: updateError.message }, { status: 500 });
    }

    let placementCreated = false;

    // Moving an enquiry to "matched" is the moment Avanti has committed the
    // driver to this customer. Previously nothing happened here beyond the
    // status label — no engagement, no contract, nothing the driver could
    // ever see. That's the root cause of "permanent placement never shows
    // on the driver's platform." This creates the actual placement record.
    if (body.status === 'matched' && enquiry.status !== 'matched') {
      // Idempotency: if this enquiry was already converted (e.g. an admin
      // bounces it back to 'introduced' and forward again), don't duplicate.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (admin as any)
        .from('placements')
        .select('id')
        .eq('enquiry_id', enquiryId)
        .maybeSingle();

      if (!existing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: driverProfile } = await (admin as any)
          .from('driver_profiles')
          .select('verification_tier')
          .eq('id', enquiry.driver_id)
          .single();

        const tier = (driverProfile?.verification_tier as TierLevel) ?? 't1';
        const monthlySalary = monthlySalaryForTier(tier);
        const startDate = enquiry.preferred_start_date ?? new Date().toISOString().slice(0, 10);

        // Placement starts 'pending' — it only activates once the 70% upfront
        // invoice is paid (handled by the Paystack webhook).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newPlacement, error: placementError } = await (admin as any)
          .from('placements')
          .insert({
            driver_id: enquiry.driver_id,
            customer_user_id: enquiry.customer_user_id,
            enquiry_id: enquiryId,
            monthly_salary: monthlySalary,
            currency: 'NGN',
            start_date: startDate,
            billing_day: deriveBillingDay(startDate),
            status: 'pending',
          })
          .select('id')
          .single();

        if (placementError) {
          // The enquiry status update above already succeeded — don't roll
          // that back, but surface this loudly so it doesn't fail silently
          // the way the old batch bug did.
          console.error('[placement-enquiry status] failed to create placement', placementError);
          return NextResponse.json(
            {
              error: 'placement_creation_failed',
              message:
                'Enquiry was marked matched, but creating the placement record failed: ' +
                placementError.message +
                '. The driver will NOT see this on their dashboard until it is retried.',
            },
            { status: 500 }
          );
        }

        placementCreated = true;

        // Take the driver off the permanent-availability market — they're placed.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any)
          .from('driver_profiles')
          .update({ available_permanent: false })
          .eq('id', enquiry.driver_id);

        // Raise the 70% upfront invoice and email it. The placement activates
        // when it's paid (Paystack webhook). Failure here shouldn't roll back
        // the match — surface it but keep going; ops can re-issue.
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: cust } = await (admin as any)
            .from('users')
            .select('full_name, email')
            .eq('id', enquiry.customer_user_id)
            .single();
          let driverName = 'your driver';
          if (driverProfile) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: dProfile } = await (admin as any)
              .from('driver_profiles')
              .select('user_id')
              .eq('id', enquiry.driver_id)
              .single();
            if (dProfile?.user_id) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: dUser } = await (admin as any)
                .from('users')
                .select('full_name')
                .eq('id', dProfile.user_id)
                .single();
              driverName = dUser?.full_name ?? 'your driver';
            }
          }
          if (cust?.email && newPlacement) {
            await issueUpfrontInvoice(
              admin,
              {
                id: newPlacement.id,
                customer_user_id: enquiry.customer_user_id,
                monthly_salary: monthlySalary,
                currency: 'NGN',
              },
              { customerName: cust.full_name ?? 'there', customerEmail: cust.email, driverName }
            );
          }
        } catch (billingErr) {
          console.error('[placement-enquiry status] upfront invoice failed', billingErr);
        }
      }
    }

    return NextResponse.json({ ok: true, placementCreated });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[placement-enquiry status]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
