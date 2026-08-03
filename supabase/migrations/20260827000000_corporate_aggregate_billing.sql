-- ============================================================================
-- Corporate billing is now aggregated per ORGANISATION, not per driver.
-- One invoice + one payment link covers all the drivers it bills for.
-- assignment_ids records which assignments an invoice covers, so paying an
-- aggregate upfront activates them all at once.
-- ============================================================================

alter table corporate_invoices
  add column if not exists assignment_ids uuid[] not null default '{}';
