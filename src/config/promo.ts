// ============================================================
//  CONFIG PROMOTION  —  page d'accueil (monfrigo.app)
// ------------------------------------------------------------
//  👉 POUR CLAUDE CODE (futures sessions) :
//  Pour changer la promo affichée, il suffit de modifier UNE
//  seule ligne tout en bas de ce fichier :
//
//      export const PROMO: PromoConfig = PROMO_PRESETS.worldcup;
//
//  Remplace "worldcup" par un des presets ci-dessous :
//    - PROMO_PRESETS.worldcup     → Coupe du Monde (fond stade + drapeaux)
//    - PROMO_PRESETS.halloween    → Halloween
//    - PROMO_PRESETS.noel         → Noël
//    - PROMO_PRESETS.blackfriday  → Black Friday
//    - PROMO_PRESETS.aucune       → DÉSACTIVE toutes les promos (rien affiché)
//
//  Pour créer une NOUVELLE promo : copie un preset 'simple' existant,
//  change les textes / le dégradé / l'emoji, donne-lui un nom, puis
//  pointe PROMO dessus. Voir aussi le guide : src/config/PROMO_GUIDE.md
// ============================================================

export type PromoConfig = {
  // true = la bannière s'affiche | false = aucune bannière
  enabled: boolean;

  // 'worldcup' = grande bannière Coupe du Monde (fond stade + choix d'équipe)
  // 'simple'   = petite bannière texte (titre + code + bouton + ambiance couleur)
  variant: 'worldcup' | 'simple';

  // ── Champs pour variant 'simple' ──
  title: string;      // Titre en gras
  subtitle: string;   // Phrase courte sous le titre
  code?: string;      // Code promo affiché (optionnel)
  ctaLabel: string;   // Texte du bouton
  ctaHref: string;    // Lien du bouton (ex: '/register')
  gradient?: string;  // Dégradé CSS de fond (ambiance couleur de la promo)
  emoji?: string;     // Gros emoji décoratif dans le coin
};

// ============================================================
//  PRESETS PRÊTS À L'EMPLOI
//  (des promos déjà configurées — il suffit de pointer dessus)
// ============================================================
export const PROMO_PRESETS = {
  // Coupe du Monde — bannière spéciale avec fond stade + drapeaux
  worldcup: {
    enabled: true,
    variant: 'worldcup',
    title: '', subtitle: '', ctaLabel: '', ctaHref: '/register', // non utilisés par 'worldcup'
  },

  // 🎃 Halloween — ambiance orange / violet
  halloween: {
    enabled: true,
    variant: 'simple',
    title: 'Offre Halloween 🎃',
    subtitle: 'Un mois Premium offert… sans mauvais tour !',
    code: 'HALLOWEEN',
    ctaLabel: 'J\'en profite',
    ctaHref: '/register',
    gradient: 'linear-gradient(135deg, #1a1024 0%, #6b21a8 45%, #ea580c 100%)',
    emoji: '🎃',
  },

  // 🎄 Noël — ambiance rouge / vert sapin
  noel: {
    enabled: true,
    variant: 'simple',
    title: 'Offre de Noël 🎄',
    subtitle: '2 mois Premium offerts pour les fêtes',
    code: 'NOEL',
    ctaLabel: 'Recevoir mon cadeau',
    ctaHref: '/register',
    gradient: 'linear-gradient(135deg, #0f2e1a 0%, #166534 45%, #b91c1c 100%)',
    emoji: '🎄',
  },

  // 🖤 Black Friday — ambiance noir / doré
  blackfriday: {
    enabled: true,
    variant: 'simple',
    title: 'Black Friday',
    subtitle: 'La plus grosse remise de l\'année sur Premium',
    code: 'BLACKFRIDAY',
    ctaLabel: 'Voir l\'offre',
    ctaHref: '/register',
    gradient: 'linear-gradient(135deg, #000000 0%, #1c1c1c 55%, #a16207 100%)',
    emoji: '🖤',
  },

  // ❌ Aucune promo — désactive tout (page sans bannière)
  aucune: {
    enabled: false,
    variant: 'simple',
    title: '', subtitle: '', ctaLabel: '', ctaHref: '/register',
  },
} satisfies Record<string, PromoConfig>;

// ============================================================
//  ⬇️  LA PROMO ACTIVE  —  change juste le nom du preset ici
// ============================================================
export const PROMO: PromoConfig = PROMO_PRESETS.worldcup;
