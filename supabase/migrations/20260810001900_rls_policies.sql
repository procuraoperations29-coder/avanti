-- ============================================================================
-- Row-Level Security
--
-- Phase 4 §4.2 helper functions.
-- Phase 3 §22 policies.
--
-- The invariant to preserve: server-side permission checks (Phase 4 §11) MUST
-- have a matching RLS policy here. If they diverge, we have a bypass path.
-- ============================================================================

-- ---- JWT claim helpers ---------------------------------------------------

create or replace function auth_role_has(needle text) returns boolean
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' -> 'roles' ? needle, false);
$$;

create or replace function auth_active_org_id() returns uuid
language sql stable as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'active_organization_id', '')::uuid;
$$;

create or replace function auth_aal() returns text
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'aal', 'aal1');
$$;

create or replace function auth_is_admin() returns boolean
language sql stable as $$
  select auth_role_has('admin_support')
      or auth_role_has('admin_verifier')
      or auth_role_has('admin_finance')
      or auth_role_has('admin_compliance')
      or auth_role_has('super_admin');
$$;

-- ---- Enable RLS on every application table -------------------------------

-- ---- Enable RLS on every application table -------------------------------
-- We filter to tables we own — PostGIS's spatial_ref_sys lives in public
-- but is owned by supabase_admin; touching it errors.

do $$
declare r record;
begin
  for r in
    select tablename from pg_tables
     where schemaname = 'public'
       and tableowner = current_user
       and tablename not in ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
  loop
    execute format('alter table public.%I enable row level security;', r.tablename);
  end loop;
end $$;

-- ---- Users --------------------------------------------------------------

create policy users_self_select on users for select
  using (id = auth.uid() or auth_is_admin());

create policy users_self_update on users for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy users_admin_update on users for update
  using (auth_role_has('admin_support') or auth_role_has('admin_compliance') or auth_role_has('super_admin'));

-- ---- Organizations ------------------------------------------------------

create policy organizations_member_select on organizations for select
  using (
    id = auth_active_org_id()
    or exists (
      select 1 from user_roles ur
       where ur.user_id = auth.uid()
         and ur.organization_id = organizations.id
         and ur.revoked_at is null
    )
    or auth_is_admin()
  );

create policy organizations_admin_write on organizations for all
  using (
    (auth_role_has('corporate_admin') and id = auth_active_org_id())
    or auth_role_has('admin_compliance') or auth_role_has('super_admin')
  );

-- ---- user_roles ----------------------------------------------------------

create policy user_roles_self_select on user_roles for select
  using (user_id = auth.uid() or auth_is_admin());

create policy user_roles_admin_write on user_roles for all
  using (auth_role_has('super_admin') or auth_role_has('admin_support'))
  with check (auth_role_has('super_admin') or auth_role_has('admin_support'));

-- ---- Customer profiles --------------------------------------------------

create policy customer_profiles_self on customer_profiles for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy customer_profiles_admin_select on customer_profiles for select
  using (auth_is_admin());

-- ---- Driver profiles ----------------------------------------------------

-- Public read of *approved, non-suspended* drivers for search.
create policy driver_profiles_public_read on driver_profiles for select
  using (
    verification_tier in ('t2','t3','t4')
    and not suspended
    and deleted_at is null
  );

create policy driver_profiles_self on driver_profiles for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy driver_profiles_admin_all on driver_profiles for all
  using (auth_is_admin());

-- ---- Availability & blackouts --------------------------------------------

create policy availability_self on driver_availabilities for all
  using (exists (select 1 from driver_profiles dp where dp.id = driver_id and dp.user_id = auth.uid()))
  with check (exists (select 1 from driver_profiles dp where dp.id = driver_id and dp.user_id = auth.uid()));

create policy availability_public_read on driver_availabilities for select
  using (true);

create policy blackouts_self on driver_blackouts for all
  using (exists (select 1 from driver_profiles dp where dp.id = driver_id and dp.user_id = auth.uid()))
  with check (exists (select 1 from driver_profiles dp where dp.id = driver_id and dp.user_id = auth.uid()));

create policy blackouts_admin_read on driver_blackouts for select using (auth_is_admin());

-- ---- Payout methods — driver-scoped, admin_finance can read for support --

create policy payout_methods_self on driver_payout_methods for all
  using (exists (select 1 from driver_profiles dp where dp.id = driver_id and dp.user_id = auth.uid()))
  with check (exists (select 1 from driver_profiles dp where dp.id = driver_id and dp.user_id = auth.uid()));

