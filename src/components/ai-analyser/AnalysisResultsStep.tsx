import { motion } from "framer-motion";
import { Sun, TrendingUp, Clock, Zap, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AnalysisData } from "./AIBillAnalyser";

interface AnalysisResultsStepProps {
  data: AnalysisData;
  onGetFullReport: () => void;
  leadCaptured: boolean;
}

export function AnalysisResultsStep({ data, onGetFullReport, leadCaptured }: AnalysisResultsStepProps) {
  const metrics = [
    {
      icon: TrendingUp,
      label: "Estimated Annual Savings",
      value: `€${data.annualSavings.toLocaleString()}`,
      sublabel: "per year",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Sun,
      label: "Solar Offset",
      value: `${data.solarOffset}%`,
      sublabel: "of your usage",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
    },
    {
      icon: Clock,
      label: "Payback Period",
      value: `${data.paybackYears} years`,
      sublabel: "estimated",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: Zap,
      label: "Recommended System",
      value: `${data.estimatedSystemSize} kWp`,
      sublabel: "system size",
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-500/10",
    },
  ];

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
        <Badge variant="secondary" className="mx-auto mb-2">
          Analysis Complete
        </Badge>
        <CardTitle className="text-2xl font-bold text-foreground">
          Your Solar Savings Potential
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Based on your €{data.monthlyBill}/month bill and Irish sunlight data
        </p>
      </CardHeader>

      <CardContent className="pt-2 pb-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="p-4 rounded-xl bg-muted/50 border border-border/50"
            >
              <div className={`w-10 h-10 rounded-lg ${metric.bgColor} flex items-center justify-center mb-2`}>
                <metric.icon className={`w-5 h-5 ${metric.color}`} />
              </div>
              <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
              <p className="text-xl font-bold text-foreground">{metric.value}</p>
              <p className="text-xs text-muted-foreground">{metric.sublabel}</p>
            </motion.div>
          ))}
        </div>

        {/* 20-Year Savings Highlight */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="p-5 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">20-Year Projected Savings</p>
              <p className="text-3xl font-bold text-primary">
                €{data.twentyYearSavings.toLocaleString()}
              </p>
            </div>
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Includes SEAI grant of up to €2,400
          </p>
        </motion.div>

        {/* Trust Signals */}
        <div className="flex items-center justify-center gap-4 mb-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3 text-primary" /> SEAI Approved
          </span>
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3 text-primary" /> Irish Data
          </span>
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3 text-primary" /> No Obligation
          </span>
        </div>

        {/* CTA */}
        {!leadCaptured && (
          <Button
            onClick={onGetFullReport}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            <FileText className="w-5 h-5 mr-2" />
            Get Your Full Solar Report
          </Button>
        )}

        <p className="text-xs text-center text-muted-foreground mt-3">
          Free detailed report • No spam, ever
        </p>
      </CardContent>
    </Card>
  );
}
