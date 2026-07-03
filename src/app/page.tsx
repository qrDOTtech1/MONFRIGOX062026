'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ScanLine, ChefHat, ShoppingCart, Leaf, Barcode, Sparkles, Check, Brain, X, Calendar, MessageSquare, Trophy, Share2, UtensilsCrossed, Volume2, Timer, Globe, Gift, ChevronLeft, ChevronRight, Copy, Star, Users, Clock, Zap } from 'lucide-react';
import LogoAnim from '@/components/LogoAnim';
import { useT, LANGUAGES } from '@/lib/i18n';
import { PROMO } from '@/config/promo';

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

      /* Fond lumineux qui suit le curseur / le doigt */
      .cursor-light {
        position: fixed; inset: 0; z-index: 1; pointer-events: none;
        transition: background 0.2s ease-out;
        background: radial-gradient(520px circle at 50% 12%, rgba(16,185,129,0.16), transparent 62%);
      }
      /* Ripple au clic / toucher */
      .click-ripple {
        position: fixed; width: 16px; height: 16px; margin: -8px 0 0 -8px;
        border-radius: 9999px;
        background: radial-gradient(circle, rgba(16,185,129,0.55), rgba(16,185,129,0.12) 60%, transparent 70%);
        pointer-events: none; transform: scale(0); z-index: 9999;
        animation: ripple 0.62s cubic-bezier(0.2,0.7,0.3,1) forwards;
      }
      @keyframes ripple { to { transform: scale(11); opacity: 0; } }

      /* ── Fond image plein écran animé (GPU: transform/opacity) ── */
      /* Wrapper fixe : couvre tout le viewport, gère l'apparition */
      .page-bg-wrap {
        position: fixed; inset: 0; z-index: 0; pointer-events: none;
        overflow: hidden;
        animation: hero-in 1.1s ease-out both;
      }
      /* Couche parallaxe : suit le curseur (transform pilotée en JS) */
      .page-bg-parallax {
        position: absolute; inset: 0;
        transition: transform 0.35s cubic-bezier(0.2, 0.7, 0.3, 1);
        will-change: transform;
      }
      /* Image : couvre tout, léger flottement + déplacement du fond */
      .page-bg {
        position: absolute; inset: -7%;
        background-image: url('/images/hero-bg.webp');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        transform: translateZ(0) scale(1.06);
        will-change: transform;
        animation: hero-drift 20s ease-in-out infinite;
      }
      /* Voile de lisibilité global — s'adapte au thème (clair/sombre) */
      .page-veil {
        position: absolute; inset: 0; pointer-events: none;
        background:
          linear-gradient(to bottom,
            color-mix(in srgb, var(--bg) 28%, transparent) 0%,
            color-mix(in srgb, var(--bg) 52%, transparent) 50%,
            color-mix(in srgb, var(--bg) 80%, transparent) 100%),
          radial-gradient(130% 60% at 50% 22%,
            color-mix(in srgb, var(--bg) 35%, transparent) 0%,
            transparent 70%);
      }
      /* Halos flous animés */
      .page-halo {
        position: absolute; border-radius: 9999px;
        filter: blur(52px); pointer-events: none;
        will-change: transform, opacity;
      }
      .page-halo-1 {
        width: 320px; height: 320px; top: -70px; left: -50px;
        background: rgba(16,185,129,0.26);
        animation: hero-halo 15s ease-in-out infinite;
      }
      .page-halo-2 {
        width: 360px; height: 360px; top: 30%; right: -70px;
        background: rgba(245,158,11,0.18);
        animation: hero-halo 19s ease-in-out infinite reverse;
      }
      .page-halo-3 {
        width: 280px; height: 280px; bottom: 6%; left: 40%;
        background: rgba(244,114,182,0.15);
        animation: hero-halo 23s ease-in-out infinite;
        animation-delay: -6s;
      }
      /* Particules lumineuses discrètes */
      .page-particles { position: absolute; inset: 0; pointer-events: none; }
      .page-particles span {
        position: absolute; width: 5px; height: 5px; border-radius: 9999px;
        background: rgba(255,255,255,0.85);
        box-shadow: 0 0 8px 2px rgba(255,255,255,0.55);
        opacity: 0; will-change: transform, opacity;
        animation: hero-particle 10s ease-in-out infinite;
      }
      .page-particles span:nth-child(1) { left: 14%; top: 30%; animation-delay: 0s;   }
      .page-particles span:nth-child(2) { left: 38%; top: 62%; animation-delay: 2.4s; }
      .page-particles span:nth-child(3) { left: 60%; top: 24%; animation-delay: 4.1s; }
      .page-particles span:nth-child(4) { left: 82%; top: 55%; animation-delay: 1.3s; }
      .page-particles span:nth-child(5) { left: 26%; top: 78%; animation-delay: 5.5s; }
      .page-particles span:nth-child(6) { left: 70%; top: 82%; animation-delay: 3.2s; }
      .page-particles span:nth-child(7) { left: 50%; top: 12%; animation-delay: 6.8s; }
      .page-particles span:nth-child(8) { left: 90%; top: 20%; animation-delay: 8.0s; }

      @keyframes hero-in {
        from { opacity: 0; transform: translate3d(0, 18px, 0); }
        to   { opacity: 1; transform: translate3d(0, 0, 0); }
      }
      /* Panoramique + zoom lent (Ken Burns), % relatif à la taille du fond */
      @keyframes hero-drift {
        0%   { transform: translate3d(0, 0, 0) scale(1.06); }
        25%  { transform: translate3d(-2%, -1.2%, 0) scale(1.10); }
        50%  { transform: translate3d(-1.2%, -2.4%, 0) scale(1.13); }
        75%  { transform: translate3d(1.6%, -1%, 0) scale(1.09); }
        100% { transform: translate3d(0, 0, 0) scale(1.06); }
      }
      @keyframes hero-halo {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1);        opacity: 0.45; }
        50%      { transform: translate3d(40px, -30px, 0) scale(1.28); opacity: 0.85; }
      }
      @keyframes hero-particle {
        0%   { transform: translate3d(0, 0, 0);     opacity: 0; }
        15%  { opacity: 0.85; }
        85%  { opacity: 0.5; }
        100% { transform: translate3d(0, -46px, 0); opacity: 0; }
      }

      /* ── Bannière promo Coupe du Monde : fond stade + animations ── */
      .promo-wc {
        position: relative;
        overflow: hidden;
        border-radius: 16px;
        isolation: isolate;
      }
      /* Image de fond du stade + respiration lente */
      .promo-wc-bg {
        position: absolute; inset: 0; z-index: 0;
        background-image: url('/images/promo-worldcup.webp');
        background-size: cover;
        background-position: center right;
        transform: scale(1.03);
        will-change: transform;
        animation: promo-breathe 16s ease-in-out infinite;
        transition: transform 0.6s ease;
      }
      /* Effet hover subtil (desktop uniquement, appareils avec vrai curseur) */
      @media (hover: hover) {
        .promo-wc:hover .promo-wc-bg { transform: scale(1.07); }
      }
      /* Overlay sombre — lisibilité du texte (plus dense à gauche) */
      .promo-wc-overlay {
        position: absolute; inset: 0; z-index: 1; pointer-events: none;
        background:
          linear-gradient(90deg, rgba(3,10,7,0.94) 0%, rgba(3,10,7,0.74) 44%, rgba(3,10,7,0.34) 100%),
          linear-gradient(0deg, rgba(3,10,7,0.55) 0%, rgba(3,10,7,0.12) 60%);
      }
      /* Glow des projecteurs (haut-droite) */
      .promo-wc-glow {
        position: absolute; z-index: 1; top: -35%; right: -6%;
        width: 46%; height: 130%; pointer-events: none;
        background: radial-gradient(circle at 60% 40%, rgba(255,214,140,0.30), transparent 62%);
        filter: blur(6px);
        animation: promo-glow 6.5s ease-in-out infinite;
      }
      /* Faisceau lumineux très discret qui traverse lentement */
      .promo-wc-beam {
        position: absolute; z-index: 1; top: -40%; left: 0;
        width: 38%; height: 180%; pointer-events: none;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
        transform: translateX(-60%) rotate(12deg);
        animation: promo-beam 12s ease-in-out infinite;
      }
      @keyframes promo-breathe { 0%,100% { transform: scale(1.03); } 50% { transform: scale(1.07); } }
      @keyframes promo-glow    { 0%,100% { opacity: 0.35; } 50% { opacity: 0.65; } }
      @keyframes promo-beam {
        0%   { transform: translateX(-60%) rotate(12deg); opacity: 0; }
        35%  { opacity: 0.7; }
        65%  { opacity: 0.45; }
        100% { transform: translateX(320%) rotate(12deg); opacity: 0; }
      }

      @media (prefers-reduced-motion: reduce) {
        .cursor-light, .click-ripple { display: none; }
        .page-bg-wrap, .page-bg, .page-halo, .page-particles span { animation: none !important; }
        .page-bg { transform: scale(1.02); }
        .page-bg-parallax { transition: none !important; transform: none !important; }
        .promo-wc-bg, .promo-wc-glow, .promo-wc-beam { animation: none !important; }
        .promo-wc-beam { display: none; }
        .promo-wc-bg { transform: scale(1.02); }
      }
    `}</style>
  );
}

/* ── Fond lumineux qui suit le curseur (sobre) + ripple au clic ──────── */
function CursorFX() {
  const lightRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    // Parallaxe : amplitude max du décalage de l'image (px)
    const PARALLAX = 34;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const parallaxEl = document.querySelector<HTMLElement>('.page-bg-parallax');

    // Déplace le halo vers (x, y) — souris sur desktop, doigt sur mobile
    const moveLight = (x: number, y: number) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (lightRef.current) {
          lightRef.current.style.background =
            `radial-gradient(520px circle at ${x}px ${y}px, rgba(16,185,129,0.16), transparent 62%)`;
        }
        // Fond qui suit le curseur (même direction, doux)
        if (parallaxEl && !reduceMotion) {
          const nx = (x / window.innerWidth  - 0.5) * 2;  // -1 → 1
          const ny = (y / window.innerHeight - 0.5) * 2;  // -1 → 1
          parallaxEl.style.transform =
            `translate3d(${(nx * PARALLAX).toFixed(1)}px, ${(ny * PARALLAX).toFixed(1)}px, 0)`;
        }
      });
    };
    // Ondulation à la position (x, y)
    const spawnRipple = (x: number, y: number) => {
      const r = document.createElement('span');
      r.className = 'click-ripple';
      r.style.left = `${x}px`;
      r.style.top = `${y}px`;
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 680);
    };

    const onMouseMove = (e: MouseEvent) => moveLight(e.clientX, e.clientY);
    const onClick = (e: MouseEvent) => spawnRipple(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      const tch = e.touches[0] || e.changedTouches[0];
      if (!tch) return;
      moveLight(tch.clientX, tch.clientY);
      spawnRipple(tch.clientX, tch.clientY);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('click', onClick);
    window.addEventListener('touchstart', onTouch, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
      window.removeEventListener('touchstart', onTouch);
      window.removeEventListener('touchmove', onTouch);
      cancelAnimationFrame(raf);
    };
  }, []);
  return <div ref={lightRef} className="cursor-light" aria-hidden />;
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
  const [current, setCurrent] = useState(0);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % promos.length), 5000);
  };

  useEffect(() => {
    if (promos.length <= 1) return;
    reset();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [promos.length]);

  function prev() { setCurrent(c => (c - 1 + promos.length) % promos.length); reset(); }
  function next() { setCurrent(c => (c + 1) % promos.length); reset(); }

  function copy(code: string) {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  if (!promos.length) return null;
  const p = promos[current];
  const remaining = p.maxUses !== null ? p.maxUses - p.usedCount : null;

  return (
    <div className="mt-5 rounded-2xl px-5 py-4" style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Gift className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-sm tracking-wider">{p.code}</span>
              <button onClick={() => copy(p.code)} className="transition-all hover:scale-110 active:scale-90" style={{ color: 'var(--text-muted)' }}>
                {copiedCode === p.code ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: 'var(--bg-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                {p.planGranted} · {p.durationMonths} {t('landing.promo.months')}
              </span>
              {remaining !== null && remaining <= 20 && (
                <span className="text-[10px]" style={{ color: 'rgb(239,68,68)' }}>· {remaining} {t('landing.promo.left')}</span>
              )}
            </div>
            {p.description && <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{p.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={p.firstSignupOnly ? '/register' : '/login'}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
            {p.firstSignupOnly ? t('landing.promo.signup') : t('landing.promo.use')}
          </Link>
          {promos.length > 1 && (
            <div className="flex gap-1">
              <button onClick={prev} className="p-1 rounded-lg transition-colors hover:opacity-70" style={{ color: 'var(--text-muted)' }}><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={next} className="p-1 rounded-lg transition-colors hover:opacity-70" style={{ color: 'var(--text-muted)' }}><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      </div>
      {promos.length > 1 && (
        <div className="flex gap-1 justify-center mt-3">
          {promos.map((_, i) => (
            <button key={i} onClick={() => { setCurrent(i); reset(); }}
              className="rounded-full transition-all"
              style={{ width: i === current ? 16 : 5, height: 5, backgroundColor: i === current ? 'var(--accent)' : 'var(--border)' }} />
          ))}
        </div>
      )}
    </div>
  );
}

// Les 48 équipes de la Coupe du Monde 2026. Réduction identique (-10 %),
// 1 code promo Stripe déterministe par équipe (code = CM26-<code FIFA>).
const WC_TEAMS = [
  { flag: '🇫🇷', name: 'France',          code: 'CM26-FRA', percent: 10 },
  { flag: '🇧🇷', name: 'Brésil',          code: 'CM26-BRA', percent: 10 },
  { flag: '🇦🇷', name: 'Argentine',       code: 'CM26-ARG', percent: 10 },
  { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', name: 'Angleterre',      code: 'CM26-ENG', percent: 10 },
  { flag: '🇪🇸', name: 'Espagne',         code: 'CM26-ESP', percent: 10 },
  { flag: '🇩🇪', name: 'Allemagne',       code: 'CM26-GER', percent: 10 },
  { flag: '🇵🇹', name: 'Portugal',        code: 'CM26-POR', percent: 10 },
  { flag: '🇳🇱', name: 'Pays-Bas',        code: 'CM26-NED', percent: 10 },
  { flag: '🇮🇹', name: 'Italie',          code: 'CM26-ITA', percent: 10 },
  { flag: '🇧🇪', name: 'Belgique',        code: 'CM26-BEL', percent: 10 },
  { flag: '🇭🇷', name: 'Croatie',         code: 'CM26-CRO', percent: 10 },
  { flag: '🇺🇾', name: 'Uruguay',         code: 'CM26-URU', percent: 10 },
  { flag: '🇨🇴', name: 'Colombie',        code: 'CM26-COL', percent: 10 },
  { flag: '🇲🇦', name: 'Maroc',           code: 'CM26-MAR', percent: 10 },
  { flag: '🇸🇳', name: 'Sénégal',         code: 'CM26-SEN', percent: 10 },
  { flag: '🇯🇵', name: 'Japon',           code: 'CM26-JPN', percent: 10 },
  { flag: '🇰🇷', name: 'Corée du Sud',    code: 'CM26-KOR', percent: 10 },
  { flag: '🇺🇸', name: 'USA',             code: 'CM26-USA', percent: 10 },
  { flag: '🇲🇽', name: 'Mexique',         code: 'CM26-MEX', percent: 10 },
  { flag: '🇨🇦', name: 'Canada',          code: 'CM26-CAN', percent: 10 },
  { flag: '🇨🇭', name: 'Suisse',          code: 'CM26-SUI', percent: 10 },
  { flag: '🇩🇰', name: 'Danemark',        code: 'CM26-DEN', percent: 10 },
  { flag: '🇷🇸', name: 'Serbie',          code: 'CM26-SRB', percent: 10 },
  { flag: '🇵🇱', name: 'Pologne',         code: 'CM26-POL', percent: 10 },
  { flag: '🇦🇹', name: 'Autriche',        code: 'CM26-AUT', percent: 10 },
  { flag: '🇹🇷', name: 'Turquie',         code: 'CM26-TUR', percent: 10 },
  { flag: '🇺🇦', name: 'Ukraine',         code: 'CM26-UKR', percent: 10 },
  { flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', name: 'Écosse',         code: 'CM26-SCO', percent: 10 },
  { flag: '🇳🇴', name: 'Norvège',         code: 'CM26-NOR', percent: 10 },
  { flag: '🇸🇪', name: 'Suède',           code: 'CM26-SWE', percent: 10 },
  { flag: '🇪🇨', name: 'Équateur',        code: 'CM26-ECU', percent: 10 },
  { flag: '🇵🇪', name: 'Pérou',           code: 'CM26-PER', percent: 10 },
  { flag: '🇨🇱', name: 'Chili',           code: 'CM26-CHI', percent: 10 },
  { flag: '🇵🇾', name: 'Paraguay',        code: 'CM26-PAR', percent: 10 },
  { flag: '🇳🇬', name: 'Nigeria',         code: 'CM26-NGA', percent: 10 },
  { flag: '🇪🇬', name: 'Égypte',          code: 'CM26-EGY', percent: 10 },
  { flag: '🇩🇿', name: 'Algérie',         code: 'CM26-ALG', percent: 10 },
  { flag: '🇨🇲', name: 'Cameroun',        code: 'CM26-CMR', percent: 10 },
  { flag: '🇬🇭', name: 'Ghana',           code: 'CM26-GHA', percent: 10 },
  { flag: '🇨🇮', name: 'Côte d\'Ivoire',  code: 'CM26-CIV', percent: 10 },
  { flag: '🇹🇳', name: 'Tunisie',         code: 'CM26-TUN', percent: 10 },
  { flag: '🇮🇷', name: 'Iran',            code: 'CM26-IRN', percent: 10 },
  { flag: '🇦🇺', name: 'Australie',       code: 'CM26-AUS', percent: 10 },
  { flag: '🇸🇦', name: 'Arabie saoudite', code: 'CM26-KSA', percent: 10 },
  { flag: '🇶🇦', name: 'Qatar',           code: 'CM26-QAT', percent: 10 },
  { flag: '🇨🇷', name: 'Costa Rica',      code: 'CM26-CRC', percent: 10 },
  { flag: '🇵🇦', name: 'Panama',          code: 'CM26-PAN', percent: 10 },
  { flag: '🇳🇿', name: 'Nouvelle-Zélande', code: 'CM26-NZL', percent: 10 },
];

// ── Bannière promo SIMPLE (texte + code + bouton) ──
// Utilisée quand la config promo est en variant: 'simple'.
// Reprend le même style que la bannière Coupe du Monde pour rester cohérent.
function SimplePromo() {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    if (!PROMO.code) return;
    navigator.clipboard.writeText(PROMO.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mb-6 fade-in">
      <div className="relative overflow-hidden rounded-2xl p-4"
        style={{
          background: 'linear-gradient(135deg, #052e1a 0%, #0b6b3a 52%, #b45309 100%)',
          boxShadow: '0 8px 28px rgba(6,78,59,0.32)',
        }}>
        <div className="absolute -right-3 -top-4 text-[86px] opacity-[0.16] select-none pointer-events-none leading-none">🎁</div>

        <div className="relative">
          <h3 className="text-lg font-extrabold text-white leading-tight mb-1">{PROMO.title}</h3>
          <p className="text-xs text-white/80 mb-3 max-w-md leading-relaxed">{PROMO.subtitle}</p>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Code promo (affiché seulement s'il existe) */}
            {PROMO.code && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.22)' }}>
                <span className="font-mono font-bold text-sm tracking-wider text-white">{PROMO.code}</span>
                <button onClick={copyCode} className="transition-all hover:scale-110 active:scale-90 text-white/80">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </span>
            )}
            {/* Bouton d'action */}
            <Link href={PROMO.ctaHref}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:scale-[1.03] active:scale-95"
              style={{ background: 'linear-gradient(135deg, #059669, #b45309)' }}>
              {PROMO.ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sélecteur de bannière : lit la config et affiche la bonne promo ──
// enabled=false → rien | 'worldcup' → Coupe du Monde | 'simple' → bannière simple
function PromoBanner({ t }: { t: (k: string, v?: Record<string, string | number>) => string }) {
  if (!PROMO.enabled) return null;
  if (PROMO.variant === 'worldcup') return <WorldCupOffer t={t} />;
  return <SimplePromo />;
}

// Bannière promotionnelle « Coupe du Monde 2026 » — offre limitée, % par équipe
type WcTeam = { flag: string; name: string; code: string; percent: number };
function WorldCupOffer({ t }: { t: (k: string, v?: Record<string, string | number>) => string }) {
  const [team, setTeam] = useState<WcTeam | null>(null);
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState('');

  function copyCode() {
    if (!team) return;
    navigator.clipboard.writeText(team.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mb-6 fade-in">
      <div className="promo-wc p-4" style={{ boxShadow: '0 8px 28px rgba(3,10,7,0.45)' }}>
        {/* Fond image stade + animations premium (couches décoratives) */}
        <div className="promo-wc-bg" aria-hidden />        {/* image de fond + respiration */}
        <div className="promo-wc-overlay" aria-hidden />   {/* overlay sombre pour lisibilité */}
        <div className="promo-wc-glow" aria-hidden />      {/* glow des projecteurs */}
        <div className="promo-wc-beam" aria-hidden />      {/* faisceau lumineux discret */}

        {/* Contenu (inchangé) */}
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold mb-2 tracking-wide"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: '#fff', backdropFilter: 'blur(4px)' }}>
            🏆 {t('landing.wc.tag')}
          </span>

          <h3 className="text-lg font-extrabold text-white leading-tight mb-1">{t('landing.wc.title')}</h3>
          <p className="text-xs text-white/80 mb-3 max-w-md leading-relaxed">{t('landing.wc.sub')}</p>

          {!team ? (
            <>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`⚽ ${t('landing.wc.search')} · ${WC_TEAMS.length} ${t('landing.wc.pick')}`}
                className="w-full mb-2 px-3 py-1.5 rounded-lg text-xs outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.16)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)' }}
              />
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                {WC_TEAMS.filter(tm => tm.name.toLowerCase().includes(query.toLowerCase())).map(tm => (
                  <button key={tm.code} onClick={() => { setTeam(tm); setQuery(''); }}
                    className="px-2 py-1 rounded-lg text-xs font-medium transition-all hover:scale-105 active:scale-95 flex items-center gap-1"
                    style={{ backgroundColor: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)' }}>
                    <span className="text-sm">{tm.flag}</span> {tm.name}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-white/60 mt-2">🔥 {t('landing.wc.urgency')}</p>
            </>
          ) : (
            <div className="rounded-xl p-3 fade-in" style={{ backgroundColor: 'rgba(255,255,255,0.96)', color: '#0f172a' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{team.flag}</span>
                <p className="font-bold text-xs">{t('landing.wc.chosen', { team: team.name })}</p>
                <button onClick={() => setTeam(null)} className="ml-auto text-[10px] underline opacity-60">{t('landing.wc.change')}</button>
              </div>
              <div className="flex items-center gap-3 mb-2.5 rounded-lg p-2.5" style={{ background: 'linear-gradient(135deg, rgba(5,150,105,0.10), rgba(180,83,9,0.10))' }}>
                <span className="text-3xl font-extrabold leading-none" style={{ color: '#047857' }}>-{team.percent}%</span>
                <p className="text-[11px] leading-snug" style={{ color: '#334155' }}>{t('landing.wc.discountSub', { team: team.name })}</p>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: '#64748b' }}>{t('landing.wc.codeLabel')}</span>
                <span className="font-mono font-bold text-base tracking-wider px-2 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#047857' }}>{team.code}</span>
                <button onClick={copyCode} className="p-1 rounded-lg transition-all hover:scale-110 active:scale-90" style={{ color: '#64748b' }}>
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] mb-2.5" style={{ color: '#64748b' }}>{t('landing.wc.howto')}</p>

              <Link href="/register"
                onClick={() => { try { localStorage.setItem('wc_promo', team.code); } catch { /* ignore */ } }}
                className="block w-full text-center py-2 rounded-lg text-xs font-bold text-white transition-all hover:scale-[1.02] active:scale-95"
                style={{ background: 'linear-gradient(135deg, #059669, #b45309)' }}>
                {t('landing.wc.cta', { team: team.name })}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { t, lang, setLang } = useT();
  const statsRef    = useFadeIn();
  const featuresRef = useFadeIn();
  const pricingRef  = useFadeIn();
  const ctaRef      = useFadeIn();
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
      <LandingStyles />
      <CursorFX />

      {/* ── Fond image animé plein écran (remplace l'ancien fond) ── */}
      <div className="page-bg-wrap" aria-hidden>
        <div className="page-bg-parallax">
          <div className="page-bg" />
        </div>
        <div className="page-veil" />
        <div className="page-halo page-halo-1" />
        <div className="page-halo page-halo-2" />
        <div className="page-halo page-halo-3" />
        <div className="page-particles">
          <span /><span /><span /><span /><span /><span /><span /><span />
        </div>
      </div>

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

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 pb-10 relative z-10">

        {/* ── Hero ── */}
        <section className="text-center pt-20 md:pt-28 pb-24">
          {/* Contenu (le fond animé est global, derrière toute la page) */}
          <div className="relative z-10">
            {/* Logo hero */}
            <div className="flex justify-center mb-9">
              <LogoAnim size={108} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium mb-8"
              style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: 'rgb(16,185,129)' }} /> {t('landing.badge')}
            </div>

            <h1 className="text-5xl md:text-7xl font-semibold leading-[1.04] tracking-[-0.035em] mb-7">
              {t('landing.hero.title1')} <span className="shimmer-text">{t('landing.hero.title2')}</span><br />
              {t('landing.hero.title3')}
            </h1>

            <p className="text-lg md:text-xl leading-relaxed mb-11 max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              {t('landing.hero.sub')}
            </p>

            <Link href="/register"
              className="inline-flex items-center gap-2 px-9 py-4 rounded-full text-base font-semibold transition-all hover:scale-[1.03] active:scale-95"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
              {t('landing.cta')}
            </Link>
            <p className="text-[13px] mt-4" style={{ color: 'var(--text-muted)' }}>
              {t('landing.cta.sub')}
            </p>
          </div>
        </section>

        {/* ── Chiffres clés (ligne épurée, sans cadres) ── */}
        <div ref={statsRef}>
          <section className="flex items-stretch justify-center mb-28 max-w-md mx-auto">
            {[
              { value: '< 3s',  labelKey: 'landing.stats.scan' },
              { value: '100%',  labelKey: 'landing.stats.recipes' },
              { value: '0€',    labelKey: 'landing.stats.price' },
            ].map((s, i) => (
              <div key={s.labelKey} className="flex-1 text-center px-3"
                style={{ borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                <p className="text-3xl md:text-4xl font-semibold mb-1.5 tracking-tight">{s.value}</p>
                <p className="text-xs leading-tight" style={{ color: 'var(--text-muted)' }}>{t(s.labelKey)}</p>
              </div>
            ))}
          </section>
        </div>

        {/* ── Features ── */}
        <div ref={featuresRef}>
          <section className="mb-28">
            <h2 className="text-3xl md:text-4xl font-semibold text-center tracking-tight mb-3">{t('landing.features.title')}</h2>
            <p className="text-base text-center mb-10 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
              {t('landing.features.sub')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((f, i) => (
                <div key={f.title} className="rounded-2xl p-5 flex items-start gap-4 transition-all hover:scale-[1.01]"
                  style={{
                    backgroundColor: 'var(--bg-raised)',
                    border: '1px solid var(--border-subtle)',
                    transitionDelay: `${i * 50}ms`,
                  }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'rgba(16,185,129,0.08)' }}>
                    <f.icon className="w-5 h-5" style={{ color: 'rgb(16,185,129)' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[15px] mb-1">{f.title}</h3>
                    <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Social proof ── */}
        <section className="mb-28 text-center">
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
        <section className="mb-28">
          <h2 className="text-3xl md:text-4xl font-semibold text-center tracking-tight mb-3">{t('landing.compare.title')}</h2>
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

        {/* ── Pricing ── */}
        <div ref={pricingRef}>
          <section className="mb-28">
            <h2 className="text-3xl md:text-4xl font-semibold text-center tracking-tight mb-3">{t('landing.pricing.title')}</h2>
            <p className="text-sm text-center mb-6" style={{ color: 'var(--text-muted)' }}>
              {t('landing.pricing.sub')}
            </p>

            {/* ── Bannière promo (gérée depuis src/config/promo.ts) ── */}
            <PromoBanner t={t} />

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

            {promos.length > 0 && <PromoCarousel promos={promos} t={t} />}

            <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
              {t('landing.pricing.extra')}
            </p>
          </section>
        </div>

        {/* ── Final CTA ── */}
        <div ref={ctaRef}>
          <section className="text-center px-6 py-20">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">{t('landing.final.title')}</h2>
            <p className="text-base md:text-lg mb-9 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
              {t('landing.final.sub')}
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-2 px-9 py-4 rounded-full text-base font-semibold transition-all hover:scale-[1.03] active:scale-95"
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
