import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      'xs': '375px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "hsl(var(--primary-50))",
          100: "hsl(var(--primary-100))",
          500: "hsl(var(--primary-500))",
          600: "hsl(var(--primary-600))",
          700: "hsl(var(--primary-700))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        slate: {
          50: "hsl(var(--slate-50))",
          100: "hsl(var(--slate-100))",
          200: "hsl(var(--slate-200))",
          300: "hsl(var(--slate-300))",
          400: "hsl(var(--slate-400))",
          500: "hsl(var(--slate-500))",
          600: "hsl(var(--slate-600))",
          700: "hsl(var(--slate-700))",
          800: "hsl(var(--slate-800))",
          900: "hsl(var(--slate-900))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Instrument scale (see src/styles/instrument.css)
        xs: "var(--radius-xs)",
        control: "var(--radius-control)",
        panel: "var(--radius-lg)",
        modal: "var(--radius-xl)",
      },
      // ---- Instrument design system -------------------------------------
      // Single source of truth lives in src/styles/instrument.css; these just
      // expose the tokens as Tailwind utilities so components stop inventing
      // their own sizes (the root cause of the cramped/tiny installer views).
      fontSize: {
        "2xs":  ["var(--text-2xs)",  { lineHeight: "1" }],
        xs:     ["var(--text-xs)",   { lineHeight: "var(--leading-ui)" }],
        sm:     ["var(--text-sm)",   { lineHeight: "var(--leading-ui)" }],
        base:   ["var(--text-base)", { lineHeight: "var(--leading-body)" }],
        md:     ["var(--text-md)",   { lineHeight: "var(--leading-ui)" }],
        lg:     ["var(--text-lg)",   { lineHeight: "var(--leading-tight)" }],
        xl:     ["var(--text-xl)",   { lineHeight: "var(--leading-tight)" }],
        "2xl":  ["var(--text-2xl)",  { lineHeight: "1.15" }],
        "3xl":  ["var(--text-3xl)",  { lineHeight: "1.1" }],
      },
      spacing: {
        control: "var(--control-h)",
        "control-sm": "var(--control-h-sm)",
        "control-lg": "var(--control-h-lg)",
        row: "var(--row-h)",
        header: "var(--header-h)",
        page: "var(--pad-page)",
        card: "var(--pad-card)",
      },
      lineHeight: {
        tight: "var(--leading-tight)",
        ui: "var(--leading-ui)",
        body: "var(--leading-body)",
      },
      boxShadow: {
        "elev-1": "var(--elev-1)",
        "elev-2": "var(--elev-2)",
        "elev-3": "var(--elev-3)",
        // cal.com/pricing card float (measured)
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        focus: "var(--focus-ring)",
      },
      transitionDuration: {
        instant: "var(--motion-instant)",
        fast: "var(--motion-fast)",
        base: "var(--motion-base)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
        smooth: "var(--ease-in-out)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
