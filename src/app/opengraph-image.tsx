import { ImageResponse } from 'next/og';

// Image de partage (réseaux sociaux) générée en code — pas de fichier statique
// à maintenir. S'applique par défaut à toutes les routes (dont /s/[slug]),
// sauf si une route définit son propre opengraph-image.
export const alt = 'Mon Frigo — Cuisine intelligente, zéro gaspi';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0d0f14 0%, #12151d 55%, #16192a 100%)',
          position: 'relative',
        }}
      >
        {/* Halo d'ambiance bleu, cohérent avec l'accent de marque */}
        <div
          style={{
            position: 'absolute',
            top: -180,
            right: -140,
            width: 520,
            height: 520,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.35) 0%, rgba(37,99,235,0) 70%)',
            display: 'flex',
          }}
        />

        {/* Icône frigo */}
        <div
          style={{
            width: 92,
            height: 92,
            borderRadius: 24,
            background: 'linear-gradient(150deg, #2563eb, #6d5cf5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 34,
          }}
        >
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
            <line x1="6" y1="11" x2="18" y2="11" />
            <line x1="9.5" y1="6.5" x2="9.5" y2="8" />
            <line x1="9.5" y1="14" x2="9.5" y2="15.5" />
          </svg>
        </div>

        {/* Nom de marque */}
        <div style={{ display: 'flex', fontSize: 74, fontWeight: 800, letterSpacing: -2, color: '#fff' }}>
          <span>Mon</span>
          <span style={{ color: '#7aa2f7' }}>Frigo</span>
        </div>

        {/* Accroche */}
        <div style={{ display: 'flex', fontSize: 30, color: '#aeb6c4', marginTop: 22, textAlign: 'center' }}>
          Cuisine mieux, avec ce que tu as déjà.
        </div>

        {/* Badge gratuit */}
        <div
          style={{
            display: 'flex',
            marginTop: 40,
            padding: '10px 26px',
            borderRadius: 999,
            background: 'rgba(122,162,247,0.14)',
            border: '1px solid rgba(122,162,247,0.35)',
            color: '#7aa2f7',
            fontSize: 24,
            fontWeight: 600,
          }}
        >
          Scan du frigo · Recettes IA · Anti-gaspi · Gratuit
        </div>
      </div>
    ),
    { ...size },
  );
}
