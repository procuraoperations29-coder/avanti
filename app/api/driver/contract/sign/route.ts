import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ensureDriverContract } from '@/lib/contracts/driver-contract';

const bodySchema = z.object({ fullName: z.string().trim().min(3).max(200) });

/** Driver signs their services contract (typed full name + today's date). */
export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    if (!user.roles.includes('driver')) return NextResponse.json({ error: 'not_a_driver' }, { status: 403 });

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch {
      return NextResponse.json({ error: 'name_required', message: 'Type your full name to sign.' }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const contract = await ensureDriverContract(admin, user.id);
    if (!contract) return NextResponse.json({ error: 'no_contract', message: 'Your contract is not ready yet.' }, { status: 409 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const A = admin as any;
    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || req.headers.get('x-real-ip') || null;
    const ua = req.headers.get('user-agent') ?? null;

    const { error: sigErr } = await A.from('signatures').insert({
      contract_id: contract.id,
      signatory_id: user.id,
      signatory_role: 'driver',
      signature_ref: body.fullName,
      signature_type: 'typed_name',
      ip_address: ip,
      user_agent: ua,
    });
    if (sigErr && !String(sigErr.message ?? '').toLowerCase().includes('duplicate') && sigErr.code !== '23505') {
      return NextResponse.json({ error: 'sign_failed', message: sigErr.message }, { status: 500 });
    }
    await A.from('contracts').update({ status: 'executed', executed_at: new Date().toISOString() }).eq('id', contract.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[driver contract sign]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