create policy payout_methods_finance_select on driver_payout_methods for select
  using (auth_role_has('admin_finance') or auth_role_has('super_admin'));

-- ---- Vehicles ------------------------------------------------------------

create policy vehicles_owner on customer_vehicles for all
  using (owner_user_id = auth.uid()
         or (owner_organization_id is not null and owner_organization_id = auth_active_org_id()))
  with check (owner_user_id = auth.uid()
              or (owner_organization_id is not null and owner_organization_id = auth_active_org_id()));

create policy vehicles_admin_select on customer_vehicles for select using (auth_is_admin());

-- ---- Documents ----------------------------------------------------------

create policy documents_owner on documents for all
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy documents_verifier_select on documents for select
  using (auth_role_has('admin_verifier') or auth_role_has('super_admin')
         or auth_role_has('admin_compliance'));

-- ---- Verification events -------------------------------------------------

create policy verification_events_driver_select on verification_events for select
  using (exists (
    select 1 from driver_profiles dp
     where dp.id = driver_id and dp.user_id = auth.uid()
  ));

create policy verification_events_verifier_select on verification_events for select
  using (auth_role_has('admin_verifier') or auth_role_has('admin_compliance')
         or auth_role_has('super_admin'));

create policy verification_events_verifier_insert on verification_events for insert
  with check (auth_role_has('admin_verifier') or auth_role_has('super_admin'));

-- ---- Pricing ------------------------------------------------------------

create policy rate_cards_public_read_published on rate_cards for select
  using (status = 'published' or auth_is_admin());

create policy rate_cards_finance_write on rate_cards for all
  using (auth_role_has('admin_finance') or auth_role_has('super_admin'))
  with check (auth_role_has('admin_finance') or auth_role_has('super_admin'));

create policy price_rules_finance_write on price_rules for all
  using (auth_role_has('admin_finance') or auth_role_has('super_admin'))
  with check (auth_role_has('admin_finance') or auth_role_has('super_admin'));

create policy price_rules_public_read on price_rules for select
  using (exists (select 1 from rate_cards rc where rc.id = rate_card_id
                   and (rc.status = 'published' or auth_is_admin())));

create policy tax_rules_public_read on tax_rules for select
  using (status = 'published' or auth_is_admin());

create policy tax_rules_finance_write on tax_rules for all
  using (auth_role_has('admin_finance') or auth_role_has('super_admin'))
  with check (auth_role_has('admin_finance') or auth_role_has('super_admin'));

-- Price quotes — visible to requester, driver quoted for, and admin
create policy price_quotes_requester_select on price_quotes for select
  using (requested_by_user_id = auth.uid()
         or (driver_id is not null and exists (
              select 1 from driver_profiles dp where dp.id = driver_id and dp.user_id = auth.uid()
            ))
         or auth_is_admin());

-- ---- Engagements ---------------------------------------------------------

create policy engagements_customer_select on engagements for select
  using (
    customer_user_id = auth.uid()
    or (customer_organization_id is not null and customer_organization_id = auth_active_org_id())
    or auth_is_admin()
    or (driver_id is not null and exists (
      select 1 from driver_profiles dp where dp.id = driver_id and dp.user_id = auth.uid()
    ))
  );

create policy engagements_customer_write on engagements for insert
  with check (
    customer_user_id = auth.uid()
    or (customer_organization_id is not null and customer_organization_id = auth_active_org_id())
  );

create policy engagements_customer_update on engagements for update
  using (
    customer_user_id = auth.uid()
    or (customer_organization_id is not null and customer_organization_id = auth_active_org_id())
    or auth_is_admin()
    or (driver_id is not null and exists (
      select 1 from driver_profiles dp where dp.id = driver_id and dp.user_id = auth.uid()
    ))
  );

create policy engagement_status_transitions_read on engagement_status_transitions for select
  using (exists (
    select 1 from engagements e where e.id = engagement_id
      and (
        e.customer_user_id = auth.uid()
        or (e.customer_organization_id is not null and e.customer_organization_id = auth_active_org_id())
        or auth_is_admin()
        or (e.driver_id is not null and exists (
          select 1 from driver_profiles dp where dp.id = e.driver_id and dp.user_id = auth.uid()
        ))
      )
  ));

