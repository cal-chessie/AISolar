/**
 * Motion presets — standardized framer-motion variants for the whole app.
 *
 * Use these everywhere instead of ad-hoc `initial`/`animate` props so motion
 * feels consistent across views. The "lost vibe" the user described was partly
 * that V5 cockpits dropped the staggered list animations the old PremiumIndex
 * had — these presets bring them back, consistently.
 *
 * Usage:
 *   import { fadeUp, staggerContainer, listItem } from '@/lib/motionPresets';
 *   <motion.ul variants={staggerContainer} initial="hidden" animate="show">
 *     {items.map(item => <motion.li key={item.id} variants={listItem} />)}
 *   </motion.ul>
 */

import type { Variants } from 'framer-motion';

/** Container that staggers its children in by 50ms each. */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.04,
    },
  },
};

/** Container with a slower stagger for larger lists. */
export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
};

/** Single list item — fades up by 8px. */
export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  },
};

/** Single list item — fades in (no Y movement). Lighter weight. */
export const listItemFade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
};

/** Card fade-up — for cards that aren't in a list. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
};

/** Slide-in from right — for slide-out panels. */
export const slideInRight: Variants = {
  hidden: { x: '100%' },
  show: {
    x: 0,
    transition: { type: 'spring', damping: 30, stiffness: 300 },
  },
  exit: {
    x: '100%',
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
};

/** Slide-up from bottom — for mobile bottom sheets. */
export const slideUpBottom: Variants = {
  hidden: { y: '100%' },
  show: {
    y: 0,
    transition: { type: 'spring', damping: 32, stiffness: 320 },
  },
  exit: {
    y: '100%',
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
};

/** While-in-view fade-up — for sections that animate when scrolled to. */
export const fadeInView: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
};

/** Standard transition for hover states on cards. */
export const cardHover = {
  whileHover: { y: -2, transition: { duration: 0.15 } },
  whileTap: { y: 0, transition: { duration: 0.1 } },
};
