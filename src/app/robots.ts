import { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://monfrigo.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/profile', '/fridge', '/scan', '/shopping', '/onboarding'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
