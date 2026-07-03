// Skeleton de chargement réutilisable — donne une impression de rapidité
// (blocs gris qui scintillent) au lieu d'un écran de chargement vide.

/** Un bloc gris scintillant. */
export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden />;
}

/** Skeleton générique d'une page (en-tête + liste de cartes). */
export default function PageSkeleton() {
  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 !rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      {/* Rangée de puces */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-7" style={{ width: `${60 + (i % 3) * 30}px` }} />
        ))}
      </div>
      {/* Cartes */}
      <div className="space-y-3 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 !rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
