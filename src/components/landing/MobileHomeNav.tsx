import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Upload, Users, Info, Zap, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function MobileHomeNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Upload, label: 'Upload', path: '/upload' },
    { icon: Zap, label: 'Analyse', path: '/upload', isPrimary: true },
    { icon: Users, label: 'Portal', path: '/portal' },
    { icon: Info, label: 'About', path: '/about' },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Collapsed mini view - just the Analyse button
  if (!isExpanded) {
    return (
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
        >
          <Zap className="h-4 w-4" />
          <span className="text-sm font-medium">Analyse</span>
          <ChevronUp className="h-3 w-3 ml-1" />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 100 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border"
      style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom))' }}
    >
      {/* Collapse handle */}
      <button 
        onClick={() => setIsExpanded(false)}
        className="absolute -top-3 left-1/2 -translate-x-1/2 bg-muted rounded-full p-1 border border-border shadow-sm"
        aria-label="Collapse navigation"
      >
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      <div className="flex items-center justify-around px-1 py-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          if (item.isPrimary) {
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center -mt-4"
              >
                <div className="w-11 h-11 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-[9px] font-medium text-primary mt-0.5">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-1.5 px-2 min-h-[48px] min-w-[48px] transition-colors ${
                active 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[9px] font-medium mt-0.5">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
