import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * PATCH /api/admin/drivers/[id] — driver-level controls (id is a
 * driver_profiles.id). Suspend/unsuspend keeps a driver on the platform but
 * off the bookable pool. Verifier / support / super only.
 *
 * update_details lets an admin correct a driver's onboarding info (identity,
 * licence, address, experience, payout) plus their user-level contact
 * fields (full_name, email, phone). Onboarding data lives in
 * driver_profiles.onboarding_state (jsonb), so we merge each provided
 * section into the existing state rather than overwriting the whole blob.
 */
const identitySchema = z.object({
  legal_name: z.string().max(200),
  date_of_birth: z.string().max(32),
  gender: z.string().max(32),
  id_type: z.string().max(64),
  id_number: z.string().max(64),
}).partial();

const licenceSchema = z.object({
  licence_number: z.string().max(64),
  licence_class: z.string().max(32),
  issue_date: z.string().max(32),
  expiry_date: z.string().max(32),
}).partial();

const addressSchema = z.object({
  street_address: z.string().max(300),
  city: z.string().max(120),
  state: z.string().max(120),
  landmark: z.string().max(300),
}).partial();

const payoutSchema = z.object({
  bank_name: z.string().max(120),
  account_number: z.string().max(32),
  account_holder_name: z.string().max(200),
}).partial();

const experienceSchema = z.object({
  years_experience: z.number().min(0).max(80),
  service_radius_km: z.number().min(0).max(1000),
  can_drive_at_night: z.boolean(),
  has_smartphone: z.boolean(),
  vehicle_classes: z.array(z.string().max(64)),
  transmission_experience: z.array(z.string().max(64)),
  languages: z.array(z.string().max(64)),
}).partial();

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('suspend'), reason: z.string().max(500).optional() }),
  z.object({ action: z.literal('unsuspend') }),
  z.object({
    action: z.literal('update_details'),
    full_name: z.string().min(1).max(200).optional(),
    email: z.union([z.string().email(), z.literal('')]).optional(),
    phone: z.string().max(32).optional(),
    identity: identitySchema.optional(),
    licence: licenceSchema.optional(),
    address: addressSchema.optional(),
    payout: payoutSchema.optional(),
    experience: experienceSchema.optional(),
  }),
]);

function canAct(roles: string[]): boolean {
  return roles.includes('admin_verifier') || roles.includes('admin_support') || roles.includes('super_admin');
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthUser();
    if (!canAct(user.roles)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const { id } = await ctx.params;

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const A = admin as any;
    const now = new Date().toISOString();

    if (body.action === 'update_details') {
      const { data: driver } = await A.from('driver_profiles').select('id, user_id, onboarding_state').eq('id', id).single();
      if (!driver) return NextResponse.json({ error: 'not_found' }, { status: 404 });

      // Merge each provided section into the existing onboarding_state
      // rather than replacing the whole jsonb blob.
      const state = (driver.onboarding_state ?? {}) as Record<string, unknown>;
      const sections = ['identity', 'licence', 'address', 'payout', 'experience'] as const;
      const nextState = { ...state };
      let stateChanged = false;
      for (const section of sections) {
        const patch = body[section];
        if (patch && Object.keys(patch).length > 0) {
          nextState[section] = { ...(state[section] as Record<string, unknown> | undefined ?? {}), ...patch };
          stateChanged = true;
        }
      }

      if (stateChanged) {
        const { error } = await A.from('driver_profiles').update({ onboarding_state: nextState, updated_at: now }).eq('id', id);
        if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
      }

      const userUpdate: Record<string, unknown> = {};
      if (body.full_name !== undefined) userUpdate.full_name = body.full_name;
      if (body.email !== undefined) userUpdate.email = body.email || null;
      if (body.phone !== undefined) userUpdate.phone = body.phone || null;
      if (Object.keys(userUpdate).length > 0) {
        userUpdate.updated_at = now;
        const { error } = await A.from('users').update(userUpdate).eq('id', driver.user_id);
        if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
      }

      // Also update driver_profiles columns for experience data (so quote matching sees it)
      const driverColumnsUpdate: Record<string, unknown> = { updated_at: now };
      if (body.experience) {
        if (body.experience.vehicle_classes !== undefined) driverColumnsUpdate.vehicle_class_experience = body.experience.vehicle_classes;
        if (body.experience.transmission_experience !== undefined) driverColumnsUpdate.transmission_experience = body.experience.transmission_experience;
        if (body.experience.languages !== undefined) driverColumnsUpdate.languages = body.experience.languages;
        if (body.experience.years_experience !== undefined) driverColumnsUpdate.years_experience = body.experience.years_experience;
        if (body.experience.service_radius_km !== undefined) driverColumnsUpdate.service_radius_km = body.experience.service_radius_km;
      }
      if (Object.keys(driverColumnsUpdate).length > 1) {
        const { error } = await A.from('driver_profiles').update(driverColumnsUpdate).eq('id', id);
        if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
      }

      try {
        await A.from('audit_logs').insert({
          actor_user_id: user.id, actor_role: user.activeRole, entity_type: 'driver_profiles', entity_id: id,
          action: 'update', metadata: { control: 'update_details', sections: sections.filter((s) => body[s]), user_fields: Object.keys(userUpdate).filter((k) => k !== 'updated_at') },
        });
      } catch { /* best-effort */ }

      return NextResponse.json({ ok: true });
    }

    const update = body.action === 'suspend'
      ? { suspended: true, suspended_reason: body.reason ?? null, updated_at: now }
      : { suspended: false, suspended_reason: null, suspended_until: null, updated_at: now };

    const { error } = await A.from('driver_profiles').update(update).eq('id', id);
    if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });

    try {
      await A.from('audit_logs').insert({
        actor_user_id: user.id, actor_role: user.activeRole, entity_type: 'driver_profiles', entity_id: id,
        action: 'update', metadata: { control: body.action, ...('reason' in body && body.reason ? { reason: body.reason } : {}) },
      });
    } catch { /* best-effort */ }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[admin drivers PATCH]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
