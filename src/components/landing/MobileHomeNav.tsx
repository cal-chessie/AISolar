import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Upload, Users, Info, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export function MobileHomeNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Upload, label: 'Upload', path: '/upload' },
    { icon: Zap, label: 'Analyse', path: '/upload', isPrimary: true },
    { icon: Users, label: 'Portal', path: '/portal' },
    { icon: Info, label: 'About', path: '/about' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 100 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          if (item.isPrimary) {
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-[10px] font-medium text-primary mt-1">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-2 px-3 min-h-[56px] min-w-[56px] transition-colors ${
                active 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium mt-1">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
