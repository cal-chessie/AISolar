/**
 * PrivacyPolicy — /privacy
 *
 * Written to be read, not to hide behind. Plain English, honest about the
 * things that actually matter here: what a bill upload does, that a
 * third-party AI model reads it, that your installer (not us) is usually the
 * controller of your project data, and how to get your data back or erased.
 *
 * Family colours mark the sections (AIOS blue · AISolar red · AITeam green ·
 * accent yellow) so the legal pages feel part of the product. Nothing claimed
 * that isn't true — no certifications we don't hold.
 */
import { Link } from 'react-router-dom';
import { Shield, Database, Share2, Clock, UserCheck, Cookie, Mail, Scale } from 'lucide-react';
import { MarketingNav, MarketingFooter } from '@/components/marketing/MarketingShell';
import SEOHead from '@/components/SEOHead';
import { openCookiePreferences } from '@/lib/gdpr';
import { brand } from '@/config/brand';

const UPDATED = '24 July 2026';
const EMAIL = brand.contact?.email ?? 'hi@aisolar.ie';
const ADDRESS = brand.contact?.address ?? 'Dublin, Ireland';
const ENTITY = brand.legal?.registeredName ?? 'AISolar Ireland Ltd';

type Accent = 'aios' | 'aisolar' | 'aiteam' | 'accent';
const ACCENT: Record<Accent, { text: string; bg: string; border: string }> = {
  aios:    { text: 'text-brand-aios',    bg: 'bg-brand-aios-subtle',    border: 'border-l-brand-aios' },
  aisolar: { text: 'text-brand-aisolar', bg: 'bg-brand-aisolar-subtle', border: 'border-l-brand-aisolar' },
  aiteam:  { text: 'text-brand-aiteam',  bg: 'bg-brand-aiteam-subtle',  border: 'border-l-brand-aiteam' },
  accent:  { text: 'text-brand-accent',  bg: 'bg-brand-accent-subtle',  border: 'border-l-brand-accent' },
};

