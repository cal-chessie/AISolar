import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sun, Menu, X, Sparkles, LogIn, Users, Info, Upload, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { brand } from '@/config/brand';
import { motion, AnimatePresence } from 'framer-motion';

export default function SiteNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/upload', label: 'Upload Bill', icon: Upload },
    { href: '/portal', label: 'Client Portal', icon: Users },
    { href: '/about', label: 'About Us', icon: Info },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b pt-safe">
      <div className="container mx-auto py-2.5 xs:py-3 sm:py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 min-h-[44px]">
            <div className="p-1.5 xs:p-2 bg-primary/10 rounded-lg">
              <Sun className="h-5 w-5 xs:h-6 xs:w-6 sm:h-7 sm:w-7 text-primary" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base xs:text-lg sm:text-xl font-bold">{brand.name}</span>
              <Badge variant="secondary" className="text-[9px] xs:text-[10px] sm:text-xs px-1.5 py-0.5 hidden xs:flex">
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
              onClick={() => navigate('/auth')} 
              variant="outline" 
              size="sm" 
              className="hidden sm:flex h-10 px-4 text-sm"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Consultant Login
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
        </div>

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
    </header>
  );
}
