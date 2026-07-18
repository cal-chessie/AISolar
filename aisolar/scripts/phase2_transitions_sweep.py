#!/usr/bin/env python3
"""
Phase 2: add `transition-shadow` to every `hover:shadow-md` (and `hover:shadow-lg`)
card that doesn't already have it. Also add `transition-colors` to interactive
buttons that change color on hover but lack the transition utility.
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
]

def add_transition_shadow(text: str) -> tuple[str, int]:
    """For every className containing `hover:shadow-md` or `hover:shadow-lg`
    that does NOT already contain `transition-shadow`, insert `transition-shadow`
    right before the hover:shadow token."""
    count = 0
    # Match className="...hover:shadow-md..." that lacks transition-shadow
    def replace(md):
        nonlocal count
        cls = md.group(1)
        if 'transition-shadow' in cls:
            return md.group(0)
        if 'hover:shadow-md' in cls or 'hover:shadow-lg' in cls:
            new_cls = cls.replace('hover:shadow-md', 'transition-shadow hover:shadow-md', 1) if 'hover:shadow-md' in cls else cls.replace('hover:shadow-lg', 'transition-shadow hover:shadow-lg', 1)
            count += 1
            return f'className="{new_cls}"'
        return md.group(0)
    new_text = re.sub(r'className="([^"]*hover:shadow-(?:md|lg)[^"]*)"', replace, text)
    return new_text, count

def add_transition_colors_to_hoverbg(text: str) -> tuple[str, int]:
    """For every className containing `hover:bg-` that does NOT already contain
    `transition-colors` or `transition-all`, insert `transition-colors`."""
    count = 0
    def replace(md):
        nonlocal count
        cls = md.group(1)
        if 'transition-colors' in cls or 'transition-all' in cls:
            return md.group(0)
        if 'hover:bg-' in cls:
            new_cls = cls.replace('hover:bg-', 'transition-colors hover:bg-', 1)
            count += 1
            return f'className="{new_cls}"'
        return md.group(0)
    new_text = re.sub(r'className="([^"]*hover:bg-[^"]*)"', replace, text)
    return new_text, count

total_shadow = 0
total_colors = 0
touched = 0

for rel in LIVE_FILES:
    path = ROOT / rel
    if not path.exists():
        continue
    text = path.read_text()
    original = text
    text, c1 = add_transition_shadow(text)
    text, c2 = add_transition_colors_to_hoverbg(text)
    if text != original:
        path.write_text(text)
        touched += 1
        total_shadow += c1
        total_colors += c2
        print(f"  {rel}: +{c1} transition-shadow, +{c2} transition-colors")

print(f"\nDone. {touched} files touched. +{total_shadow} transition-shadow, +{total_colors} transition-colors.")
