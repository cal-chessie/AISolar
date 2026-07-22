import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sun, Menu, X, Sparkles, LogIn, Users, Info, Upload, Home, Compass, Wrench, TrendingUp, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { brand } from '@/config/brand';
import { motion, AnimatePresence } from 'framer-motion';

export default function SiteNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/installer', label: 'Installer Cockpit', icon: Wrench },
    { href: '/pipeline', label: 'Pipeline', icon: TrendingUp },
    { href: '/agents', label: 'Agents', icon: Bot },
    { href: '/about', label: 'About', icon: Info },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <motion.header 
      className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b pt-safe"
      animate={{ 
        paddingTop: isScrolled ? '0rem' : '0rem',
        paddingBottom: isScrolled ? '0rem' : '0rem'
      }}
      transition={{ duration: 0.2 }}
    >
      <div className="container mx-auto px-3 sm:px-4">
        <motion.div 
          className="flex justify-between items-center"
          animate={{ padding: isScrolled ? '0.25rem 0' : '0.5rem 0' }}
          transition={{ duration: 0.2 }}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 min-h-[44px]">
            <motion.div 
              className="bg-primary/10 rounded-lg"
              animate={{ padding: isScrolled ? '0.25rem' : '0.5rem' }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <motion.div
                animate={{ scale: isScrolled ? 0.85 : 1 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                <Sun className="h-5 w-5 xs:h-6 xs:w-6 text-primary" />
              </motion.div>
            </motion.div>
            <div className="flex items-center gap-1.5">
              <motion.span 
                className="font-bold"
                animate={{ fontSize: isScrolled ? '0.875rem' : '1rem' }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                {brand.name}
              </motion.span>
              <Badge variant="secondary" className="text-[9px] xs:text-[10px] px-1.5 py-0.5 hidden xs:flex">
                <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                AI
              </Badge>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center ${
                  isActive(link.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/demo')}
              variant="ghost"
              size="sm"
              className="hidden sm:flex h-10 px-3 text-sm text-primary hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/10"
              title="Browse every view without auth — for review only"
            >
              <Compass className="h-4 w-4 mr-2" />
              Browse Views
            </Button>

            <Button
              onClick={() => navigate('/installer')}
              variant="default"
              size="sm"
              className="hidden sm:flex h-10 px-4 text-sm bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Wrench className="h-4 w-4 mr-2" />
              Open Cockpit
            </Button>

            <Button
              onClick={() => navigate('/auth')}
              variant="outline"
              size="sm"
              className="hidden sm:flex h-10 px-4 text-sm"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign in
            </Button>

            {/* Mobile menu button - 48px touch target */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-12 w-12 min-h-[48px] min-w-[48px]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </motion.div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mt-3 pb-2 border-t pt-3"
            >
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-lg text-base font-medium transition-colors min-h-[52px] active:bg-muted/80 ${
                      isActive(link.href)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <link.icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                ))}
                <Button
                  onClick={() => {
                    navigate('/demo');
                    setMobileMenuOpen(false);
                  }}
                  variant="ghost"
                  className="mt-2 justify-start gap-3 h-14 text-base text-primary"
                >
                  <Compass className="h-5 w-5" />
                  Browse All Views
                </Button>

                <Button
                  onClick={() => {
                    navigate('/auth');
                    setMobileMenuOpen(false);
                  }}
                  variant="outline"
                  className="mt-2 justify-start gap-3 h-14 text-base"
                >
                  <LogIn className="h-5 w-5" />
                  Consultant Login
                </Button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
