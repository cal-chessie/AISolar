import { motion } from "framer-motion";
import { Calendar, FileText, MessageCircle, Check, TrendingUp, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brand, getWhatsAppLink, getPhoneLink } from "@/config/brand";
import type { AnalysisData } from "./AIBillAnalyser";

interface SoftCTAStepProps {
  data: AnalysisData;
}

export function SoftCTAStep({ data }: SoftCTAStepProps) {
  const handleWhatsApp = () => {
    const message = `Hi ${brand.name}! I just used your AI Bill Analyser and got an estimate of €${data.annualSavings}/year savings with a ${data.estimatedSystemSize}kWp system. I'd like to learn more!`;
    window.open(getWhatsAppLink(message), "_blank");
  };

  return (
    <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm overflow-hidden">
      <CardHeader className="text-center pb-3 sm:pb-4 px-4 sm:px-6 bg-gradient-to-b from-primary/5 to-transparent">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 sm:mb-4"
        >
          <Check className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
        </motion.div>
        <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">
          Your Report is on the Way! 🎉
        </CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
          Check your email for your detailed solar report
        </p>
      </CardHeader>

      <CardContent className="pt-2 pb-5 sm:pb-6 px-4 sm:px-6">
        {/* Summary Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 mb-5 sm:mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">You could save approximately</p>
              <p className="text-2xl sm:text-3xl font-bold text-primary">
                €{data.twentyYearSavings.toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">over 20 years</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            </div>
          </div>
        </motion.div>

        {/* What's Next Section */}
        <p className="text-sm font-medium text-foreground mb-3 sm:mb-4 text-center">
          Ready to take the next step?
        </p>

        <div className="space-y-2.5 sm:space-y-3">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              variant="default"
              className="w-full h-14 sm:h-12 justify-start text-left font-normal px-4"
              onClick={() => window.open("/consultation", "_blank")}
            >
              <Calendar className="w-5 h-5 mr-3 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm sm:text-base">Book Free Consultation</p>
                <p className="text-[10px] sm:text-xs opacity-80 truncate">No obligation, expert advice</p>
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
              className="w-full h-14 sm:h-12 justify-start text-left font-normal px-4"
              onClick={() => window.open("/quote", "_blank")}
            >
              <FileText className="w-5 h-5 mr-3 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm sm:text-base">Get Detailed Quote</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Customised for your home</p>
              </div>
            </Button>
          </motion.div>

          {brand.features.showWhatsApp && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                variant="outline"
                className="w-full h-14 sm:h-12 justify-start text-left font-normal px-4 bg-[#25D366]/10 border-[#25D366]/30 hover:bg-[#25D366]/20"
                onClick={handleWhatsApp}
              >
                <MessageCircle className="w-5 h-5 mr-3 flex-shrink-0 text-[#25D366]" />
                <div className="min-w-0">
                  <p className="font-medium text-sm sm:text-base">WhatsApp {brand.name}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Quick questions? Chat now</p>
                </div>
              </Button>
            </motion.div>
          )}

          {brand.features.showPhoneNumber && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                variant="ghost"
                className="w-full h-14 sm:h-12 justify-start text-left font-normal px-4"
                onClick={() => window.open(getPhoneLink(), "_blank")}
              >
                <Phone className="w-5 h-5 mr-3 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm sm:text-base">Call: {brand.contact.phoneDisplay}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Mon-Fri 9am-5pm</p>
                </div>
              </Button>
            </motion.div>
          )}
        </div>

        {/* Trust Footer */}
        <div className="mt-5 sm:mt-6 pt-4 border-t border-border">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-primary" /> SEAI Registered
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-primary" /> Irish Company
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-primary" /> {brand.stats.installationsCompleted} Installs
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
