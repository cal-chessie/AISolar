import { motion } from 'framer-motion';
import { Euro, Zap, Calendar } from 'lucide-react';

export function SavingsSection() {
  const savings = [
    {
      icon: Euro,
      title: 'Annual Savings',
      value: '€600 – €1,200',
      desc: 'Typical yearly savings on electricity bills',
    },
    {
      icon: Zap,
      title: 'System Size',
      value: '3 – 6 kWp',
      desc: 'Most common for Irish homes',
    },
    {
      icon: Calendar,
      title: 'Payback Period',
      value: '6 – 9 years',
      desc: 'Including SEAI grants',
    },
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
            How Much Can You Save With Solar Panels?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            Real savings from Irish homeowners who've made the switch. Your savings depend on 
            your electricity usage, roof orientation, and system size.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8 sm:mb-12">
          {savings.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="text-center p-6 bg-background rounded-xl border shadow-sm"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">{item.value}</div>
              <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 sm:p-8 max-w-3xl mx-auto text-center"
        >
          <p className="text-lg sm:text-xl font-semibold text-foreground mb-2">
            20-Year Potential Savings
          </p>
          <p className="text-3xl sm:text-4xl font-bold text-primary mb-2">€12,000 – €24,000+</p>
          <p className="text-sm text-muted-foreground">
            Based on current electricity prices and typical Irish home usage
          </p>
        </motion.div>
      </div>
    </section>
  );
}
