import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { QrCode, Copy, CreditCard, Link2, Check, Loader2, Share2, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { brand } from '@/config/brand';

interface PaymentLinkGeneratorProps {
  // For invoice-based payments
  invoiceId?: string;
  invoiceNumber?: string;
  depositAmount?: number;
  finalAmount?: number;
  depositPaid?: boolean;
  // For direct proposal payments
  proposalId?: string;
  leadId?: string;
  totalAmount?: number;
  // Common props
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  // Display mode
  inline?: boolean;
}

export default function PaymentLinkGenerator({
  invoiceId,
  invoiceNumber,
  depositAmount,
  finalAmount,
  depositPaid = false,
  proposalId,
  leadId,
  totalAmount,
  customerName,
  customerEmail,
  customerPhone,
  inline = false,
}: PaymentLinkGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Determine payment type and amount
  const isInvoiceBased = !!invoiceId;
  const paymentType = isInvoiceBased ? (depositPaid ? 'final' : 'deposit') : 'deposit';
  const amount = isInvoiceBased 
    ? (depositPaid ? finalAmount || 0 : depositAmount || 0)
    : Math.round((totalAmount || 0) * 0.3); // 30% deposit for direct proposal payments
  
  const displayReference = isInvoiceBased ? `Invoice #${invoiceNumber}` : `Proposal`;

  const generatePaymentLink = async () => {
    setLoading(true);
    try {
      const successUrl = `${window.location.origin}/customer?payment=success`;
      const cancelUrl = `${window.location.origin}/customer?payment=cancelled`;

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: isInvoiceBased ? {
          invoiceId,
          paymentType,
          successUrl,
          cancelUrl,
        } : {
          // For direct proposal payments, create ad-hoc checkout
          amount: amount * 100, // Convert to cents
          customerEmail,
          customerName,
          proposalId,
          leadId,
          paymentType: 'deposit',
          successUrl,
          cancelUrl,
        },
      });

      if (error) throw error;
      
      setPaymentUrl(data.url);
      toast.success('Payment link generated successfully');
    } catch (error: any) {
      console.error('Error generating payment link:', error);
      toast.error('Failed to generate payment link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!paymentUrl) return;
    
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const shareViaWhatsApp = () => {
    if (!paymentUrl) return;
    
    const message = `Hi ${customerName},\n\nHere's your payment link for your ${displayReference}:\n\nAmount: €${amount.toLocaleString()}\nType: ${paymentType === 'deposit' ? 'Deposit (30%)' : 'Final Payment'}\n\n${paymentUrl}\n\nThank you for choosing ${brand.name}!`;
    const encoded = encodeURIComponent(message);
    const phone = customerPhone?.replace(/\D/g, '') || '';
    
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  const shareViaSMS = () => {
    if (!paymentUrl) return;
    
    const message = `${brand.name}: Pay €${amount} for your ${displayReference} here: ${paymentUrl}`;
    const encoded = encodeURIComponent(message);
    const phone = customerPhone?.replace(/\D/g, '') || '';
    
    window.open(`sms:${phone}?body=${encoded}`, '_blank');
  };

  // Generate QR code URL using a free service
  const qrCodeUrl = paymentUrl 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentUrl)}`
    : null;

  const content = (
    <div className="space-y-4">
      {/* Payment Summary */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Reference</span>
            <span className="font-medium">{displayReference}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Payment Type</span>
            <Badge variant="outline">
              {paymentType === 'deposit' ? 'Deposit (30%)' : 'Final Payment'}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="text-xl font-bold text-primary">€{amount.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {!paymentUrl ? (
        <Button 
          className="w-full" 
          onClick={generatePaymentLink}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4 mr-2" />
              Generate Payment Link
            </>
          )}
        </Button>
      ) : (
        <Tabs defaultValue="qr" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="qr" className="gap-2">
              <QrCode className="h-4 w-4" />
              QR Code
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-2">
              <Link2 className="h-4 w-4" />
              Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qr" className="mt-4">
            <div className="flex flex-col items-center gap-4">
              {qrCodeUrl && (
                <div className="bg-white p-4 rounded-lg shadow-inner">
                  <img 
                    src={qrCodeUrl} 
                    alt="Payment QR Code" 
                    className="w-48 h-48"
                  />
                </div>
              )}
              <p className="text-sm text-muted-foreground text-center">
                Customer can scan this QR code to pay €{amount.toLocaleString()}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="link" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Payment Link</Label>
              <div className="flex gap-2">
                <Input 
                  value={paymentUrl} 
                  readOnly 
                  className="font-mono text-xs"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Share Options */}
            <div className="space-y-2">
              <Label>Share with Customer</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={shareViaWhatsApp}
                >
                  <MessageCircle className="h-4 w-4 text-green-600" />
                  WhatsApp
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={shareViaSMS}
                >
                  <Share2 className="h-4 w-4" />
                  SMS
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {paymentUrl && (
        <Button 
          variant="ghost" 
          className="w-full"
          onClick={() => {
            setPaymentUrl(null);
            setCopied(false);
          }}
        >
          Generate New Link
        </Button>
      )}
    </div>
  );

  // Inline mode - render directly without dialog
  if (inline) {
    return content;
  }

  // Dialog mode - wrap in dialog
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Link2 className="h-4 w-4" />
          Generate Payment Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            In-Person Payment
          </DialogTitle>
          <DialogDescription>
            Generate a payment link for {customerName} to pay their {paymentType}.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
