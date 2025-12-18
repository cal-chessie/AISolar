import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Loader2, Check, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { brand } from "@/config/brand";
import type { AnalysisData } from "./AIBillAnalyser";

const IRISH_COUNTIES = [
  "Antrim", "Armagh", "Carlow", "Cavan", "Clare", "Cork", "Derry", "Donegal",
  "Down", "Dublin", "Fermanagh", "Galway", "Kerry", "Kildare", "Kilkenny",
  "Laois", "Leitrim", "Limerick", "Longford", "Louth", "Mayo", "Meath",
  "Monaghan", "Offaly", "Roscommon", "Sligo", "Tipperary", "Tyrone",
  "Waterford", "Westmeath", "Wexford", "Wicklow"
];

interface LeadCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisData: AnalysisData | null;
  onSuccess: () => void;
}

export function LeadCaptureModal({ open, onOpenChange, analysisData, onSuccess }: LeadCaptureModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    county: "",
    phone: "",
    mprn: "",
  });

  // Pre-fill name from extracted data
  const displayName = formData.name || analysisData?.accountName || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameToUse = formData.name || analysisData?.accountName;
    
    if (!nameToUse || !formData.email || !formData.county) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Build address from county and extracted address
      let address = `County ${formData.county}, ${brand.country}`;
      if (analysisData?.extractedAddress) {
        address = `${analysisData.extractedAddress}, County ${formData.county}`;
      }

      // Build comprehensive notes
      const notes = [
        `[SOURCE: AI_ANALYSER]`,
        `[AI Analysis via ${brand.domain}]`,
        analysisData?.mprn ? `[MPRN: ${analysisData.mprn}]` : null,
        `Estimated System: ${analysisData?.estimatedSystemSize}kWp`,
        `Annual Savings: €${analysisData?.annualSavings}`,
        `Payback: ${analysisData?.paybackYears} years`,
        `Annual Spend: €${analysisData?.annualSpend}`,
        analysisData?.annualKwh ? `Annual Consumption: ${analysisData.annualKwh} kWh` : null,
        `Solar Offset: ${analysisData?.solarOffset}%`,
        analysisData?.confidence ? `AI Confidence: ${analysisData.confidence}` : null,
        ``,
        `High-intent lead from bill analysis tool.`,
      ].filter(Boolean).join('\n');

      // Use manually entered MPRN if provided, otherwise use extracted
      const finalMprn = formData.mprn || analysisData?.mprn || null;

      const { data: leadData, error } = await supabase.from("leads").insert({
        name: nameToUse,
        email: formData.email,
        phone: formData.phone || null,
        address,
        monthly_bill: analysisData?.monthlyBill || null,
        mprn: finalMprn,
        annual_consumption_kwh: analysisData?.annualKwh || null,
        workflow_stage: "new",
        notes,
      }).select().single();

      if (error) throw error;

      // Auto-create draft survey if we have MPRN (high-quality lead)
      if (leadData && finalMprn) {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Create survey with pre-populated data from bill
        await supabase.from("site_surveys").insert({
          lead_id: leadData.id,
          surveyor_id: user?.id || leadData.id, // Use user if logged in, otherwise lead id placeholder
          status: "draft",
          // Pre-populate from bill analysis
          installation_notes: `Auto-created from AI Bill Analysis.\nMPRN: ${analysisData.mprn}\nAnnual Consumption: ${analysisData.annualKwh || 'Unknown'} kWh\nMonthly Bill: €${analysisData.monthlyBill || 'Unknown'}`,
          recommended_system_size: analysisData.estimatedSystemSize || null,
          customer_availability: `Lead captured via ${brand.domain} bill analyser`,
        });
        
        console.log("Draft survey auto-created for lead with MPRN:", analysisData.mprn);
      }

      toast({
        title: "Report Sent! 🎉",
        description: analysisData?.mprn 
          ? `Your property (MPRN: ${analysisData.mprn}) has been added to our system.`
          : "Check your email for your full solar report.",
      });
      onSuccess();
    } catch (error) {
      console.error("Error saving lead:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto mx-auto rounded-xl">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-lg sm:text-xl">{brand.copy.reportCtaTitle}</DialogTitle>
          <DialogDescription className="text-sm">
            {brand.copy.reportCtaDescription}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 mt-4 pb-2">
          {/* Client Info Section */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="name" className="text-sm">Name *</Label>
            <Input
              id="name"
              placeholder={analysisData?.accountName || "Your name"}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required={!analysisData?.accountName}
              className="h-12 sm:h-10"
            />
            {analysisData?.accountName && !formData.name && (
              <p className="text-xs text-muted-foreground">
                Pre-filled from your bill: {analysisData.accountName}
              </p>
            )}
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="email" className="text-sm">Email *</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="h-12 sm:h-10"
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="county" className="text-sm">County *</Label>
            <Select
              value={formData.county}
              onValueChange={(value) => setFormData({ ...formData, county: value })}
            >
              <SelectTrigger className="h-12 sm:h-10">
                <SelectValue placeholder="Select your county" />
              </SelectTrigger>
              <SelectContent className="max-h-[50vh] bg-popover z-[100]">
                {IRISH_COUNTIES.map((county) => (
                  <SelectItem key={county} value={county} className="py-3 text-base cursor-pointer">
                    {county}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="phone" className="text-sm">
              Phone <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              placeholder="08X XXX XXXX"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="h-12 sm:h-10"
            />
          </div>

          {/* MPRN Field - in Client Info section */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="mprn" className="text-sm">
              MPRN <span className="text-muted-foreground text-xs">(if not auto-detected)</span>
            </Label>
            {analysisData?.mprn ? (
              <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <Zap className="w-4 h-4 text-green-600 shrink-0" />
                <span className="text-sm text-green-700">Auto-detected:</span>
                <Badge variant="secondary" className="font-mono">
                  {analysisData.mprn}
                </Badge>
              </div>
            ) : (
              <Input
                id="mprn"
                placeholder="10XXXXXXXXX (found on your bill)"
                value={formData.mprn}
                onChange={(e) => setFormData({ ...formData, mprn: e.target.value })}
                className="h-12 sm:h-10 font-mono"
              />
            )}
          </div>

          <Button type="submit" className="w-full h-12 sm:h-11 text-base" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Send My Report
              </>
            )}
          </Button>

          <p className="text-[10px] sm:text-xs text-center text-muted-foreground">
            {brand.copy.noSpamMessage}
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
