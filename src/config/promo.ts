// ============================================================
//  CONFIG PROMOTION  —  page d'accueil (monfrigo.app)
// ------------------------------------------------------------
//  C'est LE SEUL fichier à modifier pour gérer ta bannière promo.
//
//  Pour ACTIVER une promo    : enabled = true
//  Pour DÉSACTIVER une promo  : enabled = false   (plus aucune bannière)
//  Pour REMPLACER une promo   : change "variant" ou les textes ci-dessous
//
//  Rien d'autre à toucher dans le reste du projet. 👍
// ============================================================

export type PromoConfig = {
  // true  = la bannière s'affiche
  // false = aucune bannière (page sans promo)
  enabled: boolean;

  // Quelle bannière afficher :
  //  'worldcup' = la grande bannière Coupe du Monde (choix de l'équipe + code)
  //  'simple'   = une petite bannière texte (utilise les champs plus bas)
  variant: 'worldcup' | 'simple';

  // ── Champs utilisés UNIQUEMENT quand variant = 'simple' ──
  title: string;      // Titre en gras (ex: "Offre de lancement")
  subtitle: string;   // Phrase courte sous le titre
  code?: string;      // Code promo à afficher (laisse vide si aucun)
  ctaLabel: string;   // Texte du bouton (ex: "En profiter")
  ctaHref: string;    // Lien du bouton (ex: "/register")
};

// ============================================================
//  ⬇️  LA PROMO ACTUELLE  —  modifie seulement ces valeurs
// ============================================================
export const PROMO: PromoConfig = {
  enabled: true,          // ← mets false pour tout cacher
  variant: 'worldcup',    // ← 'worldcup' ou 'simple'

  // Ces 5 lignes ne servent que si variant = 'simple' :
  title: 'Offre de lancement',
  subtitle: '1 mois Premium offert pour toute inscription',
  code: 'BIENVENUE',
  ctaLabel: 'En profiter',
  ctaHref: '/register',
};
