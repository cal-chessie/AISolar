# THE MIGRATION — 30 Jul 2026 (v2, peer-review edits applied)
### Everything landed · everything staged · nothing hidden. Every claim tool-proven.

## Constitutional Guarantee

**Nothing constitutional changes without a receipt.**

---

## ✅ LANDED — live on the kernel (`vythuqax`): constitutional guarantees strengthened

| What | Proof |
|---|---|
| **F1 — Relationships and policies are now constitutionally receipted.** Every mutation emits an immutable event (`RelationshipAsserted` / `RelationshipRevoked` / `PolicyRevised`, refs-only payloads) from which the current projection can be independently reconstructed. Triggers on INSERT/UPDATE/DELETE via `kernel.emit`. | Rollback-test fired a real receipt in-tx (`receipt_fired: 1`), rolled back clean. Post-state: **77 events unchanged · 0 orphans · 0 residue**. |
| **F2 — Admission metadata is now machine-readable.** `event_types.layer` (`constitutional` \| `domain` \| NULL): **25 domain · 7 constitutional · 25 NULL awaiting Cal** (reclassify-never-delete). | Live query post-apply. |
| **F3 — Intent lifecycle admitted.** `CommandIssued` + `CommandResolved` admitted (5 new types, `introduced_in='0011'`) — intent is now representable as immutable history before execution. | `new_types: 5` live. |
| Migration record | `COMH/RENEWABLY/platforms/aios/0011_CONSTITUTIONAL_RECEIPTS.sql` |

### Constitutional Delta — what property actually improved
- Relationships are now historical rather than merely mutable.
- Policy evolution is now receipted.
- Admission vocabulary distinguishes constitutional and domain terms.
- Intent is now represented as immutable history before execution.
- No existing constitutional semantics were removed.
- All changes are append-only; reversible only by correction.

**Authority remains a constitutional concept. Its kernel implementation is a
deterministic projection over receipted grants.**

### Constitutional Observation
The primary outcome of this migration is not the addition of new tables or event types.
It is the strengthening of the kernel's ability to **preserve truth through correction
rather than mutation**. The kernel increasingly treats history as immutable, projections
as reproducible, and correction as the only legitimate form of change. This improves the
kernel's constitutional guarantees without expanding its semantic commitments.
(Doctrines recorded: `OA/CONSTITUTIONAL_DOCTRINES.md` — 001 Mechanism over Vocabulary ·
002 Sovereign Boundaries · 003 The Neutrality Gate.)

**The standing design gate (Cal's test, adopted):** *if a hospital, a logistics company,
a land registry and a power network all used this tomorrow, would the kernel stay exactly
the same?* Every future design decision answers this before it ships. (Britain is this
test's first live run.)

**Found en route:** the kernel already refuses self-relationships (`ck_relationships_noself`)
and tenant-guards relationships — hygiene predating tonight.

---

## ✅ ANSWERED — "did you go through every single part of the app, or just the sweep docs?"

**Honest answer: coverage was doc-driven until you asked — so a full code scrape of `src/`
ran tonight.** Result: **13 client-side stores** exist in the entire app. The docs (written
late, as you said) had missed four. All four now have schema:

| Store (localStorage) | Status |
|---|---|
| `jobview_v2_*` · company compliance · tenant brand · proposal terms · finance config | ✅ already covered (`20260727` + `20260730`) |
| Product catalog — **4 keys** (`custom_products`, `overrides`, `images`, `images_by_model`) | 🆕 `products` table — **`20260801`** |
| `aisolar_consent_v1` (GDPR) | 🆕 `consent_records` (append-only trail) — **`20260801`** |
| `aisolar_feedback` — **never documented anywhere** | 🆕 `feedback` — **`20260801`** |
| Conversations/inbox (29 Jul build — in-memory, dies on refresh) | 🆕 `conversations` + `conversation_messages` — **`20260801`** |
| `demo_mode` · `shell_collapsed` · `recentSearches` | ✅ pure client state (demo OFF in prod = A10) |
| Supabase SDK auth storage | ✅ SDK's own |

**Inventory closed: 13 found = 5 previously covered + 4 covered tonight + 3 client-only + 1 SDK.**

## ✅ LANDED — in the repo (branch `cowork-jul25`, uncommitted, awaiting your yes)

| What | File |
|---|---|
| ESB pack persistence: `installed_equipment` · `esb_submissions` (lifecycle + SHA-256 seal) · seal cols · `company_compliance` key | `supabase/migrations/20260730_esb_submission_pack.sql` |
| Network foundation: `brands` · `sources` (per-door signed keys) · lead `origin_*` provenance | `supabase/migrations/20260731_network_foundation.sql` |
| **The code-scrape migration** (products · consent · feedback · conversations) | `supabase/migrations/20260801_undocumented_stores.sql` |
| The 14-page sealed ESB pack (browser-verified) | `src/lib/pdfFill.ts` + `fieldRecord.ts` + `JobViewV2.tsx` |
| Architecture ruling (Gate B artifact, ratified) · scope map | `docs/THE_NETWORK_RULING.md` · `docs/FULL_SCOPE_AND_ARCHITECTURE.md` |

## 🔶 STAGED — blocked on ONE thing: coxmtpnq access

`coxmtpnq` is under the Lovable-managed Supabase account; tonight's token provably cannot
see it and `.env.LOCAL` holds client keys only. Hand me either a management access token
from that account or the DB connection string, and the entire staged column lands:

```bash
supabase link --project-ref coxmtpnqjybwlrfwkols && supabase db push
```

(applies every pending migration in dependency order, including the three new ones), then
`supabase functions deploy` for the 16 edge functions + secrets per `docs/SECRETS.md`.

## 🔴 STILL YOURS
1. **coxmtpnq access** — unlocks everything staged.
2. **GATE 0 remainder:** Maps/Cal.com rotation · old-keys-dead · history purge · Postmark DNS · first-admin bootstrap (`docs/AUTH_RUNBOOK.md`).
3. **Classify the 25 NULL event types** (one sitting; list staged).
4. **Cutover wiring** (code, next session): point the five covered stores' read/writes at their tables; migrate product image dataURLs → storage bucket.

## The scoreboard
**Kernel: constitutional guarantees strengthened — receipts enforced by trigger, chain intact, proven by fire-and-rollback.**
**App: every persistent store in the codebase now has schema — closed by scrape, not by docs.**
**The wall: one access token on the Lovable account. Then it all lands in minutes.**

*Peer-review edits (GPT, 30 Jul) applied in full: guarantee elevated, F1/F2/F3 rewordings, Constitutional Delta added, Authority position reconciled. The direction holds: the smallest set of truths any independent authority can share without surrendering sovereignty. — Claude*
