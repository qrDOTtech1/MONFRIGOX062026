#!/usr/bin/env node
/**
 * Crée dans Stripe l'offre « Coupe du Monde 2026 » :
 *   - 1 coupon -10 %
 *   - 48 codes promo (CM26-XXX), un par équipe, rattachés au coupon
 *
 * Idempotent : relançable sans créer de doublons.
 *
 * Utilisation (PowerShell) :
 *   $env:STRIPE_SECRET_KEY="sk_test_xxx"; node scripts/setup-worldcup-promos.mjs
 * Utilisation (bash) :
 *   STRIPE_SECRET_KEY=sk_test_xxx node scripts/setup-worldcup-promos.mjs
 *
 * Options (variables d'env facultatives) :
 *   PERCENT_OFF   (défaut 10)
 *   COUPON_DURATION  once | forever | repeating   (défaut once = 1re facture)
 *   EXPIRES_AT    date ISO ex 2026-07-20  → expiration des codes
 *   MAX_REDEMPTIONS  nombre max d'utilisations par code
 *
 * ⚠️ Utilise d'abord une clé sk_test_... pour vérifier en mode test.
 */

const KEY = process.env.STRIPE_SECRET_KEY;
if (!KEY) {
  console.error('❌ STRIPE_SECRET_KEY manquant. Ex: $env:STRIPE_SECRET_KEY="sk_test_xxx"');
  process.exit(1);
}

const PERCENT_OFF = Number(process.env.PERCENT_OFF || 10);
const DURATION = process.env.COUPON_DURATION || 'once';
const COUPON_ID = `wc2026_${PERCENT_OFF}pct`;
const EXPIRES_AT = process.env.EXPIRES_AT ? Math.floor(new Date(process.env.EXPIRES_AT).getTime() / 1000) : null;
const MAX_REDEMPTIONS = process.env.MAX_REDEMPTIONS ? Number(process.env.MAX_REDEMPTIONS) : null;

// Les 48 codes (doivent correspondre à WC_TEAMS dans src/app/page.tsx)
const CODES = [
  'CM26-FRA','CM26-BRA','CM26-ARG','CM26-ENG','CM26-ESP','CM26-GER','CM26-POR','CM26-NED',
  'CM26-ITA','CM26-BEL','CM26-CRO','CM26-URU','CM26-COL','CM26-MAR','CM26-SEN','CM26-JPN',
  'CM26-KOR','CM26-USA','CM26-MEX','CM26-CAN','CM26-SUI','CM26-DEN','CM26-SRB','CM26-POL',
  'CM26-AUT','CM26-TUR','CM26-UKR','CM26-SCO','CM26-NOR','CM26-SWE','CM26-ECU','CM26-PER',
  'CM26-CHI','CM26-PAR','CM26-NGA','CM26-EGY','CM26-ALG','CM26-CMR','CM26-GHA','CM26-CIV',
  'CM26-TUN','CM26-IRN','CM26-AUS','CM26-KSA','CM26-QAT','CM26-CRC','CM26-PAN','CM26-NZL',
];

const BASE = 'https://api.stripe.com/v1';
const headers = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' };

async function api(method, path, params) {
  const body = params ? new URLSearchParams(params).toString() : undefined;
  const res = await fetch(`${BASE}${path}`, { method, headers, body });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function ensureCoupon() {
  // Existe déjà ?
  const get = await api('GET', `/coupons/${COUPON_ID}`);
  if (get.ok) {
    console.log(`✓ Coupon déjà présent : ${COUPON_ID} (-${get.data.percent_off}%)`);
    return COUPON_ID;
  }
  // Création
  const params = {
    id: COUPON_ID,
    percent_off: String(PERCENT_OFF),
    duration: DURATION,
    name: `Coupe du Monde 2026 -${PERCENT_OFF}%`,
  };
  const create = await api('POST', '/coupons', params);
  if (!create.ok) {
    console.error('❌ Création coupon échouée :', create.data?.error?.message);
    process.exit(1);
  }
  console.log(`✅ Coupon créé : ${COUPON_ID} (-${PERCENT_OFF}%, duration=${DURATION})`);
  return COUPON_ID;
}

async function promoCodeExists(code) {
  const res = await api('GET', `/promotion_codes?code=${encodeURIComponent(code)}&limit=1`);
  return res.ok && Array.isArray(res.data.data) && res.data.data.length > 0;
}

async function createPromoCode(coupon, code) {
  if (await promoCodeExists(code)) { console.log(`  ↷ ${code} existe déjà`); return 'skip'; }
  const params = { coupon, code };
  if (EXPIRES_AT) params.expires_at = String(EXPIRES_AT);
  if (MAX_REDEMPTIONS) params.max_redemptions = String(MAX_REDEMPTIONS);
  const res = await api('POST', '/promotion_codes', params);
  if (!res.ok) { console.error(`  ❌ ${code} : ${res.data?.error?.message}`); return 'error'; }
  console.log(`  ✓ ${code}`);
  return 'created';
}

(async () => {
  console.log(`\n⚽ Configuration offre Coupe du Monde 2026 (-${PERCENT_OFF}%)\n`);
  const coupon = await ensureCoupon();
  console.log('\nCréation des codes promo…');
  let created = 0, skipped = 0, errors = 0;
  for (const code of CODES) {
    const r = await createPromoCode(coupon, code);
    if (r === 'created') created++; else if (r === 'skip') skipped++; else errors++;
  }
  console.log(`\n✅ Terminé : ${created} créés, ${skipped} déjà présents, ${errors} erreurs (sur ${CODES.length}).`);
  if (errors === 0) console.log("Tu peux tester sur la landing : choisis une équipe → la réduction s'applique au paiement.");
})();
