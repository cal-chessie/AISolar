import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';

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
}

export default function InvoiceCard({ invoice }: InvoiceCardProps) {
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
            <span className={`font-semibold ${invoice.deposit_paid ? 'text-green-600' : ''}`}>
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
            <span className={`font-semibold ${invoice.final_paid ? 'text-green-600' : ''}`}>
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

        {/* Payment Instructions */}
        {!invoice.deposit_paid && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Next step:</strong> Please arrange deposit payment of €{depositAmount.toLocaleString()} to secure your installation date.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Bank transfer details will be sent to your email, or contact us for alternative payment options.
            </p>
          </div>
        )}

        {invoice.deposit_paid && !invoice.final_paid && (
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Balance due:</strong> €{finalAmount.toLocaleString()} payable upon installation completion.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
