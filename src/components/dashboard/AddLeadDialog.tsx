import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Plus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AddLeadDialogProps {
  onLeadAdded: () => void;
}

export default function AddLeadDialog({ onLeadAdded }: AddLeadDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    monthly_bill: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast({
        title: 'Missing required fields',
        description: 'Name and email are required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('leads')
        .insert({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          address: formData.address || null,
          monthly_bill: formData.monthly_bill ? parseFloat(formData.monthly_bill) : null,
          notes: formData.notes || null,
          status: 'new',
        });

      if (error) throw error;

      toast({
        title: 'Lead added',
        description: 'New lead has been created successfully',
      });

      setIsOpen(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        monthly_bill: '',
        notes: '',
      });
      onLeadAdded();
    } catch (error: any) {
      console.error('Error adding lead:', error);
      toast({
        title: 'Error adding lead',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus size={18} />
          Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              required
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
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+353 12 345 6789"
            />
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="123 Main St, Dublin"
            />
          </div>

          <div>
            <Label htmlFor="monthly_bill">Monthly Bill (€)</Label>
            <Input
              id="monthly_bill"
              name="monthly_bill"
              type="number"
              step="0.01"
              value={formData.monthly_bill}
              onChange={handleChange}
              placeholder="200"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Adding...
              </>
            ) : (
              'Add Lead'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
