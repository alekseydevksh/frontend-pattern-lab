import type { MetadataRoute } from 'next';
import { lessons } from '@content/lessons';
import { SITE_URL } from '@/lib/site';

// Required for a static export: the file is written once, at build time.
export const dynamic = 'force-static';

/**
 * The catalog and every lesson that can be played. Lessons that are only "coming soon" have
 * no page, and the pages under /dev/ are left out on purpose (they are also `noindex`).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'monthly', priority: 1 },
    ...lessons.map((lesson) => ({
      url: `${SITE_URL}/lessons/${lesson.slug}/`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
