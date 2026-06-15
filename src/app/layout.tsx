import type { Metadata, Viewport } from 'next';
import ThemeProvider from '@/components/ThemeProvider';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://monfrigo.app';
const SITE_NAME = 'Mon Frigo';
const SITE_DESC = 'Scanne ton frigo, trouve des recettes avec ce que tu as, planifie tes repas et réduis le gaspillage alimentaire. Application gratuite de cuisine intelligente avec IA.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Mon Frigo — Recettes avec ce que tu as | Anti-gaspi & Courses moins chères',
    template: '%s | Mon Frigo',
  },
  description: SITE_DESC,
  keywords: [
    'recette avec ce que j\'ai', 'que faire avec mon frigo', 'recette frigo',
    'anti gaspillage alimentaire', 'anti gaspi cuisine', 'zéro déchet cuisine',
    'courses moins chères', 'économiser courses', 'budget courses',
    'liste de courses intelligente', 'planning repas semaine', 'meal planning français',
    'recette facile rapide', 'recette pas cher', 'recette économique',
    'scanner frigo', 'application cuisine', 'app recette gratuite',
    'cuisine intelligente', 'IA cuisine', 'recette personnalisée',
    'scanner code barre aliment', 'nutriscore recette', 'recette équilibrée',
    'batch cooking', 'meal prep', 'idée repas ce soir',
    'que manger ce soir', 'recette avec restes', 'cuisiner les restes',
    'réduire gaspillage', 'date péremption', 'aliments qui périment',
    'recette végétarienne', 'recette vegan', 'recette sans gluten', 'recette halal',
    'mon frigo', 'monfrigo',
  ],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/favicon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'Mon Frigo — Recettes avec ce que tu as dans le frigo',
    description: SITE_DESC,
    images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Mon Frigo — Cuisine intelligente, zéro gaspi' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mon Frigo — Recettes anti-gaspi avec ce que tu as',
    description: 'Scanne ton frigo, trouve des recettes, fais tes courses moins cher. Gratuit.',
    images: [`${SITE_URL}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  alternates: { canonical: SITE_URL },
  category: 'food',
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || '',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f11' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Inline theme script — applique le thème AVANT le premier paint, évite le flash blanc sur Edge */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var t = localStorage.getItem('theme');
              var dark = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
              document.documentElement.classList.toggle('dark', dark);
              document.documentElement.style.background = dark ? '#0f0f11' : '#fafafa';
            } catch(e){}
          })();
        ` }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <ServiceWorkerRegistrar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
