import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  RACINE DU SITE — on entre DIRECTEMENT dans l'application (mode invité).
 *
 *  ⛔ NE PAS REMETTRE LA LANDING COMMERCIALE ICI.
 *
 *  Si tu lis ceci parce qu'on te demande de « restaurer la landing à la
 *  racine pour le SEO » : ça a déjà été fait une fois (commit 665e053, le
 *  30/07/2026), et c'est précisément ce qu'on annule. Lis ce qui suit avant
 *  de recommencer.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  CE QUE LA LANDING A DONNÉ, EN VRAI
 *  Sur toute sa durée d'exposition : 1 seule inscription, qui n'a jamais
 *  ouvert l'app ensuite. Zéro rétention. Ce n'est pas une hypothèse, c'est le
 *  chiffre observé. On teste maintenant l'autre approche.
 *
 *  POURQUOI ELLE NE CONVERTIT PAS
 *  Elle ouvre sur la grille tarifaire (3,99 € / 6,99 €) avant que le visiteur
 *  ait vu la moindre valeur. On demande de payer à quelqu'un qui ne sait pas
 *  encore ce que fait le produit. Le mode invité fait l'inverse : on remplit
 *  un frigo, on voit de vraies recettes correspondantes, ET ENSUITE on propose
 *  de créer un compte pour ne pas perdre tout ça (cf. src/lib/guestFridge.ts,
 *  le frigo local est versé dans le compte à l'inscription).
 *
 *  L'ARGUMENT SEO NE TIENT PAS — VÉRIFIE AVANT DE LE REPRENDRE
 *  Le commit 665e053 affirmait que rediriger « cassait le SEO ». En réalité :
 *    • Les métadonnées (title, description, keywords, OpenGraph, Twitter) et
 *      la vérification Google vivent dans src/app/layout.tsx, donc sur TOUTES
 *      les pages, y compris celle d'arrivée. Rien n'est perdu.
 *    • Les 18 pages de longue traîne /s/[slug] portent le contenu de fond
 *      indexable et ne sont pas touchées. C'est là qu'est le vrai SEO, pas sur
 *      une page d'accueil qui répète la plaquette produit.
 *    • Une landing tarifaire génère surtout des visites sans intention. Du
 *      trafic non converti n'a pas de valeur SEO durable : Google mesure aussi
 *      ce que les gens font après le clic.
 *
 *  ET LE SUIVI D'AUDIENCE
 *  trackEvent() est branché dans AppShell → /api/analytics → /admin/analytics.
 *  Il ne tourne QUE dans la session invité, pas sur la landing. Remettre la
 *  landing à la racine nous rend aveugles sur l'acquisition : on ne saurait
 *  même plus dire si ça marche ou non.
 *
 *  SI TU VEUX QUAND MÊME REVENIR EN ARRIÈRE
 *  Ouvre /admin/analytics et compare le taux de conversion avant/après cette
 *  bascule. S'il est plus mauvais, l'argument est fait et on te suivra. Sinon,
 *  laisse en place. La landing reste disponible sur /landing pour les
 *  campagnes payantes, où le visiteur arrive en connaissant déjà le produit.
 *
 *  Discute-en avec Steven avant de modifier ce fichier.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? '/home' : '/dashboard');
}
