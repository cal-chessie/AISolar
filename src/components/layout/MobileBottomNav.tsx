import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  ClipboardList, 
  FileText, 
  MoreHorizontal,
  Home,
  Calendar,
  Settings,
  BarChart3,
  FolderOpen,
  Package
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  path?: string;
  onClick?: () => void;
  isAdmin?: boolean;
}

interface MobileBottomNavProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  variant?: 'dashboard' | 'public';
  isAdmin?: boolean;
}

export default function MobileBottomNav({ 
  activeTab, 
  onTabChange,
  variant = 'dashboard',
  isAdmin = false
}: MobileBottomNavProps) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

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

  // Main bottom nav items (consultant tabs)
  const dashboardItems: NavItem[] = [
    { id: 'leads', icon: <Users size={22} />, label: 'Leads' },
    { id: 'surveys', icon: <ClipboardList size={22} />, label: 'Surveys' },
    { id: 'proposals', icon: <FileText size={22} />, label: 'Proposals' },
    { id: 'calendar', icon: <Calendar size={22} />, label: 'Calendar' },
  ];

  // More menu items - always available consultant tabs
  const moreConsultantItems: NavItem[] = [
    { id: 'installations', icon: <Package size={20} />, label: 'Installations' },
    { id: 'followups', icon: <Users size={20} />, label: 'Follow-ups' },
  ];

  // Admin-only items in More menu
  const moreAdminItems: NavItem[] = [
    { id: 'products', icon: <Package size={20} />, label: 'Products', isAdmin: true },
    { id: 'documents', icon: <FolderOpen size={20} />, label: 'Documents', isAdmin: true },
    { id: 'analytics', icon: <BarChart3 size={20} />, label: 'Analytics', isAdmin: true },
    { id: 'settings', icon: <Settings size={20} />, label: 'Settings', isAdmin: true },
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
    setMoreSheetOpen(false);
  };

  const handleMoreItemClick = (item: NavItem) => {
    if (item.id === 'settings') {
      navigate('/admin/settings');
    } else if (onTabChange) {
      onTabChange(item.id);
    }
    setMoreSheetOpen(false);
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
              </motion.button>
            ))}

            {/* More Button with Sheet */}
            {variant === 'dashboard' && (
              <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
                <SheetTrigger asChild>
                  <motion.button
                    className={cn(
                      "flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-3 py-2 rounded-xl transition-all",
                      "text-muted-foreground hover:text-foreground"
                    )}
                    whileTap={{ scale: 0.92 }}
                  >
                    <motion.div className="p-1.5 rounded-xl">
                      <MoreHorizontal size={22} />
                    </motion.div>
                    <span className="text-[10px] font-medium mt-0.5">More</span>
                  </motion.button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-2xl">
                  <SheetHeader>
                    <SheetTitle>More Options</SheetTitle>
                  </SheetHeader>
                  <div className="grid grid-cols-4 gap-4 py-6">
                    {/* Consultant items */}
                    {moreConsultantItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleMoreItemClick(item)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
                          activeTab === item.id 
                            ? "bg-primary/10 text-primary" 
                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {item.icon}
                        <span className="text-xs font-medium">{item.label}</span>
                      </button>
                    ))}
                    
                    {/* Admin items - only show if isAdmin */}
                    {isAdmin && moreAdminItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleMoreItemClick(item)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
                          activeTab === item.id 
                            ? "bg-orange-500/10 text-orange-500" 
                            : "hover:bg-orange-500/5 text-orange-500/70 hover:text-orange-500"
                        )}
                      >
                        {item.icon}
                        <span className="text-xs font-medium">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
