import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Pre-bundle the heavy deps that lazy-loaded routes pull in, so Vite never
  // stops to re-optimise mid-session and 404 an in-flight dynamic import
  // ("Failed to fetch dynamically imported module"). See src/lib/lazyWithRetry.
  //
  // ROOT CAUSE of the "crashes every day" (found 30 Jul): pdf-lib is imported
  // ONLY inside pdfFill.ts, which is reached ONLY via the lazy installer/
  // paperwork route. So Vite never saw it at startup and discovered it the first
  // time a job's paperwork opened each session — triggering a full dep re-optimise
  // that 404'd whatever navigation was in flight. Pre-bundling it (and the other
  // lazy-only heavies) removes the mid-session re-optimise entirely.
  optimizeDeps: {
    include: [
      'framer-motion', 'recharts', 'lucide-react', '@supabase/supabase-js',
      'pdf-lib',            // ← the daily-crash culprit: lazy-route-only, heavy
      'sonner', 'cmdk', '@tanstack/react-query', 'zod', 'date-fns',
    ],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'radix': [
            '@radix-ui/react-accordion', '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu', '@radix-ui/react-popover',
            '@radix-ui/react-select', '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip', '@radix-ui/react-switch',
            '@radix-ui/react-checkbox', '@radix-ui/react-progress',
          ],
          'framer-motion': ['framer-motion'],
          'recharts': ['recharts'],
          'lucide': ['lucide-react'],
        },
      },
    },
  },
}));
