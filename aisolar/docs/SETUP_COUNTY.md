# ONE-PAGER — Stand up a COUNTY (the 32× repeatable)
### Do this once per county. ~1 hour when practiced. Nothing here touches the kernel's semantics.

**What a county IS:** a durable kernel boundary (its own chain) + a licensed brand + doors.
The installer OPERATES it; they never own it. If they leave, the county persists.

## The steps

**1 · Kernel boundary (once, via kernel SQL or the tenant script):**
Create the county tenant under the national tree (pattern proven: Roscommon/Westmeath/
Tyrone exist). Record the operates-relationship: `insert into kernel.relationships
(tenant_id, from_id, to_id, kind) values (<county>, <installer identity>, <county
identity>, 'operates')` — **the receipt fires automatically now** (RelationshipAsserted
on the chain — tonight's trigger). That receipt IS the franchise record.

**2 · App rows (Owner console → or SQL until the UI ships):**
- `brands`: `{tenant: installer co., name: "Solar <County>", is_licensed: true, boundary_ref: <county boundary>}`
- `sources`: one row per door — the county site, the widget, campaigns. Each gets a
  generated `source_key`.

**3 · The site (sovereign — Doctrine 002):** whoever runs solar<county>.ie adopts the
door: POST to `ingest-lead` with their `x-ingest-key`/source key (contract in
`LAUNCH_HANDOVER.md` Part 4), or drops in the embed widget. We hand them the one-block
snippet; we do not edit their site.

**4 · Installer operator setup (them, 20 min):**
- Sign up → you grant `installer` role (`grant_role` RPC)
- Owner → Settings: **RECI number, company mobile/email/address** (NC6 blocks without
  them — the completeness gate will literally list what's missing)
- Upload their logo/colours → their brand theme (their proposals carry THEIR name;
  the installer is always the face)

**5 · Prove the rail (15 min):** test lead through their door → provenance line shows
"Born: solar<county>.ie" → estimate under installer's brand → book survey → (on install
day) commissioning gate → NC6 pack READY → chain receipt. If all six fire, the county
is live.

**Economics (auto by custody):** county-door leads = franchise rubric (70/20/10);
their own-brand leads = SaaS rubric. Provenance decides; nobody argues; the chain is
the referee.

**Grandfather offer (the 32):** regional exclusivity, earned-and-keepable (performance
floors + reversion), first installer per county keeps it. Offer all at once; onboard in
waves 3 → 10 → 32.
