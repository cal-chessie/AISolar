/**
 * Terms of Service — GDPR/Irish consumer law compliant
 */

import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import SiteNavigation from '@/components/layout/SiteNavigation';
import SEOHead from '@/components/SEOHead';
import { brand } from '@/config/brand';

export default function TermsOfService() {
  return (
    <>
      <SEOHead title={`Terms of Service — ${brand.name}`} description="The terms under which we provide our solar installation services." />
      <SiteNavigation />
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-950/40 rounded-xl">
              <FileText className="h-6 w-6 text-blue-700 dark:text-blue-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Terms of Service</h1>
              <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })} · Version 1.0</p>
            </div>
          </div>

          <div className="space-y-4">
            <Section title="1. Agreement">
              <p>These terms govern your use of {brand.name}'s solar installation services and platform. By uploading your electricity bill, booking a consultation, or signing a contract, you agree to these terms.</p>
            </Section>

            <Section title="2. Services">
              <p>We provide:</p>
              <ul className="list-disc pl-5 text-sm space-y-1 mt-2">
                <li>Free AI-powered bill analysis and solar savings estimate</li>
                <li>Free 30-minute consultation (video, phone, or in-person)</li>
                <li>Site survey and system design</li>
                <li>Solar PV installation by RECI-certified electricians</li>
                <li>SEAI grant paperwork preparation and submission</li>
                <li>10-year workmanship warranty + manufacturer warranties</li>
                <li>Post-installation support and monitoring setup</li>
              </ul>
            </Section>

            <Section title="3. Quotes and pricing">
              <p>Estimates provided by our AI bill analyser are indicative only. A binding quote is provided in the formal proposal after site survey. Quotes are valid for 30 days from issue.</p>
              <p>Pricing includes: panels, inverter, battery (if selected), mounting, cabling, installation labour, RECI sign-off, and SEAI grant paperwork. Excludes: additional electrical upgrades, roof repairs, tree removal.</p>
            </Section>

            <Section title="4. Payment terms">
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>30% deposit due on contract signing (locks in SEAI grant)</li>
                <li>70% balance due on installation completion and commissioning</li>
                <li>Payment by bank transfer, card (Stripe), or crypto (Coinbase Commerce)</li>
                <li>Late payment: 1.5% per month interest on overdue invoices</li>
              </ul>
            </Section>

            <Section title="5. Cancellation">
              <p>You may cancel your contract:</p>
              <ul className="list-disc pl-5 text-sm space-y-1 mt-2">
                <li>Within 14 days of signing, for any reason, with full deposit refund (EU consumer rights)</li>
                <li>After 14 days but before installation: deposit refunded less reasonable costs incurred</li>
                <li>After installation commencement: full contract price payable</li>
              </ul>
            </Section>

            <Section title="6. Warranties">
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>10-year workmanship warranty (us)</li>
                <li>25-year panel performance guarantee (manufacturer)</li>
                <li>10-year inverter warranty (manufacturer)</li>
                <li>10-year battery warranty (manufacturer)</li>
              </ul>
              <p className="mt-2 text-sm">Warranties are void if the system is modified by unauthorised parties or damaged by improper use.</p>
            </Section>

            <Section title="7. SEAI grant">
              <p>The SEAI Solar Electricity Grant (currently €900/kWp, max €1,800) is applied for on your behalf. Grant approval is at SEAI's discretion. If your application is rejected, the grant amount will be added to your final invoice.</p>
            </Section>

            <Section title="8. Limitation of liability">
              <p>To the maximum extent permitted by law, our liability is limited to the contract value. We are not liable for indirect, incidental, or consequential damages. We are not liable for delays caused by weather, supplier issues, or factors outside our control.</p>
            </Section>

            <Section title="9. Data and privacy">
              <p>See our <a href="/privacy" className="underline">Privacy Policy</a> for how we collect, use, and protect your personal data. GDPR compliant.</p>
            </Section>

            <Section title="10. Governing law">
              <p>These terms are governed by Irish law. Disputes are subject to the exclusive jurisdiction of the Irish courts.</p>
            </Section>

            <Section title="11. Contact">
              <p className="text-sm">
                {brand.name}<br />
                {brand.contact.address}, Ireland<br />
                {brand.contact.phoneDisplay} · {brand.contact.email}
              </p>
            </Section>
          </div>
        </motion.div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-lg font-bold mb-2">{title}</h2>
        <div className="text-sm text-muted-foreground space-y-2">{children}</div>
      </CardContent>
    </Card>
  );
}
