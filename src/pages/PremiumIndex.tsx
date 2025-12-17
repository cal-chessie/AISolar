import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, 
  ArrowRight, 
  Check, 
  Play,
  Star,
  TrendingUp,
  Shield,
  Calculator,
  FileText,
  Calendar,
  Upload,
  Sparkles,
  Euro,
  Quote,
  MessageCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import LeadCaptureForm from '@/components/LeadCaptureForm';
import SiteNavigation from '@/components/layout/SiteNavigation';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import { MobileHomeNav } from '@/components/landing/MobileHomeNav';
import { ScrollIndicator } from '@/components/ui/ScrollIndicator';
import { brand } from '@/config/brand';

export default function PremiumIndex() {
  const navigate = useNavigate();
  const [showVideo, setShowVideo] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [estimatedBill, setEstimatedBill] = useState(200);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.1], [1, 0.8]);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const annualSavings = Math.round(estimatedBill * 12 * 0.7);

  return (
    <>
      <SEOHead
        title={brand.seo.title}
        description={brand.seo.description}
        keywords={brand.seo.keywords}
      />
      
      <div className="premium-sales-page">
        {/* Site Navigation */}
        <SiteNavigation />

        {/* Sticky CTA Header */}
        <AnimatePresence>
          {isSticky && (
            <motion.header
              initial={{ y: -100 }}
              animate={{ y: 0 }}
              exit={{ y: -100 }}
              className="sticky-cta-header"
            >
              <div className="sticky-content">
                <div className="sticky-text">
                  <Zap size={20} />
                  <span>Get Your Instant Solar Proposal - Save Up To 70% On Electricity</span>
                </div>
                <div className="sticky-actions flex items-center gap-2">
                  <DarkModeToggle />
                  <button className="sticky-cta" onClick={() => navigate('/upload')}>
                    Upload Bill Now <ArrowRight size={16} />
                  </button>
                  <button className="consultant-login-btn small" onClick={() => navigate('/auth')}>
                    Consultant Login
                  </button>
                </div>
              </div>
            </motion.header>
          )}
        </AnimatePresence>

        {/* Hero Section */}
        <section ref={heroRef} className="hero-section">
          <div className="hero-background">
            <div className="hero-glow"></div>
          </div>
          
          <motion.div 
            className="hero-content"
            style={{ opacity, scale }}
          >
            <div className="hero-badge">
              <TrendingUp size={16} />
              <span>AI-Powered Savings Analysis</span>
            </div>

            <h1 className="hero-title">
              Stop Overpaying For
              <span className="gradient-text"> Electricity</span>
            </h1>
            
            <p className="hero-subtitle">
              Upload your electricity bill and discover how much you can save with solar power. 
              Our AI analyzes your usage and generates a personalized proposal in <strong>30 seconds</strong>.
            </p>

            <div className="hero-stats">
              <div className="stat">
                <div className="stat-number">€1,200+</div>
                <div className="stat-label">Average Annual Savings</div>
              </div>
              <div className="stat">
                <div className="stat-number">7-9</div>
                <div className="stat-label">Year Payback Period</div>
              </div>
              <div className="stat">
                <div className="stat-number">70%</div>
                <div className="stat-label">Reduction in Bills</div>
              </div>
            </div>

            {/* Main CTA */}
            <div className="hero-cta">
              <button className="primary-cta" onClick={() => navigate('/upload')}>
                <FileText size={20} />
                Upload Your Bill - Get Free Analysis
                <ArrowRight size={16} />
              </button>
              
              <button 
                className="secondary-cta"
                onClick={() => setShowVideo(true)}
              >
                <Play size={16} />
                Watch 60-Second Explainer
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="trust-pills">
              <div className="trust-pill">
                <Check size={14} />
                No Obligation
              </div>
              <div className="trust-pill">
                <Shield size={14} />
                GDPR Compliant
              </div>
              <div className="trust-pill">
                <Calculator size={14} />
                Instant Calculations
              </div>
            </div>
          </motion.div>

          {/* Hero Visual - Live Product Preview */}
          <div className="hero-visual self-start mt-0">
            <div className="flex flex-col gap-4 w-full max-w-md">
              {/* Card 1: Project Snapshot */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 cursor-pointer hover:shadow-xl hover:shadow-slate-300/50 dark:hover:shadow-slate-800/50 transition-shadow duration-200"
              >
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
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 rounded-2xl p-5 shadow-lg shadow-emerald-100/50 dark:shadow-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:shadow-xl hover:shadow-emerald-300/60 dark:hover:shadow-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-600/50 transition-all duration-300 hover:ring-2 hover:ring-emerald-400/30 dark:hover:ring-emerald-500/20"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-emerald-500 rounded-lg">
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">AI Analysis</h3>
                  <div className="ml-auto px-2 py-0.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full">
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">94% confidence</span>
                  </div>
                </div>
                <p className="text-sm text-emerald-900/80 dark:text-emerald-100/80 leading-relaxed">
                  Based on your electricity usage of 4,200 kWh annually, a south-facing roof orientation provides optimal solar generation. Estimated payback period is 7.2 years with current energy prices.
                </p>
              </motion.div>

              {/* Card 3: Next Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 cursor-pointer hover:shadow-xl hover:shadow-slate-300/50 dark:hover:shadow-slate-800/50 transition-shadow duration-200"
              >
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Next Steps</h3>
                <div className="space-y-3">
                  {[
                    { text: 'Upload electricity bill', completed: true, delay: 0.8 },
                    { text: 'AI analysis complete', completed: true, delay: 1.0 },
                    { text: 'Review savings proposal', completed: false, current: true, delay: 1.2 },
                    { text: 'Schedule site survey', completed: false, delay: 1.4 },
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: item.delay, duration: 0.3 }}
                      className="flex items-center gap-3"
                    >
                      <motion.div
                        initial={item.completed ? { scale: 0 } : {}}
                        animate={item.completed ? { scale: 1 } : {}}
                        transition={{ delay: item.delay + 0.15, duration: 0.2, type: 'spring' }}
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          item.completed
                            ? 'bg-emerald-100 dark:bg-emerald-900/50'
                            : item.current
                            ? 'border-2 border-emerald-500'
                            : 'border-2 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {item.completed && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: item.delay + 0.2, duration: 0.2 }}
                          >
                            <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                          </motion.div>
                        )}
                        {item.current && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                      </motion.div>
                      <span
                        className={`text-sm ${
                          item.completed
                            ? 'text-slate-500 dark:text-slate-400 line-through'
                            : item.current
                            ? 'text-slate-800 dark:text-slate-100 font-medium'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {item.text}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Video Modal */}
        <AnimatePresence>
          {showVideo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="video-modal"
              onClick={() => setShowVideo(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  className="close-button"
                  onClick={() => setShowVideo(false)}
                >
                  ×
                </button>
                <div className="video-container">
                  <div className="video-placeholder">
                    <Play size={48} />
                    <p>How It Works Video</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <SocialProofSection />
        <HowItWorksSection />
        <LeadCaptureSection />
        <SavingsCalculatorSection 
          estimatedBill={estimatedBill}
          setEstimatedBill={setEstimatedBill}
          annualSavings={annualSavings}
        />
        
        {/* Mobile Bottom Navigation */}
        <MobileHomeNav />
        <FinalCTASection navigate={navigate} />
      </div>
    </>
  );
}

function SocialProofSection() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const testimonials = [
    {
      name: "Sarah M.",
      location: "Dublin",
      savings: "€1,450",
      rating: 5,
      text: "The AI proposal was spot on. We're saving €1,450 annually and the installation was seamless.",
      image: "👩‍💼"
    },
    {
      name: "John D.",
      location: "Cork", 
      savings: "€1,280",
      rating: 5,
      text: "Uploaded my bill at 8 PM, had a proposal by morning. Incredible service!",
      image: "👨‍💻"
    },
    {
      name: "The O'Connor Family",
      location: "Galway",
      savings: "€1,650", 
      rating: 5,
      text: "The SEAI grant process was handled perfectly. We're essentially getting free electricity!",
      image: "👨‍👩‍👧‍👦"
    }
  ];

  return (
    <section className="social-proof-section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-header"
        >
          <h2>Trusted by Hundreds of Irish Homeowners</h2>
          <p>See what our customers are saying about their solar journey</p>
        </motion.div>

        <div 
          ref={scrollContainerRef}
          className="testimonials-grid"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="testimonial-card"
            >
              <div className="testimonial-header">
                <div className="customer-avatar">
                  {testimonial.image}
                </div>
                <div className="customer-info">
                  <div className="customer-name">{testimonial.name}</div>
                  <div className="customer-location">{testimonial.location}</div>
                </div>
                <div className="savings-badge">
                  Saves {testimonial.savings}/year
                </div>
              </div>

              <div className="testimonial-rating">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={16} fill="currentColor" />
                ))}
              </div>

              <div className="testimonial-text">
                <Quote size={20} className="quote-icon" />
                {testimonial.text}
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Scroll Indicator */}
        <div className="md:hidden">
          <ScrollIndicator 
            containerRef={scrollContainerRef as React.RefObject<HTMLElement>} 
            itemCount={testimonials.length} 
          />
        </div>

        <div className="trust-logos">
          <div className="logo-item">SEAI Approved</div>
          <div className="logo-item">RECI Certified</div>
          <div className="logo-item">SEAI Grants</div>
          <div className="logo-item">5-Star Reviews</div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const steps = [
    {
      icon: Upload,
      title: "Upload Your Bill",
      description: "Simply upload your latest electricity bill - PDF, image, or screenshot",
      color: "#10b981"
    },
    {
      icon: Sparkles,
      title: "AI Analysis",
      description: "Our AI analyzes your consumption patterns and calculates optimal solar system size",
      color: "#6366f1"
    },
    {
      icon: FileText,
      title: "Get Your Proposal",
      description: "Receive a detailed proposal with savings breakdown, system specs, and SEAI grant info",
      color: "#f59e0b"
    },
    {
      icon: Calendar,
      title: "Book Consultation",
      description: "Schedule a free consultation with our certified solar experts",
      color: "#ec4899"
    }
  ];

  return (
    <section className="how-it-works-section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-header"
        >
          <h2>Get Your Solar Proposal in 4 Simple Steps</h2>
          <p>From upload to installation - we make going solar effortless</p>
        </motion.div>

        <div 
          ref={scrollContainerRef}
          className="steps-grid"
        >
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="step-card"
            >
              <div className="step-number">{index + 1}</div>
              <div className="step-icon" style={{ color: step.color }}>
                <step.icon size={32} />
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </motion.div>
          ))}
        </div>
        
        {/* Scroll Indicator */}
        <div className="md:hidden">
          <ScrollIndicator 
            containerRef={scrollContainerRef as React.RefObject<HTMLElement>} 
            itemCount={steps.length} 
          />
        </div>
      </div>
    </section>
  );
}

