'use client';

import { useState, useRef } from 'react';
import AppShell from '@/components/AppShell';
import {
  Camera, Upload, ScanLine, Loader2, Check, Plus,
  Trash2, ImagePlus, Info, Barcode, X,
} from 'lucide-react';

interface DetectedItem {
  name: string;
  confidence: number;
  ingredientId?: string;
}

interface BarcodeResult {
  name: string;
  brands: string;
  imageUrl: string;
  nutriScore: string;
  nutrients: Record<string, number>;
  ingredientId: string | null;
  ingredientName: string | null;
}

type Mode = 'choose' | 'scan' | 'barcode';

export default function ScanPage() {
  const [mode, setMode] = useState<Mode>('choose');

  // --- Mode photo ---
  const [images, setImages] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<DetectedItem[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // --- Mode barcode ---
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<BarcodeResult | null>(null);
  const [barcodeError, setBarcodeError] = useState('');
  const [barcodeAdded, setBarcodeAdded] = useState(false);
  const barVideoRef = useRef<HTMLVideoElement>(null);
  const [barCamera, setBarCamera] = useState(false);
  const barcodeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Photo scan helpers ──────────────────────────────────────────────────────

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) { videoRef.current.srcObject = stream; setCameraActive(true); }
    } catch { alert("Impossible d'accéder à la caméra"); }
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    setImages(prev => [...prev, canvas.toDataURL('image/jpeg', 0.8)]);
  }

  function stopCamera() {
    (videoRef.current?.srcObject as MediaStream)?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files || []).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => setImages(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
    if (fileRef.current) fileRef.current.value = '';
  }

  async function analyzeAllImages() {
    setScanning(true); setResults([]);
    const seen = new Set<string>(); const all: DetectedItem[] = [];
    for (const img of images) {
      try {
        const res = await fetch('/api/scan', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: img.split(',')[1] }),
        });
        if (res.ok) {
          const data = await res.json();
          for (const item of data.items || []) {
            if (!seen.has(item.name.toLowerCase())) { seen.add(item.name.toLowerCase()); all.push(item); }
          }
        }
      } catch { /* continue */ }
    }
    setResults(all); setScanning(false);
  }

  async function addItem(item: DetectedItem) {
    if (!item.ingredientId) return;
    await fetch('/api/fridge', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredientId: item.ingredientId }),
    });
    setAdded(prev => new Set(prev).add(item.name));
  }

  // ── Barcode helpers ────────────────────────────────────────────────────────

  async function lookupBarcode(code: string) {
    setBarcodeLoading(true); setBarcodeError(''); setBarcodeResult(null); setBarcodeAdded(false);
    try {
      const res = await fetch('/api/scan/barcode', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: code }),
      });
      const data = await res.json();
      if (!res.ok) setBarcodeError(data.error);
      else setBarcodeResult(data);
    } catch { setBarcodeError('Erreur réseau'); }
    finally { setBarcodeLoading(false); }
  }

  async function startBarcodeCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (barVideoRef.current) { barVideoRef.current.srcObject = stream; setBarCamera(true); }

      // BarcodeDetector API (Chrome / Android)
      if ('BarcodeDetector' in window) {
        // @ts-expect-error BarcodeDetector not in TS types
        const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'] });
        barcodeIntervalRef.current = setInterval(async () => {
          if (!barVideoRef.current) return;
          try {
            const codes = await detector.detect(barVideoRef.current);
            if (codes.length > 0) {
              stopBarcodeCamera();
              setBarcodeInput(codes[0].rawValue);
              lookupBarcode(codes[0].rawValue);
            }
          } catch { /* frame not ready */ }
        }, 400);
      }
    } catch { alert("Impossible d'accéder à la caméra"); }
  }

  function stopBarcodeCamera() {
    if (barcodeIntervalRef.current) { clearInterval(barcodeIntervalRef.current); barcodeIntervalRef.current = null; }
    (barVideoRef.current?.srcObject as MediaStream)?.getTracks().forEach(t => t.stop());
    if (barVideoRef.current) barVideoRef.current.srcObject = null;
    setBarCamera(false);
  }

  async function addBarcodeProduct() {
    if (!barcodeResult?.ingredientId) return;
    await fetch('/api/fridge', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredientId: barcodeResult.ingredientId }),
    });
    setBarcodeAdded(true);
  }

  const NUTRISCORE_BG: Record<string, string> = {
    a: '#038141', b: '#85BB2F', c: '#FECB02', d: '#EE8100', e: '#E63E11',
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (mode === 'choose') {
    return (
      <AppShell>
        <div className="flex items-center gap-2.5 mb-5">
          <ScanLine className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <h1 className="text-lg font-semibold">Ajouter au frigo</h1>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setMode('scan')}
            className="card w-full p-5 flex items-center gap-4 hover:shadow-sm transition-all text-left"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'var(--bg-inset)' }}>
              <Camera className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div>
              <p className="font-semibold text-sm">Scanner le frigo / placard</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Prends une ou plusieurs photos, l&apos;IA identifie les aliments
              </p>
            </div>
          </button>

          <button
            onClick={() => setMode('barcode')}
            className="card w-full p-5 flex items-center gap-4 hover:shadow-sm transition-all text-left"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'var(--bg-inset)' }}>
              <Barcode className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div>
              <p className="font-semibold text-sm">Scanner un code-barres</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Identifie n&apos;importe quel produit emballé instantanément
              </p>
            </div>
          </button>
        </div>
      </AppShell>
    );
  }

  // ── Mode PHOTO ─────────────────────────────────────────────────────────────

  if (mode === 'scan') {
    return (
      <AppShell>
        <div className="flex items-center gap-2.5 mb-4">
          <button onClick={() => { setMode('choose'); setImages([]); setResults([]); setAdded(new Set()); }}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-inset)]">
            <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
          <ScanLine className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <h1 className="text-base font-semibold">Scanner le frigo</h1>
        </div>

        <div className="rounded-lg p-3.5 mb-4" style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--text-secondary)' }} />
            <ul className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
              <li>📸 Plusieurs photos sous différents angles</li>
              <li>💡 Bon éclairage, étiquettes visibles</li>
              <li>🗄️ Fonctionne aussi pour un placard ou garde-manger</li>
            </ul>
          </div>
        </div>

        {!cameraActive && (
          <>
            {images.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">{images.length} photo{images.length > 1 ? 's' : ''}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {images.map((img, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden group" style={{ aspectRatio: '1' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setImages(p => p.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => fileRef.current?.click()}
                    className="rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-[var(--bg-inset)] transition-colors"
                    style={{ aspectRatio: '1', border: '2px dashed var(--border)' }}>
                    <ImagePlus className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3 mb-4">
              {images.length === 0 && (
                <>
                  <button onClick={startCamera} className="card w-full p-5 flex flex-col items-center gap-3 hover:shadow-sm transition-all">
                    <Camera className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />
                    <p className="font-medium text-sm">Prendre des photos</p>
                  </button>
                  <button onClick={() => fileRef.current?.click()} className="card w-full p-5 flex flex-col items-center gap-3 hover:shadow-sm transition-all">
                    <Upload className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
                    <p className="font-medium text-sm">Importer depuis la galerie</p>
                  </button>
                </>
              )}
              {images.length > 0 && !scanning && results.length === 0 && (
                <div className="flex gap-2">
                  <button onClick={startCamera} className="btn-secondary flex items-center gap-2 flex-1 justify-center">
                    <Camera className="w-4 h-4" /> Ajouter
                  </button>
                  <button onClick={analyzeAllImages} className="btn-primary flex items-center gap-2 flex-1 justify-center">
                    <ScanLine className="w-4 h-4" /> Analyser
                  </button>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
          </>
        )}

        {cameraActive && (
          <div className="relative rounded-xl overflow-hidden mb-4">
            <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl" />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
              <button onClick={stopCamera} className="btn-secondary !py-2 !px-4 text-sm">Terminé</button>
              <button onClick={capturePhoto} className="btn-primary !py-2 !px-4 text-sm flex items-center gap-1.5">
                <Camera className="w-4 h-4" /> Capturer
              </button>
            </div>
          </div>
        )}

        {scanning && (
          <div className="flex items-center justify-center gap-2.5 py-8">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Analyse en cours…</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="fade-in">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium text-sm">{results.length} ingrédient{results.length > 1 ? 's' : ''} détecté{results.length > 1 ? 's' : ''}</h2>
              <button onClick={() => { for (const i of results) addItem(i); }} className="btn-primary !py-1.5 !px-3 text-xs">Tout ajouter</button>
            </div>
            <div className="space-y-1.5">
              {results.map((item, i) => (
                <div key={i} className="card p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{Math.round(item.confidence * 100)}% confiance</p>
                  </div>
                  {added.has(item.name)
                    ? <div className="w-7 h-7 rounded-md flex items-center justify-center bg-emerald-500/10"><Check className="w-4 h-4 text-emerald-500" /></div>
                    : <button onClick={() => addItem(item)} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[var(--bg-inset)] transition-colors" style={{ border: '1px solid var(--border)' }}><Plus className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} /></button>
                  }
                </div>
              ))}
            </div>
            <button onClick={() => { setImages([]); setResults([]); setAdded(new Set()); }} className="btn-secondary w-full mt-4">
              Nouveau scan
            </button>
          </div>
        )}
      </AppShell>
    );
  }

  // ── Mode BARCODE ───────────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className="flex items-center gap-2.5 mb-4">
        <button onClick={() => { setMode('choose'); setBarcodeResult(null); setBarcodeError(''); stopBarcodeCamera(); }}
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-inset)]">
          <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        </button>
        <Barcode className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-base font-semibold">Code-barres</h1>
      </div>

      {/* Caméra barcode */}
      {barCamera ? (
        <div className="relative rounded-xl overflow-hidden mb-4">
          <video ref={barVideoRef} autoPlay playsInline className="w-full rounded-xl" />
          {/* Viseur */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-24 rounded-lg" style={{ border: '2px solid rgba(255,255,255,0.8)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }} />
          </div>
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <button onClick={stopBarcodeCamera} className="btn-secondary !py-2 !px-5 text-sm">Annuler</button>
          </div>
          <p className="absolute top-3 left-0 right-0 text-center text-xs text-white/80">
            Pointe vers le code-barres
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          <button onClick={startBarcodeCamera}
            className="card w-full p-4 flex items-center gap-3 hover:shadow-sm transition-all text-left">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--bg-inset)' }}>
              <Camera className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div>
              <p className="font-medium text-sm">Scanner avec la caméra</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pointe vers EAN-13, UPC, QR code…</p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
            <span className="text-xs px-2" style={{ color: 'var(--text-muted)' }}>ou saisir manuellement</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
          </div>

          <form onSubmit={e => { e.preventDefault(); if (barcodeInput.trim()) lookupBarcode(barcodeInput.trim()); }}
            className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="ex. 3017624010701"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              className="input-field flex-1 font-mono"
            />
            <button type="submit" disabled={!barcodeInput.trim() || barcodeLoading}
              className="btn-primary !px-4 disabled:opacity-40">
              {barcodeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}

      {barcodeLoading && (
        <div className="flex items-center justify-center gap-2.5 py-8">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Recherche du produit…</p>
        </div>
      )}

      {barcodeError && (
        <div className="rounded-xl p-3.5 text-sm text-red-600 dark:text-red-400 fade-in"
          style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {barcodeError}
        </div>
      )}

      {barcodeResult && (
        <div className="card overflow-hidden fade-in">
          {barcodeResult.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={barcodeResult.imageUrl} alt={barcodeResult.name}
              className="w-full h-40 object-contain" style={{ backgroundColor: 'var(--bg-inset)' }} />
          )}
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <p className="font-semibold text-base leading-tight">{barcodeResult.name}</p>
                {barcodeResult.brands && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{barcodeResult.brands}</p>
                )}
              </div>
              {barcodeResult.nutriScore && (
                <span className="px-2 py-0.5 rounded text-white text-xs font-bold uppercase shrink-0"
                  style={{ backgroundColor: NUTRISCORE_BG[barcodeResult.nutriScore.toLowerCase()] || '#888' }}>
                  {barcodeResult.nutriScore.toUpperCase()}
                </span>
              )}
            </div>

            {/* Valeurs nutritionnelles (pour 100g) */}
            {barcodeResult.nutrients && barcodeResult.nutrients.calories > 0 && (
              <div className="grid grid-cols-4 gap-1.5 my-3">
                {[
                  { label: 'kcal', val: Math.round(barcodeResult.nutrients.calories) },
                  { label: 'Prot.', val: `${barcodeResult.nutrients.protein?.toFixed(1)}g` },
                  { label: 'Gluc.', val: `${barcodeResult.nutrients.carbs?.toFixed(1)}g` },
                  { label: 'Lip.', val: `${barcodeResult.nutrients.fat?.toFixed(1)}g` },
                ].map(n => (
                  <div key={n.label} className="rounded-lg p-2 text-center" style={{ backgroundColor: 'var(--bg-inset)' }}>
                    <p className="text-sm font-semibold">{n.val}</p>
                    <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{n.label}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] mb-3" style={{ color: 'var(--text-muted)' }}>Pour 100g</p>

            {barcodeAdded ? (
              <div className="flex items-center gap-2 justify-center py-2.5 rounded-xl text-emerald-600 dark:text-emerald-400"
                style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Ajouté au frigo !</span>
              </div>
            ) : barcodeResult.ingredientId ? (
              <button onClick={addBarcodeProduct} className="btn-primary w-full flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Ajouter au frigo
              </button>
            ) : (
              <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
                Produit trouvé mais pas encore dans notre base d&apos;ingrédients.
              </p>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
