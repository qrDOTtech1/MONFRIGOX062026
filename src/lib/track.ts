// Envoi d'événements de conversion aux pixels (Meta, TikTok) et à GA4.
// Sans effet si les pixels ne sont pas chargés (IDs non configurés).
// C'est CET événement qui permet aux plateformes de pub d'optimiser leur
// ciblage vers les gens qui s'inscrivent réellement.

/* eslint-disable @typescript-eslint/no-explicit-any */

/** À appeler juste après une inscription réussie. */
export function trackSignup() {
  try {
    (window as any).fbq?.('track', 'CompleteRegistration');
    (window as any).ttq?.track('CompleteRegistration');
    (window as any).gtag?.('event', 'sign_up');
  } catch {
    /* pixels non chargés → on ignore */
  }
}

/** À appeler quand un utilisateur passe à un abonnement payant. */
export function trackPurchase(plan: string, value: number) {
  try {
    (window as any).fbq?.('track', 'Subscribe', { value, currency: 'EUR', predicted_ltv: value });
    (window as any).ttq?.track('Subscribe', { value, currency: 'EUR', content_name: plan });
    (window as any).gtag?.('event', 'purchase', { currency: 'EUR', value });
  } catch {
    /* pixels non chargés → on ignore */
  }
}
