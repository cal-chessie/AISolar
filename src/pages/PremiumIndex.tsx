import { useState, useRef, useEffect } from 'react';
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
  MessageCircle,
  Calendar,
  Upload,
  Sparkles,
  Euro,
  Quote
} from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import LeadCaptureForm from '@/components/LeadCaptureForm';

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
        title="Save Up To 70% On Electricity Bills - Free Solar Analysis Ireland"
        description="Upload your electricity bill and get an instant AI-powered solar proposal in 30 seconds. Discover your potential savings with certified solar experts. SEAI grants available."
        keywords="solar savings Ireland, reduce electricity bills, solar calculator, instant solar proposal, SEAI grants, solar panel installation"
      />
      
      <div className="premium-sales-page">
        {/* Top Navigation Bar */}
        <nav className="top-nav">
          <div className="nav-content">
            <div className="nav-logo">
              <Zap size={24} />
              <span>SolarPro</span>
            </div>
            <button className="consultant-login-btn" onClick={() => navigate('/auth')}>
              Consultant Login
            </button>
          </div>
        </nav>

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
                <div className="sticky-actions">
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

          {/* Hero Visual */}
          <div className="hero-visual">
            <div className="floating-card bill-upload">
              <FileText size={24} />
              <span>Upload Bill</span>
            </div>
            <div className="floating-card ai-analysis">
              <Zap size={24} />
              <span>AI Analysis</span>
            </div>
            <div className="floating-card proposal">
              <Calculator size={24} />
              <span>Get Proposal</span>
            </div>
            <div className="main-visual">
              <div className="mockup-dashboard">
                <div className="mockup-header"></div>
                <div className="mockup-content">
                  <div className="savings-graph"></div>
                  <div className="proposal-card">
                    <div className="proposal-amount">€1,247</div>
                    <div className="proposal-label">Annual Savings</div>
                  </div>
                </div>
              </div>
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
        <FinalCTASection navigate={navigate} />
      </div>
    </>
  );
}

function SocialProofSection() {
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

        <div className="testimonials-grid">
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

        <div className="trust-logos">
          <div className="logo-item">SEAI Approved</div>
          <div className="logo-item">SEI Certified</div>
          <div className="logo-item">SEAI Grants</div>
          <div className="logo-item">5-Star Reviews</div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
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

        <div className="steps-grid">
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
