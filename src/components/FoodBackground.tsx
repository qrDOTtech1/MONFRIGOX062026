'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Fond "pluie d'ingrédients" réutilisable (repris de la landing).
// Couche fixe plein écran, purement décorative, sous le contenu de la page.
//
// ⚠️ Rendu via un PORTAL vers <body> : le conteneur de page porte une
// transform (animation app-enter) qui, sinon, "casse" position:fixed
// (l'élément serait rattaché au conteneur au lieu du viewport). Le portal
// le place dans le contexte racine → fixed couvre bien tout l'écran.
// z-index 0 : au-dessus du halo d'ambiance, sous le contenu (conteneur en z-1).
//
// Pour l'activer sur une page : <FoodBackground /> quelque part dans la page.
// Styles dans globals.css (.food-bg / .food-bg-item / .food-bg-frost).

// left = colonne · s = taille (px) · dur = durée de chute · delay = décalage
// (négatif = déjà en cours au chargement) · spin = rotation totale.
const FALLING_FOOD = [
  { src: 'tomate',    left: '6%',  s: 96,  dur: 14, delay: 0,   spin: 220 },
  { src: 'carotte',   left: '78%', s: 120, dur: 17, delay: -4,  spin: -180 },
  { src: 'poireau',   left: '40%', s: 130, dur: 19, delay: -9,  spin: 160 },
  { src: 'pomme',     left: '88%', s: 84,  dur: 12, delay: -3,  spin: 300 },
  { src: 'oignon',    left: '20%', s: 90,  dur: 15, delay: -11, spin: -240 },
  { src: 'concombre', left: '60%', s: 112, dur: 21, delay: -6,  spin: 200 },
  { src: 'pitaya',    left: '32%', s: 96,  dur: 13, delay: -14, spin: -160 },
  { src: 'tomate',    left: '52%', s: 70,  dur: 18, delay: -7,  spin: 260 },
];

export default function FoodBackground() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;   // portal côté client uniquement

  return createPortal(
    <div className="food-bg" aria-hidden>
      <div className="food-bg-layer" style={{ position: 'absolute', inset: 0 }}>
        {FALLING_FOOD.map((f, i) => (
          <div
            key={i}
            className="food-bg-item"
            style={{
              left: f.left,
              width: `${f.s}px`,
              height: `${f.s}px`,
              backgroundImage: `url('/images/food/${f.src}.webp')`,
              ['--dur' as string]: `${f.dur}s`,
              ['--spin' as string]: `${f.spin}deg`,
              animationDelay: `${f.delay}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>
      {/* Voile dépoli par-dessus la pluie → contenu bien lisible */}
      <div className="food-bg-frost" />
    </div>,
    document.body,
  );
}
