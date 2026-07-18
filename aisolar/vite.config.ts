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
