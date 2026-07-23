import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * PageTransition — now a plain wrapper, deliberately.
 *
 * The AnimatePresence mode="wait" fade froze THREE times in this codebase
 * (installer tabs, LeadFlow steps, and finally here at the route level) —
 * the entrance animation stalled and the ENTIRE app rendered at ~26%
 * opacity. Every "flat / washed out / colours off balance" complaint was
 * partly this haze. A 250ms fade is not worth a whole product that
 * sometimes displays at quarter strength. Pages switch instantly now.
 */
export default function PageTransition({ children }: PageTransitionProps) {
  return <div className="min-h-screen">{children}</div>;
}

// Loading bar component for top of page
export function LoadingBar({ isLoading }: { isLoading: boolean }) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 0.7, opacity: 1 }}
          exit={{ scaleX: 1, opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="fixed top-0 left-0 right-0 h-1 bg-primary origin-left z-[100]"
        />
      )}
    </AnimatePresence>
  );
}
