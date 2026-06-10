'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Heart, Lock } from 'lucide-react';

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
}: RecipeCardProps) {
  const router = useRouter();

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
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Overlay cadenas */}
        <div className="absolute inset-0 flex items-center justify-end pr-4 gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
            <Lock className="w-3 h-3" />
            Premium
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/recipes/${id}`}
      className="card flex gap-3.5 items-center hover:shadow-sm transition-all fade-in group block overflow-hidden"
      style={{ padding: imageUrl ? '0' : undefined }}
    >
      {imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={name}
            className="w-20 h-20 object-cover shrink-0"
            style={{ borderRadius: '0.625rem 0 0 0.625rem' }}
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="flex-1 min-w-0 py-3 pr-3">
            <h3 className="font-medium text-sm truncate mb-1">{name}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={difficultyColors[difficulty] || 'badge-easy'}>{difficultyLabels[difficulty] || difficulty}</span>
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Clock className="w-3 h-3" /> {prepTime} min
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{cuisine}</span>
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
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{cuisine}</span>
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
