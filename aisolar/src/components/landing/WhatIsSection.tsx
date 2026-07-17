import { motion } from 'framer-motion';
import { Upload, Brain, Sun, FileText } from 'lucide-react';

export function WhatIsSection() {
  const steps = [
    { icon: Upload, title: 'Upload Your Bill', desc: 'PDF or photo of your electricity bill' },
    { icon: Brain, title: 'AI Analyses Usage', desc: 'Our AI reads your consumption patterns' },
    { icon: Sun, title: 'Irish Data Applied', desc: 'Local sunlight hours & weather factored in' },
    { icon: FileText, title: 'Instant Results', desc: 'Get savings estimate in seconds' },
  ];

  return (
    <section className="py-12 sm:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-12"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
            What Is an AI Solar Bill Analysis?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            Our AI technology reads your electricity bill and calculates exactly how much you could save 
            with solar panels — using real Irish sunlight data and current SEAI grants.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="text-center p-4 sm:p-6 bg-background rounded-xl border shadow-sm"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <step.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-sm sm:text-base mb-1">{step.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
