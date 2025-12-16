import { motion } from "framer-motion";
import { Calendar, FileText, MessageCircle, Check, TrendingUp, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisData } from "./AIBillAnalyser";

interface SoftCTAStepProps {
  data: AnalysisData;
}

export function SoftCTAStep({ data }: SoftCTAStepProps) {
  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Hi Solar Ireland! I just used your AI Bill Analyser and got an estimate of €${data.annualSavings}/year savings with a ${data.estimatedSystemSize}kWp system. I'd like to learn more!`
    );
    window.open(`https://wa.me/353851234567?text=${message}`, "_blank");
  };

  return (
    <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm overflow-hidden">
      <CardHeader className="text-center pb-4 bg-gradient-to-b from-primary/5 to-transparent">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4"
        >
          <Check className="w-8 h-8 text-primary" />
        </motion.div>
        <CardTitle className="text-2xl font-bold text-foreground">
          Your Report is on the Way! 🎉
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Check your email for your detailed solar savings report
        </p>
      </CardHeader>

      <CardContent className="pt-2 pb-6">
        {/* Summary Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-5 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">You could save approximately</p>
              <p className="text-3xl font-bold text-primary">
                €{data.twentyYearSavings.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">over 20 years</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-primary" />
            </div>
          </div>
        </motion.div>

        {/* What's Next Section */}
        <p className="text-sm font-medium text-foreground mb-4 text-center">
          Ready to take the next step?
        </p>

        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              variant="default"
              className="w-full h-12 justify-start text-left font-normal"
              onClick={() => window.open("/consultation", "_blank")}
            >
              <Calendar className="w-5 h-5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium">Book Free Solar Consultation</p>
                <p className="text-xs opacity-80">No obligation, expert advice</p>
              </div>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              variant="outline"
              className="w-full h-12 justify-start text-left font-normal"
              onClick={() => window.open("/quote", "_blank")}
            >
              <FileText className="w-5 h-5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium">Get a Detailed Solar Quote</p>
                <p className="text-xs text-muted-foreground">Customised for your home</p>
              </div>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              variant="outline"
              className="w-full h-12 justify-start text-left font-normal bg-[#25D366]/10 border-[#25D366]/30 hover:bg-[#25D366]/20"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="w-5 h-5 mr-3 flex-shrink-0 text-[#25D366]" />
              <div>
                <p className="font-medium">WhatsApp Solar Ireland</p>
                <p className="text-xs text-muted-foreground">Quick questions? Chat now</p>
              </div>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Button
              variant="ghost"
              className="w-full h-12 justify-start text-left font-normal"
              onClick={() => window.open("tel:+353851234567", "_blank")}
            >
              <Phone className="w-5 h-5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium">Call Us: 085 123 4567</p>
                <p className="text-xs text-muted-foreground">Mon-Fri 9am-5pm</p>
              </div>
            </Button>
          </motion.div>
        </div>

        {/* Trust Footer */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-primary" /> SEAI Registered
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-primary" /> Irish Company
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-primary" /> 500+ Installs
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
