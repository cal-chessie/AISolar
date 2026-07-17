import { motion } from 'framer-motion';
import { MapPin, Award, Users, ShieldCheck } from 'lucide-react';
import { brand } from '@/config/brand';

export function WhyUsSection() {
  const reasons = [
    {
      icon: MapPin,
      title: '100% Irish Company',
      desc: `Based in ${brand.country}, we understand local weather, regulations, and the SEAI grant process inside out.`,
    },
    {
      icon: Award,
      title: 'SEAI Registered',
      desc: 'Fully registered with SEAI, ensuring you qualify for all available grants and incentives.',
    },
    {
      icon: Users,
      title: `${brand.stats.customers} Happy Customers`,
      desc: `Join thousands of Irish homeowners who've already made the switch to solar with us.`,
    },
    {
      icon: ShieldCheck,
      title: 'No Pressure, No Spam',
      desc: 'Get your free analysis with no obligation. We respect your inbox and your time.',
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
            Why Use {brand.name}?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            We're not just another solar company. We're Irish, we're experts, and we put you first.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {reasons.map((reason, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="text-center p-6 bg-background rounded-xl border"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <reason.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{reason.title}</h3>
              <p className="text-sm text-muted-foreground">{reason.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
