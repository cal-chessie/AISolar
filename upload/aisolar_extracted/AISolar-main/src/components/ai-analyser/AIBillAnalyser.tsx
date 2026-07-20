import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BillInputStep } from "./BillInputStep";
import { AnalysisResultsStep } from "./AnalysisResultsStep";
import { LeadCaptureModal } from "./LeadCaptureModal";
import { SoftCTAStep } from "./SoftCTAStep";
import { brand } from "@/config/brand";

export interface AnalysisData {
  monthlyBill: number;
  annualSpend: number;
  estimatedSystemSize: number;
  annualSavings: number;
  solarOffset: number;
  paybackYears: number;
  twentyYearSavings: number;
  // New AI-extracted fields
  mprn?: string | null;
  annualKwh?: number | null;
  accountName?: string | null;
  extractedAddress?: string | null;
  confidence?: 'high' | 'medium' | 'low';
}

type Step = "input" | "results" | "complete";

export function AIBillAnalyser() {
  const [currentStep, setCurrentStep] = useState<Step>("input");
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);

  const handleAnalyse = (data: { 
    monthlyBill: number; 
    mprn?: string | null;
    annualKwh?: number | null;
    accountName?: string | null;
    address?: string | null;
    confidence?: 'high' | 'medium' | 'low';
  }) => {
    const { monthlyBill, mprn, annualKwh, accountName, address, confidence } = data;
    
    // Calculate analysis based on Irish data
    const annualSpend = monthlyBill * 12;
    
    // Use extracted kWh if available, otherwise estimate from bill
    const estimatedAnnualKwh = annualKwh || (annualSpend / 0.35);
    
    const estimatedSystemSize = Math.max(3, Math.min(12, Math.round(estimatedAnnualKwh / 950)));
    const annualProduction = estimatedSystemSize * 950; // kWh per kWp in Ireland
    const electricityRate = 0.35; // €/kWh average
    const annualSavings = Math.round(annualProduction * electricityRate * 0.7); // 70% self-consumption
    const solarOffset = Math.min(85, Math.round((annualProduction / estimatedAnnualKwh) * 100));
    const systemCost = estimatedSystemSize * 1800 - brand.grants.maxDomestic; // After SEAI grant
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
      mprn,
      annualKwh: annualKwh || Math.round(estimatedAnnualKwh),
      accountName,
      extractedAddress: address,
      confidence,
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
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-0">
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
