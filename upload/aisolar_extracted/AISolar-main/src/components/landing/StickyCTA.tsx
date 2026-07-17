import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

interface StickyCTAProps {
  onClick: () => void;
}

export function StickyCTA({ onClick }: StickyCTAProps) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1, type: 'spring', stiffness: 100 }}
      className="fixed bottom-0 left-0 right-0 z-50 p-3 xs:p-4 bg-background/95 backdrop-blur-lg border-t md:hidden pb-safe"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      <Button 
        onClick={onClick}
        size="lg" 
        className="w-full h-14 text-base font-semibold active:scale-[0.98] transition-transform"
      >
        <Zap className="h-5 w-5 mr-2" />
        Analyse My Bill Free
      </Button>
      <p className="text-center text-[10px] xs:text-xs text-muted-foreground mt-2">
        No obligation • No spam • Instant results
      </p>
    </motion.div>
  );
}
