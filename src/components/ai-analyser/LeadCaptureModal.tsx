import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Loader2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.county) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("leads").insert({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        address: `County ${formData.county}, Ireland`,
        monthly_bill: analysisData?.monthlyBill || null,
        status: "new",
        workflow_stage: "new",
        notes: `AI Analysis: System ${analysisData?.estimatedSystemSize}kWp, Savings €${analysisData?.annualSavings}/yr, Payback ${analysisData?.paybackYears}yrs`,
      });

      if (error) throw error;

      toast({
        title: "Report Sent! 🎉",
        description: "Check your email for your full solar report.",
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">Get Your Full Solar Report</DialogTitle>
          <DialogDescription>
            We'll email you a detailed breakdown of your solar savings potential
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="Your name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="county">County *</Label>
            <Select
              value={formData.county}
              onValueChange={(value) => setFormData({ ...formData, county: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your county" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {IRISH_COUNTIES.map((county) => (
                  <SelectItem key={county} value={county}>
                    {county}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="08X XXX XXXX"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending Report...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Send My Full Report
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            🔒 No spam, ever. Your data is secure.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
