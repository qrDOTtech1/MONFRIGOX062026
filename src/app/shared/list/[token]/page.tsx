'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Check, ShoppingCart, QrCode } from 'lucide-react';

interface ShoppingItem {
  id: string;
  quantity: number;
  unit: string;
  checked: boolean;
  ingredient: { name: string; emoji: string };
}

interface SharedList {
  name: string;
  items: ShoppingItem[];
}

export default function SharedListPage() {
  const { token } = useParams();
  const [list, setList] = useState<SharedList | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedLocal, setCheckedLocal] = useState<Set<string>>(new Set());
  const [showQR, setShowQR] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch(`/api/shared/list/${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setList(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!showQR || !canvasRef.current) return;
    const url = window.location.href;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const size = 200;
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Scanne ce QR', size / 2, 20);
    ctx.fillText('ou copie le lien', size / 2, 36);
    // Simple text-based fallback (real QR would need a library)
    ctx.font = '10px monospace';
    const lines = url.match(/.{1,30}/g) || [url];
    lines.forEach((line, i) => ctx.fillText(line, size / 2, 60 + i * 14));
  }, [showQR]);

  function toggleCheck(id: string) {
    setCheckedLocal(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)' }} />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}>
        <ShoppingCart className="w-12 h-12 mb-4" style={{ color: 'var(--text-muted)' }} />
        <p className="text-lg font-semibold">Liste introuvable</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Ce lien est invalide ou a expiré.</p>
      </div>
    );
  }

  const checked = list.items.filter(i => i.checked || checkedLocal.has(i.id)).length;

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}>
      <div className="flex items-center gap-3 mb-4">
        <ShoppingCart className="w-5 h-5" style={{ color: 'var(--accent)' }} />
        <h1 className="font-semibold text-lg">{list.name}</h1>
        <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
          {checked}/{list.items.length}
        </span>
      </div>

      <div className="space-y-1.5">
        {list.items.map(item => {
          const done = item.checked || checkedLocal.has(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
              style={{ backgroundColor: done ? 'rgba(34,197,94,0.06)' : 'var(--bg-raised)', border: '1px solid var(--border-subtle)' }}
            >
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${done ? 'bg-emerald-500 border-emerald-500' : ''}`}
                style={!done ? { borderColor: 'var(--border)' } : undefined}>
                {done && <Check className="w-3 h-3 text-white" />}
              </span>
              <span className="text-sm">{item.ingredient.emoji}</span>
              <span className={`text-sm flex-1 ${done ? 'line-through opacity-50' : ''}`}>
                {item.quantity} {item.unit} {item.ingredient.name}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => { navigator.clipboard.writeText(window.location.href); }}
          className="flex-1 py-2 rounded-xl text-xs font-medium"
          style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}
        >
          Copier le lien
        </button>
        <button
          onClick={() => setShowQR(!showQR)}
          className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-medium"
          style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}
        >
          <QrCode className="w-3.5 h-3.5" /> QR
        </button>
      </div>

      {showQR && (
        <div className="mt-4 flex justify-center">
          <canvas ref={canvasRef} className="rounded-xl border" style={{ borderColor: 'var(--border)' }} />
        </div>
      )}

      <p className="text-center text-[10px] mt-6" style={{ color: 'var(--text-muted)' }}>
        Liste partagée via MonFrigo
      </p>
    </div>
  );
}
