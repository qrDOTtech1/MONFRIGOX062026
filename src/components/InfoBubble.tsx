'use client';

import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

/**
 * Petite bulle d'aide « i ».
 * Pensée pour les personnes moins à l'aise avec la technologie :
 * un clic sur l'icône affiche une explication courte et claire.
 */
export default function InfoBubble({
  text,
  label,
  align = 'center',
  className = '',
}: {
  text: string;
  label?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  const posClass =
    align === 'left'  ? 'left-0'
    : align === 'right' ? 'right-0'
    : 'left-1/2 -translate-x-1/2';

  return (
    <span ref={ref} className={`relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        aria-label={label ? `Aide : ${label}` : "Plus d'informations"}
        aria-expanded={open}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full transition-opacity hover:opacity-70 active:scale-90"
        style={{ color: 'var(--text-muted)' }}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute z-[60] top-full mt-1.5 w-56 max-w-[75vw] p-2.5 rounded-xl text-xs leading-relaxed shadow-lg fade-in ${posClass}`}
          style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          {label && <span className="block font-semibold mb-0.5" style={{ color: 'var(--text)' }}>{label}</span>}
          {text}
        </span>
      )}
    </span>
  );
}
