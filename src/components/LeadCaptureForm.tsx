import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, Loader2 } from 'lucide-react';

interface LeadCaptureFormProps {
  onSuccess?: () => void;
}

export default function LeadCaptureForm({ onSuccess }: LeadCaptureFormProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    mprn: '',
    monthly_bill: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('leads')
        .insert({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          address: formData.address || null,
          mprn: formData.mprn || null,
          monthly_bill: formData.monthly_bill ? parseFloat(formData.monthly_bill) : null,
          workflow_stage: 'new',
        });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: 'Success!',
        description: 'Your information has been submitted. We\'ll contact you shortly.',
      });
      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting lead:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit form. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-2xl p-8 border border-border shadow-lg text-center"
      >
        <CheckCircle size={64} className="text-primary mx-auto mb-4" />
        <h3 className="text-2xl font-semibold text-slate-900 mb-2">Thank You!</h3>
        <p className="text-slate-600">
          We've received your information and will contact you soon with your personalized solar proposal.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-8 border border-border shadow-lg"
    >
      <h3 className="text-2xl font-semibold text-slate-900 mb-6">Get Your Free Solar Analysis</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="John Doe"
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="john@example.com"
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+353 12 345 6789"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="address">Property Address</Label>
          <Input
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="123 Main St, Dublin"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="mprn">MPRN (Meter Point Reference Number)</Label>
          <Input
            id="mprn"
            name="mprn"
            value={formData.mprn}
            onChange={handleChange}
            placeholder="10XXXXXXXXX"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">Found on your electricity bill</p>
        </div>

        <div>
          <Label htmlFor="monthly_bill">Monthly Electricity Bill (€)</Label>
          <Input
            id="monthly_bill"
            name="monthly_bill"
            type="number"
            step="0.01"
            value={formData.monthly_bill}
            onChange={handleChange}
            placeholder="200"
            className="mt-1"
          />
        </div>

        <Button
          type="submit"
          className="w-full gradient-primary text-white"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Submitting...
            </>
          ) : (
            'Get Free Analysis'
          )}
        </Button>

        <p className="text-xs text-slate-500 text-center">
          By submitting, you agree to be contacted about solar solutions. No obligation.
        </p>
      </form>
    </motion.div>
  );
}
