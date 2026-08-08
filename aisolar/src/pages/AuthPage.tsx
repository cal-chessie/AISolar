/**
 * AuthPage — /auth (Sign in). The single sign-in door.
 *
 * Premium = focus: one centred card floating on the grey canvas, the product
 * tile, Google first, email underneath. New installers create their workspace at
 * /signup (the door fork + onboarding + plan + card); this page is sign-in only.
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { AisolarWordmark } from '@/components/brand/AiosMark';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { Button } from '@/components/ui/button';

const emailSchema = z.string().email('Enter a valid email').max(255);
const passwordSchema = z.string().min(8, 'Password needs at least 8 characters').max(100);

export default function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectByRole = async (userId: string) => {
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    const r = (roles || []).map(x => x.role);
    if (r.length === 1 && r.includes('installer')) navigate('/installer');
    else if (r.length === 1 && r.includes('customer')) navigate('/my-projects');
    else if (r.length > 1) navigate('/owner');
    else navigate('/consultant');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { emailSchema.parse(email); passwordSchema.parse(password); }
    catch (err) { if (err instanceof z.ZodError) toast.error(err.issues[0].message); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast.error('Sign in failed', { description: error.message });
    else if (data.user) { await redirectByRole(data.user.id); return; }
    setLoading(false);
  };

  const input = 'w-full h-11 rounded-control border border-input bg-background px-3.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25';

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      {/* quiet header: mark home-links, "new here?" points at the one signup door */}
      <header className="px-5 h-16 flex items-center justify-between">
        <Link to="/" aria-label="AIOS home"><AisolarWordmark className="size-9" /></Link>
        <Link to="/signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          New here? <span className="font-medium text-foreground">Get started</span>
        </Link>
      </header>

      <main className="flex-1 grid place-items-center px-5 py-10">
        <div className="w-full max-w-sm">
          {/* the card */}
          <div className="rounded-panel bg-card shadow-card p-6 sm:p-8">
            <AisolarWordmark className="size-14" />
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1.5 text-sm text-muted-foreground leading-body">
              Sign in to your cockpit — owner, consultant or installer.
            </p>

            <GoogleAuthButton className="w-full mt-6" label="Sign in with Google" />

            <div className="flex items-center gap-3 my-5">
              <span className="h-px flex-1 bg-border" />
              <span className="text-2xs uppercase tracking-wide text-muted-foreground">or with email</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={submit} className="space-y-3">
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@company.ie" autoComplete="email" className={input} />
              <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" autoComplete="current-password" className={input} />
              <Button type="submit" disabled={loading} className="w-full h-11 rounded-control text-sm font-semibold">
                Sign in <ArrowRight className="size-4 ml-1" />
              </Button>
            </form>

            <button className="mt-4 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
              onClick={async () => {
                if (!email) { toast.error('Enter your email first'); return; }
                const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth` });
                if (error) toast.error(error.message); else toast.success('Reset link sent', { description: 'Check your email.' });
              }}>
              Forgot password?
            </button>
          </div>

          <p className="mt-5 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <ShieldCheck className="size-3.5" /> EU-hosted · GDPR tooling built in · your keys stay yours
          </p>
        </div>
      </main>
    </div>
  );
}
