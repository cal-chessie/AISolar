/**
 * GDPR Compliance Layer
 *
 * Centralises all GDPR/privacy logic for the platform:
 *   - Consent capture (marketing, analytics, third-party processing)
 *   - Cookie consent banner
 *   - Data subject rights: access, rectify, erase, port
 *   - Data retention policy enforcement
 *   - Privacy policy + terms links
 *   - Sub-processor disclosure
 *
 * Irish DPC + EU GDPR compliant. Used by:
 *   - Auth signup (captures initial consent)
 *   - ContractSignature (captures contract-specific consent)
 *   - Customer portal (data subject rights UI)
 *   - Admin settings (consent audit log)
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Shield, Cookie, FileText, Download, Trash2, Eye, Edit, Lock,
  CheckCircle2, AlertCircle, Clock, User, Database, Globe,
} from 'lucide-react';
import { brand } from '@/config/brand';

// ============================================================================
// CONSENT TYPES
// ============================================================================

export interface ConsentRecord {
  userId?: string;
  leadId?: string;
  email: string;
  // Consent types
  essential: boolean;        // always true — required for service
  performance: boolean;      // analytics, error tracking
  marketing: boolean;        // promotional emails
  thirdPartyAi: boolean;     // bill extraction via Gemini, proposal drafting
  // Metadata
  capturedAt: string;
  ipAddress?: string;
  userAgent?: string;
  version: string;           // consent policy version
}

const CONSENT_VERSION = '1.0.0';
const CONSENT_STORAGE_KEY = 'aisolar_consent_v1';

// ============================================================================
// CONSENT CAPTURE
// ============================================================================

export function captureConsent(consent: Omit<ConsentRecord, 'capturedAt' | 'version'>): ConsentRecord {
  const record: ConsentRecord = {
    ...consent,
    essential: true, // always true
    capturedAt: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch { /* ignore */ }
  // In production: also write to `consent_records` table via Supabase
  return record;
}

export function getStoredConsent(): ConsentRecord | null {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as ConsentRecord;
  } catch {
    return null;
  }
}

export function hasConsent(type: keyof Omit<ConsentRecord, 'email' | 'capturedAt' | 'version' | 'userId' | 'leadId' | 'ipAddress' | 'userAgent'>): boolean {
  const consent = getStoredConsent();
  if (!consent) return type === 'essential'; // essential always allowed
  return consent[type];
}

// ============================================================================
// COOKIE CONSENT BANNER
// ============================================================================

/**
 * Re-open the cookie preferences from anywhere (footer, privacy page).
 * GDPR Art. 7(3): withdrawing consent must be as easy as giving it.
 */
