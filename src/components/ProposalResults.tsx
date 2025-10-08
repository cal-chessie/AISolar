import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingDown, Calendar, Shield, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConsultationBooking from './ConsultationBooking';

interface ProposalResultsProps {
  onStartOver: () => void;
}

export default function ProposalResults({ onStartOver }: ProposalResultsProps) {
  const [bookingOpen, setBookingOpen] = useState(false);
  
  // Mock data - in production this would come from AI analysis
  const results = {
    currentBill: '€145',
    projectedSavings: '€87',
    systemSize: '6.5 kW',
    paybackPeriod: '7.2 years',
    seaiGrant: '€2,400',
    estimatedCost: '€12,500',
    netCost: '€10,100'
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-3xl shadow-premium border border-border overflow-hidden"
      >
        {/* Header */}
        <div className="gradient-primary text-white p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <Zap size={64} className="mx-auto mb-4" />
          </motion.div>
          <h2 className="text-3xl font-bold mb-2">Your Solar Savings Potential</h2>
          <p className="text-white/90">Based on your current energy usage</p>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-3 gap-6 p-8 bg-slate-50">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-2xl shadow-md text-center"
          >
            <TrendingDown className="text-green-600 mx-auto mb-3" size={40} />
            <div className="text-3xl font-bold text-slate-900">{results.projectedSavings}</div>
            <div className="text-sm text-slate-600 mt-1">Monthly Savings</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-6 rounded-2xl shadow-md text-center"
          >
            <Zap className="text-primary mx-auto mb-3" size={40} />
            <div className="text-3xl font-bold text-slate-900">{results.systemSize}</div>
            <div className="text-sm text-slate-600 mt-1">Recommended System</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white p-6 rounded-2xl shadow-md text-center"
          >
            <Calendar className="text-orange-600 mx-auto mb-3" size={40} />
            <div className="text-3xl font-bold text-slate-900">{results.paybackPeriod}</div>
            <div className="text-sm text-slate-600 mt-1">Payback Period</div>
          </motion.div>
        </div>

        {/* Financial Breakdown */}
        <div className="p-8">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">Investment Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
              <span className="text-slate-700">System Cost</span>
              <span className="font-semibold text-slate-900">{results.estimatedCost}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl">
              <span className="text-green-700 flex items-center gap-2">
                <Shield size={18} />
                SEAI Grant
              </span>
              <span className="font-semibold text-green-700">-{results.seaiGrant}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-primary-50 rounded-xl border-2 border-primary">
              <span className="text-primary font-semibold">Your Investment</span>
              <span className="font-bold text-primary text-xl">{results.netCost}</span>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="p-8 bg-slate-50">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">What's Included</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              'Premium solar panels with 25-year warranty',
              'Professional installation by certified team',
              'SEAI grant application assistance',
              'Smart monitoring system',
              'Post-installation support',
              'Energy efficiency consultation'
            ].map((benefit, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + idx * 0.1 }}
                className="flex items-start gap-3"
              >
                <CheckCircle className="text-primary flex-shrink-0 mt-1" size={20} />
                <span className="text-slate-700">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="p-8 flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => setBookingOpen(true)}
            className="flex-1 gradient-primary text-white py-6 text-lg font-semibold hover:shadow-lg"
            size="lg"
          >
            Schedule Free Consultation
          </Button>
          <Button
            onClick={onStartOver}
            variant="outline"
            className="flex-1 py-6 text-lg"
            size="lg"
          >
            Start Over
          </Button>
        </div>
      </motion.div>

      {/* Trust Indicators */}
      <div className="mt-8 flex items-center justify-center gap-8 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <div className="text-lg">✓</div>
          <span>No obligation</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-lg">✓</div>
          <span>Free site survey</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-lg">✓</div>
          <span>Expert advice</span>
        </div>
      </div>

      <ConsultationBooking open={bookingOpen} onOpenChange={setBookingOpen} />
    </div>
  );
}
