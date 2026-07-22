/**
 * Prestigious Auth — for installer/consultant sign-in + signup.
 *
 * Redesigned to feel premium:
 *   - Split-screen on desktop (brand showcase left, form right)
 *   - Animated gradient background
 *   - Floating glassmorphism card
 *   - Trust indicators (SEAI, RECI, customer count)
 *   - Two paths: "I'm a solar customer" (anonymous booking) vs "I'm staff" (sign in)
 *   - Role picker with visual cards (not dropdown)
 *   - Social proof + outcome selling
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { z } from 'zod';
import {
  ArrowRight, ArrowLeft, Shield, Award, Mail, Lock, User, Phone,
  Wrench, CheckCircle2, Building2, UserCircle, FileText,
} from 'lucide-react';
import { brand } from '@/config/brand';
import { AiosGlyph, AisolarWordmark } from '@/components/brand/AiosMark';
import { motion, AnimatePresence } from 'framer-motion';

const emailSchema = z.string().email('Invalid email address').max(255);
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(100);

type RoleType = 'owner' | 'consultant' | 'installer' | 'customer';

export default function PrestigiousAuth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'choose' | 'signin' | 'signup'>('choose');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<RoleType>('owner');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        redirectBasedOnRoles(session.user.id);
      }
    });
  }, [navigate]);

  const redirectBasedOnRoles = async (userId: string) => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    const userRoles = (roles || []).map(r => r.role);

    if (userRoles.length === 1 && userRoles.includes('installer')) {
      navigate('/installer');
    } else if (userRoles.length === 1 && userRoles.includes('customer')) {
      navigate('/my-projects');
    } else if (userRoles.length > 1) {
      navigate('/owner'); // owner with multiple roles → birdseye view
    } else {
      navigate('/consultant');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: 'Validation Error', description: error.issues[0].message, variant: 'destructive' });
      }
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({ title: 'Sign In Error', description: error.message, variant: 'destructive' });
      setLoading(false);
    } else if (data.user) {
      redirectBasedOnRoles(data.user.id);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: 'Validation Error', description: error.issues[0].message, variant: 'destructive' });
      }
      return;
    }

    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl, data: { role, full_name: name } },
    });

    if (error) {
      toast({ title: 'Sign Up Error', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (data.user) {
      // Role assignment happens server-side via handle_new_user trigger (v3)
      toast({
        title: 'Account created',
        description: 'Check your email to confirm your account, then sign in.',
      });
      setMode('signin');
    }
    setLoading(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try { emailSchema.parse(resetEmail); } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: 'Validation Error', description: error.issues[0].message, variant: 'destructive' });
      }
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Check your email', description: 'We sent you a password reset link.' });
      setResetDialogOpen(false);
      setResetEmail('');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: brand panel (desktop only) — solid charcoal, one quiet infinity
          motif, and only claims we can stand behind. */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary text-primary-foreground p-14 flex-col justify-between relative overflow-hidden">
        {/* A single, subtle infinity motif — used sparingly, low contrast. */}
        <AiosGlyph className="absolute -right-16 -bottom-10 w-[32rem] h-auto text-primary-foreground/[0.04]" />

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors mb-14">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="mb-10">
            <AisolarWordmark className="size-20" />
            <div className="text-base text-primary-foreground/60 mt-3 ml-1">by AIOS</div>
          </div>

          <h1 className="text-4xl font-semibold tracking-tight leading-[1.1] mb-5 max-w-md">
            The operating system for solar installers.
          </h1>
          <p className="text-lg text-primary-foreground/70 leading-relaxed mb-10 max-w-md">
            Upload a homeowner's bill and the agents take it from there — proposals
            drafted, surveys scheduled, follow-ups sent. Your crews install. The
            platform runs the rest.
          </p>

          <div className="space-y-3.5 max-w-md">
            {[
              { icon: FileText, text: 'Reads 21 details off every bill — tariff, day/night split, MPRN' },
              { icon: CheckCircle2, text: 'Agents draft, schedule and follow up — you approve, never chase' },
              { icon: Building2, text: 'One cockpit for owner, consultant and crew' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="flex items-start gap-3"
                >
                  <span className="mt-0.5 p-1.5 rounded-md bg-primary-foreground/10">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm leading-relaxed text-primary-foreground/85">{item.text}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-sm text-primary-foreground/60">
          <span className="flex items-center gap-1.5"><Award className="h-4 w-4" /> SEAI Registered</span>
          <span className="flex items-center gap-1.5"><Shield className="h-4 w-4" /> RECI aware</span>
        </div>
      </div>

      {/* Right: Auth form */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-10 bg-background">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {/* CHOOSE MODE */}
            {mode === 'choose' && (
              <motion.div
                key="choose"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="text-center mb-8">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex mb-5">
                    <AisolarWordmark className="size-16" />
                  </motion.div>
                  <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
                  <p className="text-muted-foreground mt-2">Sign in to your dashboard, or start a free bill analysis.</p>
                </div>

                {/* Two paths */}
                <div className="space-y-3">
                  {/* Customer path */}
                  <button
                    onClick={() => navigate('/upload')}
                    className="w-full p-5 rounded-xl border-2 border-primary/40 dark:border-primary/40 bg-primary/10 dark:bg-primary/10 hover:border-primary/40 transition-shadow hover:shadow-lg transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-primary/10 dark:bg-primary/10 rounded-xl">
                        <UserCircle className="h-6 w-6 text-primary dark:text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-base">I'm a homeowner</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Upload your electricity bill for a free analysis, book a consultation, and
                          follow your job from quote to install.
                        </p>
                        <div className="flex items-center gap-1 text-primary dark:text-primary text-sm font-medium mt-2 group-hover:gap-2 transition-all">
                          Start free analysis <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Staff path */}
                  <button
                    onClick={() => setMode('signin')}
                    className="w-full p-5 rounded-xl border-2 border-primary/40 dark:border-primary/40 bg-primary/10 dark:bg-primary/10 hover:border-primary/40 transition-shadow hover:shadow-lg transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-primary/10 dark:bg-primary/10 rounded-xl">
                        <Wrench className="h-6 w-6 text-primary dark:text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-base">I'm staff (installer / consultant / owner)</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your cockpit — pipeline, surveys, proposals, installs, and the agents
                          that run them.
                        </p>
                        <div className="flex items-center gap-1 text-primary dark:text-primary text-sm font-medium mt-2 group-hover:gap-2 transition-all">
                          Sign in <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Sign up */}
                  <div className="text-center pt-4">
                    <p className="text-sm text-muted-foreground">
                      New to {brand.name}?{' '}
                      <button onClick={() => setMode('signup')} className="text-primary hover:underline font-medium">
                        Create an account
                      </button>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SIGN IN MODE */}
            {mode === 'signin' && (
              <motion.div
                key="signin"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="shadow-xl">
                  <CardContent className="p-6">
                    <button
                      onClick={() => setMode('choose')}
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
                    >
                      <ArrowLeft className="h-3 w-3" /> Back
                    </button>

                    <div className="text-center mb-6">
                      <AisolarWordmark className="size-14 mx-auto mb-3" />
                      <h1 className="text-xl font-semibold tracking-tight">Staff sign in</h1>
                      <p className="text-sm text-muted-foreground mt-1">Owner, consultant or installer — one login.</p>
                    </div>

                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <div className="relative mt-1">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@aisolar.ie"
                            required
                            className="pl-9 h-11"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="password">Password</Label>
                        <div className="relative mt-1">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="pl-9 h-11"
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 bg-pop text-pop-foreground hover:bg-pop/90 font-medium"
                      >
                        {loading ? 'Signing in…' : 'Sign in'}
                      </Button>
                    </form>

                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setResetDialogOpen(true)}
                        className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                      >
                        Forgot your password?
                      </button>
                    </div>

                    <div className="mt-6 pt-4 border-t text-center text-sm">
                      <span className="text-muted-foreground">No account? </span>
                      <button onClick={() => setMode('signup')} className="text-primary hover:underline font-medium">
                        Create one
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* SIGN UP MODE */}
            {mode === 'signup' && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="shadow-xl">
                  <CardContent className="p-6">
                    <button
                      onClick={() => setMode('choose')}
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
                    >
                      <ArrowLeft className="h-3 w-3" /> Back
                    </button>

                    <div className="text-center mb-6">
                      <AisolarWordmark className="size-14 mx-auto mb-3" />
                      <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
                      <p className="text-sm text-muted-foreground mt-1">Free to start. No card required.</p>
                    </div>

                    {/* Role picker — visual cards */}
                    <div className="mb-4">
                      <Label>I am a…</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {[
                          { id: 'owner' as const, icon: Building2, label: 'Owner', desc: 'Full access' },
                          { id: 'installer' as const, icon: Wrench, label: 'Installer', desc: 'Field crew' },
                          { id: 'consultant' as const, icon: User, label: 'Consultant', desc: 'Sales + pipeline' },
                          { id: 'customer' as const, icon: UserCircle, label: 'Customer', desc: 'My project' },
                        ].map(opt => {
                          const Icon = opt.icon;
                          const isSelected = role === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setRole(opt.id)}
                              className={`p-3 rounded-lg border-2 transition-all text-left ${
                                isSelected
                                  ? 'border-primary/40 bg-primary/10 dark:bg-primary/10'
                                  : 'border-border hover:border-primary/40'
                              }`}
                            >
                              <Icon className={`h-5 w-5 mb-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                              <div className="font-semibold text-sm">{opt.label}</div>
                              <div className="text-xs text-muted-foreground">{opt.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <form onSubmit={handleSignUp} className="space-y-3">
                      <div>
                        <Label htmlFor="name">Full name</Label>
                        <div className="relative mt-1">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Pat Walsh"
                            required
                            className="pl-9 h-11"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <div className="relative mt-1">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@aisolar.ie"
                            required
                            className="pl-9 h-11"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone <span className="text-xs text-muted-foreground">(optional)</span></Label>
                        <div className="relative mt-1">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="08X XXX XXXX"
                            className="pl-9 h-11"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="password">Password</Label>
                        <div className="relative mt-1">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Min 8 characters"
                            required
                            className="pl-9 h-11"
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 bg-pop text-pop-foreground hover:bg-pop/90 font-medium"
                      >
                        {loading ? 'Creating account…' : 'Create account'}
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        By signing up you agree to our{' '}
                        <Link to="/terms" className="underline hover:text-foreground">Terms</Link> and{' '}
                        <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
                      </p>
                    </form>

                    <div className="mt-6 pt-4 border-t text-center text-sm">
                      <span className="text-muted-foreground">Already have an account? </span>
                      <button onClick={() => setMode('signin')} className="text-primary hover:underline font-medium">
                        Sign in
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reset password dialog */}
          <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset password</DialogTitle>
                <DialogDescription>Enter your email and we'll send you a reset link.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePasswordReset} className="space-y-3">
                <Input
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="you@aisolar.ie"
                  required
                />
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Sending…' : 'Send reset link'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
