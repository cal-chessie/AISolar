import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sun, Mail, ArrowRight, CheckCircle2, LogIn, AlertCircle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { brand } from '@/config/brand';

/**
 * v3 SECURITY: ClientPortal (email → access_token lookup) was the v1 PII leak.
 * Anyone could type a victim's email and receive back their access_token +
 * full PII. This page now does ONE safe thing: requests a magic link.
 *
 * The magic link is sent via the existing Supabase auth flow — the customer
 * signs in with their email, gets a one-time link, and lands on /my-projects
 * (CustomerDashboard) which uses their auth.uid() to fetch only their own leads.
 *
 * No access_token is ever exposed to the client. No email enumeration.
 */
export default function ClientPortal() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      // Dynamic import to avoid pulling supabase into the production bundle
      // if this page is never visited (code-split).
      const { supabase } = await import('@/integrations/supabase/client');

      const { error: sendError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/my-projects`,
          shouldCreateUser: false, // only existing customers can sign in
        },
      });

      if (sendError) {
        // Common: "User not found" — we don't reveal whether the email exists.
        // Supabase may return this as an error; we treat it as success to avoid enumeration.
        if (sendError.message.toLowerCase().includes('not found') ||
            sendError.message.toLowerCase().includes('not registered')) {
          setSent(true);
        } else {
          setError(sendError.message);
        }
      } else {
        setSent(true);
      }
    } catch (err: any) {
      // Don't reveal whether the email exists in our system.
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Customer Sign In | {brand.name}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-emerald-950/20 dark:via-background dark:to-blue-950/20 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <Sun className="h-4 w-4" />
            Back to home
          </Link>

          <Card className="shadow-xl border-border/50">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <motion.div
                  className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center shadow-lg shadow-primary/20"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sun className="h-7 w-7 text-white" />
                </motion.div>
              </div>
              <CardTitle className="text-2xl">Customer Sign In</CardTitle>
              <CardDescription>
                Enter your email and we'll send you a secure sign-in link.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {sent ? (
                <div className="text-center space-y-3 py-4">
                  <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
                  <h3 className="font-semibold text-lg">Check your email</h3>
                  <p className="text-sm text-muted-foreground">
                    If you have a project with {brand.name}, we've sent a sign-in link to
                    <span className="font-medium text-foreground"> {email}</span>.
                    Click the link to view your solar project.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    The link expires in 1 hour. If you don't see the email, check your spam folder.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => { setSent(false); setEmail(''); }}
                  >
                    Use a different email
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSendMagicLink} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="mt-1"
                      autoComplete="email"
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 p-3 rounded bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 text-white font-semibold shadow-lg shadow-primary/20"
                    disabled={loading}
                  >
                    {loading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending link…</>
                    ) : (
                      <>Send sign-in link <ArrowRight className="h-4 w-4 ml-2" /></>
                    )}
                  </Button>

                  <div className="text-center text-xs text-muted-foreground space-y-1">
                    <p>
                      <Mail className="h-3 w-3 inline mr-1" />
                      We'll email you a one-time link — no password needed.
                    </p>
                    <p>
                      Don't have a project yet?{' '}
                      <Link to="/upload" className="text-primary hover:underline font-medium">
                        Get a free solar analysis
                      </Link>
                    </p>
                  </div>
                </form>
              )}

              <div className="mt-6 pt-4 border-t text-center">
                <p className="text-xs text-muted-foreground mb-2">Staff member?</p>
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
                >
                  <LogIn className="h-3 w-3" /> Staff sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
