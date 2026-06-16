'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ScanLine, ChefHat, ShoppingCart, Leaf, Barcode, Sparkles, Check, Brain, X, Calendar, MessageSquare, Trophy, Share2, UtensilsCrossed, Volume2, Timer, Globe, Gift, ChevronLeft, ChevronRight, Copy, Star, Users, Clock, Zap } from 'lucide-react';
import LogoAnim from '@/components/LogoAnim';
import FloatingEmojis from '@/components/FloatingEmojis';
import { useT, LANGUAGES } from '@/lib/i18n';

/* ── Landing-specific styles ─────────────────────────────────────────── */
function LandingStyles() {
  return (
    <style>{`
      @keyframes shimmer {
        0%   { background-position: -200% center; }
        100% { background-position:  200% center; }
      }
      @keyframes glow-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(var(--accent-rgb, 200,200,200), 0); }
        50%       { box-shadow: 0 0 24px 4px rgba(var(--accent-rgb, 200,200,200), 0.18); }
      }
      .btn-glow { animation: glow-pulse 2.8s ease-in-out infinite; }
      .shimmer-text {
        background: linear-gradient(90deg, var(--text) 20%, var(--accent) 50%, var(--text) 80%);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: shimmer 4s linear infinite;
      }
      .section-fade { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
      .section-fade.visible { opacity: 1; transform: translateY(0); }
    `}</style>
  );
}

/* ── Staggered section observer ─────────────────────────────────────── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add('section-fade');
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('visible'); obs.disconnect(); }
    }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ── Feature icon mapping ───────────────────────────────────────────── */
const featureIcons = [
  { icon: ScanLine,        titleKey: 'feat.scan.title',     descKey: 'feat.scan.desc' },
  { icon: Barcode,         titleKey: 'feat.barcode.title',  descKey: 'feat.barcode.desc' },
  { icon: ChefHat,         titleKey: 'feat.recipes.title',  descKey: 'feat.recipes.desc' },
  { icon: MessageSquare,   titleKey: 'feat.ai.title',       descKey: 'feat.ai.desc' },
  { icon: Calendar,        titleKey: 'feat.planning.title', descKey: 'feat.planning.desc' },
  { icon: UtensilsCrossed, titleKey: 'feat.cooking.title',  descKey: 'feat.cooking.desc' },
  { icon: ShoppingCart,    titleKey: 'feat.shopping.title',  descKey: 'feat.shopping.desc' },
  { icon: Leaf,            titleKey: 'feat.waste.title',     descKey: 'feat.waste.desc' },
  { icon: Trophy,          titleKey: 'feat.badges.title',    descKey: 'feat.badges.desc' },
  { icon: Volume2,         titleKey: 'feat.voice.title',     descKey: 'feat.voice.desc' },
];

type PlanDef = {
  nameKey: string; price: string; priceAnnual?: string;
  periodKey: string; periodAnnualKey?: string; periodAnnualSuffix?: string; descKey: string;
  color: string; border: string;
  badgeKey?: string; badgeColor?: string; badgeBg?: string;
  ctaKey: string; href: string;
  featureKeys: string[]; excludedKeys: string[];
};

