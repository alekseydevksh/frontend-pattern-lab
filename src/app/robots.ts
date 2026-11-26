import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Required for a static export: the file is written once, at build time.
export const dynamic = 'force-static';

/**
 * Everything may be crawled. The /dev/ pages are not blocked here on purpose: a page that
 * crawlers may not fetch can never show them its `noindex`, and could still be listed by
 * address alone. They carry `noindex` themselves and are not in the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
