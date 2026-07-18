/**
 * Landing Page — installer B2B SaaS.
 *
 * This is NOT a homeowner sales page. This is what a solar installer
 * sees when they visit aisolar.ie. They should immediately understand:
 *   "This is an automation platform for my solar business."
 *
 * The homeowner funnel (bill upload → estimate → consultation booking)
 * still exists at /lead-flow but it's not the homepage anymore.
 *
 * Phase 6: added mobile hamburger menu (nav was overflowing on 375px).
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bot, Zap, Calendar, FileText, Wrench, Shield, Award, TrendingUp,
  ArrowRight, Check, Sun, Users, Clock, DollarSign, BarChart3,
  Building2, Cpu, MessageSquare, Package, Camera, Menu, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SEOHead from '@/components/SEOHead';
import { brand } from '@/config/brand';
import { useIsMobile } from '@/hooks/use-mobile';

export default function InstallerLanding() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = (
    <>
      <Button variant="ghost" size="sm" onClick={() => { navigate('/calculator'); setMenuOpen(false); }}>ROI Calculator</Button>
      <Button variant="ghost" size="sm" onClick={() => { navigate('/about'); setMenuOpen(false); }}>About</Button>
      <Button size="sm" onClick={() => { navigate('/auth'); setMenuOpen(false); }} className="bg-emerald-600 transition-colors hover:bg-emerald-700">
        Sign in
      </Button>
      <Button size="sm" variant="outline" onClick={() => { navigate('/demo'); setMenuOpen(false); }}>
        <Bot className="h-3 w-3 mr-1" /> Demo
      </Button>
    </>
  );

  return (
    <>
      <SEOHead
        title={`${brand.name} — Solar Installer Operating System | Ireland`}
        description="Automation + AI for solar installers. Bill extract, auto-survey scheduling, AI proposal drafting, SEAI grant filing, install coordination. Your crews install. The platform does the rest."
      />

      {/* Nav */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-amber-500 to-blue-600 rounded-lg">
              <Sun className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg">{brand.name}</span>
          </div>
          {/* Desktop nav */}
          {!isMobile && (
            <div className="flex items-center gap-2">
              {navItems}
            </div>
          )}
          {/* Mobile hamburger */}
          {isMobile && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
        {/* Mobile dropdown */}
        <AnimatePresence>
          {isMobile && menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden overflow-hidden border-t bg-background"
            >
              <div className="container mx-auto px-4 py-3 flex flex-col gap-2">
                {navItems}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero — for installers */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-background dark:to-blue-950/20">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="outline" className="bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 mb-4">
              <Bot className="h-3 w-3 mr-1" /> Solar Installer Operating System
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
              Your crews install.<br />
              <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                The platform does the rest.
              </span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Bill extract at the front door. 10 autonomous agents handle survey scheduling,
              proposal drafting, SEAI grants, install coordination, and customer follow-ups.
              Built for Irish solar installers — SEAI, RECI, ESB, Met Éireann built in.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button size="lg" onClick={() => navigate('/auth')} className="bg-emerald-600 transition-colors hover:bg-emerald-700">
                Start free trial <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/demo')}>
                See it in action
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-4 justify-center text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-600" /> 14-day free trial</span>
              <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-600" /> No credit card</span>
              <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-600" /> Irish-based support</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* The 7 automated stages */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">From bill upload to installed system — automated</h2>
            <p className="text-muted-foreground">7 stages. 10 agents. Zero manual admin.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Zap, title: 'Bill Extract', desc: 'Customer uploads bill. AI extracts MPRN, kWh, address. Lead enters pipeline automatically.' },
              { icon: Calendar, title: 'Auto-Survey', desc: 'Survey Scheduler Agent books site visit based on installer availability + lead location.' },
              { icon: Bot, title: 'AI Proposal', desc: 'Proposal Drafter Agent uses survey data + product catalogue. Consultant reviews in 2 minutes.' },
              { icon: FileText, title: 'Contract + Invoice', desc: 'Customer signs in portal. Invoice auto-created. SEAI grant paperwork auto-started.' },
              { icon: Wrench, title: 'Install Coordination', desc: 'Agent schedules crew, orders materials, sends T-7/T-1 reminders, auto-reschedules on weather.' },
              { icon: Shield, title: 'SEAI + RECI + ESB', desc: 'Grant filed, electrical sign-off, NC6 microgen export — all pre-populated from survey + install data.' },
              { icon: MessageSquare, title: 'Customer Comms', desc: 'Customer gets a chat portal with AI assistant. PostInstall Agent sends warranty + review request.' },
              { icon: BarChart3, title: 'Analytics', desc: 'Real-time funnel, conversion rates, team performance, agent impact, SEAI pipeline.' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <Card className="h-full">
                    <CardContent className="p-5">
                      <div className="p-2 bg-blue-100 dark:bg-blue-950/40 rounded-lg w-fit mb-3">
                        <Icon className="h-5 w-5 text-blue-700 dark:text-blue-300" />
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

      {/* Stats */}
      <section className="py-12 px-4 bg-emerald-600 text-white">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <div><div className="text-4xl font-bold">10</div><div className="text-sm text-blue-100">Autonomous agents</div></div>
            <div><div className="text-4xl font-bold">3hrs</div><div className="text-sm text-blue-100">Saved per consultant/day</div></div>
            <div><div className="text-4xl font-bold">42%</div><div className="text-sm text-blue-100">Lift in conversion</div></div>
            <div><div className="text-4xl font-bold">€1,800</div><div className="text-sm text-blue-100">SEAI grant auto-filed</div></div>
          </div>
        </div>
      </section>

      {/* What you get — the cockpit */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">One cockpit. Every POV.</h2>
            <p className="text-muted-foreground">Owner, consultant, installer, customer — all connected.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Building2, title: 'Owner Cockpit', desc: 'Birdseye view: pipeline flow, team performance, agent monitor, calendar, analytics, SEAI compliance, settings — all in one sidebar.' },
              { icon: Users, title: 'Consultant Inbox', desc: '11 tabs: Leads, Chats, Estimates, Surveys, Proposals, Installations, Calendar, Follow-ups, Products, Documents, Analytics. Slide-out estimate + proposal panels.' },
              { icon: Wrench, title: 'Installer Portal', desc: '3 tabs: Jobs (active/completed), Materials (per-customer BOM + depot stock), Map. Click any job → tabbed checklist with signature.' },
              { icon: MessageSquare, title: 'Customer Portal', desc: 'Conversation-first: chat thread with AI, documents (proposal, contract, invoice, warranty), GDPR data rights.' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <Card key={i}>
                  <CardContent className="p-5 flex items-start gap-3">
                    <div className="p-2 bg-violet-100 dark:bg-violet-950/40 rounded-lg flex-shrink-0">
                      <Icon className="h-5 w-5 text-violet-700 dark:text-violet-300" />
                    </div>
                    <div>
                      <h3 className="font-bold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Irish-specific */}
      <section className="py-12 px-4 bg-slate-50 dark:bg-slate-950/30">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold mb-6">Built for Ireland</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Award, label: 'SEAI grant rules', desc: '€900/kWp, max €1,800. Auto-filed.' },
              { icon: Shield, label: 'RECI compliance', desc: 'Electrical sign-off from checklist.' },
              { icon: Zap, label: 'ESB NC6 microgen', desc: 'Export tariff €0.14/kWh. Auto-submitted.' },
              { icon: Calendar, label: 'Met Éireann', desc: 'Weather warnings auto-reschedule.' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="text-center">
                  <div className="p-3 bg-background rounded-xl w-fit mx-auto mb-2 border">
                    <Icon className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="font-semibold text-sm">{item.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-emerald-600 to-blue-700 text-white">
        <div className="container mx-auto max-w-3xl text-center">
          <Cpu className="h-12 w-12 mx-auto mb-4 opacity-80" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Stop doing admin. Start installing.
          </h2>
          <p className="text-lg text-white/80 mb-8">
            14-day free trial. We'll have your first lead through the pipeline today.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" variant="secondary" onClick={() => navigate('/auth')} className="bg-white text-emerald-700 transition-colors hover:bg-white/90">
              Start free trial <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/demo')} className="border-white text-white transition-colors hover:bg-white/10">
              Browse all views
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto max-w-4xl text-center text-sm text-muted-foreground">
          <p>{brand.name} · {brand.contact.address} · {brand.contact.phoneDisplay} · {brand.contact.email}</p>
          <p className="mt-2">SEAI Registered · RECI Certified · GDPR Compliant · Irish Data Protection Commission registered</p>
        </div>
      </footer>
    </>
  );
}
