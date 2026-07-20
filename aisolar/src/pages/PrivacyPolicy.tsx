/**
 * Privacy Policy — GDPR compliant
 *
 * Plain-English, structured per GDPR Articles 13 & 14.
 * Irish DPC template adapted for AISolar.
 */

import { motion } from 'framer-motion';
import { Shield, Mail, Database, Globe, Clock, User, FileText, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import SiteNavigation from '@/components/layout/SiteNavigation';
import SEOHead from '@/components/SEOHead';
import { brand } from '@/config/brand';

export default function PrivacyPolicy() {
  return (
    <>
      <SEOHead title={`Privacy Policy — ${brand.name}`} description="How we collect, use, and protect your personal data. GDPR compliant." />
      <SiteNavigation />
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-violet-100 dark:bg-violet-950/40 rounded-xl">
              <Shield className="h-6 w-6 text-violet-700 dark:text-violet-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })} · Version 1.0</p>
            </div>
          </div>

          <Card className="mb-6">
            <CardContent className="p-4 text-sm">
              <p className="font-semibold mb-1">In a nutshell:</p>
              <p className="text-muted-foreground">
                We collect your name, email, phone, address, and electricity usage data to design and install your solar system.
                We never sell your data. We share it only with sub-processors required to deliver the service (Stripe, Postmark, Google Gemini, etc.).
                You can request access, correction, or deletion anytime. Full details below.
              </p>
            </CardContent>
          </Card>

          <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <Section icon={User} title="1. Who we are">
              <p>{brand.name} ("we", "us", "our") is a solar installation company based in {brand.contact.address}. We are the data controller for your personal data.</p>
              <p className="text-sm"><strong>Contact:</strong> {brand.contact.email} · {brand.contact.phoneDisplay}</p>
              <p className="text-sm">We are registered with the Irish Data Protection Commission. Our DPO (Data Protection Officer) can be reached at <a href={`mailto:dpo@${brand.domain}`} className="underline">dpo@{brand.domain}</a>.</p>
            </Section>

            <Section icon={Database} title="2. What data we collect">
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li><strong>Identity:</strong> name, email, phone number</li>
                <li><strong>Property:</strong> address, Eircode, MPRN (meter point reference number)</li>
                <li><strong>Energy usage:</strong> electricity bill data (annual kWh, monthly spend, tariff)</li>
                <li><strong>Property details:</strong> roof type, orientation, pitch, shading, available area (from site survey)</li>
                <li><strong>Financial:</strong> invoice details, payment history, contract details</li>
                <li><strong>Communications:</strong> emails, SMS, call logs, AI chat history</li>
                <li><strong>Photos:</strong> roof photos, install photos, meter photos (from site survey + installation)</li>
                <li><strong>Consent records:</strong> what you've consented to, when, and the policy version</li>
              </ul>
            </Section>

            <Section icon={FileText} title="3. Why we collect it (lawful basis)">
              <p>We process your data under the following lawful bases (GDPR Article 6):</p>
              <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
                <li><strong>Contract performance</strong> — to design, quote, and install your solar system</li>
                <li><strong>Legal obligation</strong> — to retain financial records for 7 years (Irish Revenue), to comply with RECI/Safe Electric Ireland regulations</li>
                <li><strong>Consent</strong> — for marketing emails, AI bill extraction, third-party processing</li>
                <li><strong>Legitimate interest</strong> — to prevent fraud, improve our service, and analyse usage patterns</li>
              </ul>
            </Section>

            <Section icon={Globe} title="4. Who we share it with (sub-processors)">
              <p>We share your data with these third parties to deliver the service. All have signed Data Processing Agreements (DPAs) with us:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
                <li><strong>Supabase</strong> (Frankfurt, EU) — database, authentication, file storage</li>
                <li><strong>Stripe</strong> (Ireland, EU) — payment processing</li>
                <li><strong>Postmark</strong> (US, with EU Standard Contractual Clauses) — transactional email</li>
                <li><strong>Google Gemini</strong> (US, with EU SCCs) — AI bill extraction + proposal drafting</li>
                <li><strong>Coinbase Commerce</strong> (US, with EU SCCs) — optional crypto payment</li>
                <li><strong>Mapbox</strong> (US, with EU SCCs) — installer map view</li>
              </ul>
              <p className="text-sm mt-2">We <strong>never</strong> sell your data to third parties. We do not use your data for training AI models.</p>
            </Section>

            <Section icon={Clock} title="5. How long we keep it (retention)">
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li><strong>Active leads:</strong> 2 years from last contact</li>
                <li><strong>Customer records (post-install):</strong> 10 years (warranty period)</li>
                <li><strong>Financial records (invoices, contracts):</strong> 7 years (Irish Revenue requirement)</li>
                <li><strong>SEAI grant paperwork:</strong> 7 years</li>
                <li><strong>Activity logs:</strong> 1 year</li>
                <li><strong>Consent records:</strong> 7 years (to prove consent was captured)</li>
                <li><strong>Marketing data:</strong> until you withdraw consent</li>
              </ul>
              <p className="text-sm mt-2">After the retention period, data is anonymised (not deleted — to preserve audit trail).</p>
            </Section>

            <Section icon={User} title="6. Your rights (GDPR Articles 15-22)">
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li><strong>Right of access</strong> — see all data we hold about you</li>
                <li><strong>Right to rectification</strong> — correct inaccurate data</li>
                <li><strong>Right to erasure</strong> — anonymise your data (subject to legal retention)</li>
                <li><strong>Right to portability</strong> — export your data as JSON</li>
                <li><strong>Right to object</strong> — stop processing for marketing</li>
                <li><strong>Right to restrict processing</strong> — limit how we use your data</li>
                <li><strong>Right to withdraw consent</strong> — anytime, without affecting prior processing</li>
              </ul>
              <p className="text-sm mt-2">To exercise any right, email <a href={`mailto:${brand.contact.email}?subject=GDPR Request`} className="underline">{brand.contact.email}</a> or use the in-app "Data Rights" panel. We respond within 30 days.</p>
            </Section>

            <Section icon={Lock} title="7. How we protect it (security)">
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Row-Level Security (RLS) on all database tables — users can only access their own data</li>
                <li>JWT-based authentication via Supabase Auth</li>
                <li>HTTPS/TLS 1.3 encryption in transit</li>
                <li>AES-256 encryption at rest (Supabase)</li>
                <li>Webhook signatures verified (Stripe, Coinbase)</li>
                <li>Secrets stored in Supabase Vault (encrypted)</li>
                <li>PII-safe logging (emails/tokens redacted in logs)</li>
                <li>Strict Content-Security-Policy headers</li>
                <li>Regular security audits + penetration testing</li>
              </ul>
            </Section>

            <Section icon={Globe} title="8. International transfers">
              <p>Your data is primarily stored in the EU (Supabase Frankfurt). Some sub-processors (Postmark, Google Gemini, Coinbase, Mapbox) process data in the US under EU Standard Contractual Clauses (SCCs). We have completed Transfer Impact Assessments for each.</p>
            </Section>

            <Section icon={Mail} title="9. How to contact us">
              <p className="text-sm">
                Email: <a href={`mailto:${brand.contact.email}`} className="underline">{brand.contact.email}</a><br />
                Phone: {brand.contact.phoneDisplay}<br />
                Post: {brand.contact.address}, Ireland<br />
                DPO: <a href={`mailto:dpo@${brand.domain}`} className="underline">dpo@{brand.domain}</a>
              </p>
              <p className="text-sm mt-2">
                You can also complain to the Irish Data Protection Commission at <a href="https://www.dataprotection.ie" className="underline">dataprotection.ie</a>.
              </p>
            </Section>
          </div>
        </motion.div>
      </div>
    </>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Shield; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
          <Icon className="h-4 w-4 text-violet-600" />
          {title}
        </h2>
        <div className="text-sm text-muted-foreground space-y-2">{children}</div>
      </CardContent>
    </Card>
  );
}
