'use client';

import Link from 'next/link';
import { Clock, Heart } from 'lucide-react';

interface RecipeCardProps {
  id: string;
  name: string;
  difficulty: string;
  prepTime: number;
  cuisine: string;
  matchPercent?: number;
  matchCount?: string;
  emoji?: string;
  isFavorite?: boolean;
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
  if (pct >= 80) return 'bg-fresh-500';
  if (pct >= 50) return 'bg-yellow-500';
  return 'bg-orange-500';
}

export default function RecipeCard({
  id, name, difficulty, prepTime, cuisine, matchPercent, matchCount, emoji, isFavorite, onToggleFavorite,
}: RecipeCardProps) {
  return (
    <Link href={`/recipes/${id}`} className="glass-card p-4 flex gap-4 items-center hover:border-fresh-500/30 transition-all fade-in group">
      <div className="w-14 h-14 bg-dark-600 rounded-xl flex items-center justify-center text-2xl shrink-0">
        {emoji || '🍽️'}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm truncate group-hover:text-fresh-400 transition-colors">{name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className={difficultyColors[difficulty] || 'badge-easy'}>{difficultyLabels[difficulty] || difficulty}</span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" /> {prepTime} min
          </span>
          <span className="text-xs text-gray-500">{cuisine}</span>
        </div>
        {matchPercent !== undefined && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] text-gray-500">{matchCount}</span>
            <div className="match-bar flex-1">
              <div className={`match-fill ${getMatchColor(matchPercent)}`} style={{ width: `${matchPercent}%` }} />
            </div>
            <span className={`text-xs font-bold ${matchPercent >= 80 ? 'text-fresh-400' : matchPercent >= 50 ? 'text-yellow-400' : 'text-orange-400'}`}>
              {matchPercent}%
            </span>
          </div>
        )}
      </div>

      {onToggleFavorite && (
        <button
          onClick={e => { e.preventDefault(); onToggleFavorite(); }}
          className="p-2 hover:bg-dark-600 rounded-xl transition-colors"
        >
          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
        </button>
      )}
    </Link>
  );
}
