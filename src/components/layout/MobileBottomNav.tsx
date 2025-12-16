import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  ClipboardList, 
  FileText, 
  Wrench, 
  MoreHorizontal,
  Home,
  BarChart3,
  Package
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  path?: string;
  onClick?: () => void;
}

interface MobileBottomNavProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  variant?: 'dashboard' | 'public';
}

export default function MobileBottomNav({ 
  activeTab, 
  onTabChange,
  variant = 'dashboard'
}: MobileBottomNavProps) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Hide/show on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  if (!isMobile) return null;

  const dashboardItems: NavItem[] = [
    { id: 'leads', icon: <Users size={22} />, label: 'Leads' },
    { id: 'surveys', icon: <ClipboardList size={22} />, label: 'Surveys' },
    { id: 'proposals', icon: <FileText size={22} />, label: 'Proposals' },
    { id: 'installations', icon: <Wrench size={22} />, label: 'Installs' },
    { id: 'more', icon: <MoreHorizontal size={22} />, label: 'More' },
  ];

  const publicItems: NavItem[] = [
    { id: 'home', icon: <Home size={22} />, label: 'Home', path: '/' },
    { id: 'upload', icon: <FileText size={22} />, label: 'Upload', path: '/upload' },
    { id: 'login', icon: <Users size={22} />, label: 'Login', path: '/auth' },
  ];

  const items = variant === 'dashboard' ? dashboardItems : publicItems;

  const handleItemClick = (item: NavItem) => {
    if (item.path) {
      navigate(item.path);
    } else if (onTabChange) {
      onTabChange(item.id);
    }
  };

  const isActive = (item: NavItem) => {
    if (item.path) {
      return location.pathname === item.path;
    }
    return activeTab === item.id;
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-area-bottom"
        >
          <div className="flex items-center justify-around px-2 py-1">
            {items.map((item) => (
              <motion.button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-3 py-2 rounded-xl transition-all",
                  isActive(item) 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <motion.div
                  className={cn(
                    "p-1.5 rounded-xl transition-all duration-200",
                    isActive(item) && "bg-primary/10"
                  )}
                  animate={isActive(item) ? { scale: 1.1 } : { scale: 1 }}
                >
                  {item.icon}
                </motion.div>
                <span className={cn(
                  "text-[10px] font-medium mt-0.5 transition-all",
                  isActive(item) && "font-semibold"
                )}>
                  {item.label}
                </span>
                {isActive(item) && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute bottom-1 w-1 h-1 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
