#!/usr/bin/env python3
"""
Phase 2 color palette unification.

Sweeps `bg-blue-600` / `hover:bg-blue-700` / `text-blue-600` / `from-blue-600` /
`to-blue-600` in the LIVE files only, replacing primary CTAs + nav-active states
with emerald. Keeps blue for AI/agent semantic accents.

Rule:
  - bg-blue-600 / hover:bg-blue-700  → bg-emerald-600 / hover:bg-emerald-700
    (primary CTA buttons, active nav, active tabs)
  - from-blue-600 / to-blue-600      → from-emerald-600 / to-blue-600
    (logo gradients keep a hint of blue — the AI accent)
  - text-blue-600                    → text-emerald-600
    (primary icons, headlines — UNLESS the surrounding context is AI/agent)

Dead files (per audit §1) are skipped — Phase 5 will delete them.
"""

import re
from pathlib import Path

ROOT = Path("/home/z/my-project/aisolar/src")

LIVE_FILES = [
    "pages/InstallerLanding.tsx",
    "pages/PrestigiousAuth.tsx",
    "components/OwnerCockpit.tsx",
    "components/ConsultantCockpitV5.tsx",
    "components/installer/InstallerPortalV5.tsx",
    "components/customer/CustomerPortalV2.tsx",
    "components/LeadFlow.tsx",
    "components/installer/JobViewV2.tsx",
    "components/AgentFoundation.tsx",
    "components/AgentTraining.tsx",
    "components/AIConfig.tsx",
    "components/SEAIDashboard.tsx",
    "components/EstimateView.tsx",
    "components/EstimatesView.tsx",
    "components/CustomerIntelligenceProfile.tsx",
    "components/ProfessionalProducts.tsx",
    "components/RealCalendar.tsx",
    "components/UnifiedCalendar.tsx",
    "components/SystemSettingsV2.tsx",
    "components/AnalyticsDashboard.tsx",
    "components/ProposalView.tsx",
]

REPLACEMENTS = [
    ("bg-blue-600 text-white", "bg-emerald-600 text-white"),
    ("bg-blue-600 hover:bg-blue-700", "bg-emerald-600 hover:bg-emerald-700"),
    ("bg-blue-600 hover:bg-blue-800", "bg-emerald-600 hover:bg-emerald-800"),
    ("bg-blue-50 dark:bg-blue-950/30", "bg-emerald-50 dark:bg-emerald-950/30"),
    ("from-blue-600 to-violet-600", "from-emerald-600 to-blue-600"),
    ("from-blue-500 to-violet-500", "from-emerald-500 to-blue-500"),
    ("from-blue-500 to-violet-700", "from-emerald-500 to-blue-700"),
    ("from-blue-600 to-violet-600 bg-clip-text text-transparent",
     "from-emerald-600 to-blue-600 bg-clip-text text-transparent"),
]

total = 0
touched = 0

for rel in LIVE_FILES:
    path = ROOT / rel
    if not path.exists():
        print(f"  SKIP (missing): {rel}")
        continue
    text = path.read_text()
    original = text
    fc = 0
    for old, new in REPLACEMENTS:
        c = text.count(old)
        if c:
            text = text.replace(old, new)
            fc += c
    if text != original:
        path.write_text(text)
        touched += 1
        total += fc
        print(f"  {rel}: {fc} replacements")
    else:
        print(f"  {rel}: (no changes)")

print(f"\nDone. {total} replacements across {touched} files.")
