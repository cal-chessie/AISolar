/**
 * BRAND CONFIGURATION
 * 
 * This file contains all white-label settings for the platform.
 * To customize for a new client/partner, simply update these values.
 * 
 * Usage: import { brand } from "@/config/brand"
 */

export const brand = {
  // ===== TENANT BINDING (AIOS kernel) =====
  // id       = this storefront's brand slug. Stamped on every lead as `brand`
  //            (the fee-attribution axis — NEVER changes after creation).
  // tenantId = which kernel tenant holds CUSTODY of leads born on this
  //            deployment (the routing agent may transfer custody later).
  //            Default: Renewable Ireland (national) — per the pool rule,
  //            "nobody holds it → national picks it up".
  // Every white-label deployment MUST set both. There is no fallback —
  // a lead with no owner refuses to save.
  id: "aisolar",
  tenantId: "b05a5672-822b-48f2-b0e4-be88f724dfd7", // Renewable Ireland (national)

  // ===== COMPANY INFO =====
  name: "AISOLAR",
  tagline: "The solar installer operating system",
  domain: "aisolar.ie",
  country: "Ireland",
  countryEmoji: "🇮🇪",
  
  // ===== CONTACT DETAILS =====
  contact: {
    phone: "+353 1 234 5678",
    phoneDisplay: "01 234 5678",
    whatsapp: "353851234567", // No + or spaces for wa.me link
    email: "hello@aisolar.ie",
    address: "Dublin, Ireland",
  },
  
  // ===== LEGAL / TRADING IDENTITY =====
  // Cal 2026-07-21: a proposal is a commercial document. It needs the
  // installer's real trading identity on it — company name, registration,
  // VAT and the certifications an Irish homeowner checks before signing.
  // Each tenant fills these with their own; blanks are simply not rendered.
  legal: {
    tradingName: "AISOLAR",              // "trading as" name on the quote
    registeredName: "AISolar Ireland Ltd", // legal entity
    companyNumber: "",                    // CRO number
    vatNumber: "",                        // IE VAT
    reciNumber: "",                       // RECI electrical contractor reg
    seaiRegistered: true,                 // SEAI registered installer
    registeredAddress: "Dublin, Ireland",
  },

  // ===== SOCIAL LINKS =====
  social: {
    facebook: "https://facebook.com/aisolarie",
    instagram: "https://instagram.com/aisolarie",
    linkedin: "https://linkedin.com/company/aisolarie",
    twitter: "https://twitter.com/aisolarie",
    youtube: "https://youtube.com/@aisolarie",
    tiktok: "https://tiktok.com/@aisolarie",
  },
  
  // ===== BRANDING =====
  logo: {
    // Set to null to use default icon, or provide image path
    image: null as string | null,
    icon: "Sun", // Lucide icon name if no image
  },
  
  // ===== TRUST BADGES & STATS =====
  // ⚠️ TODO (Task 4 polish): these stats are placeholder marketing numbers.
  // Same legal risk as the fake reviews removed from the RI site — replace
  // with real figures or remove before serious traffic.
  stats: {
    customers: "2,500+",
    savingsGenerated: "€3.2M",
    installedCapacity: "15 MW",
    googleRating: "4.9★",
    yearsInBusiness: "10+",
    installationsCompleted: "500+",
  },
  
  certifications: [
    { name: "SEAI Registered", icon: "ShieldCheck" },
    { name: "RECI Certified", icon: "Award" },
    { name: "Fully Insured", icon: "ShieldCheck" },
  ],
  
  // ===== SEAI GRANT INFO (Ireland-specific) =====
  grants: {
    maxDomestic: 1800,
    maxCommercialSmall: 2700,
    perKwpDomestic: 900,
    perKwpCommercial: 450,
  },

  // ===== PRICING (per-tenant — set here or itemise on the Products page) =====
  // The ONE place system cost is shaped. Every screen (estimate → design →
  // proposal → drafting agent) resolves cost through src/lib/pricing.ts, which
  // reads these rates. Change them per tenant and every number moves together.
  //   perKwp        — installed hardware + standard labour, € per kWp
  //   batteryPerKwh — storage added on top, € per usable kWh
  //   panelWatts    — panel wattage, converts panel count ↔ kWp
  pricing: {
    perKwp: 1800,
    batteryPerKwh: 650,
    panelWatts: 435,
  },

  // ===== SEO & META =====
  seo: {
    title: "AISOLAR — The Solar Installer Operating System | Ireland",
    description: "Run your solar business on autopilot. Bill extract at the front door, autonomous agents handle survey scheduling, proposal drafting, SEAI grants, install coordination, and follow-ups. Built for Irish solar installers, consultants, and owners.",
    keywords: "solar installer software, solar CRM, SEAI grant automation, solar pipeline management, installer cockpit, Irish solar business",
  },
  
  // ===== FEATURE FLAGS =====
  features: {
    showWhatsApp: true,
    showPhoneNumber: true,
    showSocialLinks: false,
    enableCryptoPayments: false,
    showTestimonials: true,
  },
  
  // ===== COPY/MESSAGING =====
  copy: {
    heroTitle: "The solar installer operating system",
    heroSubtitle: "Bill extract → autonomous pipeline → installed systems",
    heroCta: "Open the installer cockpit",
    valueProposition: "Bill extract at the front door. Agents handle survey scheduling, proposal drafting, SEAI grants, install coordination, and follow-ups. Your crews install. The platform does the rest.",
    trustMessage: "Built for installers, consultants, and owners — not consumers",
    noSpamMessage: "10 autonomous agents · RECI sign-off built in · SEAI auto-filed",
    reportCtaTitle: "See the live pipeline",
    reportCtaDescription: "Every lead, every stage, every touchpoint — and the next automation that will fire",
  },
} as const;

// Type for the brand config
export type BrandConfig = typeof brand;

/**
 * Helper function to get WhatsApp link with pre-filled message
 */
export function getWhatsAppLink(message?: string): string {
  const encodedMessage = message ? encodeURIComponent(message) : "";
  return `https://wa.me/${brand.contact.whatsapp}${encodedMessage ? `?text=${encodedMessage}` : ""}`;
}

/**
 * Helper function to get phone link
 */
export function getPhoneLink(): string {
  return `tel:${brand.contact.phone.replace(/\s/g, "")}`;
}

/**
 * Helper function to get email link
 */
export function getEmailLink(subject?: string): string {
  const subjectParam = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return `mailto:${brand.contact.email}${subjectParam}`;
}
