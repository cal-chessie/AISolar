import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, Check, Play, Star, TrendingUp, Shield, Calculator, FileText, Calendar, Upload, Sparkles, Euro, Quote, MessageCircle, ChevronLeft, ChevronRight, Leaf, Clock, ShieldCheck, Award } from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import LeadCaptureForm from '@/components/LeadCaptureForm';
import SiteNavigation from '@/components/layout/SiteNavigation';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import { MobileHomeNav } from '@/components/landing/MobileHomeNav';
import { ScrollIndicator } from '@/components/ui/ScrollIndicator';
import { brand } from '@/config/brand';
import { Card3D } from '@/components/ui/Card3D';
export default function PremiumIndex() {
  const navigate = useNavigate();
  const [showVideo, setShowVideo] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [estimatedBill, setEstimatedBill] = useState(200);
  const heroRef = useRef(null);
  const {
    scrollYProgress
  } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.25], [1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2, 0.3], [1, 1, 0.9]);
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const annualSavings = Math.round(estimatedBill * 12 * 0.7);
  return <>
      <SEOHead title={brand.seo.title} description={brand.seo.description} keywords={brand.seo.keywords} />
      
      <div className="premium-sales-page">
        {/* Site Navigation */}
        <SiteNavigation />

        {/* Sticky CTA Header */}
        <AnimatePresence>
          {isSticky && <motion.header initial={{
          y: -100
        }} animate={{
          y: 0
        }} exit={{
          y: -100
        }} className="sticky-cta-header">
              <div className="sticky-content">
                <div className="sticky-text">
                  <Zap size={20} />
                  <span>Get Your Instant Solar Proposal - Save Up To 70% On Electricity</span>
                </div>
                <div className="sticky-actions flex items-center gap-2">
                  <div className="hidden md:block">
                    <DarkModeToggle />
                  </div>
                  <button className="sticky-cta" onClick={() => navigate('/upload')}>
                    Upload Bill Now <ArrowRight size={16} />
                  </button>
                  <button className="consultant-login-btn small" onClick={() => navigate('/auth')}>
                    Consultant Login
                  </button>
                </div>
              </div>
            </motion.header>}
        </AnimatePresence>

        {/* Hero Section */}
        <section ref={heroRef} className="hero-section">
          <div className="hero-background">
            <div className="hero-glow"></div>
          </div>
          
          <motion.div className="hero-content" style={{
          opacity,
          scale
        }}>
            <div className="hero-badge">
              <TrendingUp size={16} />
              <span>Solar installer operating system — for crews, not consumers</span>
            </div>

            <h1 className="hero-title">
              Run your solar business on
              <span className="gradient-text"> autopilot</span>
            </h1>
            
            <p className="hero-subtitle">
              Bill extract at the front door. Autonomous agents handle survey scheduling,
              proposal drafting, SEAI grant paperwork, install coordination, and customer follow-ups.
              Your crews install. The platform does the rest.
            </p>

            <div className="hero-stats">
              <div className="stat">
                <div className="stat-number">10</div>
                <div className="stat-label">Autonomous agents working 24/7</div>
              </div>
              <div className="stat">
                <div className="stat-number">3 hrs</div>
                <div className="stat-label">Saved per consultant per day</div>
              </div>
              <div className="stat">
                <div className="stat-number">42%</div>
                <div className="stat-label">Lift in survey→proposal conversion</div>
              </div>
            </div>

            {/* Main CTA */}
            <div className="hero-cta">
              <button className="primary-cta" onClick={() => navigate('/installer')}>
                <FileText size={20} />
                Open installer cockpit
                <ArrowRight size={16} />
              </button>
              
              <button className="secondary-cta" onClick={() => navigate('/pipeline')}>
                <Play size={16} />
                See the live pipeline
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="trust-pills">
              <div className="trust-pill">
                <Check size={14} />
                SEAI grant auto-filed
              </div>
              <div className="trust-pill">
                <Shield size={14} />
                RECI sign-off built in
              </div>
              <div className="trust-pill">
                <Calculator size={14} />
                Bill extract → proposal in 30s
              </div>
            </div>
          </motion.div>

          {/* Hero Visual - Live Product Preview */}
          <div className="hero-visual self-start mt-0 ml-6">
            <div className="flex flex-col gap-5 w-full max-w-lg">
              {/* Card 1: Project Snapshot */}
              <motion.div initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: 0.2,
              duration: 0.5
            }} whileHover={{
              y: -4,
              transition: {
                duration: 0.2
              }
            }} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 cursor-pointer hover:shadow-xl hover:shadow-slate-300/50 dark:hover:shadow-slate-800/50 transition-shadow duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Project Snapshot</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">System Size</span>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">6.4 kWp</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Annual Production</span>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">5,890 kWh</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">SEAI Grant</span>
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">€1,800</span>
                  </div>
                </div>
              </motion.div>

              {/* Card 2: AI Insight (Emphasized) */}
              <motion.div initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: 0.4,
              duration: 0.5
            }} whileHover={{
              y: -4,
              transition: {
                duration: 0.2
              }
            }} className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 rounded-2xl p-6 shadow-lg shadow-emerald-100/50 dark:shadow-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:shadow-xl hover:shadow-emerald-300/60 dark:hover:shadow-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-600/50 transition-all duration-300 hover:ring-2 hover:ring-emerald-400/30 dark:hover:ring-emerald-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-emerald-500 rounded-lg">
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">AI Analysis</h3>
                  <motion.div className="ml-auto px-2 py-0.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full ring-1 ring-emerald-400/30 dark:ring-emerald-500/30" animate={{
                  boxShadow: ['0 0 0 0 rgba(16, 185, 129, 0)', '0 0 8px 2px rgba(16, 185, 129, 0.3)', '0 0 0 0 rgba(16, 185, 129, 0)']
                }} transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}>
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">94% confidence</span>
                  </motion.div>
                </div>
                <p className="text-sm text-emerald-900/80 dark:text-emerald-100/80 leading-relaxed">
                  Based on your electricity usage of 4,200 kWh annually, a south-facing roof orientation provides optimal solar generation. Estimated payback period is 7.2 years with current energy prices.
                </p>
              </motion.div>

              {/* Card 3: Next Actions */}
              <motion.div initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: 0.6,
              duration: 0.5
            }} whileHover={{
              y: -4,
              transition: {
                duration: 0.2
              }
            }} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 cursor-pointer hover:shadow-xl hover:shadow-slate-300/50 dark:hover:shadow-slate-800/50 transition-shadow duration-200">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Next Steps</h3>
                <div className="space-y-3">
                  {[{
                  text: 'Upload electricity bill',
                  completed: true,
                  delay: 0.8
                }, {
                  text: 'AI analysis complete',
                  completed: true,
                  delay: 1.0
                }, {
                  text: 'Review savings proposal',
                  completed: false,
                  current: true,
                  delay: 1.2
                }, {
                  text: 'Schedule site survey',
                  completed: false,
                  delay: 1.4
                }].map((item, index) => <motion.div key={index} initial={{
                  opacity: 0,
                  x: -10
                }} animate={{
                  opacity: 1,
                  x: 0
                }} transition={{
                  delay: item.delay,
                  duration: 0.3
                }} className="flex items-center gap-3">
                      <motion.div initial={item.completed ? {
                    scale: 0
                  } : {}} animate={item.completed ? {
                    scale: 1
                  } : {}} transition={{
                    delay: item.delay + 0.15,
                    duration: 0.2,
                    type: 'spring'
                  }} className={`w-5 h-5 rounded-full flex items-center justify-center ${item.completed ? 'bg-emerald-100 dark:bg-emerald-900/50' : item.current ? 'border-2 border-emerald-500' : 'border-2 border-slate-200 dark:border-slate-700'}`}>
                        {item.completed && <motion.div initial={{
                      scale: 0
                    }} animate={{
                      scale: 1
                    }} transition={{
                      delay: item.delay + 0.2,
                      duration: 0.2
                    }}>
                            <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                          </motion.div>}
                        {item.current && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                      </motion.div>
                      <span className={`text-sm ${item.completed ? 'text-slate-500 dark:text-slate-400 line-through' : item.current ? 'text-slate-800 dark:text-slate-100 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
                        {item.text}
                      </span>
                    </motion.div>)}
                </div>
              </motion.div>

              {/* Trust element under cards */}
              <motion.div initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: 1.6,
              duration: 0.5
            }} className="flex items-center gap-3 p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xs font-semibold text-white shadow-md ring-2 ring-white dark:ring-slate-900">SM</div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-xs font-semibold text-white shadow-md ring-2 ring-white dark:ring-slate-900">JO</div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-xs font-semibold text-white shadow-md ring-2 ring-white dark:ring-slate-900">KF</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    500+ Irish homes
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    switched to solar this year
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Video Modal */}
        <AnimatePresence>
          {showVideo && <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} exit={{
          opacity: 0
        }} className="video-modal" onClick={() => setShowVideo(false)}>
              <motion.div initial={{
            scale: 0.8,
            opacity: 0
          }} animate={{
            scale: 1,
            opacity: 1
          }} className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="close-button" onClick={() => setShowVideo(false)}>
                  ×
                </button>
                <div className="video-container">
                  <div className="video-placeholder">
                    <Play size={48} />
                    <p>How It Works Video</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>}
        </AnimatePresence>

        <SocialProofSection />
        <HowItWorksSection />
        <LeadCaptureSection />
        <SavingsCalculatorSection estimatedBill={estimatedBill} setEstimatedBill={setEstimatedBill} annualSavings={annualSavings} />
        
        {/* Mobile Bottom Navigation */}
        <MobileHomeNav />
        <FinalCTASection navigate={navigate} />
      </div>
    </>;
}
function SocialProofSection() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const testimonials = [{
    name: "Sarah Murphy",
    location: "Dublin",
    systemInfo: "System installed · 4.2 kW · SEAI grant applied",
    savings: "€1,450",
    rating: 5,
    text: "The AI proposal matched our actual bills almost exactly. We're saving about €1,450 a year, and the installation just… happened.",
    initials: "SM",
    gradient: "from-emerald-400 to-teal-500"
  }, {
    name: "John O'Brien",
    location: "Cork",
    systemInfo: "Bill uploaded → proposal → install in 21 days",
    savings: "€1,280",
    rating: 5,
    text: "I uploaded my bill at 8 PM and had a clear proposal by the next morning. No back-and-forth. No pressure.",
    initials: "JO",
    gradient: "from-blue-400 to-indigo-500"
  }, {
    name: "The Kelly Family",
    location: "Galway",
    systemInfo: "SEAI paperwork handled in full",
    savings: "€1,650",
    rating: 5,
    text: "The SEAI grant was handled for us from start to finish. Between that and solar, our electricity costs are close to zero.",
    initials: "KF",
    gradient: "from-purple-400 to-pink-500"
  }];
  return <section className="social-proof-section">
      <div className="container">
        <motion.div initial={{
        opacity: 0,
        y: 50
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} className="section-header">
          <h2>Trusted by Hundreds of Irish Homeowners — With Verified Savings</h2>
          <p>Real customers. Real bills. Real installations — from upload to switch-on.</p>
        </motion.div>

        <div ref={scrollContainerRef} className="testimonials-grid">
          {testimonials.map((testimonial, index) => <motion.div key={index} initial={{
          opacity: 0,
          y: 30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          delay: index * 0.1
        }} className="testimonial-card">
              <div className="testimonial-header">
                <div className={`customer-avatar bg-gradient-to-br ${testimonial.gradient} text-white font-semibold text-lg shadow-lg`}>
                  {testimonial.initials}
                </div>
                <div className="customer-info">
                  <div className="customer-name">{testimonial.name}</div>
                  <div className="customer-location">{testimonial.location}</div>
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                {testimonial.systemInfo}
              </div>

              <div className="testimonial-rating">
                {[...Array(testimonial.rating)].map((_, i) => <motion.div key={i} initial={{
              opacity: 0,
              scale: 0
            }} whileInView={{
              opacity: 1,
              scale: 1
            }} viewport={{
              once: true
            }} transition={{
              delay: index * 0.1 + 0.3 + i * 0.1,
              duration: 0.2,
              type: 'spring',
              stiffness: 500
            }}>
                    <Star size={16} fill="currentColor" />
                  </motion.div>)}
              </div>

              <div className="testimonial-text">
                <Quote size={20} className="quote-icon" />
                {testimonial.text}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Estimated savings · {testimonial.savings}/year
                </span>
              </div>
            </motion.div>)}
        </div>
        
        {/* Scroll Indicator */}
        <div className="md:hidden">
          <ScrollIndicator containerRef={scrollContainerRef as React.RefObject<HTMLElement>} itemCount={testimonials.length} />
        </div>

        {/* Trust Line */}
        <motion.p initial={{
        opacity: 0
      }} whileInView={{
        opacity: 1
      }} viewport={{
        once: true
      }} className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6 max-w-2xl mx-auto">
          Savings estimates are based on historical utility bills, system size, and current tariffs. Individual results may vary.
        </motion.p>

        {/* Soft CTA */}
        <motion.div initial={{
        opacity: 0,
        y: 10
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} className="text-center mt-6">
          <a href="/upload" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
            See what your bill could look like
            <ArrowRight size={16} />
          </a>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            Most customers upload their bill in under 2 minutes.
          </p>
        </motion.div>

        <div className="trust-logos">
          <div className="certification-badge">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>SEAI Registered</span>
          </div>
          <div className="certification-badge">
            <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>RECI Certified</span>
          </div>
          <div className="certification-badge">
            <Euro className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>€1,800 Grant</span>
          </div>
          <div className="certification-badge">
            <Star className="w-5 h-5 text-yellow-500" fill="currentColor" />
            <span>4.9★ Rating</span>
          </div>
        </div>
      </div>
    </section>;
}
function HowItWorksSection() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const steps = [{
    icon: Upload,
    title: "Upload Your Bill",
    description: "Simply upload your latest electricity bill - PDF, image, or screenshot",
    color: "#10b981"
  }, {
    icon: Sparkles,
    title: "AI Analysis",
    description: "Our AI analyzes your consumption patterns and calculates optimal solar system size",
    color: "#6366f1"
  }, {
    icon: FileText,
    title: "Get Your Proposal",
    description: "Receive a detailed proposal with savings breakdown, system specs, and SEAI grant info",
    color: "#f59e0b"
  }, {
    icon: Calendar,
    title: "Book Consultation",
    description: "Schedule a free consultation with our certified solar experts",
    color: "#ec4899"
  }];
  return <section className="how-it-works-section">
      <div className="container">
        <motion.div initial={{
        opacity: 0,
        y: 50
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} className="section-header">
          <h2>Get Your Solar Proposal in 4 Simple Steps</h2>
          <p>From upload to installation - we make going solar effortless</p>
        </motion.div>

        <div ref={scrollContainerRef} className="steps-grid">
          {steps.map((step, index) => <motion.div key={index} initial={{
          opacity: 0,
          x: -30
        }} whileInView={{
          opacity: 1,
          x: 0
        }} viewport={{
          once: true
        }} transition={{
          delay: index * 0.15
        }} className="step-card">
              <div className="step-number">{index + 1}</div>
              <div className="step-icon" style={{
            color: step.color
          }}>
                <step.icon size={32} />
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </motion.div>)}
        </div>
        
        {/* Scroll Indicator */}
        <div className="md:hidden">
          <ScrollIndicator containerRef={scrollContainerRef as React.RefObject<HTMLElement>} itemCount={steps.length} />
        </div>
      </div>
    </section>;
}
function LeadCaptureSection() {
  return <section className="savings-calculator-section">
      <div className="container">
        <motion.div initial={{
        opacity: 0,
        y: 50
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} className="section-header">
          <h2>Start Your Solar Journey Today</h2>
          <p>Fill out the form below and we'll contact you with a personalized solar proposal</p>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          <LeadCaptureForm />
        </div>
      </div>
    </section>;
}
// Simple Counter Component - displays value directly
function AnimatedCounter({ 
  value, 
  prefix = '', 
  suffix = '',
}: { 
  value: number; 
  prefix?: string; 
  suffix?: string;
  isInView?: boolean;
}) {
  return (
    <span className="tabular-nums">
      {prefix}{value.toLocaleString()}{suffix}
    </span>
  );
}

function SavingsCalculatorSection({
  estimatedBill,
  setEstimatedBill,
  annualSavings
}: {
  estimatedBill: number;
  setEstimatedBill: (value: number) => void;
  annualSavings: number;
}) {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  

  // Calculate additional metrics
  const twentyFiveYearSavings = annualSavings * 25;
  
  return (
    <section className="savings-calculator-section" ref={sectionRef}>
      <div className="container">
        <motion.div 
          initial={{ opacity: 0, y: 50 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }} 
          className="section-header"
        >
          <h2>Calculate Your Potential Savings</h2>
          <p>Drag the slider to see your personalized solar savings</p>
        </motion.div>

        <motion.div 
          className="calculator-card enhanced"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          {/* Interactive Slider Section */}
          <div className="calculator-input minimal">
            <label>
              <Euro size={20} />
              Monthly Electricity Bill
            </label>
            <div className="slider-container minimal">
              {/* Value bubble - accurately positioned above thumb */}
              <div 
                className="slider-value-bubble"
                style={{ left: `calc(${((estimatedBill - 50) / 450) * 100}% * 0.92 + 4%)` }}
              >
                €{estimatedBill}
              </div>
              
              <input 
                type="range" 
                min="50" 
                max="500" 
                step="10"
                value={estimatedBill} 
                onChange={e => setEstimatedBill(Number(e.target.value))} 
                className="minimal-slider" 
              />
              
              <div className="slider-range-labels">
                <span>€50</span>
                <span>€500</span>
              </div>
            </div>
          </div>

          {/* Results Grid - 3 cards side by side */}
          <div className="calculator-results-row">
            <Card3D className="result-card-3d" intensity={8}>
              <div className="result-card glass">
                <div className="result-icon-mini">
                  <TrendingUp size={20} />
                </div>
                <div className="result-label">Annual Savings</div>
                <div className="result-value">
                  €<AnimatedCounter value={annualSavings} isInView={isInView} />
                </div>
              </div>
            </Card3D>

            <Card3D className="result-card-3d" intensity={8}>
              <div className="result-card glass">
                <div className="result-icon-mini">
                  <Calculator size={20} />
                </div>
                <div className="result-label">25-Year Savings</div>
                <div className="result-value">
                  €<AnimatedCounter value={twentyFiveYearSavings} isInView={isInView} />
                </div>
              </div>
            </Card3D>

            <Card3D className="result-card-3d" intensity={8}>
              <div className="result-card glass">
                <div className="result-icon-mini">
                  <Clock size={20} />
                </div>
                <div className="result-label">Payback Period</div>
                <div className="result-value">5-7 years</div>
              </div>
            </Card3D>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
function FinalCTASection({
  navigate
}: {
  navigate: (path: string) => void;
}) {
  return <section className="final-cta-section">
      <div className="container">
        <motion.div initial={{
        opacity: 0,
        scale: 0.9
      }} whileInView={{
        opacity: 1,
        scale: 1
      }} viewport={{
        once: true
      }} className="cta-card">
          <div className="cta-content">
            <h2>Ready to Start Saving on Your Electricity Bills?</h2>
            <p>Upload your bill now and get your free solar proposal in 30 seconds</p>
            
            <div className="cta-buttons">
              <button className="primary-cta" onClick={() => navigate('/upload')}>
                <Upload size={20} />
                Upload Your Bill Now
                <ArrowRight size={16} />
              </button>
              <button className="secondary-cta">
                <MessageCircle size={16} />
                Chat with an Expert
              </button>
            </div>

            <div className="cta-benefits">
              <div className="benefit">
                <Check size={16} />
                <span>100% Free Analysis</span>
              </div>
              <div className="benefit">
                <Check size={16} />
                <span>No Sales Pressure</span>
              </div>
              <div className="benefit">
                <Check size={16} />
                <span>SEAI Grant Support</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>;
}