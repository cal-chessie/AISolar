import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { createCustomerPortalLink, getExistingPortalLink } from '@/lib/customerPortal';
import { Send, Copy, Check, Loader2, ExternalLink } from 'lucide-react';

interface SendToCustomerDialogProps {
  leadId: string;
  leadName: string;
  leadEmail: string;
  proposalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SendToCustomerDialog({
  leadId,
  leadName,
  leadEmail,
  proposalId,
  open,
  onOpenChange
}: SendToCustomerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [portalLink, setPortalLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = async () => {
    setLoading(true);
    try {
      // Check if link already exists
      let link = await getExistingPortalLink(leadId);
      
      if (!link) {
        link = await createCustomerPortalLink(leadId);
      }
      
      setPortalLink(link);
      toast({
        title: 'Portal Link Ready',
        description: 'You can now share this link with your customer.',
      });
    } catch (error: any) {
      console.error('Error generating link:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate customer portal link.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!portalLink) return;
    
    try {
      await navigator.clipboard.writeText(portalLink);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Link copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Copy Failed',
        description: 'Please copy the link manually.',
        variant: 'destructive'
      });
    }
  };

  const handleOpenPortal = () => {
    if (portalLink) {
      window.open(portalLink, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Proposal to Customer
          </DialogTitle>
          <DialogDescription>
            Generate a secure link for {leadName} to view and accept their proposal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Info */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="grid gap-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium">{leadName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{leadEmail}</span>
              </div>
            </div>
          </div>

          {/* Generate Link Button */}
          {!portalLink && (
            <Button 
              onClick={handleGenerateLink} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Generate Customer Portal Link
                </>
              )}
            </Button>
          )}

          {/* Link Display */}
          {portalLink && (
            <div className="space-y-3">
              <Label>Customer Portal Link</Label>
              <div className="flex gap-2">
                <Input 
                  value={portalLink} 
                  readOnly 
                  className="text-xs"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleOpenPortal}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Preview Portal
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleCopyLink}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Link
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Share this link via email, SMS, or WhatsApp. The customer can view the proposal, 
                sign the contract, and pay the deposit through this secure portal.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}