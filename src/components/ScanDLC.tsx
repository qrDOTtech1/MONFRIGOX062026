'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Camera, Loader2, Check, RotateCcw } from 'lucide-react';

interface ScanDLCProps {
  itemId: string;
  itemName: string;
  itemEmoji: string;
  onSaved: () => void;
  onClose: () => void;
}

const DATE_PATTERNS = [
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/,
  // DD/MM/YY or DD-MM-YY or DD.MM.YY
  /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})/,
  // YYYY-MM-DD (ISO)
  /(\d{4})-(\d{1,2})-(\d{1,2})/,
  // "31 JAN 2025" or "31 JANV 2025"
  /(\d{1,2})\s*(janv?(?:ier)?|fev(?:rier)?|févr?(?:ier)?|mars?|avr(?:il)?|mai|juin|juil(?:let)?|aout|août|sept?(?:embre)?|oct(?:obre)?|nov(?:embre)?|dec(?:embre)?|déc(?:embre)?|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s*(\d{2,4})/i,
  // "JAN 2025" (sans jour)
  /\b(janv?(?:ier)?|fev(?:rier)?|févr?(?:ier)?|mars?|avr(?:il)?|mai|juin|juil(?:let)?|aout|août|sept?(?:embre)?|oct(?:obre)?|nov(?:embre)?|dec(?:embre)?|déc(?:embre)?|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s*(\d{4})\b/i,
  // MM/YYYY
  /(\d{1,2})[\/\-.](\d{4})/,
];

const MONTH_MAP: Record<string, number> = {
  jan: 1, janv: 1, janvier: 1,
  feb: 2, fev: 2, fevrier: 2, févr: 2, février: 2,
  mar: 3, mars: 3,
  apr: 4, avr: 4, avril: 4,
  may: 5, mai: 5,
  jun: 6, juin: 6,
  jul: 7, juil: 7, juillet: 7,
  aug: 8, aout: 8, août: 8,
  sep: 9, sept: 9, septembre: 9,
  oct: 10, octobre: 10,
  nov: 11, novembre: 11,
  dec: 12, déc: 12, decembre: 12, décembre: 12,
};

function parseMonth(s: string): number {
  const key = s.toLowerCase().replace(/\./g, '');
  for (const [k, v] of Object.entries(MONTH_MAP)) {
    if (key.startsWith(k)) return v;
  }
  return 0;
}

function fixYear(y: number): number {
  if (y < 100) return y + 2000;
  return y;
}

function extractDate(text: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    // YYYY-MM-DD
    if (pattern === DATE_PATTERNS[3]) {
      const year = fixYear(parseInt(match[1]));
      if (year > 1900) {
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }

    // DD/MM/YYYY or DD/MM/YY
    if (pattern === DATE_PATTERNS[0] || pattern === DATE_PATTERNS[1]) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]);
      const year = fixYear(parseInt(match[3]));
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    // ISO YYYY-MM-DD
    if (pattern === DATE_PATTERNS[2]) {
      return match[0];
    }

    // "31 JAN 2025"
    if (pattern === DATE_PATTERNS[3]) {
      const day = parseInt(match[1]);
      const month = parseMonth(match[2]);
      const year = fixYear(parseInt(match[3]));
      if (month && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    // "JAN 2025" (no day → 1st of month)
    if (pattern === DATE_PATTERNS[4]) {
      const month = parseMonth(match[1]);
      const year = fixYear(parseInt(match[2]));
      if (month) {
        return `${year}-${String(month).padStart(2, '0')}-01`;
      }
    }

    // MM/YYYY
    if (pattern === DATE_PATTERNS[5]) {
      const month = parseInt(match[1]);
      const year = parseInt(match[2]);
      if (month >= 1 && month <= 12) {
        return `${year}-${String(month).padStart(2, '0')}-01`;
      }
    }
  }
  return null;
}

export default function ScanDLC({ itemId, itemName, itemEmoji, onSaved, onClose }: ScanDLCProps) {
  const [scanning, setScanning] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [detectedDate, setDetectedDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(async (file: File) => {
    setScanning(true);
    setError('');
    setDetectedDate(null);
    setOcrText('');

    const img = new Image();
    const canvas = document.createElement('canvas');
    img.onload = async () => {
      const max = 1200;
      const ratio = Math.min(max / img.width, max / img.height, 1);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      setPreview(canvas.toDataURL('image/jpeg', 0.8));

      try {
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('fra');
        const { data } = await worker.recognize(canvas);
        await worker.terminate();

        const text = data.text;
        setOcrText(text);

        const date = extractDate(text);
        if (date) {
          setDetectedDate(date);
        } else {
          setError('Aucune date détectée. Essaie de recadrer sur la date.');
        }
      } catch {
        setError('Erreur lors de la lecture. Réessaie avec une photo plus nette.');
      }
      setScanning(false);
    };
    img.src = URL.createObjectURL(file);
  }, []);

  async function saveDate() {
    if (!detectedDate) return;
    setSaving(true);
    await fetch(`/api/fridge/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresAt: detectedDate }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => onSaved(), 800);
  }

  function formatDateFR(iso: string) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl fade-in"
        style={{ backgroundColor: 'var(--bg-raised)', maxHeight: '90vh', overflow: 'auto' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <div>
              <p className="text-sm font-semibold">Scanner la DLC</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{itemEmoji} {itemName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-inset)]">
            <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="px-4 py-5">
          {/* Zone photo */}
          {!preview && !scanning && (
            <div className="text-center">
              <label className="flex flex-col items-center justify-center gap-3 py-10 rounded-xl cursor-pointer transition-colors hover:bg-[var(--bg-inset)]"
                style={{ border: '2px dashed var(--border)' }}>
                <Camera className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p className="text-sm font-medium">Prends en photo la date</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>DLC, DDM ou date de péremption</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) processImage(file);
                  }}
                />
              </label>
            </div>
          )}

          {/* Scanning */}
          {scanning && (
            <div className="text-center py-10 fade-in">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: 'var(--accent)' }} />
              <p className="text-sm font-medium">Lecture en cours…</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Analyse de la photo avec OCR</p>
            </div>
          )}

          {/* Preview + résultat */}
          {preview && !scanning && (
            <div className="fade-in">
              <img src={preview} alt="Photo" className="w-full rounded-xl mb-4 aspect-video object-cover"
                style={{ border: '1px solid var(--border)' }} />

              {detectedDate && !saved && (
                <div className="rounded-xl p-4 mb-4"
                  style={{ backgroundColor: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)' }}>
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Date détectée</p>
                  <p className="text-2xl font-semibold text-emerald-600">{formatDateFR(detectedDate)}</p>
                  <button onClick={saveDate} disabled={saving}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {saving ? 'Enregistrement…' : 'Enregistrer cette date'}
                  </button>
                </div>
              )}

              {saved && (
                <div className="flex items-center justify-center gap-2 py-3 rounded-xl mb-4 text-sm font-medium fade-in"
                  style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
                  <Check className="w-4 h-4" /> Date enregistrée !
                </div>
              )}

              {error && (
                <div className="rounded-xl p-4 mb-4"
                  style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  {ocrText && (
                    <details className="mt-2">
                      <summary className="text-[10px] cursor-pointer" style={{ color: 'var(--text-muted)' }}>Texte détecté (debug)</summary>
                      <p className="text-[10px] mt-1 whitespace-pre-wrap" style={{ color: 'var(--text-muted)' }}>{ocrText}</p>
                    </details>
                  )}
                </div>
              )}

              {!saved && (
                <button onClick={() => { setPreview(null); setDetectedDate(null); setError(''); setOcrText(''); fileRef.current?.click(); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all"
                  style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  <RotateCcw className="w-4 h-4" />
                  Reprendre la photo
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
