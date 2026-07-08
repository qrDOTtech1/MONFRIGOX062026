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
// NB perfs : les 16 éléments ne réutilisent que 7 images (déjà en cache) →
// aucun téléchargement supplémentaire, seulement du compositing GPU léger.
const FALLING_FOOD = [
  // 1ʳᵉ vague — devant, plus grands
  { src: 'tomate',    left: '5%',  s: 96,  dur: 14, delay: 0,    spin: 220 },
  { src: 'carotte',   left: '78%', s: 120, dur: 17, delay: -4,   spin: -180 },
  { src: 'poireau',   left: '40%', s: 130, dur: 19, delay: -9,   spin: 160 },
  { src: 'pomme',     left: '88%', s: 84,  dur: 12, delay: -3,   spin: 300 },
  { src: 'oignon',    left: '20%', s: 90,  dur: 15, delay: -11,  spin: -240 },
  { src: 'concombre', left: '60%', s: 112, dur: 21, delay: -6,   spin: 200 },
  { src: 'pitaya',    left: '32%', s: 96,  dur: 13, delay: -14,  spin: -160 },
  { src: 'tomate',    left: '52%', s: 70,  dur: 18, delay: -7,   spin: 260 },
  // 2ᵉ vague — derrière, plus petits (profondeur), colonnes décalées
  { src: 'pomme',     left: '13%', s: 62,  dur: 20, delay: -2,   spin: -200 },
  { src: 'carotte',   left: '48%', s: 68,  dur: 23, delay: -16,  spin: 180 },
  { src: 'oignon',    left: '68%', s: 60,  dur: 16, delay: -19,  spin: 240 },
  { src: 'poireau',   left: '92%', s: 74,  dur: 24, delay: -5,   spin: -140 },
  { src: 'concombre', left: '27%', s: 58,  dur: 15, delay: -22,  spin: 300 },
  { src: 'pitaya',    left: '84%', s: 66,  dur: 22, delay: -12,  spin: -220 },
  { src: 'tomate',    left: '70%', s: 54,  dur: 19, delay: -25,  spin: 200 },
  { src: 'poireau',   left: '2%',  s: 60,  dur: 26, delay: -18,  spin: -170 },
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
