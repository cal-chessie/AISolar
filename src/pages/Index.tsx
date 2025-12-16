import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AIBillAnalyser } from '@/components/ai-analyser';
import SEOHead from '@/components/SEOHead';
import { LogIn, Sun, Users, Award, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

const Index = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title="Solar Automation Platform - Instant Solar Proposals for Ireland"
        description="Upload your electricity bill and get an instant solar panel proposal with accurate savings calculations. Free consultation with certified solar experts. SEAI grants available."
        keywords="solar panels Ireland, solar calculator, electricity bill analysis, solar savings, SEAI grants, solar installation Ireland, renewable energy"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: 'Solar Automation Platform',
          description: 'Instant solar panel proposals and consultations for Irish homes',
          priceRange: '€€',
          image: '/placeholder.svg',
          serviceType: 'Solar Panel Installation',
          areaServed: {
            '@type': 'Country',
            name: 'Ireland',
          },
        }}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Sun className="h-7 w-7 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">Solar Ireland</span>
                  <Badge variant="secondary" className="text-xs hidden sm:flex">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI-Powered
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/portal')}
                  className="hidden sm:flex"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Client Portal
                </Button>
                <Button onClick={() => navigate('/auth')} variant="outline">
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 md:py-12">
          {/* Hero Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10 md:mb-14"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
            >
              <Award className="h-4 w-4" />
              SEAI Registered & BER Approved
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight">
              AI Solar Bill Analysis
              <br className="hidden md:block" />
              <span className="text-muted-foreground text-3xl md:text-4xl lg:text-5xl"> for Irish Homes</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-2">
              Upload your electricity bill and get instant savings estimates.
              No obligation, free analysis.
            </p>
            <p className="text-sm text-muted-foreground">
              🇮🇪 Irish sunlight data • SEAI grants included • No spam
            </p>
          </motion.div>

          {/* AI Bill Analyser */}
          <AIBillAnalyser />

          {/* Trust Section */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-16 md:mt-20"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {[
                { number: '2,500+', label: 'Happy Customers' },
                { number: '€3.2M', label: 'Savings Generated' },
                { number: '15 MW', label: 'Installed Capacity' },
                { number: '4.9★', label: 'Google Rating' },
              ].map((stat, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + idx * 0.1 }}
                  className="text-center p-4"
                >
                  <div className="text-2xl md:text-3xl font-bold text-primary mb-1">{stat.number}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Certifications */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-8"
          >
            {[
              { icon: ShieldCheck, label: 'SEAI Registered' },
              { icon: Award, label: 'BER Certified' },
              { icon: ShieldCheck, label: 'Fully Insured' },
            ].map((cert, idx) => (
              <div key={idx} className="flex items-center gap-2 text-muted-foreground">
                <cert.icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{cert.label}</span>
              </div>
            ))}
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="border-t bg-background mt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <Sun className="h-5 w-5 text-primary" />
                <span className="font-semibold">Solar Ireland</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <Link to="/portal" className="hover:text-foreground transition-colors">
                  Client Portal
                </Link>
                <Link to="/auth" className="hover:text-foreground transition-colors">
                  Consultant Login
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Solar Ireland. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Index;
