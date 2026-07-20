import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { FileText, CheckCircle, Clock, Loader2, Euro } from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  deposit_amount: number | null;
  deposit_paid: boolean | null;
  deposit_paid_at: string | null;
  final_amount: number | null;
  final_paid: boolean | null;
  final_paid_at: string | null;
  due_date: string | null;
  status: string | null;
  created_at: string;
}

interface InvoiceManagementProps {
  leadId: string;
}

export default function InvoiceManagement({ leadId }: InvoiceManagementProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoice();
  }, [leadId]);

  const fetchInvoice = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setInvoice(data);
    } catch (error) {
      console.error('Error fetching invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const markDepositPaid = async () => {
    if (!invoice) return;
    setUpdating('deposit');
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          deposit_paid: true,
          deposit_paid_at: new Date().toISOString(),
          status: 'partial'
        })
        .eq('id', invoice.id);

      if (error) throw error;

      toast({
        title: 'Deposit Marked as Paid',
        description: `€${(invoice.deposit_amount || 0).toLocaleString()} deposit recorded.`,
      });
      fetchInvoice();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update invoice.',
        variant: 'destructive'
      });
    } finally {
      setUpdating(null);
    }
  };

  const markFinalPaid = async () => {
    if (!invoice) return;
    setUpdating('final');
    try {
      const finalAmount = invoice.final_amount || (invoice.total_amount - (invoice.deposit_amount || 0));
      const { error } = await supabase
        .from('invoices')
        .update({
          final_paid: true,
          final_paid_at: new Date().toISOString(),
          final_amount: finalAmount,
          status: 'paid'
        })
        .eq('id', invoice.id);

      if (error) throw error;

      toast({
        title: 'Final Payment Recorded',
        description: `Invoice ${invoice.invoice_number} is now fully paid.`,
      });
      fetchInvoice();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update invoice.',
        variant: 'destructive'
      });
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!invoice) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Invoice Yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            An invoice will be automatically generated when the customer signs their contract.
          </p>
        </CardContent>
      </Card>
    );
  }

  const depositAmount = invoice.deposit_amount || 0;
  const finalAmount = invoice.final_amount || (invoice.total_amount - depositAmount);

  const getStatusBadge = () => {
    if (invoice.status === 'paid' || invoice.final_paid) {
      return <Badge className="bg-green-500">Paid</Badge>;
    }
    if (invoice.status === 'partial' || invoice.deposit_paid) {
      return <Badge className="bg-blue-500">Deposit Paid</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Invoice #{invoice.invoice_number}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Created {new Date(invoice.created_at).toLocaleDateString()}
              </p>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Breakdown */}
          <div className="space-y-4">
            {/* Deposit */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-4">
                {invoice.deposit_paid ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <Clock className="h-6 w-6 text-amber-500" />
                )}
                <div>
                  <p className="font-semibold">Deposit (30%)</p>
                  {invoice.deposit_paid && invoice.deposit_paid_at && (
                    <p className="text-sm text-muted-foreground">
                      Paid on {new Date(invoice.deposit_paid_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-lg font-bold ${invoice.deposit_paid ? 'text-green-600' : ''}`}>
                  €{depositAmount.toLocaleString()}
                </span>
                {!invoice.deposit_paid && (
                  <Button 
                    size="sm" 
                    onClick={markDepositPaid}
                    disabled={updating === 'deposit'}
                  >
                    {updating === 'deposit' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Mark Paid'
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Final Payment */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-4">
                {invoice.final_paid ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <Clock className="h-6 w-6 text-muted-foreground" />
                )}
                <div>
                  <p className="font-semibold">Final Balance (70%)</p>
                  {invoice.final_paid && invoice.final_paid_at && (
                    <p className="text-sm text-muted-foreground">
                      Paid on {new Date(invoice.final_paid_at).toLocaleDateString()}
                    </p>
                  )}
                  {!invoice.final_paid && (
                    <p className="text-sm text-muted-foreground">
                      Due after installation
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-lg font-bold ${invoice.final_paid ? 'text-green-600' : ''}`}>
                  €{finalAmount.toLocaleString()}
                </span>
                {invoice.deposit_paid && !invoice.final_paid && (
                  <Button 
                    size="sm" 
                    onClick={markFinalPaid}
                    disabled={updating === 'final'}
                  >
                    {updating === 'final' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Mark Paid'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold">€{invoice.total_amount.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
