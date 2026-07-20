import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface ScrollIndicatorProps {
  containerRef: React.RefObject<HTMLElement>;
  itemCount: number;
  className?: string;
}

export function ScrollIndicator({ containerRef, itemCount, className = '' }: ScrollIndicatorProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const scrollWidth = container.scrollWidth - container.clientWidth;
      const progress = scrollWidth > 0 ? scrollLeft / scrollWidth : 0;
      const newIndex = Math.round(progress * (itemCount - 1));
      setActiveIndex(newIndex);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef, itemCount]);

  const scrollToIndex = (index: number) => {
    const container = containerRef.current;
    if (!container) return;
    
    const scrollWidth = container.scrollWidth - container.clientWidth;
    const targetScroll = (index / (itemCount - 1)) * scrollWidth;
    container.scrollTo({ left: targetScroll, behavior: 'smooth' });
  };

  return (
    <div className={`flex items-center justify-center gap-2 py-3 ${className}`}>
      {Array.from({ length: itemCount }).map((_, index) => (
        <motion.button
          key={index}
          onClick={() => scrollToIndex(index)}
          className={`rounded-full transition-all duration-300 ${
            index === activeIndex
              ? 'w-6 h-2 bg-primary'
              : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
          }`}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          aria-label={`Go to item ${index + 1}`}
        />
      ))}
    </div>
  );
}
