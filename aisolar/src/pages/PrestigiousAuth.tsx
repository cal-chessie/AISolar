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
  Zap, ArrowRight, ArrowLeft, Shield, Award, Users, TrendingUp,
  Sun, Wrench, Calendar, Mail, Lock, User, Phone, Sparkles, CheckCircle2,
  Building2, UserCircle, Star,
} from 'lucide-react';
import { brand } from '@/config/brand';
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
      {/* Left: Brand showcase (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-700 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-yellow-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-12">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-white/10 backdrop-blur rounded-2xl">
              <Sun className="h-8 w-8" />
            </div>
            <div>
              <div className="text-2xl font-bold">{brand.name}</div>
              <div className="text-sm text-white/70">{brand.tagline}</div>
            </div>
          </div>

          <h1 className="text-4xl font-bold leading-tight mb-4">
            Run your solar business on autopilot.
          </h1>
          <p className="text-lg text-white/80 mb-8">
            Bill extract at the front door. Autonomous agents handle survey scheduling,
            proposal drafting, SEAI grants, install coordination, and follow-ups.
            Your crews install. The platform does the rest.
          </p>

          <div className="space-y-3">
            {[
              { icon: Zap, text: '10 autonomous agents working 24/7' },
              { icon: TrendingUp, text: '42% lift in survey→proposal conversion' },
              { icon: Shield, text: 'SEAI grant auto-filed · RECI sign-off built in' },
              { icon: Users, text: '3 hours saved per consultant per day' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="p-2 bg-white/10 backdrop-blur rounded-lg">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm">{item.text}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-sm text-white/70">
          <div className="flex items-center gap-1">
            <Award className="h-4 w-4" /> SEAI Registered
          </div>
          <div className="flex items-center gap-1">
            <Shield className="h-4 w-4" /> RECI Certified
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4" /> 4.9★ customer rating
          </div>
        </div>
      </div>

      {/* Right: Auth form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-background dark:to-blue-950/20">
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
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 mb-4 shadow-lg shadow-emerald-500/30"
                  >
                    <Sun className="h-8 w-8 text-white" />
                  </motion.div>
                  <h1 className="text-3xl font-bold">Welcome to {brand.name}</h1>
                  <p className="text-muted-foreground mt-2">Sign in to your dashboard, or get a free solar analysis.</p>
                </div>

                {/* Two paths */}
                <div className="space-y-3">
                  {/* Customer path */}
                  <button
                    onClick={() => navigate('/upload')}
                    className="w-full p-5 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-emerald-400 transition-shadow hover:shadow-lg transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 rounded-xl">
                        <UserCircle className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-base">I'm a homeowner</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Get a free solar analysis from your electricity bill. Book a consultation.
                          Track your project from quote to install.
                        </p>
                        <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 text-sm font-medium mt-2 group-hover:gap-2 transition-all">
                          Start free analysis <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Staff path */}
                  <button
                    onClick={() => setMode('signin')}
                    className="w-full p-5 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 hover:border-blue-400 transition-shadow hover:shadow-lg transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-blue-100 dark:bg-blue-950/40 rounded-xl">
                        <Wrench className="h-6 w-6 text-blue-700 dark:text-blue-300" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-base">I'm staff (installer / consultant / owner)</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Sign in to your dashboard. Manage your pipeline, surveys, proposals,
                          installs, agents, and analytics.
                        </p>
                        <div className="flex items-center gap-1 text-blue-700 dark:text-blue-300 text-sm font-medium mt-2 group-hover:gap-2 transition-all">
                          Sign in <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Sign up */}
                  <div className="text-center pt-4">
                    <p className="text-sm text-muted-foreground">
                      New to {brand.name}?{' '}
                      <button onClick={() => setMode('signup')} className="text-blue-600 hover:underline font-medium">
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
                      <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 mb-3">
                        <Lock className="h-6 w-6 text-white" />
                      </div>
                      <h1 className="text-2xl font-bold">Staff sign in</h1>
                      <p className="text-sm text-muted-foreground mt-1">Access your {brand.name} dashboard</p>
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
                        className="w-full h-11 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold shadow-lg"
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
                      <button onClick={() => setMode('signup')} className="text-blue-600 hover:underline font-medium">
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
                      <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 mb-3">
                        <Sparkles className="h-6 w-6 text-white" />
                      </div>
                      <h1 className="text-2xl font-bold">Create your account</h1>
                      <p className="text-sm text-muted-foreground mt-1">Start your free 14-day trial. No credit card.</p>
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
                                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                                  : 'border-border hover:border-emerald-300'
                              }`}
                            >
                              <Icon className={`h-5 w-5 mb-1 ${isSelected ? 'text-emerald-600' : 'text-muted-foreground'}`} />
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
                        className="w-full h-11 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold shadow-lg"
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
                      <button onClick={() => setMode('signin')} className="text-blue-600 hover:underline font-medium">
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