create policy work_sessions_scoped on work_sessions for all
  using (exists (
    select 1 from engagements e where e.id = engagement_id
      and (
        e.customer_user_id = auth.uid()
        or (e.customer_organization_id is not null and e.customer_organization_id = auth_active_org_id())
        or auth_is_admin()
        or exists (select 1 from driver_profiles dp where dp.id = e.driver_id and dp.user_id = auth.uid())
      )
  ));

create policy engagement_insurance_scoped on engagement_insurance for all
  using (exists (
    select 1 from engagements e where e.id = engagement_id
      and (
        e.customer_user_id = auth.uid()
        or (e.customer_organization_id is not null and e.customer_organization_id = auth_active_org_id())
        or auth_is_admin()
      )
  ));

create policy favourite_drivers_self on favourite_drivers for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- Contracts + signatures ---------------------------------------------

create policy contracts_scoped_select on contracts for select
  using (exists (
    select 1 from engagements e where e.id = engagement_id
      and (
        e.customer_user_id = auth.uid()
        or (e.customer_organization_id is not null and e.customer_organization_id = auth_active_org_id())
        or auth_is_admin()
        or exists (select 1 from driver_profiles dp where dp.id = e.driver_id and dp.user_id = auth.uid())
      )
  ));

create policy signatures_scoped on signatures for all
  using (exists (
    select 1 from contracts c
      join engagements e on e.id = c.engagement_id
     where c.id = contract_id
       and (
         e.customer_user_id = auth.uid()
         or (e.customer_organization_id is not null and e.customer_organization_id = auth_active_org_id())
         or auth_is_admin()
         or exists (select 1 from driver_profiles dp where dp.id = e.driver_id and dp.user_id = auth.uid())
       )
  ));

-- ---- Substitution --------------------------------------------------------

create policy substitutions_scoped on substitutions for all
  using (exists (
    select 1 from engagements e where e.id = engagement_id
      and (
        e.customer_user_id = auth.uid()
        or (e.customer_organization_id is not null and e.customer_organization_id = auth_active_org_id())
        or auth_is_admin()
        or exists (select 1 from driver_profiles dp
                    where dp.id in (substitutions.original_driver_id, substitutions.substitute_driver_id)
                      and dp.user_id = auth.uid())
      )
  ));

create policy backup_pool_scoped on backup_pool_nominations for all
  using (exists (
    select 1 from engagements e where e.id = engagement_id
      and (
        e.customer_user_id = auth.uid()
        or (e.customer_organization_id is not null and e.customer_organization_id = auth_active_org_id())
        or auth_is_admin()
        or exists (select 1 from driver_profiles dp where dp.id = nominated_driver_id and dp.user_id = auth.uid())
      )
  ));

-- ---- Money — the isolation seam ------------------------------------------
-- Payments: customer sees their payment; driver does NOT.
-- Payouts:  driver sees their payout; customer does NOT.
-- Admin (finance, compliance, super_admin) sees everything.

create policy payments_payer_select on payments for select
  using (
    payer_user_id = auth.uid()
    or (payer_organization_id is not null and payer_organization_id = auth_active_org_id())
    or auth_role_has('admin_finance') or auth_role_has('admin_compliance') or auth_role_has('super_admin')
  );

create policy refunds_scoped_select on refunds for select
  using (exists (
    select 1 from payments p where p.id = payment_id
      and (
        p.payer_user_id = auth.uid()
        or (p.payer_organization_id is not null and p.payer_organization_id = auth_active_org_id())
        or auth_role_has('admin_finance') or auth_role_has('admin_compliance') or auth_role_has('super_admin')
      )
  ));

create policy payouts_driver_select on payouts for select
  using (
    exists (select 1 from driver_profiles dp where dp.id = driver_id and dp.user_id = auth.uid())
    or auth_role_has('admin_finance') or auth_role_has('admin_compliance') or auth_role_has('super_admin')
  );

create policy payout_batches_finance_read on payout_batches for select
  using (auth_role_has('admin_finance') or auth_role_has('admin_compliance') or auth_role_has('super_admin'));

-- Commission entries: never customer-visible; driver never sees these either.
create policy commission_entries_admin on commission_entries for select
  using (auth_role_has('admin_finance') or auth_role_has('admin_compliance') or auth_role_has('super_admin'));

