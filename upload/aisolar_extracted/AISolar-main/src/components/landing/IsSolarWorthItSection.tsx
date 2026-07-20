import { motion } from 'framer-motion';
import { TrendingUp, Banknote, Clock, CheckCircle2 } from 'lucide-react';

export function IsSolarWorthItSection() {
  const reasons = [
    {
      icon: TrendingUp,
      title: 'Rising Electricity Costs',
      desc: 'Irish electricity prices have increased 40%+ since 2021. Solar locks in your energy costs.',
    },
    {
      icon: Banknote,
      title: 'SEAI Grants Available',
      desc: 'Get up to €2,100 back from SEAI grants, reducing your upfront investment significantly.',
    },
    {
      icon: Clock,
      title: 'Quick Payback Period',
      desc: 'Most Irish homeowners see payback in 6-9 years, with 25+ years of free electricity after.',
    },
  ];

  return (
    <section className="py-12 sm:py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-12"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
            Is Solar Worth It in Ireland?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            Despite our weather, Ireland gets enough sunlight for solar to make financial sense. 
            Here's why thousands of Irish homes are switching to solar.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {reasons.map((reason, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="p-6 bg-muted/30 rounded-xl border"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <reason.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-lg mb-2">{reason.title}</h3>
              <p className="text-sm text-muted-foreground">{reason.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 sm:mt-12 bg-primary/5 border border-primary/20 rounded-xl p-6 max-w-3xl mx-auto"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm sm:text-base text-foreground">
              <strong>The verdict:</strong> With current electricity prices and SEAI grants, solar panels 
              in Ireland typically pay for themselves in 6-9 years — then provide free electricity for 
              another 15-20+ years.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
