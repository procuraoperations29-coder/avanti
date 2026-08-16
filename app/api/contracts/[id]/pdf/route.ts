import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { renderContractPdf, type PdfSignatory } from '@/lib/contracts/pdf';
import type { ContractTerms } from '@/lib/contracts/generate';

export const runtime = 'nodejs';

const ADMIN_ROLES = ['admin_support', 'admin_finance', 'admin_compliance', 'admin_verifier', 'super_admin'];

/**
 * GET /api/contracts/[id]/pdf — download a contract as a PDF. Allowed for the
 * contract's customer (via its engagement), the subject driver, or an admin.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthUser();
    const { id } = await ctx.params;

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const A = admin as any;
    const { data: c } = await A.from('contracts')
      .select('id, terms, engagement_id, subject_user_id')
      .eq('id', id)
      .single();
    if (!c) return new Response('Not found', { status: 404 });

    // Authorize.
    const isAdmin = user.roles.some((r) => ADMIN_ROLES.includes(r));
    let allowed = isAdmin || c.subject_user_id === user.id;
    if (!allowed && c.engagement_id) {
      const { data: eng } = await A.from('engagements').select('customer_user_id').eq('id', c.engagement_id).single();
      allowed = eng?.customer_user_id === user.id;
    }
    if (!allowed) return new Response('Forbidden', { status: 403 });

    const { data: sigs } = await A.from('signatures')
      .select('signatory_role, signature_ref, signed_at')
      .eq('contract_id', id)
      .order('signed_at', { ascending: true });
    const signatories: PdfSignatory[] = (sigs ?? []).map((sg: { signatory_role: string; signature_ref: string; signed_at: string }) => ({
      role: sg.signatory_role,
      name: sg.signature_ref,
      date: new Date(sg.signed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    }));

    const terms = c.terms as ContractTerms;
    const pdf = await renderContractPdf(terms, signatories);
    const filename = `Avanti-Agreement-${terms.reference ?? id.slice(0, 8)}.pdf`;

    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return new Response('Unauthorized', { status: err.status });
    console.error('[contract pdf]', err);
    return new Response('Error generating PDF', { status: 500 });
  }
}