function LeadCaptureSection() {
  return (
    <section className="savings-calculator-section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-header"
        >
          <h2>Start Your Solar Journey Today</h2>
          <p>Fill out the form below and we'll contact you with a personalized solar proposal</p>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          <LeadCaptureForm />
        </div>
      </div>
    </section>
  );
}

function SavingsCalculatorSection({ estimatedBill, setEstimatedBill, annualSavings }: {
  estimatedBill: number;
  setEstimatedBill: (value: number) => void;
  annualSavings: number;
}) {
  return (
    <section className="savings-calculator-section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-header"
        >
          <h2>Calculate Your Potential Savings</h2>
          <p>See how much you could save with solar panels</p>
        </motion.div>

        <div className="calculator-card">
          <div className="calculator-input">
            <label>
              <Euro size={20} />
              Monthly Electricity Bill
            </label>
            <div className="slider-container">
              <input
                type="range"
                min="50"
                max="500"
                value={estimatedBill}
                onChange={(e) => setEstimatedBill(Number(e.target.value))}
                className="savings-slider"
              />
              <div className="slider-value">€{estimatedBill}/month</div>
            </div>
          </div>

          <div className="calculator-results">
            <div className="result-card primary">
              <div className="result-icon">
                <TrendingUp size={24} />
              </div>
              <div className="result-content">
                <div className="result-label">Estimated Annual Savings</div>
                <div className="result-value">€{annualSavings.toLocaleString()}</div>
              </div>
            </div>

            <div className="result-card">
              <div className="result-label">25-Year Savings</div>
              <div className="result-value">€{(annualSavings * 25).toLocaleString()}</div>
            </div>

            <div className="result-card">
              <div className="result-label">Payback Period</div>
              <div className="result-value">7-9 years</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTASection({ navigate }: { navigate: (path: string) => void }) {
  return (
    <section className="final-cta-section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="cta-card"
        >
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
    </section>
  );
}