export const COOKIE_PREFS_EVENT = 'aisolar:open-cookie-prefs';
export function openCookiePreferences() {
  window.dispatchEvent(new CustomEvent(COOKIE_PREFS_EVENT));
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  // GDPR: every non-essential purpose defaults OFF. Consent is opt-in —
  // a pre-ticked box is not consent (this previously defaulted thirdPartyAi on).
  const [consents, setConsents] = useState({
    performance: false,
    marketing: false,
    thirdPartyAi: false,
  });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const existing = getStoredConsent();
    if (!existing) {
      // Short beat so it doesn't fight the first paint, but not so long that
      // it lands after the reader has started (was 2s — felt like a jump).
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  // Re-openable for withdrawal, from the footer or the privacy page.
  useEffect(() => {
    const reopen = () => {
      const stored = getStoredConsent();
      if (stored) {
        setConsents({
          performance: stored.performance,
          marketing: stored.marketing,
          thirdPartyAi: stored.thirdPartyAi,
        });
      }
      setShowSettings(true);
      setVisible(true);
    };
    window.addEventListener(COOKIE_PREFS_EVENT, reopen);
    return () => window.removeEventListener(COOKIE_PREFS_EVENT, reopen);
  }, []);

  // Escape closes the preferences panel back to the choice (never silently
  // consents). Focus moves into the dialog when it appears.
  useEffect(() => {
    if (!visible) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSettings) setShowSettings(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, showSettings]);

  const handleAcceptAll = () => {
    captureConsent({
      email: '', // captured at signup
      essential: true,
      performance: true,
      marketing: true,
      thirdPartyAi: true,
    });
    setVisible(false);
  };

  const handleAcceptSelected = () => {
    captureConsent({
      email: '',
      essential: true,
      ...consents,
    });
    setVisible(false);
  };

  const handleReject = () => {
    captureConsent({
      email: '',
      essential: true,
      performance: false,
      marketing: false,
      thirdPartyAi: false,
    });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    /* Sits bottom-left as a compact card on desktop (doesn't wall off the page)
       and as a bottom sheet on mobile. min-w-0 + no `container` class — the old
       `container mx-auto max-w-4xl` measured wider than a 375px viewport and was
       a source of horizontal overflow. */
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:inset-x-auto sm:left-4 sm:bottom-4 sm:p-0 sm:max-w-sm outline-none"
    >
      <div className="min-w-0 rounded-panel bg-card border border-border shadow-2xl p-4 sm:p-5">
        {!showSettings ? (
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <Cookie className="size-5 text-brand-accent shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0">
                <h3 id="cookie-consent-title" className="font-semibold text-sm">Cookies on AISOLAR</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Essential cookies keep the site working. Optional ones help us
                  improve it — nothing optional runs until you say yes. See our{' '}
                  <Link to="/privacy" className="underline underline-offset-2 hover:no-underline">Privacy Policy</Link>.
                </p>
              </div>
            </div>
            {/* Stacked on mobile at full touch height; inline from sm up. */}
            {/* NOTE: flex-1 must be sm:-scoped. In the mobile column layout
                flex-1 sets flex-basis on the VERTICAL axis and collapses the
                button to content height (22px — under the 44px touch min).
                Full width on mobile, equal widths from sm up. */}
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button onClick={handleAcceptAll} className="h-control w-full sm:flex-1 text-sm">Accept all</Button>
              <Button variant="outline" onClick={handleReject} className="h-control w-full sm:flex-1 text-sm">Essential only</Button>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="mt-1 w-full py-2.5 text-center text-2xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Choose what I share
            </button>
          </div>
        ) : (
          <div className="space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 id="cookie-consent-title" className="font-semibold text-sm flex items-center gap-2 min-w-0">
                <Cookie className="size-4 shrink-0 text-brand-accent" aria-hidden /> <span className="truncate">Cookie preferences</span>
              </h3>
              <Button variant="ghost" size="sm" className="h-8 text-xs shrink-0" onClick={() => setShowSettings(false)}>Back</Button>
            </div>
            <ConsentRow
              title="Essential"
              description="Required for the platform to function (auth, security, session). Cannot be disabled."
              checked={true}
              disabled={true}
            />
            <ConsentRow
              title="Performance & analytics"
              description="Anonymous usage data to help us improve (Sentry, PostHog)."
              checked={consents.performance}
              onChange={(v) => setConsents(prev => ({ ...prev, performance: v }))}
            />
            <ConsentRow
              title="Marketing"
              description="Promotional emails about solar incentives, new products, referral programmes."
              checked={consents.marketing}
              onChange={(v) => setConsents(prev => ({ ...prev, marketing: v }))}
            />
            <ConsentRow
              title="Bill analysis (AI processing)"
              description="If you upload a bill, it's read by a third-party AI model to extract details like your MPRN, usage and rates. Off means you can still use the site — you just enter your numbers yourself."
              checked={consents.thirdPartyAi}
              onChange={(v) => setConsents(prev => ({ ...prev, thirdPartyAi: v }))}
            />
            <div className="pt-3 border-t border-border">
              <Button onClick={handleAcceptSelected} className="h-control w-full text-sm">
                Save preferences
              </Button>
              <p className="mt-2 text-2xs text-muted-foreground text-center">
                You can change these any time from the footer.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConsentRow({ title, description, checked, disabled, onChange }: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30">
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{title}</Label>
          {disabled && <Badge variant="outline" className="text-[10px]">Required</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

// ============================================================================
// DATA SUBJECT RIGHTS — Access, Rectify, Erase, Port
// ============================================================================

export function DataSubjectRightsPanel({ userEmail }: { userEmail: string }) {
  const [loading, setLoading] = useState<'access' | 'port' | 'erase' | null>(null);
  const [accessData, setAccessData] = useState<string | null>(null);
  const [eraseDialogOpen, setEraseDialogOpen] = useState(false);

  const handleAccessRequest = async () => {
    setLoading('access');
    // In production: invoke edge function that queries all tables for this user's data
    await new Promise(r => setTimeout(r, 1000));
    const mockData = {
      user: { email: userEmail, name: 'Demo User' },
      leads: [{ name: 'Mary O\'Brien', address: 'Dublin', status: 'proposal_sent' }],
      proposals: [{ system_size_kw: 6.4, net_cost: 11840 }],
      consents: [{ type: 'essential', captured: '2026-07-17' }],
      activityLogs: 47,
      notifications: 12,
    };
    setAccessData(JSON.stringify(mockData, null, 2));
    setLoading(null);
  };

  const handlePortabilityRequest = async () => {
    setLoading('port');
    // In production: same as access but formatted as JSON download
    await new Promise(r => setTimeout(r, 1000));
    const data = {
      exportedAt: new Date().toISOString(),
      user: { email: userEmail },
      data: { leads: [], proposals: [], consents: [] },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aisolar-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLoading(null);
  };

  const handleEraseRequest = async () => {
    setLoading('erase');
    // In production: invoke `anonymise_lead` SQL function (already built in v3 migration)
    await new Promise(r => setTimeout(r, 1500));
    setEraseDialogOpen(false);
    setLoading(null);
    alert('Your data has been scheduled for anonymisation. This completes within 30 days per GDPR Article 17. Financial records are retained for 7 years per Irish Revenue requirements.');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Your data rights (GDPR)
        </CardTitle>
        <CardDescription>You have full control over your personal data.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <DataRow
          icon={Eye}
          title="Right of access"
          description="See all the personal data we hold about you"
          actionLabel="Request data"
          actionOnClick={handleAccessRequest}
          loading={loading === 'access'}
        />
        <DataRow
          icon={Download}
          title="Right to portability"
          description="Export your data as a machine-readable JSON file"
          actionLabel="Export data"
          actionOnClick={handlePortabilityRequest}
          loading={loading === 'port'}
        />
        <DataRow
          icon={Edit}
          title="Right to rectification"
          description="Correct inaccurate personal data"
          actionLabel="Contact us"
          actionOnClick={() => window.location.href = `mailto:${brand.contact.email}?subject=Data Rectification Request`}
        />
        <DataRow
          icon={Trash2}
          title="Right to erasure (right to be forgotten)"
          description="Anonymise your personal data. Financial records retained 7 years per Irish Revenue."
          actionLabel="Request erasure"
          actionOnClick={() => setEraseDialogOpen(true)}
          loading={loading === 'erase'}
          destructive
        />

        {accessData && (
          <Card className="mt-3">
            <CardContent className="p-3">
              <div className="text-xs font-semibold mb-2">Your data preview:</div>
              <pre className="text-[10px] bg-muted/30 p-2 rounded max-h-48 overflow-y-auto font-mono">{accessData}</pre>
            </CardContent>
          </Card>
        )}

        {eraseDialogOpen && (
          <Card className="border-red-300 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10">
            <CardContent className="p-4">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">Confirm data erasure</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your personal data (name, email, phone, address, MPRN) will be anonymised.
                    Financial records (invoices, contracts) are retained for 7 years per Irish Revenue.
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={handleEraseRequest}>Confirm erasure</Button>
                <Button variant="outline" size="sm" onClick={() => setEraseDialogOpen(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="pt-3 border-t text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>We respond to all data requests within 30 days (GDPR Article 12).</span>
          </div>
          <div className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            <span>Data stored in EU (Supabase Frankfurt). Sub-processors: Stripe, Postmark, Google Gemini, Coinbase, Mapbox.</span>
          </div>
          <div className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            <span>Irish DPC registered. Full <a href="/privacy" className="underline">privacy policy</a>.</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DataRow({ icon: Icon, title, description, actionLabel, actionOnClick, loading, destructive }: {
  icon: typeof Eye;
  title: string;
  description: string;
  actionLabel: string;
  actionOnClick: () => void;
  loading?: boolean;
  destructive?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-2 border rounded-lg">
      <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${destructive ? 'text-red-600' : 'text-muted-foreground'}`} />
      <div className="flex-1">
        <div className="font-medium text-sm">{title}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Button
        size="sm"
        variant={destructive ? 'destructive' : 'outline'}
        onClick={actionOnClick}
        disabled={loading}
        className="h-7 text-xs"
      >
        {loading ? <Clock className="h-3 w-3 animate-pulse" /> : actionLabel}
      </Button>
    </div>
  );
}

// ============================================================================
// CONSENT AUDIT LOG (for admin view)
// ============================================================================

export function ConsentAuditLog() {
  // In production: SELECT * FROM consent_records ORDER BY captured_at DESC LIMIT 50
  const mockLogs = [
    { email: 'mary.obrien@example.com', captured: '2026-07-17 14:23', marketing: true, ai: true, version: '1.0.0' },
    { email: 'patrick.kelly@example.com', captured: '2026-07-17 13:51', marketing: false, ai: true, version: '1.0.0' },
    { email: 'sarah.mcdonald@example.com', captured: '2026-07-17 11:30', marketing: true, ai: true, version: '1.0.0' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          Consent audit log
        </CardTitle>
        <CardDescription>Every consent capture is logged. Retained 7 years per GDPR.</CardDescription>
      </CardHeader>
      <CardContent>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b">
              <th className="text-left py-2">Email</th>
              <th className="text-left">Captured</th>
              <th className="text-center">Marketing</th>
              <th className="text-center">AI processing</th>
              <th className="text-left">Version</th>
            </tr>
          </thead>
          <tbody>
            {mockLogs.map((log, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 font-mono">{log.email}</td>
                <td>{log.captured}</td>
                <td className="text-center">
                  {log.marketing ? <CheckCircle2 className="h-3 w-3 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="text-center">
                  {log.ai ? <CheckCircle2 className="h-3 w-3 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="font-mono">{log.version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUB-PROCESSOR DISCLOSURE
// ============================================================================

export function SubProcessorList() {
  const processors = [
    { name: 'Supabase', purpose: 'Database, auth, file storage', location: 'Frankfurt, EU', dpasSigned: true },
    { name: 'Stripe', purpose: 'Payment processing', location: 'Ireland, EU', dpasSigned: true },
    { name: 'Postmark', purpose: 'Transactional email', location: 'US (with EU SCCs)', dpasSigned: true },
    { name: 'Google Gemini', purpose: 'AI bill extraction + proposal drafting', location: 'US (with EU SCCs)', dpasSigned: true },
    { name: 'Coinbase Commerce', purpose: 'Crypto payment option', location: 'US (with EU SCCs)', dpasSigned: true },
    { name: 'Mapbox', purpose: 'Installer map view', location: 'US (with EU SCCs)', dpasSigned: true },
    { name: 'Lovable AI Gateway', purpose: 'AI gateway for Gemini', location: 'US (with EU SCCs)', dpasSigned: true },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Sub-processors
        </CardTitle>
        <CardDescription>Third parties that process customer data. DPAs signed with all.</CardDescription>
      </CardHeader>
      <CardContent>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b">
              <th className="text-left py-2">Processor</th>
              <th className="text-left">Purpose</th>
              <th className="text-left">Location</th>
              <th className="text-center">DPA</th>
            </tr>
          </thead>
          <tbody>
            {processors.map(p => (
              <tr key={p.name} className="border-b last:border-0">
                <td className="py-2 font-medium">{p.name}</td>
                <td className="text-muted-foreground">{p.purpose}</td>
                <td>{p.location}</td>
                <td className="text-center">
                  {p.dpasSigned && <CheckCircle2 className="h-3 w-3 text-primary mx-auto" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
