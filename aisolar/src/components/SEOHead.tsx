/**
 * SEOHead — per-page title, meta, canonical and JSON-LD.
 *
 * Sets the tags DIRECTLY on document.head instead of going through
 * react-helmet-async. Helmet v2 silently rendered nothing under React 18's
 * createRoot here (the component ran with the right props, but no tag ever
 * reached <head> — verified in the browser), which meant every page shipped
 * index.html's single generic title. This version is deterministic: it writes
 * the tags, marks them `data-seo-head`, and removes its own on unmount, so
 * there is exactly one of each and no duplicates with index.html.
 *
 * Honest defaults only — no invented ratings/reviews in structured data.
 */
import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogType?: string;
  ogImage?: string;
  canonical?: string;
  structuredData?: object;
}

const MARK = 'data-seo-head';

/** Create/update a tag we own, keyed by its identifying attribute. */
function setTag(tag: 'meta' | 'link', keyAttr: string, keyVal: string, valAttr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(`${tag}[${keyAttr}="${keyVal}"]`);
  if (!el) {
    el = document.createElement(tag);
    el.setAttribute(keyAttr, keyVal);
    el.setAttribute(MARK, '');
    document.head.appendChild(el);
  }
  el.setAttribute(valAttr, value);
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
  useEffect(() => {
    const siteUrl = window.location.origin;
    const currentUrl = canonical || window.location.href;

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

    document.title = title;

    setTag('meta', 'name', 'description', 'content', description);
    setTag('meta', 'name', 'keywords', 'content', keywords);
    setTag('meta', 'name', 'robots', 'content', 'index, follow');
    setTag('link', 'rel', 'canonical', 'href', currentUrl);

    setTag('meta', 'property', 'og:type', 'content', ogType);
    setTag('meta', 'property', 'og:url', 'content', currentUrl);
    setTag('meta', 'property', 'og:title', 'content', title);
    setTag('meta', 'property', 'og:description', 'content', description);
    setTag('meta', 'property', 'og:image', 'content', `${siteUrl}${ogImage}`);

    setTag('meta', 'name', 'twitter:card', 'content', 'summary_large_image');
    setTag('meta', 'name', 'twitter:title', 'content', title);
    setTag('meta', 'name', 'twitter:description', 'content', description);
    setTag('meta', 'name', 'twitter:image', 'content', `${siteUrl}${ogImage}`);

    // Page-level JSON-LD (the Organization/WebSite graph stays in index.html).
    const ldId = 'seo-head-jsonld';
    let ld = document.getElementById(ldId) as HTMLScriptElement | null;
    if (!ld) {
      ld = document.createElement('script');
      ld.id = ldId;
      ld.type = 'application/ld+json';
      ld.setAttribute(MARK, '');
      document.head.appendChild(ld);
    }
    ld.textContent = JSON.stringify(structuredData || defaultStructuredData);

    return () => {
      // Drop the page-specific JSON-LD so the next route can't inherit it.
      document.getElementById(ldId)?.remove();
    };
  }, [title, description, keywords, ogType, ogImage, canonical, structuredData]);

  return null;
}
