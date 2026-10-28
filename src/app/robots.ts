import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/marketing/metadata'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: ['/', '/es', '/en'], disallow: ['/api/', '/admin'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
