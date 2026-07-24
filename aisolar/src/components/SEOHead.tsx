import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogType?: string;
  ogImage?: string;
  canonical?: string;
  structuredData?: object;
}

export default function SEOHead({
  title = 'AISOLAR — The Solar Installer Operating System (Ireland)',
  description = 'AISOLAR is the operating system for Irish solar installers. It reads the day/night split from your electricity bill, then ten agents handle survey scheduling, proposal drafting, SEAI grant tracking, install coordination and follow-ups.',
  keywords = 'solar installer software Ireland, solar CRM, SEAI grant, solar proposal software, solar bill analysis, day night meter, solar automation Ireland',
  ogType = 'website',
  ogImage = '/placeholder.svg',
  canonical,
  structuredData,
}: SEOHeadProps) {
  const siteUrl = window.location.origin;
  const currentUrl = canonical || window.location.href;

  // Honest defaults only — no invented ratings/reviews in structured data.
  const defaultStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AISOLAR',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description,
    url: 'https://aisolar.ie',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      description: 'Free solar savings estimate — no signup.',
    },
    provider: { '@type': 'Organization', name: 'AISOLAR', url: 'https://aisolar.ie' },
    areaServed: { '@type': 'Country', name: 'Ireland' },
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={currentUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${siteUrl}${ogImage}`} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={currentUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={`${siteUrl}${ogImage}`} />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData || defaultStructuredData)}
      </script>

      {/* Additional SEO tags */}
      <meta name="robots" content="index, follow" />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      <meta name="author" content="Solar Automation Platform" />
    </Helmet>
  );
}
