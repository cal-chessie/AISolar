import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AIBillAnalyser } from '@/components/ai-analyser';
import SEOHead from '@/components/SEOHead';
import { LogIn, Sun, Users, Award, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { brand } from '@/config/brand';

const Index = () => {
  const navigate = useNavigate();

  const stats = [
    { number: brand.stats.customers, label: 'Happy Customers' },
    { number: brand.stats.savingsGenerated, label: 'Savings Generated' },
    { number: brand.stats.installedCapacity, label: 'Installed Capacity' },
    { number: brand.stats.googleRating, label: 'Google Rating' },
  ];

  return (
    <>
      <SEOHead
        title={brand.seo.title}
        description={brand.seo.description}
        keywords={brand.seo.keywords}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: brand.name,
          description: brand.seo.description,
          priceRange: '€€',
          image: '/placeholder.svg',
          serviceType: 'Solar Panel Installation',
          telephone: brand.contact.phone,
          email: brand.contact.email,
          areaServed: {
            '@type': 'Country',
            name: brand.country,
          },
        }}
      />
      
      <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-background via-background to-primary/5">
        {/* Header - Mobile Optimized */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b safe-area-inset-top">
          <div className="container mx-auto px-4 py-3 sm:py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg sm:rounded-xl">
                  <Sun className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-base sm:text-xl font-bold">{brand.name}</span>
                  <Badge variant="secondary" className="text-[10px] sm:text-xs hidden xs:flex">
                    <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                    AI
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/portal')}
                  className="hidden sm:flex"
                  size="sm"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Client Portal
                </Button>
                <Button onClick={() => navigate('/auth')} variant="outline" size="sm" className="h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm">
                  <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  Login
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 sm:py-8 md:py-12 pb-safe">
          {/* Hero Section - Mobile Optimized */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-6 sm:mb-10 md:mb-14"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-4 sm:mb-6"
            >
              <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              SEAI Registered & BER Approved
            </motion.div>
            
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-2 sm:mb-4 leading-tight">
              {brand.copy.heroTitle}
              <br />
              <span className="text-muted-foreground text-xl sm:text-3xl md:text-4xl lg:text-5xl">{brand.copy.heroSubtitle}</span>
            </h1>
            
            <p className="text-sm sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-1 sm:mb-2">
              {brand.copy.valueProposition}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {brand.countryEmoji} {brand.country} data • SEAI grants • {brand.copy.trustMessage}
            </p>
          </motion.div>

          {/* AI Bill Analyser */}
          <AIBillAnalyser />

          {/* Trust Section - Mobile Optimized */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-10 sm:mt-16 md:mt-20"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 max-w-4xl mx-auto">
              {stats.map((stat, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + idx * 0.1 }}
                  className="text-center p-2 sm:p-4"
                >
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-0.5 sm:mb-1">{stat.number}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Certifications - Mobile Optimized */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 sm:mt-12 flex flex-wrap items-center justify-center gap-4 sm:gap-8"
          >
            {brand.certifications.map((cert, idx) => (
              <div key={idx} className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground">
                <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span className="text-xs sm:text-sm font-medium">{cert.name}</span>
              </div>
            ))}
          </motion.div>
        </main>

        {/* Footer - Mobile Optimized */}
        <footer className="border-t bg-background mt-10 sm:mt-16 pb-safe">
          <div className="container mx-auto px-4 py-6 sm:py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span className="text-sm sm:text-base font-semibold">{brand.name}</span>
              </div>
              <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
                <Link to="/portal" className="hover:text-foreground transition-colors">
                  Client Portal
                </Link>
                <Link to="/auth" className="hover:text-foreground transition-colors">
                  Consultant Login
                </Link>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground text-center">
                © {new Date().getFullYear()} {brand.name}. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Index;