-- Tax entries: driver sees their own withholding via v_driver_payout_summary view.
create policy tax_entries_scoped_select on tax_entries for select
  using (
    (payout_id is not null and exists (
       select 1 from payouts p
         join driver_profiles dp on dp.id = p.driver_id
        where p.id = tax_entries.payout_id and dp.user_id = auth.uid()
    ))
    or auth_role_has('admin_finance') or auth_role_has('admin_compliance') or auth_role_has('super_admin')
  );

create policy invoices_scoped_select on invoices for select
  using (
    customer_user_id = auth.uid()
    or (customer_organization_id is not null and customer_organization_id = auth_active_org_id())
    or auth_role_has('admin_finance') or auth_role_has('admin_compliance') or auth_role_has('super_admin')
  );

create policy invoice_lines_scoped_select on invoice_lines for select
  using (exists (
    select 1 from invoices i where i.id = invoice_id
      and (
        i.customer_user_id = auth.uid()
        or (i.customer_organization_id is not null and i.customer_organization_id = auth_active_org_id())
        or auth_role_has('admin_finance') or auth_role_has('admin_compliance') or auth_role_has('super_admin')
      )
  ));

-- ---- Ratings ------------------------------------------------------------

create policy ratings_scoped_select on ratings for select
  using (
    rater_user_id = auth.uid()
    or (rated_kind = 'driver' and exists (
         select 1 from driver_profiles dp where dp.id = rated_driver_id and dp.user_id = auth.uid()
       ))
    or (rated_kind = 'customer' and rated_user_id = auth.uid())
    or auth_is_admin()
    -- Anyone can read a rating that's on an approved, non-suspended driver
    or (rated_kind = 'driver' and exists (
         select 1 from driver_profiles dp
          where dp.id = rated_driver_id
            and dp.verification_tier in ('t2','t3','t4')
            and not dp.suspended and dp.deleted_at is null
            and not ratings.quarantined
       ))
  );

create policy ratings_insert_by_rater on ratings for insert
  with check (rater_user_id = auth.uid());

-- ---- Disputes -----------------------------------------------------------

create policy disputes_participant_select on disputes for select
  using (
    raised_by_user_id = auth.uid()
    or respondent_user_id = auth.uid()
    or exists (select 1 from engagements e where e.id = engagement_id
               and (
                 e.customer_user_id = auth.uid()
                 or (e.customer_organization_id is not null and e.customer_organization_id = auth_active_org_id())
                 or exists (select 1 from driver_profiles dp where dp.id = e.driver_id and dp.user_id = auth.uid())
               ))
    or auth_is_admin()
  );

create policy disputes_insert_by_participant on disputes for insert
  with check (
    raised_by_user_id = auth.uid()
    and exists (select 1 from engagements e where e.id = engagement_id
                and (
                  e.customer_user_id = auth.uid()
                  or (e.customer_organization_id is not null and e.customer_organization_id = auth_active_org_id())
                  or exists (select 1 from driver_profiles dp where dp.id = e.driver_id and dp.user_id = auth.uid())
                ))
  );

create policy dispute_evidence_scoped on dispute_evidence for all
  using (exists (
    select 1 from disputes d where d.id = dispute_id
      and (
        d.raised_by_user_id = auth.uid() or d.respondent_user_id = auth.uid()
        or auth_is_admin()
      )
  ));

create policy dispute_messages_scoped on dispute_messages for all
  using (exists (
    select 1 from disputes d where d.id = dispute_id
      and (
        d.raised_by_user_id = auth.uid() or d.respondent_user_id = auth.uid()
        or auth_is_admin()
      )
  ));

create policy dispute_outcomes_admin on dispute_outcomes for all
  using (auth_role_has('admin_compliance') or auth_role_has('super_admin'))
  with check (auth_role_has('admin_compliance') or auth_role_has('super_admin'));

create policy dispute_outcomes_participant_select on dispute_outcomes for select
  using (exists (
    select 1 from disputes d where d.id = dispute_id
      and (d.raised_by_user_id = auth.uid() or d.respondent_user_id = auth.uid())
  ));

-- ---- Notifications ------------------------------------------------------

create policy notifications_own on notifications for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notifications_admin_send on notifications for insert
  with check (auth_is_admin());

create policy notification_deliveries_own_select on notification_deliveries for select
  using (exists (select 1 from notifications n where n.id = notification_id and n.user_id = auth.uid()));

