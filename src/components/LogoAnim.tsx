'use client';

/**
 * LogoAnim — mascotte Mon Frigo
 *
 * Fond noir natif → conteneur sombre arrondi.
 * logo-static.png = frame de base (poster entre deux animations).
 * logo-anim.mp4   = animation principale (boucle).
 */

interface LogoAnimProps {
  /** Taille en px du conteneur carré (défaut 48) */
  size?: number;
  /** Afficher le nom "Mon Frigo" à côté (défaut false) */
  withName?: boolean;
  /** Taille du texte si withName (défaut 'text-lg') */
  nameSize?: string;
  /** Forcer l'image statique uniquement (ex. favicon, og:image) */
  staticOnly?: boolean;
}

export default function LogoAnim({
  size = 48,
  withName = false,
  nameSize = 'text-lg',
  staticOnly = false,
}: LogoAnimProps) {
  const radius = Math.round(size * 0.22);

  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          overflow: 'hidden',
          background: '#000',
          flexShrink: 0,
          boxShadow: '0 2px 12px rgba(0,0,0,0.30)',
        }}
      >
        {staticOnly ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/logo-static.png"
            alt="Mon Frigo"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <video
            src="/logo-anim.mp4"
            poster="/logo-static.png"   /* ← image fixe pendant chargement / entre boucles */
            autoPlay
            loop
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
      </div>

      {withName && (
        <span className={`font-bold tracking-tight ${nameSize}`}>
          Mon Frigo
        </span>
      )}
    </div>
  );
}
