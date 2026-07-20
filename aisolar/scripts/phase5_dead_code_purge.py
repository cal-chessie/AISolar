#!/usr/bin/env python3
"""
Phase 5: Dead code purge.

Deletes ~32k LOC of dead code across 5 atomic batches. Before deleting each
file, verifies it exists and (for safety) that no LIVE file imports it.

Live files = the ones mounted by App.tsx + their transitive imports.
We use a conservative allowlist of "live roots" and walk the import graph
to build the live set. Anything not in the live set is dead.

Dead files are deleted in 5 batches so a typo in the allowlist doesn't
cascade into deleting something important.
"""

import re
import shutil
import sys
from pathlib import Path

ROOT = Path("/home/z/my-project/aisolar/src")
SUPABASE = Path("/home/z/my-project/aisolar/supabase")

# Files that are LIVE (mounted by App.tsx or transitively imported).
# Anything NOT in this list (and not in the live set built from it)
# is a candidate for deletion.
LIVE_ROOTS = [
    # Pages mounted by App.tsx
    "pages/InstallerLanding.tsx",
    "pages/ValueUpsell.tsx",
    "pages/AboutUs.tsx",
    "pages/ROICalculator.tsx",
    "pages/PrivacyPolicy.tsx",
    "pages/TermsOfService.tsx",
    "pages/PrestigiousAuth.tsx",
    "pages/OnboardingMode.tsx",
    "pages/DemoIndex.tsx",
    "pages/NotFound.tsx",
    # Components mounted by App.tsx
    "components/OwnerCockpit.tsx",
    "components/ConsultantCockpitV5.tsx",
    "components/LeadFlow.tsx",
    "components/installer/InstallerPortalV5.tsx",
    "components/installer/JobViewV2.tsx",
    "components/customer/CustomerPortalV2.tsx",
    "components/ai/RoleBasedAICoach.tsx",
    "components/DemoBanner.tsx",
    "components/ProtectedRoute.tsx",
    "components/layout/PageTransition.tsx",
    "components/search/GlobalSearchModal.tsx",
    # App.tsx itself + main entry
    "App.tsx",
    "main.tsx",
    # Lib + hooks + config used by live code
    "lib/gdpr.tsx",
    "lib/demoMode.ts",
    "lib/dummyData.ts",
    "lib/leadIntake.ts",
    "lib/seaiPipeline.ts",
    "lib/agents.ts",
    "lib/aiCoach.ts",
    "lib/utils.ts",
    "lib/activityLog.ts",
    "lib/stageNotifications.ts",
    "lib/surveyValidation.ts",
    "lib/conversation.ts",
    "lib/motionPresets.ts",
    "hooks/useAuth.ts",
    "hooks/useKeyboardShortcuts.ts",
    "hooks/use-mobile.tsx",
    "hooks/use-toast.ts",
    "config/brand.ts",
    "integrations/supabase/client.ts",
    "integrations/supabase/types.ts",
]

def find_imports(file_path: Path) -> list[str]:
    """Extract @/ -prefixed imports from a TS/TSX file."""
    if not file_path.exists():
        return []
    text = file_path.read_text(errors='ignore')
    # Match: from '@/...' or from "@/..."
    imports = re.findall(r'''from\s+['"](@/[^'"]+)['"]''', text)
    # Also match dynamic imports: import('@/...')
    imports += re.findall(r'''import\s*\(\s*['"](@/[^'"]+)['"]\s*\)''', text)
    return imports

def resolve_import(imp: str, root: Path) -> Path | None:
    """Resolve a '@/foo/bar' import to a file path. Tries .tsx, .ts, /index.tsx, /index.ts."""
    rel = imp.lstrip('@/').lstrip('./')
    candidate = root / rel
    # Try exact + extensions
    for ext in ['', '.tsx', '.ts']:
        p = candidate.with_suffix(ext) if ext else candidate
        if p.exists() and p.is_file():
            return p
    # Try index files
    for index in ['index.tsx', 'index.ts']:
        p = candidate / index
        if p.exists() and p.is_file():
            return p
    return None

def build_live_set(root: Path, live_roots: list[str]) -> set[Path]:
    """Walk the import graph from live_roots to build the full live set."""
    live = set()
    queue = []
    for rel in live_roots:
        p = root / rel
        if p.exists():
            queue.append(p)
    while queue:
        p = queue.pop()
        if p in live:
            continue
        live.add(p)
        for imp in find_imports(p):
            resolved = resolve_import(imp, root)
            if resolved and resolved not in live:
                queue.append(resolved)
    return live

