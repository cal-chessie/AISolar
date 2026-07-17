import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'How accurate is the AI solar bill analysis?',
    answer: 'Our AI provides estimates within 85-90% accuracy based on your bill data and Irish sunlight averages. For a precise quote, we recommend a free home survey where we assess your roof, orientation, and shading.',
  },
  {
    question: 'Do I need a smart meter for this analysis?',
    answer: 'No, you don\'t need a smart meter. Our AI can work with any standard Irish electricity bill. However, if you have a smart meter, the analysis can be even more accurate as we can see your hourly usage patterns.',
  },
  {
    question: 'Does the estimate include SEAI grants?',
    answer: 'Yes! All our estimates automatically include the current SEAI grants (up to €2,100 for solar PV). We stay up-to-date with all Irish grant schemes to ensure your quote is accurate.',
  },
  {
    question: 'What counties do you cover?',
    answer: 'We cover all 26 counties in Ireland. Our network of SEAI-registered installers means we can provide solar installations anywhere in the country, from Dublin to Donegal.',
  },
  {
    question: 'How long does a solar installation take?',
    answer: 'Most residential solar installations are completed in 1-2 days. The full process from initial enquiry to switching on your system typically takes 4-8 weeks, including SEAI grant application.',
  },
  {
    question: 'Will solar panels work in Irish weather?',
    answer: 'Absolutely! Solar panels work with daylight, not direct sunshine. Germany, with similar weather to Ireland, is one of the world\'s largest solar markets. Irish homes typically generate 850-1,000 kWh per kWp installed annually.',
  },
];

export function FAQSection() {
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
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            Got questions? We've got answers. Here are the most common things Irish homeowners ask about solar.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, idx) => (
              <AccordionItem
                key={idx}
                value={`item-${idx}`}
                className="bg-background border rounded-xl px-4 sm:px-6"
              >
                <AccordionTrigger className="text-left text-sm sm:text-base font-medium py-4 hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}

// Export FAQ data for structured data
export const faqStructuredData = faqs.map(faq => ({
  '@type': 'Question',
  name: faq.question,
  acceptedAnswer: {
    '@type': 'Answer',
    text: faq.answer,
  },
}));
