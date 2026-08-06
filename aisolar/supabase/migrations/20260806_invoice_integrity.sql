-- 20260806_invoice_integrity — money precision + gap-free VAT invoice numbers.
--
-- #58 (money in floats): invoice amounts were unbounded `numeric`, so a float
-- deposit split (total * 0.3 = 3703.701) could persist sub-cent money. Pin the
-- money columns to numeric(12,2) — the DB now guarantees 2 decimal places (rounds
-- on store) no matter what JS float feeds it — plus >= 0 checks. The table is
-- empty (fresh V5), so the type change is safe.
--
-- #62 (invoice numbering): Irish VAT invoices must carry a sequential, gap-free
-- number. invoice_number was text NOT NULL with no generator. This adds a
-- per-tenant, per-year counter + a BEFORE INSERT trigger that stamps
-- INV-<year>-<nnnnn>, gap-free within each tenant's annual series (the counter row
-- is locked per assignment, so concurrent inserts serialise). An explicitly
-- provided number is respected (imports/migrations).

-- money precision -----------------------------------------------------------
alter table public.invoices
  alter column total_amount   type numeric(12,2) using round(total_amount, 2),
  alter column deposit_amount type numeric(12,2) using round(coalesce(deposit_amount, 0), 2),
  alter column final_amount   type numeric(12,2) using round(final_amount, 2);

alter table public.invoices drop constraint if exists invoices_amounts_nonneg;
alter table public.invoices add constraint invoices_amounts_nonneg check (
  total_amount >= 0
  and (deposit_amount is null or deposit_amount >= 0)
  and (final_amount  is null or final_amount  >= 0)
);

-- gap-free per-tenant annual invoice numbers --------------------------------
create table if not exists public.invoice_counters (
  tenant_id uuid   not null references public.tenants(id) on delete cascade,
  year      int    not null,
  next_seq  bigint not null default 1,
  primary key (tenant_id, year)
);
-- No policies: only the SECURITY DEFINER trigger writes it (RLS locks clients out).
alter table public.invoice_counters enable row level security;

create or replace function public.invoices_assign_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare t uuid; y int; n bigint;
begin
  if new.invoice_number is not null and btrim(new.invoice_number) <> '' then
    return new;  -- respect an explicitly provided number
  end if;
  select l.tenant_id into t from public.leads l where l.id = new.lead_id;
  if t is null then
    raise exception 'invoice: cannot assign number — lead % has no tenant', new.lead_id;
  end if;
  y := extract(year from now())::int;
  insert into public.invoice_counters (tenant_id, year, next_seq) values (t, y, 1)
    on conflict (tenant_id, year) do nothing;
  update public.invoice_counters
     set next_seq = next_seq + 1
   where tenant_id = t and year = y
   returning next_seq - 1 into n;      -- the value BEFORE increment = this invoice's number
  new.invoice_number := 'INV-' || y::text || '-' || lpad(n::text, 5, '0');
  return new;
end;
$$;

drop trigger if exists trg_invoices_assign_number on public.invoices;
create trigger trg_invoices_assign_number
  before insert on public.invoices
  for each row execute function public.invoices_assign_number();
