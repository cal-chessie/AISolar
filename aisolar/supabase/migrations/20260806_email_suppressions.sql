-- 20260806_email_suppressions — deliverability reputation guard (#69).
--
-- WHY: nothing stops us re-mailing a hard-bounced or complaining address. That is
-- the #1 way a shared sending domain gets flagged and the WHOLE cohort's mail
-- starts landing in spam. This is the capture side: Postmark's bounce +
-- spam-complaint webhooks (see functions/postmark-webhook) write here, and every
-- send checks it first (see _shared/email.ts + send-notification).
--
-- PLATFORM-WIDE on purpose: a hard bounce / complaint is about the ADDRESS and the
-- shared domain reputation, not one tenant — so it's a single global list, not
-- tenant-scoped. Only edge functions (service role) touch it; RLS with no policies
-- locks every client out.

create table if not exists public.email_suppressions (
  email          text primary key,            -- lowercased recipient address
  reason         text not null,               -- 'HardBounce' | 'SpamComplaint' | 'Manual' | ...
  detail         text,                        -- Postmark Description/Details, if any
  message_stream text,                         -- the Postmark stream it came from
  suppressed_at  timestamptz not null default now()
);

comment on table public.email_suppressions is
  'Global email reputation suppression list (hard bounces + spam complaints, via Postmark webhooks). Checked before every send. Platform-wide, service-role only.';

alter table public.email_suppressions enable row level security;
-- No policies: only the edge functions (service role) read/write this list.
