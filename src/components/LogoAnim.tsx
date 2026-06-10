'use client';

/**
 * LogoAnim — mascotte animée Mon Frigo
 *
 * La vidéo a un fond noir → on utilise mix-blend-mode: screen en dark mode
 * (le noir disparaît, les pixels colorés restent).
 * En light mode : conteneur sombre arrondi pour intégrer naturellement le fond noir.
 */

interface LogoAnimProps {
  /** Taille en px du conteneur carré (défaut 48) */
  size?: number;
  /** Afficher le nom "Mon Frigo" à côté (défaut false) */
  withName?: boolean;
  /** Taille du texte si withName (défaut 'text-lg') */
  nameSize?: string;
}

export default function LogoAnim({ size = 48, withName = false, nameSize = 'text-lg' }: LogoAnimProps) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* Conteneur vidéo */}
      <div
        style={{
          width:  size,
          height: size,
          borderRadius: size * 0.22,   // coins arrondis proportionnels
          overflow: 'hidden',
          background: '#000',           // fond noir pour intégrer la vidéo
          flexShrink: 0,
          boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
        }}
      >
        <video
          src="/logo-anim.mp4"
          autoPlay
          loop
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>

      {withName && (
        <span className={`font-bold tracking-tight ${nameSize}`}>
          Mon Frigo
        </span>
      )}
    </div>
  );
}
