-- 20260806_cooling_off — consumer 14-day cooling-off engine (#48).
--
-- WHY: an Irish/EU distance sale (solar sold online, contract signed remotely)
-- gives the consumer a statutory 14-day right to cancel. Nothing tracked it. This
-- is the DATA ENGINE only — dates + waiver + cancellation flags. The customer-
-- facing NOTICE wording and the refund/waiver POLICY are legal/business decisions
-- (Cal's yes — see LAST_MILE #48); this migration ships no legal copy.
--
-- The window starts when the distance contract is concluded = contracts.signed_at.

alter table public.contracts
  -- statutory deadline = signed_at + 14 days, stamped by a trigger (a generated
  -- column can't be used: timestamptz + interval is only STABLE, not IMMUTABLE).
  add column if not exists cooling_off_ends_at timestamptz,
  -- the customer EXPRESSLY asked us to begin during cooling-off (waiving the
  -- full-refund right for work done). Must come from the customer — never default true.
  add column if not exists cooling_off_waived boolean not null default false,
  add column if not exists cooling_off_waived_at timestamptz,
  -- the consumer exercised the right to cancel within the window
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text;

create or replace function public.contracts_set_cooling_off()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.signed_at is not null then
    new.cooling_off_ends_at := new.signed_at + interval '14 days';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_contracts_cooling_off on public.contracts;
create trigger trg_contracts_cooling_off
  before insert or update of signed_at on public.contracts
  for each row execute function public.contracts_set_cooling_off();

comment on column public.contracts.cooling_off_ends_at is
  'Statutory 14-day consumer cooling-off deadline (distance contract) = signed_at + 14 days. Stamped by trg_contracts_cooling_off.';
comment on column public.contracts.cooling_off_waived is
  'Customer expressly requested the install begin during cooling-off (waives the full-refund right for work done). Never set true by default — capture from the customer.';