create policy notification_preferences_own on notification_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy chat_threads_scoped_select on chat_threads for select
  using (exists (
    select 1 from engagements e where e.id = engagement_id
      and (
        e.customer_user_id = auth.uid()
        or (e.customer_organization_id is not null and e.customer_organization_id = auth_active_org_id())
        or auth_is_admin()
        or exists (select 1 from driver_profiles dp where dp.id = e.driver_id and dp.user_id = auth.uid())
      )
  ));

create policy chat_messages_scoped on chat_messages for all
  using (exists (
    select 1 from chat_threads t
      join engagements e on e.id = t.engagement_id
     where t.id = thread_id
       and (
         e.customer_user_id = auth.uid()
         or (e.customer_organization_id is not null and e.customer_organization_id = auth_active_org_id())
         or auth_is_admin()
         or exists (select 1 from driver_profiles dp where dp.id = e.driver_id and dp.user_id = auth.uid())
       )
  ));

-- ---- Corporate approvals -------------------------------------------------

create policy approvals_org_scoped on approvals for all
  using (
    organization_id = auth_active_org_id()
    or requester_user_id = auth.uid()
    or approver_user_id = auth.uid()
    or auth_is_admin()
  );

-- ---- Recruitment --------------------------------------------------------

create policy recruitment_roles_public_read_open on recruitment_roles for select
  using (status = 'open' or posted_by_user_id = auth.uid()
         or (posted_by_organization_id is not null and posted_by_organization_id = auth_active_org_id())
         or auth_is_admin());

create policy recruitment_roles_poster_write on recruitment_roles for all
  using (
    posted_by_user_id = auth.uid()
    or (posted_by_organization_id is not null and posted_by_organization_id = auth_active_org_id())
    or auth_is_admin()
  )
  with check (
    posted_by_user_id = auth.uid()
    or (posted_by_organization_id is not null and posted_by_organization_id = auth_active_org_id())
    or auth_is_admin()
  );

create policy recruitment_shortlist_scoped on recruitment_shortlist_entries for all
  using (exists (
    select 1 from recruitment_roles rr where rr.id = role_id
      and (
        rr.posted_by_user_id = auth.uid()
        or (rr.posted_by_organization_id is not null and rr.posted_by_organization_id = auth_active_org_id())
        or auth_is_admin()
      )
  ));

-- ---- Support tickets ----------------------------------------------------

create policy support_tickets_scoped on support_tickets for all
  using (
    reporter_user_id = auth.uid()
    or (organization_id is not null and organization_id = auth_active_org_id())
    or auth_role_has('admin_support') or auth_role_has('super_admin')
  );

create policy support_ticket_messages_scoped on support_ticket_messages for all
  using (exists (
    select 1 from support_tickets t where t.id = ticket_id
      and (
        t.reporter_user_id = auth.uid()
        or auth_role_has('admin_support') or auth_role_has('super_admin')
      )
  ));

-- ---- Audit + compliance -------------------------------------------------

create policy audit_logs_compliance_read on audit_logs for select
  using (auth_role_has('admin_compliance') or auth_role_has('super_admin'));

-- audit_logs INSERT is expected via server-side service-role only.
-- No public INSERT policy — silent deny is correct.

create policy dsr_own on data_subject_requests for all
  using (requester_user_id = auth.uid() or auth_role_has('admin_compliance') or auth_role_has('super_admin'))
  with check (requester_user_id = auth.uid() or auth_role_has('admin_compliance') or auth_role_has('super_admin'));

-- ---- Devices + safety ---------------------------------------------------

create policy user_devices_own on user_devices for all
  using (user_id = auth.uid() or auth_is_admin())
  with check (user_id = auth.uid());

create policy safety_events_own on safety_events for insert
  with check (user_id = auth.uid());

create policy safety_events_scoped_select on safety_events for select
  using (user_id = auth.uid() or auth_role_has('admin_support') or auth_role_has('admin_compliance') or auth_role_has('super_admin'));

-- ---- Emergency contacts + cost centres ----------------------------------

create policy emergency_contacts_self on emergency_contacts for all
  using (user_id = auth.uid() or auth_role_has('admin_support') or auth_role_has('admin_compliance') or auth_role_has('super_admin'))
  with check (user_id = auth.uid());

create policy cost_centres_org_scoped on cost_centres for all
  using (organization_id = auth_active_org_id() or auth_is_admin())
  with check (organization_id = auth_active_org_id() or auth_is_admin());