def delete_files(files: list[str], root: Path, live_set: set[Path], batch_name: str) -> tuple[int, int]:
    """Delete the given files. Returns (deleted_count, skipped_count)."""
    deleted = 0
    skipped = 0
    for rel in files:
        p = root / rel
        if not p.exists():
            print(f"  SKIP (missing): {rel}")
            skipped += 1
            continue
        # Safety check: if the file is in the live set, DON'T delete it
        if p in live_set:
            print(f"  SKIP (LIVE — would break imports!): {rel}")
            skipped += 1
            continue
        try:
            p.unlink()
            deleted += 1
            print(f"  DEL: {rel}")
        except Exception as e:
            print(f"  ERR ({rel}): {e}")
            skipped += 1
    return deleted, skipped

def delete_dir(dir_rel: str, root: Path, live_set: set[Path], batch_name: str) -> tuple[int, int]:
    """Delete an entire directory if none of its files are in the live set."""
    p = root / dir_rel
    if not p.exists():
        print(f"  SKIP (missing dir): {dir_rel}")
        return 0, 1
    # Safety check: ensure no file in this dir is in live_set
    live_in_dir = [f for f in p.rglob('*') if f in live_set]
    if live_in_dir:
        print(f"  SKIP (contains LIVE files): {dir_rel}")
        for f in live_in_dir:
            print(f"    LIVE: {f.relative_to(root)}")
        return 0, 1
    try:
        file_count = sum(1 for _ in p.rglob('*') if _.is_file())
        shutil.rmtree(p)
        print(f"  DEL DIR: {dir_rel} ({file_count} files)")
        return file_count, 0
    except Exception as e:
        print(f"  ERR ({dir_rel}): {e}")
        return 0, 1

# Build the live set first
print("Building live import graph...")
live_set = build_live_set(ROOT, LIVE_ROOTS)
print(f"Live set: {len(live_set)} files\n")

total_deleted_files = 0
total_deleted_dirs = 0
total_skipped = 0

# ============================================================================
# BATCH 1: Zero-importer dead leaves
# ============================================================================
print("=" * 70)
print("BATCH 1: Zero-importer dead leaves")
print("=" * 70)
batch1 = [
    "components/PipelineView.tsx",
    "components/CommunicationHub.tsx",
    "components/PremiumBillUpload.tsx",
    "components/InstallerIntelligenceBuilder.tsx",
    "components/ProposalResults.tsx",
    "components/ai/PersistentAICoach.tsx",
    "components/workflow/PostProposalWorkflow.tsx",
    "components/workflow/WorkflowPipeline.tsx",
    "components/survey/CameraCapture.tsx",
    "components/survey/SurveyProgressIndicator.tsx",
    "components/installer/InstallerBOM.tsx",
    "lib/proposalTemplate.ts",
    "hooks/useCountUp.ts",
]
d, s = delete_files(batch1, ROOT, live_set, "batch1")
total_deleted_files += d; total_skipped += s
# Delete the now-empty workflow/ directory
d, s = delete_dir("components/workflow", ROOT, live_set, "batch1")
total_deleted_dirs += d; total_skipped += s

# ============================================================================
# BATCH 2: Legacy versioned components + dead pages
# ============================================================================
print("\n" + "=" * 70)
print("BATCH 2: Legacy versioned components + dead pages")
print("=" * 70)
batch2 = [
    # Legacy versioned components
    "components/ConsultantCockpitV3.tsx",
    "components/ConsultantCockpitV4.tsx",
    "components/ConsultantDashboardV2.tsx",
    "components/installer/InstallerPortalV2.tsx",
    "components/installer/InstallerPortalV3.tsx",
    "components/installer/JobView.tsx",
    "components/installer/MobileInstallerCompanion.tsx",
    "components/customer/CustomerMobilePortal.tsx",
    "components/OwnerBirdseye.tsx",
    "components/PremiumDashboard.tsx",
    "components/SystemSettings.tsx",
    "components/WorkflowOrchestrator.tsx",
    # Dead pages
    "pages/PremiumIndex.tsx",
    "pages/Index.tsx",
    "pages/Auth.tsx",
    "pages/ConsultantDashboard.tsx",
    "pages/InstallerPortal.tsx",
    "pages/InstallerMobileApp.tsx",
    "pages/CustomerPortal.tsx",
    "pages/ClientPortal.tsx",
    "pages/CustomerDashboard.tsx",
    "pages/AdminSettings.tsx",
    "pages/AuditDashboard.tsx",
]
d, s = delete_files(batch2, ROOT, live_set, "batch2")
total_deleted_files += d; total_skipped += s

# ============================================================================
# BATCH 3: Entire dead directories + transitively-dead sub-components
# ============================================================================
print("\n" + "=" * 70)
print("BATCH 3: Entire dead directories + transitively-dead sub-components")
print("=" * 70)

# Entire directories
batch3_dirs = [
    "components/dashboard",
    "components/landing",
    "components/ai-analyser",
]
for d in batch3_dirs:
    deleted, skipped = delete_dir(d, ROOT, live_set, "batch3")
    total_deleted_dirs += deleted; total_skipped += skipped

