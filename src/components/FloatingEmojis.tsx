'use client';

const FOOD_EMOJIS = [
  '🍎','🥑','🧀','🥕','🍋','🥦','🍅','🥚','🧅','🫑',
  '🍇','🍓','🥩','🍞','🧄','🫐','🥜','🫒','🥐','🍳',
  '🥗','🫙','🥛','🍄','🌽','🍆','🫚','🧁','🥝','🍯',
];

const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  emoji:    FOOD_EMOJIS[i % FOOD_EMOJIS.length],
  left:     (i * 37 + 13) % 100,
  size:     1.2 + ((i * 7) % 14) / 10,
  duration: 12 + ((i * 11) % 14),
  delay:    (i * 1.3) % 18,
  opacity:  0.12 + ((i * 3) % 18) / 100,
}));

export default function FloatingEmojis() {
  return (
    <>
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) rotate(0deg);    opacity: 0; }
          10%  { opacity: var(--op); }
          85%  { opacity: var(--op); }
          100% { transform: translateY(-110vh) rotate(20deg); opacity: 0; }
        }
      `}</style>
      <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {PARTICLES.map((p, i) => (
          <span key={i} style={{
            position:   'absolute',
            left:       `${p.left}%`,
            bottom:     '-5%',
            fontSize:   `${p.size}rem`,
            '--op':     p.opacity,
            animation:  `floatUp ${p.duration}s ${p.delay}s linear infinite`,
            userSelect: 'none',
          } as React.CSSProperties}>
            {p.emoji}
          </span>
        ))}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, var(--bg) 0%, transparent 18%, transparent 80%, var(--bg) 100%)',
        }} />
      </div>
    </>
  );
}
