import type { ReactNode } from 'react';
import { SiteShell } from '@/components/shell/SiteShell';

/** The header and footer around the catalog and the lessons. The `/dev/` pages sit outside. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