const planDefs: PlanDef[] = [
  {
    nameKey: 'plan.free', price: '0€', periodKey: 'plan.free.period',
    descKey: 'plan.free.desc',
    color: 'transparent', border: 'var(--border)',
    ctaKey: 'plan.free.cta', href: '/register',
    featureKeys: [
      'planfeat.fridge', 'planfeat.barcode20', 'planfeat.recipes50',
      'planfeat.planning', 'planfeat.shopping', 'planfeat.cookmode',
      'planfeat.expiry', 'planfeat.badges', 'planfeat.ai3',
    ],
    excludedKeys: ['planfeat.noScanIA', 'planfeat.noAIUnlimited', 'planfeat.noCoach'],
  },
  {
    nameKey: 'plan.premium', price: '3,99€', priceAnnual: '34,99€',
    periodKey: 'plan.period.month', periodAnnualKey: 'plan.period.annual', periodAnnualSuffix: '  −27%',
    descKey: 'plan.premium.desc',
    color: 'rgba(245,158,11,0.04)', border: 'rgba(245,158,11,0.35)',
    badgeKey: 'plan.premium.badge', badgeColor: 'text-amber-600 dark:text-amber-400', badgeBg: 'rgba(245,158,11,0.12)',
    ctaKey: 'plan.premium.cta', href: '/register',
    featureKeys: [
      'planfeat.freeIncl', 'planfeat.ai10', 'planfeat.scanFrigo5',
      'planfeat.barcode100', 'planfeat.allRecipes', 'planfeat.aiRecipes',
      'planfeat.voice', 'planfeat.notes', 'planfeat.history',
    ],
    excludedKeys: [],
  },
  {
    nameKey: 'plan.vip', price: '6,99€', priceAnnual: '59,99€',
    periodKey: 'plan.period.month', periodAnnualKey: 'plan.period.annual', periodAnnualSuffix: '  −28%',
    descKey: 'plan.vip.desc',
    color: 'rgba(168,85,247,0.04)', border: 'rgba(168,85,247,0.35)',
    badgeKey: 'plan.vip.badge', badgeColor: 'text-purple-600 dark:text-purple-400', badgeBg: 'rgba(168,85,247,0.12)',
    ctaKey: 'plan.vip.cta', href: '/register',
    featureKeys: [
      'planfeat.premIncl', 'planfeat.aiUnlimited', 'planfeat.scanFrigo14',
      'planfeat.barcodeUnlimited', 'planfeat.coach', 'planfeat.nutrition',
      'planfeat.wasteBilan', 'planfeat.support', 'planfeat.early',
    ],
    excludedKeys: [],
  },
];

/* ── JSON-LD ────────────────────────────────────────────────────────── */
const SITE_URL = 'https://monfrigo.app';
const jsonLdApp = JSON.stringify({
  '@context': 'https://schema.org', '@type': 'WebApplication',
  name: 'Mon Frigo', url: SITE_URL, applicationCategory: 'LifestyleApplication', operatingSystem: 'Web',
  description: "Application de cuisine intelligente : scanne ton frigo, trouve des recettes, planifie tes repas, réduis le gaspillage alimentaire.",
  offers: [
    { '@type': 'Offer', price: '0', priceCurrency: 'EUR', name: 'Gratuit' },
    { '@type': 'Offer', price: '3.99', priceCurrency: 'EUR', name: 'Premium', billingIncrement: 'P1M' },
    { '@type': 'Offer', price: '6.99', priceCurrency: 'EUR', name: 'VIP', billingIncrement: 'P1M' },
  ],
  aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '1250', bestRating: '5' },
  featureList: ['Scan IA du frigo', 'Scan code-barres EAN', 'Recettes personnalisées', 'Assistant culinaire IA', 'Planning repas', 'Mode cuisine pas-à-pas', 'Liste de courses intelligente', 'Anti-gaspillage alimentaire', 'Coach nutritionnel', 'Commande vocale'],
});
const jsonLdFaq = JSON.stringify({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: "Comment trouver une recette avec ce que j'ai dans le frigo ?", acceptedAnswer: { '@type': 'Answer', text: "Ouvrez Mon Frigo, prenez une photo de votre frigo ou ajoutez vos ingrédients. L'app montre instantanément toutes les recettes faisables, triées par correspondance." } },
    { '@type': 'Question', name: "Mon Frigo est-il gratuit ?", acceptedAnswer: { '@type': 'Answer', text: "Oui ! Le plan gratuit est utilisable à vie sans carte bancaire : frigo, planning, liste de courses, mode cuisine, alertes péremption. L'IA est en essai (3 requêtes). Premium dès 3,99€/mois pour débloquer l'IA." } },
    { '@type': 'Question', name: "Comment faire des courses moins chères ?", acceptedAnswer: { '@type': 'Answer', text: "Mon Frigo estime le coût de chaque recette, propose des alternatives économiques, et génère des listes de courses optimisées. Économisez 25 à 40% sur votre budget." } },
    { '@type': 'Question', name: "Comment réduire le gaspillage alimentaire ?", acceptedAnswer: { '@type': 'Answer', text: "L'app suit les dates de péremption, prévient quand un aliment va expirer, et propose des recettes qui l'utilisent en priorité." } },
    { '@type': 'Question', name: "Quels régimes alimentaires sont supportés ?", acceptedAnswer: { '@type': 'Answer', text: "Végétarien, vegan, halal, casher, sans gluten, keto, sans sucre — tous configurables dans le profil avec filtrage automatique." } },
  ],
});
const jsonLdOrg = JSON.stringify({
  '@context': 'https://schema.org', '@type': 'Organization',
  name: 'Mon Frigo', url: SITE_URL, logo: `${SITE_URL}/icon.png`,
  description: "Mon Frigo — Application de cuisine intelligente anti-gaspi",
});

