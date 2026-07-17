import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, Clock, AlertCircle, Loader2, CreditCard, Bitcoin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import PaymentMethodSelector from '@/components/payment/PaymentMethodSelector';

interface InvoiceCardProps {
  invoice: {
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
  };
  portalToken?: string;
}

export default function InvoiceCard({ invoice, portalToken }: InvoiceCardProps) {
  const [loadingCard, setLoadingCard] = useState(false);
  const [loadingCrypto, setLoadingCrypto] = useState(false);
  
  const depositAmount = invoice.deposit_amount || 0;
  const finalAmount = invoice.final_amount || (invoice.total_amount - depositAmount);
  
  const getStatusBadge = () => {
    if (invoice.final_paid) {
      return <Badge className="bg-green-500">Paid in Full</Badge>;
    }
    if (invoice.deposit_paid) {
      return <Badge className="bg-blue-500">Deposit Paid</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const handlePayment = async (paymentType: 'deposit' | 'final', method: 'card' | 'crypto') => {
    const setLoading = method === 'card' ? setLoadingCard : setLoadingCrypto;
    setLoading(true);
    
    try {
      const baseUrl = window.location.origin;
      const successUrl = portalToken 
        ? `${baseUrl}/customer/${portalToken}?payment=success`
        : `${baseUrl}?payment=success`;
      const cancelUrl = portalToken
        ? `${baseUrl}/customer/${portalToken}?payment=cancelled`
        : `${baseUrl}?payment=cancelled`;

      const endpoint = method === 'crypto' ? 'create-crypto-checkout' : 'create-checkout';

      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: {
          invoiceId: invoice.id,
          paymentType,
          successUrl,
          cancelUrl,
        },
      });

      if (error) throw error;

      const redirectUrl = data?.hosted_url || data?.url;
      
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Error',
        description: error.message || 'Failed to initiate payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const needsPayment = !invoice.deposit_paid || (invoice.deposit_paid && !invoice.final_paid);
  const currentPaymentType: 'deposit' | 'final' = !invoice.deposit_paid ? 'deposit' : 'final';
  const currentAmount = !invoice.deposit_paid ? depositAmount : finalAmount;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Invoice
          </CardTitle>
          {getStatusBadge()}
        </div>
        <p className="text-sm text-muted-foreground">#{invoice.invoice_number}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Summary */}
        <div className="space-y-3">
          {/* Deposit */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              {invoice.deposit_paid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Clock className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <p className="font-medium">Deposit (30%)</p>
                {invoice.deposit_paid && invoice.deposit_paid_at && (
                  <p className="text-xs text-muted-foreground">
                    Paid on {new Date(invoice.deposit_paid_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <span className={`font-semibold ${invoice.deposit_paid ? 'text-green-600 dark:text-green-400' : ''}`}>
              €{depositAmount.toLocaleString()}
            </span>
          </div>

          {/* Final Payment */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              {invoice.final_paid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : invoice.deposit_paid ? (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              ) : (
                <Clock className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Balance Due</p>
                {invoice.final_paid && invoice.final_paid_at && (
                  <p className="text-xs text-muted-foreground">
                    Paid on {new Date(invoice.final_paid_at).toLocaleDateString()}
                  </p>
                )}
                {!invoice.final_paid && invoice.deposit_paid && (
                  <p className="text-xs text-muted-foreground">
                    Due after installation
                  </p>
                )}
              </div>
            </div>
            <span className={`font-semibold ${invoice.final_paid ? 'text-green-600 dark:text-green-400' : ''}`}>
              €{finalAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Total */}
        <div className="pt-3 border-t">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold">€{invoice.total_amount.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment Method Selector */}
        {needsPayment && (
          <PaymentMethodSelector
            onSelectCard={() => handlePayment(currentPaymentType, 'card')}
            onSelectCrypto={() => handlePayment(currentPaymentType, 'crypto')}
            isLoadingCard={loadingCard}
            isLoadingCrypto={loadingCrypto}
            amount={currentAmount}
          />
        )}

        {invoice.final_paid && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">
              ✓ Invoice paid in full
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
