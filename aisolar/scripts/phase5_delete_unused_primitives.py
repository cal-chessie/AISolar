#!/usr/bin/env python3
"""Phase 5 batch 5: delete truly-unused shadcn primitives."""
from pathlib import Path

ROOT = Path("/home/z/my-project/aisolar/src")

UNUSED_PRIMITIVES = [
    "accordion", "alert", "alert-dialog", "aspect-ratio", "breadcrumb",
    "carousel", "chart", "checkbox", "collapsible", "context-menu",
    "drawer", "dropdown-menu", "form", "hover-card", "input-otp",
    "menubar", "navigation-menu", "pagination", "popover", "radio-group",
    "resizable", "scroll-area", "sidebar", "slider", "table", "toggle-group",
]

deleted = 0
for prim in UNUSED_PRIMITIVES:
    p = ROOT / "components" / "ui" / f"{prim}.tsx"
    if p.exists():
        p.unlink()
        deleted += 1
        print(f"  DEL: components/ui/{prim}.tsx")
    else:
        print(f"  SKIP (missing): components/ui/{prim}.tsx")

print(f"\nDeleted {deleted} unused shadcn primitives.")
