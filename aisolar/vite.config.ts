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
  optimizeDeps: {
    include: ['framer-motion', 'recharts', 'lucide-react', '@supabase/supabase-js'],
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
