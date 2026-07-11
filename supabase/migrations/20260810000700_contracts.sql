-- ============================================================================
-- Contracts & signatures
-- ============================================================================

create table contracts (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements(id) on delete cascade,
  kind contract_kind not null,
  version int not null default 1,
  supersedes_contract_id uuid references contracts(id),
  price_quote_hash char(64) not null,
  jurisdiction char(2) not null,
  currency currency_code not null,
  terms jsonb not null,
  pdf_storage_path text,
  pdf_sha256 char(64),
  status contract_status not null default 'draft',
  executed_at timestamptz,
  terminated_at timestamptz,
  terminated_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uniq_engagement_kind_version unique (engagement_id, kind, version)
);

create index idx_contracts_engagement on contracts (engagement_id, kind, version desc);
create index idx_contracts_status on contracts (status);

-- Now the deferred FK from engagements
alter table engagements
  add constraint fk_engagements_contract
  foreign key (contract_id) references contracts(id);

create table signatures (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  signatory_id uuid not null references users(id),
  signatory_role signature_role not null,
  signed_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  signature_ref text not null,
  signature_type text not null default 'typed_name',
  constraint uniq_signature unique (contract_id, signatory_role)
);

create index idx_signatures_contract on signatures (contract_id);