/* ── Page ────────────────────────────────────────────────────────────── */
interface PublicPromo {
  code: string; description: string; planGranted: string;
  durationMonths: number; expiresAt: string | null;
  firstSignupOnly: boolean; maxUses: number | null; usedCount: number;
}

function PromoCarousel({ promos, t }: { promos: PublicPromo[]; t: (k: string, v?: Record<string, string | number>) => string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (promos.length <= 1) return;
    const interval = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const cardW = el.firstElementChild?.clientWidth || 280;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 10) el.scrollTo({ left: 0, behavior: 'smooth' });
      else el.scrollBy({ left: cardW + 12, behavior: 'smooth' });
    }, 4000);
    return () => clearInterval(interval);
  }, [promos.length]);

  function copy(code: string) {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  if (!promos.length) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 justify-center mb-4">
        <Gift className="w-5 h-5" style={{ color: 'var(--accent)' }} />
        <h2 className="text-lg font-bold">{t('landing.promo.title')}</h2>
      </div>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-2 px-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {promos.map(p => {
          const isVip = p.planGranted === 'VIP';
          const borderColor = isVip ? 'rgba(168,85,247,0.5)' : 'rgba(245,158,11,0.5)';
          const bgColor = isVip ? 'rgba(168,85,247,0.06)' : 'rgba(245,158,11,0.06)';
          const tagColor = isVip ? '#a855f7' : '#f59e0b';
          const remaining = p.maxUses !== null ? p.maxUses - p.usedCount : null;

          return (
            <div key={p.code} className="snap-center shrink-0 w-[280px] p-4 rounded-2xl relative overflow-hidden"
              style={{ backgroundColor: bgColor, border: `1.5px solid ${borderColor}` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${tagColor}20`, color: tagColor }}>
                  {isVip ? '👑 VIP' : '⭐ Premium'} · {p.durationMonths} {t('landing.promo.months')}
                </span>
                {remaining !== null && remaining <= 20 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                    🔥 {remaining} {t('landing.promo.left')}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono font-bold text-lg tracking-wider">{p.code}</span>
                <button onClick={() => copy(p.code)}
                  className="p-1 rounded-lg transition-all hover:scale-110 active:scale-90"
                  style={{ color: 'var(--text-muted)' }}>
                  {copiedCode === p.code ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {p.description && (
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{p.description}</p>
              )}

              {p.expiresAt && (
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  ⏰ {t('landing.promo.expires')} {new Date(p.expiresAt).toLocaleDateString()}
                </p>
              )}

              <Link href={p.firstSignupOnly ? '/register' : '/login'}
                className="mt-3 block w-full text-center py-2 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95"
                style={{ backgroundColor: tagColor, color: '#fff' }}>
                {p.firstSignupOnly ? t('landing.promo.signup') : t('landing.promo.use')}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Chaque équipe = une réduction % + un code Stripe déterministe (à créer dans Stripe).
const WC_TEAMS = [
  { flag: '🇫🇷', name: 'France',    code: 'CM26-FRA', percent: 30 },
  { flag: '🇧🇷', name: 'Brésil',    code: 'CM26-BRA', percent: 30 },
  { flag: '🇦🇷', name: 'Argentine', code: 'CM26-ARG', percent: 30 },
  { flag: '🇲🇦', name: 'Maroc',     code: 'CM26-MAR', percent: 35 },
  { flag: '🇪🇸', name: 'Espagne',   code: 'CM26-ESP', percent: 25 },
  { flag: '🇵🇹', name: 'Portugal',  code: 'CM26-POR', percent: 25 },
  { flag: '🇩🇪', name: 'Allemagne', code: 'CM26-GER', percent: 25 },
  { flag: '🇮🇹', name: 'Italie',    code: 'CM26-ITA', percent: 25 },
  { flag: '🇧🇪', name: 'Belgique',  code: 'CM26-BEL', percent: 25 },
  { flag: '🇳🇱', name: 'Pays-Bas',  code: 'CM26-NED', percent: 25 },
  { flag: '🇺🇸', name: 'USA',       code: 'CM26-USA', percent: 25 },
  { flag: '🇲🇽', name: 'Mexique',   code: 'CM26-MEX', percent: 25 },
];

// Bannière promotionnelle « Coupe du Monde 2026 » — offre limitée, % par équipe
type WcTeam = { flag: string; name: string; code: string; percent: number };
function WorldCupOffer({ t }: { t: (k: string, v?: Record<string, string | number>) => string }) {
  const [team, setTeam] = useState<WcTeam | null>(null);
  const [copied, setCopied] = useState(false);

  function copyCode() {
    if (!team) return;
    navigator.clipboard.writeText(team.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="mb-9 fade-in">
      <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6"
        style={{ background: 'linear-gradient(135deg, #064e3b 0%, #0f766e 45%, #b45309 100%)', boxShadow: '0 14px 44px rgba(6,78,59,0.40)' }}>
        <div className="absolute -right-5 -top-7 text-[130px] opacity-[0.12] select-none pointer-events-none">⚽</div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold mb-3 tracking-wide"
          style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: '#fff', backdropFilter: 'blur(4px)' }}>
          {t('landing.wc.tag')}
        </span>

        <h2 className="text-2xl sm:text-[28px] font-extrabold text-white leading-tight mb-2">{t('landing.wc.title')}</h2>
        <p className="text-sm text-white/85 mb-4 max-w-md leading-relaxed">{t('landing.wc.sub')}</p>

        {!team ? (
          <>
            <p className="text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">{t('landing.wc.pick')}</p>
            <div className="flex flex-wrap gap-1.5">
              {WC_TEAMS.map(tm => (
                <button key={tm.name} onClick={() => setTeam(tm)}
                  className="px-2.5 py-1.5 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
                  style={{ backgroundColor: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)' }}>
                  <span className="text-base">{tm.flag}</span> {tm.name}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-white/60 mt-3">🔥 {t('landing.wc.urgency')}</p>
          </>
        ) : (
          <div className="rounded-2xl p-4 fade-in" style={{ backgroundColor: 'rgba(255,255,255,0.96)', color: '#0f172a' }}>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-2xl">{team.flag}</span>
              <p className="font-bold text-sm">{t('landing.wc.chosen', { team: team.name })}</p>
              <button onClick={() => setTeam(null)} className="ml-auto text-[11px] underline opacity-60">{t('landing.wc.change')}</button>
            </div>
            {/* Le % gagné grâce à l'équipe */}
            <div className="flex items-center gap-3 mb-3 rounded-xl p-3" style={{ background: 'linear-gradient(135deg, rgba(5,150,105,0.10), rgba(180,83,9,0.10))' }}>
              <span className="text-4xl font-extrabold leading-none" style={{ color: '#047857' }}>-{team.percent}%</span>
              <p className="text-xs leading-snug" style={{ color: '#334155' }}>{t('landing.wc.discountSub', { team: team.name })}</p>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#64748b' }}>{t('landing.wc.codeLabel')}</span>
              <span className="font-mono font-bold text-lg tracking-wider px-2.5 py-1 rounded-lg" style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#047857' }}>{team.code}</span>
              <button onClick={copyCode} className="p-1 rounded-lg transition-all hover:scale-110 active:scale-90" style={{ color: '#64748b' }}>
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] mb-3" style={{ color: '#64748b' }}>{t('landing.wc.howto')}</p>

            <Link href="/register"
              className="block w-full text-center py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: 'linear-gradient(135deg, #059669, #b45309)' }}>
              {t('landing.wc.cta', { team: team.name })}
            </Link>
            <p className="text-[11px] text-center mt-2.5" style={{ color: '#94a3b8' }}>🔥 {t('landing.wc.urgency')}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default function LandingPage() {
  const { t, lang, setLang } = useT();
  const statsRef    = useFadeIn();
  const featuresRef = useFadeIn();
  const pricingRef  = useFadeIn();
  const ctaRef      = useFadeIn();
  const promoRef    = useFadeIn();
  const [promos, setPromos] = useState<PublicPromo[]>([]);
  const [showLangPicker, setShowLangPicker] = useState(false);

  useEffect(() => {
    fetch('/api/promo/public').then(r => r.ok ? r.json() : []).then(setPromos).catch(() => {});
  }, []);

  const features = featureIcons.map(f => ({
    icon: f.icon,
    title: t(f.titleKey),
    desc: t(f.descKey),
  }));

  const plans = planDefs.map(p => ({
    name: t(p.nameKey),
    price: p.price,
    priceAnnual: p.priceAnnual,
    period: t(p.periodKey),
    periodAnnual: p.periodAnnualKey ? t(p.periodAnnualKey) + (p.periodAnnualSuffix || '') : undefined,
    desc: t(p.descKey),
    color: p.color,
    border: p.border,
    badge: p.badgeKey ? t(p.badgeKey) : undefined,
    badgeColor: p.badgeColor,
    badgeBg: p.badgeBg,
    cta: t(p.ctaKey),
    href: p.href,
    features: p.featureKeys.map(k => t(k)),
    excluded: p.excludedKeys.map(k => t(k)),
  }));

  return (
    <div className="min-h-screen flex flex-col relative" style={{ backgroundColor: 'var(--bg)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdApp }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdFaq }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdOrg }} />
      <FloatingEmojis />
      <LandingStyles />

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 py-4 sticky top-0 z-20"
        style={{
          backgroundColor: 'var(--bg)',
          borderBottom: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}>
        <LogoAnim size={36} withName nameSize="text-base" />
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowLangPicker(!showLangPicker)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <Globe className="w-3.5 h-3.5" />
              {LANGUAGES.find(l => l.code === lang)?.flag || '🌐'} {lang.toUpperCase()}
            </button>
            {showLangPicker && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowLangPicker(false)} />
                <div className="absolute right-0 top-full mt-1 z-40 rounded-xl p-2 grid grid-cols-2 gap-1 w-[280px] shadow-xl"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  {LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => { setLang(l.code); setShowLangPicker(false); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left hover:scale-[1.02]"
                      style={lang === l.code
                        ? { backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)', fontWeight: 600 }
                        : { backgroundColor: 'transparent' }}>
                      <span>{l.flag}</span> {l.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <Link href="/login"    className="btn-secondary !px-4 !py-2 text-sm">{t('landing.login')}</Link>
          <Link href="/register" className="btn-primary  !px-4 !py-2 text-sm">{t('landing.register')}</Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-5 pb-20 relative z-10">

        {/* ── Offre Coupe du Monde 2026 (tout en haut) ── */}
        <div className="pt-6">
          <WorldCupOffer t={t} />
        </div>

        {/* ── Hero ── */}
        <section className="text-center pt-2 pb-12">
          {/* Mascotte hero */}
          <div className="flex justify-center mb-6">
            <LogoAnim size={96} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-7"
            style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: 'rgb(16,185,129)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Sparkles className="w-3 h-3" /> {t('landing.badge')}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-5">
            {t('landing.hero.title1')} <span className="shimmer-text">{t('landing.hero.title2')}</span><br />
            {t('landing.hero.title3')}
          </h1>

          <p className="text-base leading-relaxed mb-2 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
            {t('landing.hero.sub')}
          </p>
          <p className="text-sm mb-10 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
            {t('landing.hero.sub2')}
          </p>

          <Link href="/register"
            className="btn-glow inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold transition-all hover:scale-[1.03] active:scale-95"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
            {t('landing.cta')}
          </Link>
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            {t('landing.cta.sub')}
          </p>
        </section>

        {/* ── Chiffres clés ── */}
        <div ref={statsRef}>
          <section className="grid grid-cols-3 gap-3 mb-14">
            {[
              { value: '< 3s',  labelKey: 'landing.stats.scan' },
              { value: '100%',  labelKey: 'landing.stats.recipes' },
              { value: '0€',    labelKey: 'landing.stats.price' },
            ].map((s, i) => (
              <div key={s.labelKey} className="card p-4 text-center"
                style={{ transitionDelay: `${i * 80}ms`, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
                <p className="text-2xl font-bold mb-1">{s.value}</p>
                <p className="text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>{t(s.labelKey)}</p>
              </div>
            ))}
          </section>
        </div>

        {/* ── Features ── */}
        <div ref={featuresRef}>
          <section className="mb-14">
            <h2 className="text-xl font-bold text-center mb-1.5">{t('landing.features.title')}</h2>
            <p className="text-sm text-center mb-6" style={{ color: 'var(--text-muted)' }}>
              {t('landing.features.sub')}
            </p>
            <div className="grid grid-cols-1 gap-2.5">
              {features.map((f, i) => (
                <div key={f.title} className="card p-4 flex items-start gap-4 hover:scale-[1.01] transition-transform"
                  style={{
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    transitionDelay: `${i * 60}ms`,
                  }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'var(--bg-inset)' }}>
                    <f.icon className="w-[1.1rem] h-[1.1rem]" style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-0.5">{f.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Social proof ── */}
        <section className="mb-14 text-center">
          <div className="flex items-center justify-center gap-1 mb-2">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
          </div>
          <p className="text-sm font-medium mb-1">{t('landing.social.rating')}</p>
          <div className="flex items-center justify-center gap-6 mt-3">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Users className="w-3.5 h-3.5" /> {t('landing.social.users')}
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <ChefHat className="w-3.5 h-3.5" /> {t('landing.social.recipes')}
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Zap className="w-3.5 h-3.5" /> {t('landing.social.scans')}
            </div>
          </div>
        </section>

        {/* ── Comparison table ── */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-center mb-1.5">{t('landing.compare.title')}</h2>
          <p className="text-sm text-center mb-6" style={{ color: 'var(--text-muted)' }}>{t('landing.compare.sub')}</p>

          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-xs" style={{ minWidth: 520, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="text-left py-2 px-2 font-medium" style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{t('landing.compare.features')}</th>
                  {['Jow', 'Marmiton', 'MealPal'].map(c => (
                    <th key={c} className="text-center py-2 px-1 font-normal" style={{ color: 'var(--text-muted)', fontSize: 11 }}>{c}</th>
                  ))}
                  <th className="text-center py-2 px-1 font-bold text-sm" style={{ color: 'var(--accent)', borderRadius: '12px 12px 0 0', backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '2px solid var(--accent)', borderBottom: 'none' }}>MonFrigo</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ['landing.compare.scan',     false, false, false, true],
                  ['landing.compare.barcode',  false, false, false, true],
                  ['landing.compare.aiRecipes','limité', false, false, true],
                  ['landing.compare.planning', true,  false, true,  true],
                  ['landing.compare.fridge',   false, false, false, true],
                  ['landing.compare.shopping', true,  false, 'basique', true],
                  ['landing.compare.aiChat',   false, false, false, true],
                  ['landing.compare.coach',    false, false, 'macros', true],
                  ['landing.compare.waste',    false, false, false, true],
                  ['landing.compare.voice',    false, false, false, true],
                  ['landing.compare.i18n',     '2-3', 'FR',  'EN',  true],
                  ['landing.compare.free',     false, true,  false, true],
                ] as const).map(([key, ...vals], ri) => (
                  <tr key={String(key)} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="py-2.5 px-2 font-medium text-xs">{t(String(key))}</td>
                    {vals.map((v, ci) => {
                      const isHero = ci === 3;
                      const cellStyle: React.CSSProperties = isHero
                        ? { backgroundColor: 'color-mix(in srgb, var(--accent) 4%, transparent)', borderLeft: '2px solid var(--accent)', borderRight: '2px solid var(--accent)', ...(ri === 11 ? { borderBottom: '2px solid var(--accent)', borderRadius: '0 0 12px 12px' } : {}) }
                        : {};
                      return (
                        <td key={ci} className="text-center py-2.5 px-1" style={cellStyle}>
                          {v === true ? (
                            isHero
                              ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white" style={{ backgroundColor: 'var(--accent)' }}><Check className="w-3.5 h-3.5" /></span>
                              : <Check className="w-3.5 h-3.5 inline" style={{ color: 'rgb(16,185,129)' }} />
                          ) : v === false ? (
                            <X className="w-3 h-3 inline opacity-30" />
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)' }}>{v}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Promo codes carousel ── */}
        {promos.length > 0 && (
          <div ref={promoRef}>
            <PromoCarousel promos={promos} t={t} />
          </div>
        )}

        {/* ── Pricing ── */}
        <div ref={pricingRef}>
          <section className="mb-14">
            <h2 className="text-xl font-bold text-center mb-1.5">{t('landing.pricing.title')}</h2>
            <p className="text-sm text-center mb-7" style={{ color: 'var(--text-muted)' }}>
              {t('landing.pricing.sub')}
            </p>

            <div className="space-y-3">
              {plans.map((plan, pi) => (
                <div key={plan.name} className="card p-5 hover:scale-[1.01] transition-transform"
                  style={{
                    backgroundColor: plan.color, borderColor: plan.border,
                    backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                    transitionDelay: `${pi * 80}ms`,
                  }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-base">{plan.name}</h3>
                        {plan.badge && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${plan.badgeColor}`}
                            style={{ backgroundColor: plan.badgeBg }}>
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{plan.desc}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <span className="text-2xl font-bold">{plan.price}</span>
                      <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>{plan.period}</span>
                      {plan.priceAnnual && (
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {t('plan.or')} <span className="font-semibold">{plan.priceAnnual}</span>
                          {' '}<span className="text-emerald-500 font-medium">{plan.periodAnnual}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-1.5 mb-4">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                    {plan.excluded.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs"
                        style={{ color: 'var(--text-muted)', opacity: 0.45 }}>
                        <X className="w-3 h-3 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href={plan.href}
                    className="block w-full text-center py-2.5 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95"
                    style={plan.badge
                      ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                      : { backgroundColor: 'var(--bg-inset)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>

            <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
              {t('landing.pricing.extra')}
            </p>
          </section>
        </div>

        {/* ── Final CTA ── */}
        <div ref={ctaRef}>
          <section className="text-center px-6 py-12 rounded-2xl"
            style={{
              backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            }}>
            <div className="text-5xl mb-4 animate-bounce" style={{ animationDuration: '2.5s' }}>🍽️</div>
            <h2 className="text-xl font-bold mb-2">{t('landing.final.title')}</h2>
            <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: 'var(--text-muted)' }}>
              {t('landing.final.sub')}
            </p>
            <Link href="/register"
              className="btn-glow inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.03] active:scale-95"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
              {t('landing.final.cta')}
            </Link>
          </section>
        </div>
      </main>

      <footer className="text-center text-xs py-8 space-y-4 relative z-10" style={{ color: 'var(--text-muted)' }}>
        {/* SEO internal links — kept in French for SEO */}
        <nav className="max-w-2xl mx-auto px-5">
          <p className="font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Découvrir aussi</p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
            {[
              { href: '/s/recette-avec-ce-que-j-ai', label: "Recette avec ce que j'ai" },
              { href: '/s/courses-moins-cheres', label: 'Courses moins chères' },
              { href: '/s/anti-gaspillage-alimentaire', label: 'Anti-gaspillage alimentaire' },
              { href: '/s/planning-repas-semaine', label: 'Planning repas semaine' },
              { href: '/s/recette-pas-cher', label: 'Recettes pas chères' },
              { href: '/s/que-manger-ce-soir', label: 'Que manger ce soir ?' },
              { href: '/s/scanner-frigo-ia', label: 'Scanner frigo IA' },
              { href: '/s/liste-courses-intelligente', label: 'Liste courses intelligente' },
              { href: '/s/recette-rapide-facile', label: 'Recettes rapides' },
              { href: '/s/cuisiner-les-restes', label: 'Cuisiner les restes' },
              { href: '/s/batch-cooking-meal-prep', label: 'Batch cooking' },
              { href: '/s/recette-vegetarienne', label: 'Recettes végétariennes' },
              { href: '/s/recette-vegan', label: 'Recettes vegan' },
              { href: '/s/recette-sans-gluten', label: 'Sans gluten' },
              { href: '/s/recette-halal', label: 'Recettes halal' },
              { href: '/s/economiser-alimentation', label: 'Économiser alimentation' },
              { href: '/s/nutriscore-recette', label: 'NutriScore recette' },
              { href: '/s/application-cuisine-gratuite', label: 'App cuisine gratuite' },
            ].map(l => (
              <Link key={l.href} href={l.href} className="hover:underline underline-offset-2 transition-opacity hover:opacity-80">
                {l.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="space-y-1">
          <p>Mon Frigo &copy; 2026</p>
          <p>
            Une application proposée par{' '}
            <a href="https://matable.pro" target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-80 transition-opacity">
              matable.pro
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