function Section({ icon: Icon, title, accent, children }: {
  icon: typeof Shield; title: string; accent: Accent; children: React.ReactNode;
}) {
  const a = ACCENT[accent];
  return (
    <section className="min-w-0">
      <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
        <span className={`grid size-8 shrink-0 place-items-center rounded-control ${a.bg} ${a.text}`}>
          <Icon className="size-4" />
        </span>
        <span className="min-w-0">{title}</span>
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SEOHead
        title="Privacy Policy | AISOLAR"
        description="How AISOLAR handles your data: what we collect, what happens when you upload a bill, who it's shared with, where it's hosted, and how to access or erase it."
        canonical="https://aisolar.ie/privacy"
      />
      <MarketingNav product="aisolar" />

      <main className="mx-auto max-w-3xl px-5 py-14 lg:py-20">
        <header className="min-w-0">
          <p className="label-micro">Legal</p>
          <h1 className="mt-2 text-[34px] leading-[40px] sm:text-[42px] sm:leading-[48px] font-semibold tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Plain English, because you should be able to tell what happens to your
            data without needing a solicitor. If anything here is unclear, email us
            and we'll answer it straight.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">Last updated {UPDATED}</p>
        </header>

        {/* The short version */}
        <div className={`mt-8 rounded-panel border-l-4 ${ACCENT.aios.border} bg-card shadow-card p-5 min-w-0`}>
          <p className={`text-2xs font-semibold uppercase tracking-wide ${ACCENT.aios.text}`}>The short version</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li>We collect what's needed to size a solar system and run your project — most of it comes off your electricity bill.</li>
            <li>If you upload a bill, a third-party AI model reads it. You can say no and type the numbers in yourself.</li>
            <li>We don't sell your data. Ever.</li>
            <li>It's hosted in the EU.</li>
            <li>You can get a copy, correct it, or have it erased — just ask.</li>
          </ul>
        </div>

        <div className="mt-12 space-y-10">
          <Section icon={Shield} title="Who we are" accent="aios">
            <p>
              {ENTITY} (trading as {brand.legal?.tradingName ?? 'AISOLAR'}), based in {ADDRESS}.
              We build software that Irish solar installers use to run their business.
            </p>
            <p>
              <strong className="text-foreground">One important distinction.</strong> When you use
              our public calculator or upload a bill on our own site, we are the data
              controller. When you're dealing with an installer who uses AISOLAR, <em>they</em> are
              the controller of your project data and we act as their processor — we handle it
              on their instructions. Either way, the rights below are yours.
            </p>
          </Section>

          <Section icon={Database} title="What we collect" accent="aisolar">
            <p>
              <strong className="text-foreground">From your electricity bill, if you upload one.</strong> Up
              to 21 details: your MPRN, annual and billed usage, day/night split, unit and night
              rates, standing charge, tariff name, billing period, supplier and supply address.
            </p>
            <p>
              <strong className="text-foreground">What you tell us.</strong> Name, email, phone,
              address or Eircode, and whatever you enter in the calculator — your monthly bill,
              whether you drive an EV, whether someone's home during the day, and the roof you
              draw on the map.
            </p>
            <p>
              <strong className="text-foreground">Automatically.</strong> Standard technical data
              (IP address, browser, pages viewed) needed to serve and secure the site. Optional
              analytics only run if you agree to them.
            </p>
            <p className="text-sm">
              We don't ask for special category data — no health, biometric or political
              information. Please don't send it to us.
            </p>
          </Section>

          <Section icon={Scale} title="Why we're allowed to use it" accent="aiteam">
            <p><strong className="text-foreground">To do what you asked (contract).</strong> Producing your estimate, booking a survey, preparing a proposal, running the project.</p>
            <p>
              <strong className="text-foreground">Because you said yes (consent).</strong> Optional
              cookies, marketing email, and letting a third-party AI model read your bill. You can
              withdraw any of these at any time —{' '}
              <button onClick={openCookiePreferences} className="underline underline-offset-2 hover:no-underline text-foreground">
                cookie preferences
              </button>{' '}
              is always in the footer.
            </p>
            <p><strong className="text-foreground">To run the business sensibly (legitimate interests).</strong> Keeping the service secure, preventing fraud, and improving how it works — balanced against your rights.</p>
            <p><strong className="text-foreground">Because the law requires it (legal obligation).</strong> Tax and accounting records, and grant or connection paperwork where a scheme requires it.</p>
          </Section>

          <Section icon={Database} title="What happens when you upload a bill" accent="accent">
            <p>
              Your bill is sent to a third-party AI model, which reads it and returns the details
              listed above. That's how you get an estimate built on your real numbers in seconds
              instead of typing fifteen fields.
            </p>
            <p>
              <strong className="text-foreground">You can say no.</strong> Turn off bill analysis in
              cookie preferences and the site still works — you enter the numbers yourself and get
              the same calculation. Your bill is not used to train any AI model, and it isn't sent
              anywhere else.
            </p>
          </Section>

          <Section icon={Share2} title="Who we share it with" accent="aisolar">
            <p><strong className="text-foreground">Your installer.</strong> If you ask for a quote or book a survey, your details go to the installer who'd do the work. That's the point of the request.</p>
            <p><strong className="text-foreground">Providers we rely on</strong>, under contract and only to deliver the service: our EU-hosted database and file storage, our transactional email provider, our payment processors, and the AI provider that reads uploaded bills.</p>
            <p><strong className="text-foreground">SEAI and ESB Networks</strong>, where a grant application or a microgeneration registration is being made for your installation — as part of the job, with your knowledge.</p>
            <p><strong className="text-foreground">Nobody else.</strong> We do not sell your data, rent it, or hand it to advertisers.</p>
          </Section>

          <Section icon={Clock} title="Where it lives, and for how long" accent="aios">
            <p>
              Data is hosted in the European Union. Where a provider processes data outside the
              EEA, that transfer relies on safeguards permitted under GDPR, such as Standard
              Contractual Clauses.
            </p>
            <p>
              We keep project data while we're working with you, and afterwards only as long as
              we're required to — grant records, connection records and tax records each carry
              their own statutory retention period. Marketing consent is kept until you withdraw
              it. Anything with no remaining purpose is erased or anonymised.
            </p>
          </Section>

          <Section icon={UserCheck} title="Your rights" accent="aiteam">
            <p>Under GDPR you can ask us to:</p>
            <ul className="space-y-1.5">
              <li><strong className="text-foreground">Give you a copy</strong> of the data we hold about you.</li>
              <li><strong className="text-foreground">Correct</strong> anything that's wrong.</li>
              <li><strong className="text-foreground">Erase it</strong>, where we have no legal reason to keep it.</li>
              <li><strong className="text-foreground">Port it</strong> — a machine-readable export you can take elsewhere.</li>
              <li><strong className="text-foreground">Restrict or object</strong> to how we're using it.</li>
              <li><strong className="text-foreground">Withdraw consent</strong> at any time, as easily as you gave it.</li>
            </ul>
            <p>
              Email <a href={`mailto:${EMAIL}`} className="underline underline-offset-2 hover:no-underline text-foreground">{EMAIL}</a> and
              we'll respond within one month. If your data sits with an installer who uses AISOLAR,
              we'll pass the request to them as controller and help them action it.
            </p>
            <p>
              If you're unhappy with how we've handled it, you can complain to the Irish Data
              Protection Commission at{' '}
              <a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:no-underline text-foreground">dataprotection.ie</a>.
            </p>
          </Section>

          <Section icon={Cookie} title="Cookies" accent="accent">
            <p>
              Essential cookies keep the site working — signing in, security, remembering your
              session. They can't be switched off. Everything else is optional and stays off
              until you turn it on.
            </p>
            <p>
              <button onClick={openCookiePreferences} className="underline underline-offset-2 hover:no-underline text-foreground font-medium">
                Open cookie preferences
              </button>{' '}
              to change your choices at any time.
            </p>
          </Section>

          <Section icon={Shield} title="Security, and being straight with you" accent="aios">
            <p>
              We use access controls, encryption in transit, and row-level database policies so
              one installer can never see another's customers.
            </p>
            <p>
              We're a young company and we don't claim certifications we haven't earned — you
              won't find invented ISO or SOC badges on this site. If we ever suffer a breach that
              puts your rights at risk, we'll notify the Data Protection Commission within 72
              hours and tell you directly where we're required to.
            </p>
          </Section>

          <Section icon={Mail} title="Contact" accent="aisolar">
            <p>
              Questions, requests or corrections:{' '}
              <a href={`mailto:${EMAIL}`} className="underline underline-offset-2 hover:no-underline text-foreground">{EMAIL}</a>.
            </p>
            <p>{ENTITY}, {ADDRESS}.</p>
            <p className="text-sm">
              Changes to this policy get posted here with a new date at the top. If a change
              materially affects you, we'll tell you rather than hope you notice.
            </p>
          </Section>
        </div>

        <div className="mt-14 flex flex-wrap gap-4 text-sm">
          <Link to="/terms" className="underline underline-offset-2 hover:no-underline">Terms of Service</Link>
          <Link to="/faq" className="underline underline-offset-2 hover:no-underline">FAQ</Link>
          <Link to="/blog" className="underline underline-offset-2 hover:no-underline">Guides</Link>
        </div>
      </main>

      <MarketingFooter product="aisolar" />
    </div>
  );
}
