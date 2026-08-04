/**
 * InstallerSignup — the A1 entry on the AISolar site. Opens with the door fork
 * (Cal): installer vs "estimate for my property". Installer → the signup flow
 * that provisions their tenant (card-payer = admin, 7-day trial). Property →
 * the existing estimate flow (which routes the lead to Solar Ireland Group).
 *
 * INSTALLER COPY throughout — the copy law: this is someone adopting the software
 * to run their business, NOT a homeowner getting a solar quote.
 *
 * Stripe card capture is the next slice; today the trial starts on signup and the
 * tenant provisions. Going live is gated on GATE 0 (key rotation).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, HardHat, Home, Search, MessageSquare, Calendar, Mail, CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { provisionTenant } from '@/lib/tenant';
import OnboardingFlow, { type OnboardingStep, type OnboardingAnswers } from '@/components/onboarding/OnboardingFlow';

export default function InstallerSignup() {
  const navigate = useNavigate();
  const [entry, setEntry] = useState<'door' | 'installer'>('door');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const steps: OnboardingStep[] = [
    {
      kind: 'chip', id: 'role', question: "Who's setting this up?",
      sub: 'So the workspace fits how you work.',
      options: [
        { value: 'owner', label: 'The owner', sub: 'I run the business', icon: Building2 },
        { value: 'consultant', label: 'A consultant', sub: 'I sell and quote', icon: Users },
        { value: 'installer', label: 'An installer', sub: "I'm on the tools", icon: HardHat },
      ],
    },
    {
      kind: 'chip', id: 'source', question: 'How did you hear about us?',
      sub: 'Genuinely helps us reach more installers like you.',
      options: [
        { value: 'search', label: 'Search', icon: Search },
        { value: 'referral', label: 'Word of mouth', icon: MessageSquare },
        { value: 'social', label: 'Social', icon: Users },
        { value: 'event', label: 'An event or wholesaler', icon: Calendar },
      ],
    },
    {
      kind: 'input', id: 'company', question: 'Your company', cta: 'Continue',
      sub: 'This becomes your brand across the app — you can refine it later.',
      fields: [
        { name: 'company', label: 'Company name', placeholder: 'e.g. AISolar', required: true },
        { name: 'county', label: 'County', placeholder: 'e.g. Roscommon' },
      ],
    },
    {
      kind: 'input', id: 'account', question: 'Create your account', cta: 'Start my 7-day trial',
      sub: "You're the admin — you'll add your team after.",
      fields: [
        { name: 'email', label: 'Work email', type: 'email', placeholder: 'you@company.ie', required: true },
        { name: 'password', label: 'Password', type: 'password', placeholder: '8+ characters', required: true },
      ],
    },
  ];

  const onComplete = async (a: OnboardingAnswers) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email: a.email, password: a.password });
      if (error) { setNotice(error.message); return; }
      if (data.session) {
        // Authenticated immediately (email confirmation off) — the card-payer
        // provisions their tenant now and lands in the owner cockpit.
        await provisionTenant(a.company, a.county || null);
        navigate('/owner');
      } else {
        // Email confirmation required — stash the pending tenant so it provisions
        // on first authenticated load, and tell them to confirm.
        try { localStorage.setItem('aisolar_pending_tenant', JSON.stringify({ company: a.company, county: a.county || null })); } catch { /* ignore */ }
        setNotice('confirm-email');
      }
    } finally { setBusy(false); }
  };

  if (notice === 'confirm-email') {
    return (
      <div className="min-h-dvh grid place-items-center bg-background px-5">
        <div className="max-w-sm text-center">
          <div className="size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto"><Mail className="size-6" /></div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Check your inbox</h1>
          <p className="mt-2 text-muted-foreground leading-body">Confirm your email and we'll finish setting up your workspace — your company, brand and trial are ready to go.</p>
        </div>
      </div>
    );
  }
  if (notice) {
    return (
      <div className="min-h-dvh grid place-items-center bg-background px-5">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">{notice}</p>
          <button onClick={() => setNotice(null)} className="mt-4 h-11 px-5 rounded-control bg-primary text-primary-foreground font-medium">Try again</button>
        </div>
      </div>
    );
  }

  if (entry === 'installer') return <OnboardingFlow steps={steps} onComplete={onComplete} busy={busy} />;

  // THE DOOR — the first fork on the AISolar site.
  return (
    <div className="min-h-dvh flex flex-col justify-center bg-background px-5 py-10">
      <div className="max-w-lg w-full mx-auto">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">What brings you here?</h1>
          <p className="mt-3 text-muted-foreground leading-body">Two ways in — pick the one that's you.</p>
        </div>
        <div className="mt-8 grid gap-3">
          <button onClick={() => setEntry('installer')}
            className="group rounded-panel border border-border bg-card shadow-card p-5 text-left flex items-center gap-4 hover:border-primary/50 transition-colors">
            <span className="size-12 rounded-lg bg-primary text-primary-foreground grid place-items-center shrink-0"><HardHat className="size-6" /></span>
            <span className="flex-1 min-w-0">
              <span className="font-semibold block">I'm an installer</span>
              <span className="block text-sm text-muted-foreground mt-0.5">Run my solar business on AISolar — quotes, compliance, install, grant, all in one.</span>
            </span>
            <ArrowRight className="size-5 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />
          </button>
          <button onClick={() => navigate('/start')}
            className="group rounded-panel border border-border bg-card shadow-card p-5 text-left flex items-center gap-4 hover:border-primary/50 transition-colors">
            <span className="size-12 rounded-lg bg-muted grid place-items-center shrink-0"><Home className="size-6" /></span>
            <span className="flex-1 min-w-0">
              <span className="font-semibold block">A solar estimate for my property</span>
              <span className="block text-sm text-muted-foreground mt-0.5">Home or business — get your system size, grant and payback on your real numbers.</span>
            </span>
            <ArrowRight className="size-5 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />
          </button>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <CheckCircle2 className="size-3.5 text-doc-deposit" /> 7-day free trial for installers · no card charged during the trial
        </p>
      </div>
    </div>
  );
}