# Individual transitively-dead sub-components
batch3_files = [
    "components/LeadDetailView.tsx",
    "components/ProposalQuestionnaire.tsx",
    "components/ProposalResultsView.tsx",
    "components/proposal/ProposalPreview.tsx",
    "components/ProductsManagement.tsx",
    "components/CalendarBooking.tsx",
    "components/ConsultationBooking.tsx",
    "components/LeadCaptureForm.tsx",
    "components/InstallerDashboard.tsx",
    "components/InstallerFirstDashboard.tsx",
    "components/installer/InstallationChecklist.tsx",
    "components/installer/InstallerMapView.tsx",
    "components/installer/InstallerAvailabilityCalendar.tsx",
    "components/installer/SurveyDetailsCard.tsx",
    "components/customer/InstallationCalendar.tsx",
    "components/customer/StatusTimeline.tsx",
    "components/customer/ProposalSummaryCard.tsx",
    "components/customer/InvoiceCard.tsx",
    "components/seai/SEAIGrantTracker.tsx",
    "components/seai/SEAIGrantStatus.tsx",
    "components/payment/PaymentLinkGenerator.tsx",
    "components/payment/PaymentMethodSelector.tsx",
    "components/contracts/ContractSignature.tsx",
    "components/equipment/EquipmentLibrary.tsx",
    "components/ai/AICoachFloatingButton.tsx",
    "components/ai/DynamicAISalesCoach.tsx",
    "components/notifications/NotificationBell.tsx",
    "components/settings/NotificationPreferences.tsx",
    "components/layout/MobileBottomNav.tsx",
    "components/ui/Card3D.tsx",
    "components/ui/ScrollIndicator.tsx",
    "components/ui/PaginationControls.tsx",
    "components/ui/ErrorBoundary.tsx",  # already imported by App.tsx — should be LIVE; will skip
    "components/ui/SignatureCanvas.tsx",
    "components/ui/skeletons/index.tsx",
]
d, s = delete_files(batch3_files, ROOT, live_set, "batch3")
total_deleted_files += d; total_skipped += s

# Delete now-empty subdirs
for d in ["components/proposal", "components/seai", "components/payment",
          "components/contracts", "components/equipment", "components/notifications",
          "components/settings", "components/survey", "components/ui/skeletons"]:
    deleted, skipped = delete_dir(d, ROOT, live_set, "batch3")
    total_deleted_dirs += deleted; total_skipped += skipped

# ============================================================================
# BATCH 4: Dead hooks + dead lib helpers
# ============================================================================
print("\n" + "=" * 70)
print("BATCH 4: Dead hooks + dead lib helpers")
print("=" * 70)
batch4 = [
    "hooks/usePullToRefresh.ts",
    "hooks/useRealtimeUpdates.ts",
    "hooks/useNotifications.ts",
    "lib/customerPortal.ts",
    "lib/estimate-engine.ts",
    "lib/offlineSupport.ts",
    "lib/pdfExport.ts",
    "lib/grantCalculations.ts",
    "lib/tenant.ts",
]
d, s = delete_files(batch4, ROOT, live_set, "batch4")
total_deleted_files += d; total_skipped += s

# ============================================================================
# BATCH 5: ts-prune sweep — find unused shadcn primitives
# ============================================================================
print("\n" + "=" * 70)
print("BATCH 5: Sweep for unused shadcn primitives")
print("=" * 70)

# Build the import graph from the LIVE roots (some may have been deleted above
# but live_set was built before deletions — that's fine, we want the original
# live set to know what's used).
all_imports = set()
for live_file in live_set:
    for imp in find_imports(live_file):
        all_imports.add(imp)

# Check each file in components/ui/ for whether it's imported by anything live
ui_dir = ROOT / "components/ui"
if ui_dir.exists():
    for ui_file in sorted(ui_dir.iterdir()):
        if not ui_file.is_file():
            continue
        rel = f"components/ui/{ui_file.name}"
        # Check if any live file imports this
        stem = ui_file.stem
        # Match: '@/components/ui/{stem}' or './{stem}' from within ui/
        import_path = f"@/components/ui/{stem}"
        if import_path not in all_imports:
            # Also check for re-exports (e.g. ui/use-toast.ts re-exports hooks/use-toast)
            print(f"  CANDIDATE: {rel} (no live import found)")
            # Don't auto-delete shadcn primitives — they may be needed for future use.
            # Just report them.
        else:
            pass  # Used — skip

# ============================================================================
# Summary
# ============================================================================
print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print(f"Files deleted:      {total_deleted_files}")
print(f"Files in deleted dirs: {total_deleted_dirs}")
print(f"Total files removed: {total_deleted_files + total_deleted_dirs}")
print(f"Files skipped:      {total_skipped}")
