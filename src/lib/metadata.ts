import type { Metadata } from 'next';
import messages from '@messages/en.json';

/**
 * Metadata for one page: title, description, canonical URL and the Open Graph fields.
 *
 * Next.js replaces a parent's `openGraph` object whole when a page sets its own, so every page
 * has to carry the complete set. This builds it once. `path` starts with `/` and ends with `/`,
 * because the export serves each page as `path/index.html` (`trailingSlash`, D5); it is made
 * absolute against `metadataBase` in the root layout.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  /** The page's own title. The site name is added after it, except on the catalog. */
  title?: string;
  description: string;
  path: string;
}): Metadata {
  const fullTitle = title ? `${title} · ${messages.site.name}` : messages.site.name;
  return {
    title: title ? { absolute: fullTitle } : { absolute: messages.site.name },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: messages.site.name,
      locale: 'en_US',
      title: fullTitle,
      description,
      url: path,
    },
  };
}
