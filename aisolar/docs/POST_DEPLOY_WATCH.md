# POST-DEPLOY WATCH — the standing health runbook

_Cal lost his dev (7 Aug 2026). This is the doc so his AI senior-dev monitors a live SaaS
**without re-digging the codebase each time**. Read this + run these; don't re-derive.
Pairs with `DEPLOYMENT_GATE.md` (deploy steps) and `LAST_MILE.md` (current state)._

## 0. The lesson that created this doc (7 Aug)
The type-checker was wired to check **nothing** — the root `tsconfig.json` is references-only
(`"files": []`), so `tsc --noEmit` checked zero files. **57 real type errors hid for weeks**,
three of which crashed the app at runtime ("X is not defined"). A green check that never ran
is worse than no check. **Never trust a pass you haven't confirmed actually ran.**

## 1. THE GATES — run before EVERY deploy (all must pass)
```bash
npm run typecheck   # tsc -p tsconfig.app.json --noEmit — MUST be 0 (the net that was missing)
npm run build       # vite build — MUST exit 0
npm run lint        # eslint — review warnings
```
If `typecheck` ≠ 0, **do not deploy** — TS2304 "cannot find name" errors are runtime crashes
waiting to render. This gate belongs in CI before it ever reaches Cal's hands.

## 2. STALE TYPES — the silent killer (root cause of most "errors everywhere")
Supabase query errors like `SelectQueryError<"column X does not exist">` or "excessively deep"
(TS2589) mean the **generated types are stale, not the code**. Regenerate (CLI is often
unavailable here → use the Management API):
```bash
TOKEN=$(cat ~/.supabase/access-token); REF=ywizcsulurxoqjdgnkvc
curl -s -H "Authorization: Bearer $TOKEN" -H "User-Agent: Mozilla/5.0" \
  "https://api.supabase.com/v1/projects/$REF/types/typescript?included_schemas=public" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["types"])' > src/integrations/supabase/types.ts
npm run typecheck   # re-check after
```
**Regenerate types after EVERY migration** — a stale type file hides real errors AND fakes false ones.

## 3. POST-DEPLOY SMOKE (immediately after a deploy hits prod)
- `curl -s https://www.aisolar.ie/api/health` → 200 `{status:"ok"}` (proves the deploy is live).
- Open the site: **no console errors** (DevTools), the /aisolar map loads, sign-in works.
- One real path end-to-end: lead → proposal → (test) pay → customer portal.

## 4. THE DAILY WATCH (post-launch — what the AI checks for Cal)
- **Runtime crashes** — the `client_errors` table is the crash sink. Last 24h, grouped:
  ```sql
  select message, url, count(*) from client_errors
  where created_at > now() - interval '1 day' group by 1,2 order by 3 desc;
  ```
- **Edge functions** — Supabase → Functions → logs; watch 5xx, "missing secret", auth failures.
- **Cost / bill-shock** — OpenRouter (bill OCR + AI), Google Maps, Stripe, Supabase egress.
  A runaway loop = a surprise bill (shared free-tier cap, see CLAUDE.md).
- **Uptime** — `/api/health` via an external monitor (still to wire).

## 5. ESCALATE TO CAL — immediately, plainly, with evidence
Anything customer-facing broken · any money-path error · a spike in `client_errors` · a cost
anomaly. **Verify with tools, never claim a state I haven't checked** (the standing rule).
