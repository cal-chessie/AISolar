import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BillInputStep } from "./BillInputStep";
import { AnalysisResultsStep } from "./AnalysisResultsStep";
import { LeadCaptureModal } from "./LeadCaptureModal";
import { SoftCTAStep } from "./SoftCTAStep";

export interface AnalysisData {
  monthlyBill: number;
  annualSpend: number;
  estimatedSystemSize: number;
  annualSavings: number;
  solarOffset: number;
  paybackYears: number;
  twentyYearSavings: number;
}

type Step = "input" | "results" | "complete";

export function AIBillAnalyser() {
  const [currentStep, setCurrentStep] = useState<Step>("input");
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);

  const handleAnalyse = (monthlyBill: number) => {
    // Calculate analysis based on Irish data
    const annualSpend = monthlyBill * 12;
    const estimatedSystemSize = Math.max(3, Math.min(12, Math.round(annualSpend / 1200)));
    const annualProduction = estimatedSystemSize * 950; // kWh per kWp in Ireland
    const electricityRate = 0.35; // €/kWh average
    const annualSavings = Math.round(annualProduction * electricityRate * 0.7); // 70% self-consumption
    const solarOffset = Math.min(85, Math.round((annualProduction / (annualSpend / electricityRate)) * 100));
    const systemCost = estimatedSystemSize * 1800 - 2400; // After SEAI grant
    const paybackYears = Math.round((systemCost / annualSavings) * 10) / 10;
    const twentyYearSavings = annualSavings * 20;

    setAnalysisData({
      monthlyBill,
      annualSpend,
      estimatedSystemSize,
      annualSavings,
      solarOffset,
      paybackYears,
      twentyYearSavings,
    });
    setCurrentStep("results");
  };

  const handleGetFullReport = () => {
    setShowLeadCapture(true);
  };

  const handleLeadCaptured = () => {
    setShowLeadCapture(false);
    setLeadCaptured(true);
    setCurrentStep("complete");
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {currentStep === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <BillInputStep onAnalyse={handleAnalyse} />
          </motion.div>
        )}

        {currentStep === "results" && analysisData && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <AnalysisResultsStep
              data={analysisData}
              onGetFullReport={handleGetFullReport}
              leadCaptured={leadCaptured}
            />
          </motion.div>
        )}

        {currentStep === "complete" && analysisData && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <SoftCTAStep data={analysisData} />
          </motion.div>
        )}
      </AnimatePresence>

      <LeadCaptureModal
        open={showLeadCapture}
        onOpenChange={setShowLeadCapture}
        analysisData={analysisData}
        onSuccess={handleLeadCaptured}
      />
    </div>
  );
}
