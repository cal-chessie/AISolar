#!/usr/bin/env python3
"""
Phase 6 batch: a11y + text-size + focus-ring sweep.

1. Replace text-[8px] / text-[9px] / text-[10px] with text-[11px] (the floor
   for readable text per WCAG). Keeps text-xs (12px) as the recommended min.
2. Add focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
   to every <button> className that doesn't already have focus-visible.

Only touches LIVE files (per Phase 5 live set).
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
    "components/EstimateView.tsx",
    "components/EstimatesView.tsx",
    "components/SEAIDashboard.tsx",
    "components/ProfessionalProducts.tsx",
    "components/RealCalendar.tsx",
    "components/UnifiedCalendar.tsx",
    "components/SystemSettingsV2.tsx",
    "components/AnalyticsDashboard.tsx",
    "components/ProposalView.tsx",
    "components/CustomerIntelligenceProfile.tsx",
    "components/AgentTraining.tsx",
    "components/AIConfig.tsx",
]

# 1. Text size replacements
def fix_text_sizes(text: str) -> tuple[str, int]:
    """Replace text-[8px], text-[9px], text-[10px] with text-[11px]."""
    count = 0
    for old in ['text-[8px]', 'text-[9px]', 'text-[10px]']:
        c = text.count(old)
        if c:
            text = text.replace(old, 'text-[11px]')
            count += c
    return text, count

# 2. Focus ring additions
def add_focus_rings(text: str) -> tuple[str, int]:
    """Add focus-visible:ring to <button> className that lacks it."""
    count = 0
    # Match: <button ... className="..." ...>
    # We add focus-visible classes to the className if not present
    def replace_button(md):
        nonlocal count
        full = md.group(0)
        if 'focus-visible:ring' in full:
            return full
        # Find the className attribute within the button tag
        cls_match = re.search(r'className="([^"]*)"', full)
        if not cls_match:
            return full
        cls = cls_match.group(1)
        # Don't add to buttons that are aria-hidden or have role="presentation"
        if 'aria-hidden="true"' in full or 'role="presentation"' in full:
            return full
        new_cls = cls + ' focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
        new_full = full.replace(f'className="{cls}"', f'className="{new_cls}"', 1)
        count += 1
        return new_full
    # Match opening <button ...> tags (not self-closing, not </button>)
    new_text = re.sub(r'<button(?:[^>]*?[^/]>)?', replace_button, text)
    return new_text, count

total_text = 0
total_focus = 0
touched = 0

for rel in LIVE_FILES:
    path = ROOT / rel
    if not path.exists():
        continue
    text = path.read_text()
    original = text
    text, c1 = fix_text_sizes(text)
    text, c2 = add_focus_rings(text)
    if text != original:
        path.write_text(text)
        touched += 1
        total_text += c1
        total_focus += c2
        print(f"  {rel}: +{c1} text-size fixes, +{c2} focus rings")

print(f"\nDone. {touched} files. +{total_text} text-size fixes, +{total_focus} focus rings.")
