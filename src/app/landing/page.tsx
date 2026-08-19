import LandingPage from '@/components/LandingPage';

/**
 * La page de présentation commerciale, conservée mais SORTIE de la racine.
 *
 * Elle reste utile pour une campagne payante ou un lien direct où le visiteur
 * arrive en connaissant déjà le produit. Elle n'est simplement plus la porte
 * d'entrée par défaut : voir le commentaire de src/app/page.tsx pour le
 * raisonnement complet.
 */
export const metadata = {
  title: 'Mon Frigo — Présentation et tarifs',
  description:
    "Ce que fait Mon Frigo, ce que contient le plan gratuit et ce qu'apportent les formules payantes.",
};

export default function LandingRoute() {
  return <LandingPage />;
}
