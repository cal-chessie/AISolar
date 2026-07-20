import { motion } from 'framer-motion';
import {
  Award, Shield, Users, Sun, Zap, Bot, TrendingUp, Wrench, Calendar,
  CheckCircle2, FileText, MessageSquare, BarChart3, Sparkles, ArrowRight,
  Cpu, Lock, Globe,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SiteNavigation from '@/components/layout/SiteNavigation';
import SEOHead from '@/components/SEOHead';
import { brand } from '@/config/brand';
import { useNavigate } from 'react-router-dom';

export default function AboutUs() {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title={`About ${brand.name} — The Solar Installer Operating System`}
        description="We built AISOLAR because Irish solar installers deserve better than spreadsheets and WhatsApp. Our autonomous agent foundation handles the busywork so your crews can install."
        ogType="website"
      />
      <SiteNavigation />

      {/* Hero */}
      <section className="py-20 px-4 bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-emerald-950/20 dark:via-background dark:to-blue-950/20">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 mb-4">
              <Sparkles className="h-3 w-3 mr-1" /> The Solar Installer Operating System
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
              We built AISOLAR because Irish solar installers deserve better than spreadsheets and WhatsApp.
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Your crews install. The platform does the rest — bill extract at the front door,
              autonomous agents handle survey scheduling, proposal drafting, SEAI grant paperwork,
              install coordination, and customer follow-ups.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button size="lg" onClick={() => navigate('/upload')} className="bg-emerald-600 hover:bg-emerald-700">
                See it in action <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/demo')}>
                Browse all views
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* What we do */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">What AISOLAR actually does</h2>
            <p className="text-muted-foreground">Seven automated stages, from lead to closed project.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Zap, title: 'Bill extract', desc: 'Customer uploads electricity bill. AI extracts MPRN, annual kWh, address. Lead enters pipeline automatically.' },
              { icon: Calendar, title: 'Survey scheduling', desc: 'Survey Scheduler Agent books site visit based on installer availability + lead location + priority.' },
              { icon: Bot, title: 'Proposal drafting', desc: 'Proposal Drafter Agent uses survey data + product catalogue to auto-draft a proposal. Consultant reviews in 2 minutes.' },
              { icon: FileText, title: 'Contract + invoice', desc: 'Customer signs in portal. Invoice auto-created. SEAI grant paperwork auto-started.' },
              { icon: Wrench, title: 'Install coordination', desc: 'Install Coordinator Agent schedules crew, orders materials, sends T-7/T-1 SMS reminders, auto-reschedules on weather warnings.' },
              { icon: Shield, title: 'SEAI grant filing', desc: 'SEAI Grant Agent compiles application pack (MPRN, BER, invoice, install photos, RECI cert) and emails to SEAI.' },
              { icon: MessageSquare, title: 'Customer comms', desc: 'Customer gets a mobile portal with timeline, paperwork, and AI chat. PostInstall Agent sends warranty + review request.' },
              { icon: BarChart3, title: 'Analytics + BI', desc: 'Real-time funnel, conversion rates, team performance, agent impact, SEAI pipeline. Export to CSV.' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="h-full">
                    <CardContent className="p-5">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-950/40 rounded-lg w-fit mb-3">
                        <Icon className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                      </div>
                      <h3 className="font-bold mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* The 10 agents */}
      <section className="py-16 px-4 bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-950/20 dark:to-blue-950/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge variant="outline" className="bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 mb-3">
              <Bot className="h-3 w-3 mr-1" /> Autonomous Foundation
            </Badge>
            <h2 className="text-3xl font-bold mb-3">10 agents working 24/7</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each agent owns a recurring workflow step that doesn't need human judgment.
              They run on pg_cron schedules + DB triggers, write to <code>agent_runs</code> for audit,
              and have built-in guardrails.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { name: 'Lead Intake', trigger: 'New lead' },
              { name: 'Survey Scheduler', trigger: 'Intake complete' },
              { name: 'Proposal Drafter', trigger: 'Survey complete' },
              { name: 'Follow-Up', trigger: 'Daily 09:00' },
              { name: 'SEAI Grant', trigger: 'Contract signed' },
              { name: 'Install Coordinator', trigger: 'Deposit paid' },
              { name: 'PostInstall', trigger: 'Install complete' },
              { name: 'Customer Digest', trigger: 'Mon 10:00' },
              { name: 'Stale Lead Escalator', trigger: 'Daily 08:00' },
              { name: 'Payment Reminder', trigger: 'Daily 09:30' },
            ].map((agent, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="text-center">
                  <CardContent className="p-4">
                    <div className="p-2 bg-violet-100 dark:bg-violet-950/40 rounded-full w-fit mx-auto mb-2">
                      <Bot className="h-4 w-4 text-violet-700 dark:text-violet-300" />
                    </div>
                    <div className="font-semibold text-sm">{agent.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{agent.trigger}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why we built it */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Why we built AISOLAR</h2>
            <p className="text-muted-foreground">The problem we kept seeing in Irish solar.</p>
          </div>
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-100 dark:bg-red-950/40 rounded-xl flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-red-700 dark:text-red-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Installers were drowning in admin</h3>
                    <p className="text-muted-foreground">
                      We talked to 40+ Irish solar installers. The pattern was identical: crews spending
                      3+ hours/day on leads, surveys, proposals, follow-ups, grant paperwork, and customer
                      comms — instead of installing solar. The pipeline was leaking at every stage.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-100 dark:bg-amber-950/40 rounded-xl flex-shrink-0">
                    <Bot className="h-6 w-6 text-amber-700 dark:text-amber-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Existing CRMs weren't built for solar</h3>
                    <p className="text-muted-foreground">
                      Generic CRMs (HubSpot, Pipedrive) don't know what an MPRN is. Don't know SEAI grant
                      rules. Don't auto-draft proposals. Don't coordinate installs. Don't file grants.
                      Installers were duct-taping 5+ tools together.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 rounded-xl flex-shrink-0">
                    <Sparkles className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">So we built the operating system</h3>
                    <p className="text-muted-foreground">
                      AISOLAR is purpose-built for Irish solar: SEAI grant rules baked in, Eircode lookup,
                      Met Éireann weather integration, RECI compliance, Irish microgen export tariff.
                      10 autonomous agents do the busywork. Your crews install. The platform does the rest.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="py-16 px-4 bg-slate-50 dark:bg-slate-950/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Built on a proper foundation</h2>
            <p className="text-muted-foreground">Not a Lovable demo. Production-grade architecture.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Cpu, title: 'Supabase kernel', desc: 'Postgres + Auth + Edge Functions + Realtime + Storage. RLS-enforced multi-tenancy. pg_cron + Vault for agent scheduling.' },
              { icon: Bot, title: 'Agent runtime', desc: 'claim_next_job / complete_job / fail_job SQL functions with FOR UPDATE SKIP LOCKED. Exponential backoff. Dead-letter queue. Stuck-job sweeper.' },
              { icon: Lock, title: 'Security first', desc: 'verify_jwt=true on all non-webhook functions. Stripe + Coinbase webhook signatures mandatory. PII-safe logging. Vault-stored secrets.' },
              { icon: Globe, title: 'Irish-specific', desc: 'Eircode lookup. Met Éireann weather. SEAI grant rules. RECI compliance. Microgen export tariff (€0.14/kWh). Irish VAT (13% on solar).' },
              { icon: BarChart3, title: 'Analytics built-in', desc: 'Real-time funnel. Conversion rates per stage. Team performance. Agent impact (hours saved, cost saved). SEAI pipeline value.' },
              { icon: Shield, title: 'GDPR ready', desc: 'Right-to-erasure helper. Data retention crons. Cookie consent. Privacy policy + terms. DPA templates for sub-processors.' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <Card key={i}>
                  <CardContent className="p-5">
                    <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg w-fit mb-3">
                      <Icon className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                    </div>
                    <h3 className="font-bold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-emerald-600 to-blue-700 text-white">
        <div className="container mx-auto max-w-3xl text-center">
          <Sun className="h-12 w-12 mx-auto mb-4" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Run your solar business on autopilot.
          </h2>
          <p className="text-lg text-white/80 mb-8">
            Start your free 14-day trial. No credit card. We'll have your first lead through the pipeline today.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" variant="secondary" onClick={() => navigate('/auth')} className="bg-white text-emerald-700 hover:bg-white/90">
              Start free trial <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/demo')} className="border-white text-white hover:bg-white/10">
              Browse all views
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
