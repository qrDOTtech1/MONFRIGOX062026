'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Mascot, { MascotVariant } from '@/components/Mascot';
import { useMealTypes } from '@/lib/useMealTypes';
import { useRecentPages } from '@/lib/useRecentPages';
import {
  Flame, Beef, Leaf, Zap, DollarSign, Trophy, BarChart2, Recycle,
  Plus, ChevronRight, ShoppingCart, ScanLine, Refrigerator,
  Sparkles, Clock, AlertTriangle, Star,
} from 'lucide-react';

/* ── Types ── */
interface DashData {
  user: { name: string; plan: string; role: string };
  greeting: string;
  mascotVariant: string;
  mascotMessage: string;
  todayPlans: Array<{
    id: string; mealType: 'BREAKFAST'|'SNACK'|'LUNCH'|'DINNER';
    recipe: { id: string; name: string; prepTime: number; imageUrl: string; calories?: number|null; protein?: number|null; ingredients: Array<{ ingredient: { emoji: string; name: string } }> };
  }>;
  streak: number;
  expiringCount: number;
  expiringItems: Array<{ name: string; emoji: string; expiresAt: string }>;
  radarScores: Record<string, number>;
  weekStats: { kcalPerDay: number; kgSaved: number; spent: number; recipesCooked: number; daysPlanned: number };
  badges: Array<{ id: string; label: string; desc: string }>;
}

// MEALS is now dynamic — see useMealTypes() inside the component

const RADAR_AXES = [
  { key: 'calories',    label: 'Calories',    icon: '🔥', color: '#f97316' },
  { key: 'proteines',   label: 'Protéines',   icon: '💪', color: '#818cf8' },
  { key: 'diversite',   label: 'Diversité',   icon: '🥦', color: '#22c55e' },
  { key: 'antiGaspi',   label: 'Anti-gaspi',  icon: '♻️', color: '#10b981' },
  { key: 'saisonnalite',label: 'Saisonnalité',icon: '🌿', color: '#84cc16' },
  { key: 'rapidite',    label: 'Rapidité',    icon: '⚡', color: '#eab308' },
  { key: 'budget',      label: 'Budget',      icon: '💶', color: '#06b6d4' },
  { key: 'regularite',  label: 'Régularité',  icon: '🏆', color: '#a855f7' },
];

/* ── Octagon SVG ── */
function OctagonRadar({ scores }: { scores: Record<string, number> }) {
  const cx = 130; const cy = 130; const maxR = 100;
  const n = RADAR_AXES.length;

  function polar(idx: number, r: number) {
    const angle = (idx / n) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  const gridLevels = [2, 4, 6, 8, 10];
  const dataPoints = RADAR_AXES.map((a, i) => polar(i, (scores[a.key] || 0) / 10 * maxR));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';

  return (
    <svg viewBox="0 0 260 260" className="w-full max-w-[280px] mx-auto">
      {/* Grid */}
      {gridLevels.map(level => {
        const pts = RADAR_AXES.map((_, i) => polar(i, level / 10 * maxR));
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';
        return <path key={level} d={path} fill="none" stroke="var(--border)" strokeWidth={level === 10 ? 1 : 0.5} opacity={0.4} />;
      })}

      {/* Axis lines */}
      {RADAR_AXES.map((_, i) => {
        const outer = polar(i, maxR);
        return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="var(--border)" strokeWidth={0.5} opacity={0.4} />;
      })}

      {/* Data polygon */}
      <path d={dataPath} fill="var(--accent)" fillOpacity={0.15} stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="var(--accent)" />
      ))}

      {/* Axis labels */}
      {RADAR_AXES.map((axis, i) => {
        const labelPos = polar(i, maxR + 18);
        return (
          <text key={axis.key} x={labelPos.x} y={labelPos.y + 4}
            textAnchor="middle" fontSize={9} fill="var(--text-muted)" fontWeight="500">
            {axis.icon}
          </text>
        );
      })}
    </svg>
  );
}

/* ── Background gradient by time ── */
function getTimeGradient() {
  const h = new Date().getHours();
  if (h >= 5 && h < 10)  return 'linear-gradient(160deg, rgba(251,146,60,0.12) 0%, rgba(234,179,8,0.08) 50%, transparent 100%)';
  if (h >= 10 && h < 17) return 'linear-gradient(160deg, rgba(56,189,248,0.1) 0%, rgba(16,185,129,0.06) 50%, transparent 100%)';
  if (h >= 17 && h < 21) return 'linear-gradient(160deg, rgba(168,85,247,0.1) 0%, rgba(239,68,68,0.07) 50%, transparent 100%)';
  return 'linear-gradient(160deg, rgba(30,27,75,0.15) 0%, rgba(88,28,135,0.08) 50%, transparent 100%)';
}

