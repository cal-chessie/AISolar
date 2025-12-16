/**
 * BRAND CONFIGURATION
 * 
 * This file contains all white-label settings for the platform.
 * To customize for a new client/partner, simply update these values.
 * 
 * Usage: import { brand } from "@/config/brand"
 */

export const brand = {
  // ===== COMPANY INFO =====
  name: "AI Solar",
  tagline: "AI-Powered Solar Analysis",
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
  
  // ===== SOCIAL LINKS =====
  social: {
    facebook: "https://facebook.com/aisolarie",
    instagram: "https://instagram.com/aisolarie",
    linkedin: "https://linkedin.com/company/aisolarie",
    twitter: "https://twitter.com/aisolarie",
  },
  
  // ===== BRANDING =====
  logo: {
    // Set to null to use default icon, or provide image path
    image: null as string | null,
    icon: "Sun", // Lucide icon name if no image
  },
  
  // ===== TRUST BADGES & STATS =====
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
    { name: "BER Certified", icon: "Award" },
    { name: "Fully Insured", icon: "ShieldCheck" },
  ],
  
  // ===== SEAI GRANT INFO (Ireland-specific) =====
  grants: {
    maxDomestic: 2400,
    maxCommercialSmall: 2700,
    perKwpDomestic: 900,
    perKwpCommercial: 450,
  },
  
  // ===== SEO & META =====
  seo: {
    title: "AI Solar Bill Analysis | Free Solar Savings Calculator Ireland",
    description: "Upload your electricity bill and get instant solar savings estimates. Free AI-powered analysis for Irish homes. SEAI grants included.",
    keywords: "solar panels Ireland, solar calculator, electricity bill analysis, solar savings, SEAI grants, solar installation Ireland",
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
    heroTitle: "AI Solar Bill Analysis",
    heroSubtitle: "for Irish Homes",
    heroCta: "Analyse My Bill (Free)",
    valueProposition: "Upload your electricity bill and get instant savings estimates.",
    trustMessage: "No obligation, free analysis",
    noSpamMessage: "🔒 No spam, ever. Your data is secure.",
    reportCtaTitle: "Get Your Full Solar Report",
    reportCtaDescription: "We'll email you a detailed breakdown of your solar savings potential",
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
