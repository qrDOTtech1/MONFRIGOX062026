'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Heart, Lock, AlertTriangle, Ban, Leaf } from 'lucide-react';

interface RecipeCardProps {
  id: string;
  name: string;
  difficulty: string;
  prepTime: number;
  cuisine: string;
  imageUrl?: string;
  matchPercent?: number;
  matchCount?: string;
  emoji?: string;
  isFavorite?: boolean;
  isLocked?: boolean;
  onToggleFavorite?: () => void;
  allergenWarnings?: string[];
  dietConflict?: boolean;
  dietLabel?: string;
  usesExpiring?: number;
  isRevisite?: boolean;
  isCommunity?: boolean;
  avgRating?: number;
  ratingCount?: number;
  cost?: number;
}

const difficultyColors: Record<string, string> = {
  FACILE: 'badge-easy',
  MOYEN: 'badge-medium',
  DIFFICILE: 'badge-hard',
};

const difficultyLabels: Record<string, string> = {
  FACILE: 'Facile',
  MOYEN: 'Moyen',
  DIFFICILE: 'Difficile',
};

function getMatchColor(pct: number) {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-orange-500';
}

function getMatchTextColor(pct: number) {
  if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-orange-600 dark:text-orange-400';
}

export default function RecipeCard({
  id, name, difficulty, prepTime, cuisine, imageUrl, matchPercent, matchCount,
  emoji, isFavorite, isLocked, onToggleFavorite,
  allergenWarnings, dietConflict, dietLabel, usesExpiring, isRevisite, isCommunity, avgRating, ratingCount, cost,
}: RecipeCardProps) {
  const router = useRouter();
  const hasAllergen = (allergenWarnings?.length ?? 0) > 0;

  // Badges allergène / régime (réutilisés dans les deux variantes)
  const dietaryBadges = (
    <>
      {typeof cost === 'number' && cost > 0 && (
        <span className="badge text-[10px] flex items-center gap-1" style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: 'rgb(16,185,129)' }} title="Coût total estimé de la recette">
          ≈ {cost < 10 ? cost.toFixed(1) : Math.round(cost)} €
        </span>
      )}
      {isCommunity && (
        <span className="badge text-[10px] flex items-center gap-1" style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: 'rgb(59,130,246)' }} title="Recette partagée par la communauté">
          👥 Communauté
        </span>
      )}
      {isRevisite && (
        <span className="badge text-[10px] flex items-center gap-1" style={{ backgroundColor: 'rgba(168,85,247,0.12)', color: 'rgb(168,85,247)' }} title="Recette revisitée par l'IA">
          ✨ Revisité
        </span>
      )}
      {hasAllergen && (
        <span className="badge text-[10px] flex items-center gap-1 text-red-600 dark:text-red-400" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }} title="Contient un de vos allergènes">
          <AlertTriangle className="w-2.5 h-2.5" /> Allergène
        </span>
      )}
      {dietConflict && (
        <span className="badge text-[10px] flex items-center gap-1" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)' }} title={`Non ${dietLabel}`}>
          <Ban className="w-2.5 h-2.5" /> Non {dietLabel}
        </span>
      )}
    </>
  );

  // Pastille anti-gaspi sur la vignette
  const expiringDot = (usesExpiring ?? 0) > 0 ? (
    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgb(34,197,94)', color: 'white' }} title="Utilise des aliments qui périment bientôt">
      <Leaf className="w-3 h-3" />
    </span>
  ) : null;

  if (isLocked) {
    return (
      <div
        className="card overflow-hidden relative cursor-pointer select-none"
        onClick={() => router.push('/profile')}
        style={{ padding: imageUrl ? '0' : undefined }}
      >
        {/* Contenu flouté */}
        <div className="blur-sm pointer-events-none opacity-60">
          {imageUrl ? (
            <div className="flex gap-3.5 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="w-20 h-20 object-cover shrink-0"
                style={{ borderRadius: '0.625rem 0 0 0.625rem' }} />
              <div className="flex-1 min-w-0 py-3 pr-3">
                <h3 className="font-medium text-sm truncate mb-1">{name}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={difficultyColors[difficulty] || 'badge-easy'}>{difficultyLabels[difficulty] || difficulty}</span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Clock className="w-3 h-3" /> {prepTime} min
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 flex gap-3.5 items-center">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl shrink-0"
                style={{ backgroundColor: 'var(--bg-inset)' }}>
                {emoji || '🍽️'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{name}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={difficultyColors[difficulty] || 'badge-easy'}>{difficultyLabels[difficulty] || difficulty}</span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Clock className="w-3 h-3" /> {prepTime} min
                  </span>
                  {avgRating != null && avgRating > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-amber-500">
                      ⭐ {avgRating.toFixed(1)}{ratingCount ? <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>({ratingCount})</span> : null}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Overlay cadenas */}
        <div className="absolute inset-0 flex items-center justify-end pr-4 gap-2">
          <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-center"
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.95), rgba(168,85,247,0.95))', color: 'white' }}>
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span className="text-xs font-bold">Premium</span>
            </div>
            <span className="text-[9px] opacity-90">dès 3,99€/mois</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/recipes/${id}`}
      className="card flex gap-3.5 items-center hover:shadow-sm transition-all fade-in group block overflow-hidden"
      style={{ padding: imageUrl ? '0' : undefined, ...(dietConflict ? { opacity: 0.75 } : {}) }}
    >
      {imageUrl ? (
        <>
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={name}
              className="w-20 h-20 object-cover"
              style={{ borderRadius: '0.625rem 0 0 0.625rem' }}
              loading="lazy"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            {expiringDot}
          </div>
          <div className="flex-1 min-w-0 py-3 pr-3">
            <h3 className="font-medium text-sm truncate mb-1">{name}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={difficultyColors[difficulty] || 'badge-easy'}>{difficultyLabels[difficulty] || difficulty}</span>
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Clock className="w-3 h-3" /> {prepTime} min
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{cuisine}</span>
              {dietaryBadges}
            </div>
            {matchPercent !== undefined && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{matchCount}</span>
                <div className="match-bar flex-1">
                  <div className={`match-fill ${getMatchColor(matchPercent)}`} style={{ width: `${matchPercent}%` }} />
                </div>
                <span className={`text-xs font-semibold ${getMatchTextColor(matchPercent)}`}>
                  {matchPercent}%
                </span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="p-4 flex gap-3.5 items-center w-full">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl shrink-0 relative"
            style={{ backgroundColor: 'var(--bg-inset)' }}>
            {emoji || '🍽️'}
            {expiringDot}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{name}</h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={difficultyColors[difficulty] || 'badge-easy'}>{difficultyLabels[difficulty] || difficulty}</span>
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Clock className="w-3 h-3" /> {prepTime} min
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{cuisine}</span>
              {dietaryBadges}
            </div>
            {matchPercent !== undefined && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{matchCount}</span>
                <div className="match-bar flex-1">
                  <div className={`match-fill ${getMatchColor(matchPercent)}`} style={{ width: `${matchPercent}%` }} />
                </div>
                <span className={`text-xs font-semibold ${getMatchTextColor(matchPercent)}`}>
                  {matchPercent}%
                </span>
              </div>
            )}
          </div>
          {onToggleFavorite && (
            <button
              onClick={e => { e.preventDefault(); onToggleFavorite(); }}
              className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-inset)]"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`}
                style={!isFavorite ? { color: 'var(--text-muted)' } : undefined} />
            </button>
          )}
        </div>
      )}
    </Link>
  );
}
