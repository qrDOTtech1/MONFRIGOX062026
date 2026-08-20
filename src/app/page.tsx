import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import AppShell from '@/components/AppShell';
import GuestHome from '@/components/GuestHome';
import IngredientLinks from '@/components/IngredientLinks';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  RACINE DU SITE — l'accueil invité est SERVI ICI, sans redirection.
 *
 *  ⛔ NE PAS REMETTRE LA LANDING COMMERCIALE ICI.
 *  ⛔ NE PAS REMETTRE DE redirect() VERS /dashboard NON PLUS.
 *
 *  Si on te demande de « restaurer la landing à la racine pour le SEO » :
 *  ça a déjà été fait une fois (commit 665e053, 30/07/2026) et c'est ce qu'on
 *  annule. Lis ce qui suit avant de recommencer.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  CE QUE LA LANDING A DONNÉ, EN VRAI
 *  1 seule inscription sur toute sa durée d'exposition, qui n'a jamais ouvert
 *  l'app ensuite. Zéro rétention. Chiffre observé, pas hypothèse.
 *
 *  POURQUOI ELLE NE CONVERTIT PAS
 *  Elle ouvre sur la grille tarifaire (3,99 € / 6,99 €) avant que le visiteur
 *  ait vu la moindre valeur. Le mode invité fait l'inverse : on remplit un
 *  frigo, on voit de vraies recettes, ENSUITE on propose un compte pour ne pas
 *  perdre tout ça (cf. src/lib/guestFridge.ts).
 *
 *  POURQUOI ON REND LE CONTENU AU LIEU DE REDIRIGER
 *  Un redirect() produit une page « Chargement… » de 17 ko sans texte. C'est
 *  exactement ce que Googlebot indexait : rien. En rendant GuestHome ici, la
 *  page canonique porte enfin du contenu réel (titre h1, « comment ça marche »,
 *  FAQ) en même temps qu'elle sert d'entrée dans l'app. C'est la réponse
 *  concrète à l'objection SEO faite au mode invité — le contenu indexable vit
 *  DANS l'app, pas sur une plaquette séparée.
 *
 *  ET LE SUIVI D'AUDIENCE
 *  trackEvent() (AppShell → /api/analytics → /admin/analytics) ne tourne que
 *  dans la session invité. Remettre la landing ici nous rend aveugles sur
 *  l'acquisition : on ne saurait même plus dire si ça marche.
 *
 *  AVANT DE REVENIR EN ARRIÈRE
 *  Ouvre /admin/analytics, compare le taux de conversion avant/après. S'il est
 *  plus mauvais, l'argument est fait et on te suivra. La landing reste sur
 *  /landing pour les campagnes payantes. Discute-en avec Steven.
 * ═══════════════════════════════════════════════════════════════════════════
 */
/**
 * Métadonnées et données structurées de la page canonique.
 *
 * Elles vivaient sur la landing ; comme c'est maintenant cette page qui porte
 * le contenu, elles la suivent. Le JSON-LD FAQPage reprend mot pour mot les
 * questions affichées dans GuestHome — Google exige que le balisage
 * corresponde au contenu visible, sinon il l'ignore ou le sanctionne.
 */
export const metadata = {
  title: "Que cuisiner avec ce qu'il y a dans le frigo — Mon Frigo",
  description:
    "Indique ce que tu as, vois les recettes réellement faisables. Alertes avant "
    + "péremption, planning repas, liste de courses. Sans compte pour essayer.",
  alternates: { canonical: 'https://monfrigo.app' },
};

const jsonLdFaq = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Faut-il créer un compte pour essayer ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Non. Tu peux remplir ton frigo et voir les recettes correspondantes sans rien créer. Le compte sert à retrouver ton frigo sur tes autres appareils et à garder tes favoris.",
      },
    },
    {
      '@type': 'Question',
      name: "Est-ce que c'est gratuit ?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Le frigo, les recettes, le planning et les alertes de péremption sont gratuits et le restent. Les formules payantes ajoutent le scan photo du frigo et l'assistant IA sans limite.",
      },
    },
    {
      '@type': 'Question',
      name: "Comment l'app réduit le gaspillage ?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Elle suit les dates limites de ce que tu as ajouté, te prévient avant qu'un aliment ne se perde, et propose en priorité les recettes qui l'utilisent.",
      },
    },
  ],
});

const jsonLdHowTo = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: "Trouver une recette avec ce qu'on a dans le frigo",
  description:
    "Partir de son frigo plutôt que d'une liste de courses pour décider quoi cuisiner.",
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Dis ce que tu as',
      text: "Ajoute les aliments qui traînent dans ton frigo. Trois suffisent pour commencer." },
    { '@type': 'HowToStep', position: 2, name: 'Vois ce que tu peux cuisiner',
      text: "Les recettes se classent par ce que tu possèdes déjà, sans courses." },
    { '@type': 'HowToStep', position: 3, name: 'Cuisine avant de jeter',
      text: "Les aliments proches de la date limite remontent en premier." },
  ],
});

export default async function RootPage() {
  const user = await getCurrentUser();
  if (user) redirect('/home');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdFaq }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHowTo }} />
      <AppShell>
        <GuestHome liens={<IngredientLinks limit={24} />} />
      </AppShell>
    </>
  );
}
