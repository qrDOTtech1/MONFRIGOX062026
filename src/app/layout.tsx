import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Baloo_2 } from 'next/font/google';
import ThemeProvider from '@/components/ThemeProvider';
import { I18nProvider } from '@/lib/i18n';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import Analytics from '@/components/Analytics';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-app',
  display: 'swap',
});

// Police des titres : ronde et chaleureuse (ambiance "cuisine humaine")
const baloo = Baloo_2({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
});

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
    // Pas d'"images" ici : générées par src/app/opengraph-image.tsx (convention
    // de fichier Next.js), injectées automatiquement — évite une URL statique
    // à maintenir manuellement.
    type: 'website',
    locale: 'fr_FR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'Mon Frigo — Recettes avec ce que tu as dans le frigo',
    description: SITE_DESC,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mon Frigo — Recettes anti-gaspi avec ce que tu as',
    description: 'Scanne ton frigo, trouve des recettes, fais tes courses moins cher. Gratuit.',
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
  viewportFit: 'cover',   // active les safe-areas (encoches, barre gestuelle) sur mobile
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0f14' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="" suppressHydrationWarning>
      <head>
        {/*
          Vérification Google Search Console.

          Posée ici en dur plutôt que via `metadata.verification` : ce dernier
          n'était émis que sur la racine, pas sur /dashboard. Or la racine
          redirige désormais vers l'app — Googlebot suit la redirection et doit
          retrouver sa preuve à l'arrivée, sinon la propriété du domaine saute.
          Le jeton est public (il est lu dans le HTML), le garder en repli évite
          une dévérification si la variable d'environnement disparaît.
        */}
        <meta
          name="google-site-verification"
          content={process.env.GOOGLE_SITE_VERIFICATION
            || 'qc3-6Ir1rHfMdTkHJ6831yhXpQWbyFxhse3ZwbBM2ZI'}
        />
        {/* Inline theme script — applique le thème AVANT le premier paint, évite le flash blanc sur Edge */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var t = localStorage.getItem('theme');
              var dark = t ? t === 'dark' : true;   // sombre par défaut
              document.documentElement.classList.toggle('dark', dark);
              document.documentElement.style.background = dark ? '#0d0f14' : '#f7f8fa';
              var lang = localStorage.getItem('lang') || (navigator.language && navigator.language.slice(0,2) === 'fr' ? 'fr' : 'en');
              document.documentElement.lang = lang;
            } catch(e){}
          })();
        ` }} />
      </head>
      <body className={`antialiased ${spaceGrotesk.variable} ${baloo.variable}`}>
        <Analytics />
        <I18nProvider>
          <ThemeProvider>
            <ServiceWorkerRegistrar />
            {children}
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