/* ═══════════════════════════════════════════════════════ */
export default function HomePage() {
  const router = useRouter();
  const MEALS = useMealTypes();
  const { shortcuts, recent } = useRecentPages();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Mascot variant="sleep" size="lg" animate="pulse" message="Chargement…" />
        </div>
      </AppShell>
    );
  }

  if (!data) return <AppShell><div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Erreur de chargement</div></AppShell>;

  const { greeting, user, mascotVariant, mascotMessage, todayPlans, streak, expiringCount,
    expiringItems, radarScores, weekStats, badges } = data;
  const firstName = user.name.split(' ')[0] || 'toi';
  const showPlan = (level: 'PREMIUM'|'VIP') => {
    if (user.role === 'ADMIN') return false;
    if (level === 'PREMIUM') return !['PREMIUM','VIP'].includes(user.plan);
    return user.plan !== 'VIP';
  };

  return (
    <AppShell>
      <div className="pb-28" style={{ background: getTimeGradient(), minHeight: '100vh' }}>
        <div className="px-4 pt-4 max-w-lg mx-auto space-y-4">

          {/* ── Header mascotte ── */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <h1 className="text-xl font-bold">{greeting}, {firstName} 👋</h1>
              {expiringCount > 0 && (
                <button onClick={() => router.push('/fridge')}
                  className="flex items-center gap-1.5 mt-1.5 text-xs font-medium px-3 py-1 rounded-full"
                  style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: 'rgb(245,158,11)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <AlertTriangle className="w-3 h-3" />
                  {expiringCount} ingrédient{expiringCount > 1 ? 's' : ''} à utiliser vite !
                </button>
              )}
            </div>
            <Mascot
              variant={mascotVariant as MascotVariant}
              message={mascotMessage}
              size="lg"
              animate="float"
            />
          </div>

          {/* ── Streak banner ── */}
          {streak > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: 'linear-gradient(135deg, rgba(251,146,60,0.15), rgba(234,179,8,0.1))', border: '1px solid rgba(251,146,60,0.2)' }}>
              <span className="text-2xl">🔥</span>
              <div>
                <p className="text-sm font-bold">{streak} jour{streak > 1 ? 's' : ''} de streak !</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Continue comme ça pour débloquer des badges</p>
              </div>
            </div>
          )}

          {/* ── Repas du jour ── */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
              <h2 className="text-sm font-bold">Repas du jour</h2>
              <button onClick={() => router.push('/shopping')}
                className="text-[10px] font-medium px-2.5 py-1 rounded-full"
                style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--accent)' }}>
                Planning complet →
              </button>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {MEALS.map(meal => {
                const plan = todayPlans.find(p => p.mealType === meal.type);
                return (
                  <div key={meal.type} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-base w-6">{meal.emoji}</span>
                    <span className="text-[11px] w-14 shrink-0" style={{ color: 'var(--text-muted)' }}>{meal.label}</span>
                    {plan ? (
                      <button onClick={() => router.push('/shopping')}
                        className="flex-1 flex items-center gap-2 min-w-0">
                        {plan.recipe.imageUrl
                          ? <img src={plan.recipe.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          : <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ backgroundColor: 'var(--bg-inset)' }}>{plan.recipe.ingredients[0]?.ingredient.emoji || '🍽️'}</div>
                        }
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{plan.recipe.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}><Clock className="w-2.5 h-2.5 inline mr-0.5" />{plan.recipe.prepTime}min</span>
                            {plan.recipe.calories && <span className="text-[10px] text-orange-400"><Flame className="w-2.5 h-2.5 inline mr-0.5" />{plan.recipe.calories} kcal</span>}
                            {plan.recipe.protein && <span className="text-[10px]" style={{ color: '#818cf8' }}><Beef className="w-2.5 h-2.5 inline mr-0.5" />{Math.round(plan.recipe.protein)}g</span>}
                          </div>
                        </div>
                      </button>
                    ) : (
                      <button onClick={() => router.push('/shopping')}
                        className="flex-1 flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 transition-colors"
                        style={{ border: '1.5px dashed var(--border)', color: 'var(--text-muted)' }}>
                        <Plus className="w-3 h-3" /> Ajouter
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Octogone ── */}
          <div className="card px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold">Mon octogone</h2>
              <span className="text-[10px] px-2.5 py-1 rounded-full font-medium"
                style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)' }}>
                Semaine en cours
              </span>
            </div>
            <OctagonRadar scores={radarScores} />
            {/* Légende */}
            <div className="grid grid-cols-4 gap-1.5 mt-3">
              {RADAR_AXES.map(axis => (
                <div key={axis.key} className="flex flex-col items-center gap-0.5">
                  <span className="text-base leading-none">{axis.icon}</span>
                  <span className="text-[8px] text-center leading-tight" style={{ color: 'var(--text-muted)' }}>{axis.label}</span>
                  <span className="text-[9px] font-bold" style={{ color: 'var(--accent)' }}>{radarScores[axis.key] || 0}/10</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Stats 4 tuiles ── */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { icon: '🔥', label: 'Kcal moy/jour', value: weekStats.kcalPerDay > 0 ? `${weekStats.kcalPerDay}` : '—', unit: 'kcal', color: '#f97316' },
              { icon: '♻️', label: 'Anti-gaspi mois', value: `${weekStats.kgSaved}`, unit: 'kg éco.', color: '#10b981' },
              { icon: '💶', label: 'Dépense semaine', value: `${weekStats.spent}`, unit: '€ est.', color: '#06b6d4' },
              { icon: '👨‍🍳', label: 'Recettes cuisinées', value: `${weekStats.recipesCooked}`, unit: 'ce mois', color: '#a855f7' },
            ].map(stat => (
              <div key={stat.label} className="card px-4 py-3.5 flex flex-col gap-1">
                <span className="text-xl leading-none">{stat.icon}</span>
                <div>
                  <p className="text-lg font-bold leading-none" style={{ color: stat.color }}>
                    {stat.value}<span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>{stat.unit}</span>
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Accès rapides ── */}
          <div className="card px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold">Accès rapides</h2>
              {recent.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)' }}>
                  ⚡ {recent.length} récent{recent.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {shortcuts.map((page, idx) => {
                const isRecent = idx < recent.length;
                return (
                  <button key={page.href} onClick={() => router.push(page.href)}
                    className="flex flex-col items-center gap-2 py-3.5 px-2 rounded-2xl transition-all active:scale-95 relative"
                    style={{
                      backgroundColor: isRecent ? `${page.color}10` : 'var(--bg-inset)',
                      border: isRecent ? `1.5px solid ${page.color}30` : '1px solid var(--border-subtle)',
                    }}>
                    {isRecent && (
                      <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: page.color }} />
                    )}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${page.color}18` }}>
                      {page.icon}
                    </div>
                    <span className="text-[10px] font-medium text-center leading-tight"
                      style={{ color: isRecent ? page.color : 'var(--text-secondary)' }}>
                      {page.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Ingrédients qui périment ── */}
          {expiringItems.length > 0 && (
            <div className="card px-4 py-3.5"
              style={{ border: '1px solid rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.04)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-bold">À utiliser vite</h2>
                </div>
                <button onClick={() => router.push('/fridge?mode=vide-frigo')}
                  className="text-[10px] font-medium" style={{ color: 'var(--accent)' }}>
                  Recettes →
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {expiringItems.map(item => (
                  <span key={item.name} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: 'rgb(245,158,11)' }}>
                    {item.emoji} {item.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Streak & badges ── */}
          <div className="card px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold">Badges & Streak</h2>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{ backgroundColor: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)' }}>
                <span className="text-sm">🔥</span>
                <span className="text-xs font-bold text-orange-400">{streak}j</span>
              </div>
            </div>

            {badges.length > 0 ? (
              <div className="space-y-2">
                {badges.map(badge => (
                  <div key={badge.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-inset)' }}>
                    <span className="text-xl shrink-0">{badge.label.split(' ')[0]}</span>
                    <div>
                      <p className="text-xs font-semibold">{badge.label.slice(badge.label.indexOf(' ') + 1)}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{badge.desc}</p>
                    </div>
                    <Star className="w-3.5 h-3.5 ml-auto shrink-0 fill-amber-400 text-amber-400" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 py-2">
                <Mascot variant="wink" size="sm" animate="none" />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Planifie tes repas cette semaine pour débloquer tes premiers badges !
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </AppShell>
  );
}
