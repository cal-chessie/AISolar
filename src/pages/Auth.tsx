import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { z } from 'zod';
import { Zap } from 'lucide-react';

const emailSchema = z.string().email('Invalid email address').max(255);
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(100);

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [role, setRole] = useState<'consultant' | 'installer'>('consultant');

  useEffect(() => {
    // Check if user is already logged in or if this is a password recovery
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Check if this is a password recovery session
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        if (hashParams.get('type') === 'recovery') {
          setIsPasswordRecovery(true);
        } else {
          navigate('/consultant');
        }
      }
    });
  }, [navigate]);

  const validateInputs = () => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.issues[0].message,
          variant: 'destructive',
        });
      }
      return false;
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          role: role
        }
      }
    });

    if (error) {
      toast({
        title: 'Sign Up Error',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Create user_role entry
    if (data.user) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: data.user.id, role: role });

      if (roleError) {
        console.error('Error creating user role:', roleError);
      }

      // Create profile entry
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ 
          user_id: data.user.id,
          role: role
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }

      // Create installer profile if role is installer
      if (role === 'installer') {
        const { error: installerError } = await supabase
          .from('installers')
          .insert({ user_id: data.user.id });

        if (installerError) {
          console.error('Error creating installer profile:', installerError);
        }
      }
    }

    toast({
      title: 'Success!',
      description: 'Account created successfully. You can now sign in.',
    });
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: 'Sign In Error',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    } else {
      navigate('/consultant');
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(resetEmail);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.issues[0].message,
          variant: 'destructive',
        });
      }
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      toast({
        title: 'Reset Password Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Check Your Email',
        description: 'We sent you a password reset link. Please check your email.',
      });
      setResetDialogOpen(false);
      setResetEmail('');
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      passwordSchema.parse(newPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.issues[0].message,
          variant: 'destructive',
        });
      }
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        title: 'Update Password Error',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    } else {
      toast({
        title: 'Password Updated',
        description: 'Your password has been updated successfully.',
      });
      setIsPasswordRecovery(false);
      navigate('/consultant');
    }
  };

  if (isPasswordRecovery) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Set New Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Minimum 8 characters
                </p>
              </div>
              <Button
                type="submit"
                className="w-full gradient-primary text-white"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Consultant Portal</CardTitle>
          <CardDescription>Sign in to manage your solar leads</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="consultant@example.com"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="mt-1"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full gradient-primary text-white"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
              
              <div className="mt-4 text-center">
                <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="link" className="text-sm text-muted-foreground hover:text-primary">
                      Forgot your password?
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reset Password</DialogTitle>
                      <DialogDescription>
                        Enter your email address and we'll send you a link to reset your password.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                      <div>
                        <Label htmlFor="reset-email">Email</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="consultant@example.com"
                          required
                          className="mt-1"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full gradient-primary text-white"
                        disabled={loading}
                      >
                        {loading ? 'Sending...' : 'Send Reset Link'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="consultant@example.com"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Minimum 8 characters
                  </p>
                </div>
                <div>
                  <Label htmlFor="role">I am a</Label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'consultant' | 'installer')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                  >
                    <option value="consultant">Consultant</option>
                    <option value="installer">Installer</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Select your role to access the appropriate dashboard
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full gradient-primary text-white"
                  disabled={loading}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
