'use client';

import { useEffect, useState } from 'react';

export type MascotVariant = 'wink' | 'happy' | 'excited' | 'worried' | 'sad' | 'sleep';
export type MascotSize = 'sm' | 'md' | 'lg' | 'xl';

interface MascotProps {
  variant?: MascotVariant;
  message?: string;
  size?: MascotSize;
  animate?: 'float' | 'bounce' | 'shake' | 'pulse' | 'none';
  className?: string;
}

const VARIANT_SRC: Record<MascotVariant, string> = {
  wink:    '/mascot-wink.png',
  happy:   '/mascot-happy.png',
  excited: '/mascot-excited.png',
  worried: '/mascot-worried.png',
  sad:     '/mascot-sad.png',
  sleep:   '/mascot-sleep.png',
};

const SIZE_PX: Record<MascotSize, number> = {
  sm: 64, md: 96, lg: 128, xl: 180,
};

/* Falls back to wink if variant image not yet added */
function srcWithFallback(variant: MascotVariant) {
  return VARIANT_SRC[variant] ?? VARIANT_SRC.wink;
}

export default function Mascot({
  variant = 'wink',
  message,
  size = 'md',
  animate = 'float',
  className = '',
}: MascotProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 60); }, []);

  const px = SIZE_PX[size];

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}>

      {/* Speech bubble */}
      {message && (
        <div className="relative mb-2 max-w-[200px]">
          <div className="px-3 py-2 rounded-2xl rounded-bl-sm text-xs font-medium leading-snug text-center shadow-sm"
            style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            {message}
          </div>
          {/* Bubble tail */}
          <div className="absolute -bottom-1.5 left-5 w-3 h-3 rotate-45 rounded-sm"
            style={{ backgroundColor: 'var(--bg-raised)', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }} />
        </div>
      )}

      {/* Mascot image */}
      <div style={{ width: px, height: px }} className={`mascot-${animate}`}>
        <img
          src={srcWithFallback(variant)}
          alt="MonFrigo mascotte"
          width={px}
          height={px}
          className="w-full h-full object-contain drop-shadow-lg"
          onError={e => { (e.target as HTMLImageElement).src = VARIANT_SRC.wink; }}
        />
      </div>

      <style jsx>{`
        .mascot-float  { animation: mascotFloat 3s ease-in-out infinite; }
        .mascot-bounce { animation: mascotBounce 0.6s cubic-bezier(.36,.07,.19,.97) both; }
        .mascot-shake  { animation: mascotShake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        .mascot-pulse  { animation: mascotPulse 2s ease-in-out infinite; }
        .mascot-none   {}

        @keyframes mascotFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes mascotBounce {
          0%,100% { transform: translateY(0); }
          20%     { transform: translateY(-16px) scale(1.05); }
          40%     { transform: translateY(-8px); }
          60%     { transform: translateY(-12px) scale(1.02); }
          80%     { transform: translateY(-4px); }
        }
        @keyframes mascotShake {
          0%,100% { transform: rotate(0deg); }
          20%     { transform: rotate(-6deg); }
          40%     { transform: rotate(6deg); }
          60%     { transform: rotate(-4deg); }
          80%     { transform: rotate(4deg); }
        }
        @keyframes mascotPulse {
          0%,100% { transform: scale(1); }
          50%     { transform: scale(1.06); }
        }
      `}</style>
    </div>
  );
}
