import { motion } from 'framer-motion';
import { Upload, Cpu, BarChart3, FileCheck } from 'lucide-react';

export function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      icon: Upload,
      title: 'Upload Your Bill',
      desc: 'Take a photo or upload a PDF of your most recent electricity bill. We accept bills from all Irish suppliers.',
    },
    {
      step: '02',
      icon: Cpu,
      title: 'AI Reads Your Usage',
      desc: 'Our AI extracts your consumption data and analyses your usage patterns throughout the year.',
    },
    {
      step: '03',
      icon: BarChart3,
      title: 'We Calculate Savings',
      desc: 'Using Irish sunlight data, current electricity rates, and SEAI grants, we estimate your potential savings.',
    },
    {
      step: '04',
      icon: FileCheck,
      title: 'Get Your Free Report',
      desc: 'Receive a detailed breakdown of recommended system size, costs, savings, and payback period.',
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
            How the AI Solar Bill Analyser Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            Get your personalised solar savings estimate in under 60 seconds. 
            No phone calls, no salespeople — just instant results.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          {steps.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="flex gap-4 sm:gap-6 mb-6 sm:mb-8 last:mb-0"
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg">
                  {item.step}
                </div>
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <item.icon className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground text-lg">{item.title}</h3>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
