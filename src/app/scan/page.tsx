'use client';

import { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Link from 'next/link';
import {
  Camera, Upload, ScanLine, Loader2, Check, Plus,
  Trash2, ImagePlus, Info, Barcode, X, Lock,
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

type Mode = 'choose' | 'scan' | 'barcode' | 'upgrade';

/* ─── Caméra plein écran overlay ────────────────────────────────────────────
   Montée en fixed sur tout l'écran → les boutons sont toujours visibles,
   pas besoin de scroller.
──────────────────────────────────────────────────────────────────────────── */
function FullscreenCamera({
  videoRef,
  onCapture,
  onClose,
  captureLabel = 'Capturer',
  children,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onCapture?: () => void;
  onClose: () => void;
  captureLabel?: string;
  children?: React.ReactNode; // viseur custom (barcode)
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Vidéo remplit tout l'écran */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="flex-1 w-full object-cover"
        style={{ minHeight: 0 }}
      />

      {/* Overlay custom (viseur barcode etc.) */}
      {children && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {children}
        </div>
      )}

      {/* Boutons — toujours visibles en bas, padding safe-area iOS */}
      <div
        className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 px-6 py-5"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
          paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
        }}
      >
        <button
          onClick={onClose}
          className="flex-1 max-w-[140px] py-3 rounded-xl text-sm font-semibold text-white"
          style={{ backgroundColor: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)' }}
        >
          Fermer
        </button>
        {onCapture && (
          <button
            onClick={onCapture}
            className="flex-1 max-w-[160px] py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
          >
            <Camera className="w-4 h-4" /> {captureLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Viseur EAN ─────────────────────────────────────────────────────────── */
function BarcodeViewfinder({ status }: { status: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-white/80 text-xs bg-black/40 px-3 py-1 rounded-full">{status}</p>
      <div
        className="w-72 h-28 rounded-xl"
        style={{
          border: '2px solid rgba(255,255,255,0.85)',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
        }}
      />
      <p className="text-white/50 text-[11px]">EAN-13 · EAN-8 · UPC · QR</p>
    </div>
  );
}

/* ─── Page principale ────────────────────────────────────────────────────── */
function ScanPageInner() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(() =>
    searchParams.get('mode') === 'barcode' ? 'barcode' : 'choose'
  );
  useEffect(() => {
    if (searchParams.get('mode') === 'barcode') setMode('barcode');
  }, [searchParams]);

  // ── Mode photo ──
  const [images, setImages]     = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [results, setResults]   = useState<DetectedItem[]>([]);
  const [added, setAdded]       = useState<Set<string>>(new Set());
  const fileRef                 = useRef<HTMLInputElement>(null);
  const videoRef                = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // ── Mode barcode ──
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeResult, setBarcodeResult]   = useState<BarcodeResult | null>(null);
  const [barcodeError, setBarcodeError]     = useState('');
  const [barcodeAdded, setBarcodeAdded]     = useState(false);
  const barVideoRef    = useRef<HTMLVideoElement>(null);
  const [barCamera, setBarCamera] = useState(false);
  const [barStatus, setBarStatus] = useState('Pointe vers le code-barres');
  const zxingControlsRef = useRef<import('@zxing/browser').IScannerControls | null>(null);

  // ── Photo helpers ──
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch { alert("Impossible d'accéder à la caméra"); }
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    canvas.getContext('2d')?.drawImage(v, 0, 0);
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
        if (res.status === 403) { setScanning(false); setMode('upgrade'); return; }
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

  // ── Barcode helpers (ZXing) ──
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

  const stopBarcodeCamera = useCallback(() => {
    try { zxingControlsRef.current?.stop(); } catch { /* ignore */ }
    zxingControlsRef.current = null;
    if (barVideoRef.current) barVideoRef.current.srcObject = null;
    setBarCamera(false);
    setBarStatus('Pointe vers le code-barres');
  }, []);

  async function startBarcodeCamera() {
    setBarCamera(true);
    setBarStatus('Démarrage…');
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();

      setBarStatus('Cherche un code-barres…');

      // decodeFromConstraints gère le stream + la vidéo, retourne IScannerControls
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } } },
        barVideoRef.current ?? undefined,
        (result, err) => {
          if (result) {
            const code = result.getText();
            setBarStatus(`✓ Détecté : ${code}`);
            stopBarcodeCamera();
            setBarcodeInput(code);
            lookupBarcode(code);
          } else if (err && !(err.message ?? '').includes('No MultiFormat')) {
            setBarStatus('Cherche un code-barres…');
          }
        },
      );
      zxingControlsRef.current = controls;
    } catch (e) {
      stopBarcodeCamera();
      alert("Impossible d'accéder à la caméra");
      console.error(e);
    }
  }

  async function addBarcodeProduct() {
    if (!barcodeResult?.ingredientId) return;
    await fetch('/api/fridge', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredientId: barcodeResult.ingredientId }),
    });
    setBarcodeAdded(true);
  }

  // Nettoyage au démontage
  useEffect(() => () => { stopCamera(); stopBarcodeCamera(); }, [stopBarcodeCamera]);

  const NUTRISCORE_BG: Record<string, string> = {
    a: '#038141', b: '#85BB2F', c: '#FECB02', d: '#EE8100', e: '#E63E11',
  };

  // ── Upgrade ──
  if (mode === 'upgrade') return (
    <AppShell>
      <div className="flex flex-col items-center justify-center text-center py-20 px-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}>
          <Lock className="w-7 h-7 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">Scan IA — Premium uniquement</h2>
        <p className="text-sm mb-1 max-w-xs" style={{ color: 'var(--text-secondary)' }}>
          Le scan IA de frigo utilise la vision artificielle — réservé aux abonnés Premium et VIP.
        </p>
        <p className="text-xs mb-8" style={{ color: 'var(--text-muted)' }}>
          Le scan code-barres EAN reste disponible gratuitement.
        </p>
        <Link href="/profile"
          className="px-8 py-3 rounded-xl text-sm font-semibold mb-3 block"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
          Passer Premium — 3,99€/mois
        </Link>
        <button onClick={() => setMode('barcode')} className="text-sm underline underline-offset-2"
          style={{ color: 'var(--text-muted)' }}>
          Utiliser le scan code-barres à la place
        </button>
      </div>
    </AppShell>
  );

  // ── Choose ──
  if (mode === 'choose') return (
    <AppShell>
      <div className="flex items-center gap-2.5 mb-5">
        <ScanLine className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-lg font-semibold">Ajouter au frigo</h1>
      </div>
      <div className="space-y-3">
        <button onClick={() => setMode('scan')}
          className="card w-full p-5 flex items-center gap-4 hover:shadow-sm transition-all text-left relative overflow-hidden">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--bg-inset)' }}>
            <Camera className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Scanner le frigo / placard</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Prends une ou plusieurs photos, l&apos;IA identifie les aliments</p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0"
            style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: 'rgb(180,120,0)' }}>Premium</span>
        </button>
        <button onClick={() => setMode('barcode')}
          className="card w-full p-5 flex items-center gap-4 hover:shadow-sm transition-all text-left">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--bg-inset)' }}>
            <Barcode className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm">Scanner un code-barres</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Identifie n&apos;importe quel produit emballé instantanément</p>
          </div>
        </button>
      </div>
    </AppShell>
  );

  // ── Mode PHOTO ──
  if (mode === 'scan') return (
    <>
      {/* Caméra plein écran — fixe, boutons toujours visibles */}
      {cameraActive && (
        <FullscreenCamera
          videoRef={videoRef}
          onCapture={capturePhoto}
          onClose={() => { stopCamera(); }}
          captureLabel="Capturer"
        />
      )}

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

        {/* Photos prises */}
        {images.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">{images.length} photo{images.length > 1 ? 's' : ''}</p>
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

        {/* Boutons principaux */}
        {!scanning && results.length === 0 && (
          <div className="space-y-3 mb-4">
            {images.length === 0 ? (
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
            ) : (
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
        )}

        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />

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
    </>
  );

  // ── Mode BARCODE ──
  return (
    <>
      {/* Caméra barcode plein écran */}
      {barCamera && (
        <FullscreenCamera
          videoRef={barVideoRef}
          onClose={stopBarcodeCamera}
          captureLabel=""
        >
          <BarcodeViewfinder status={barStatus} />
        </FullscreenCamera>
      )}

      <AppShell>
        <div className="flex items-center gap-2.5 mb-4">
          <button onClick={() => { setMode('choose'); setBarcodeResult(null); setBarcodeError(''); stopBarcodeCamera(); }}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-inset)]">
            <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
          <Barcode className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <h1 className="text-base font-semibold">Code-barres</h1>
        </div>

        {/* Bouton caméra */}
        <button onClick={startBarcodeCamera}
          className="card w-full p-4 flex items-center gap-3 hover:shadow-sm transition-all text-left mb-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--bg-inset)' }}>
            <Camera className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div>
            <p className="font-medium text-sm">Scanner avec la caméra</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>EAN-13, EAN-8, UPC, QR code — iOS &amp; Android</p>
          </div>
        </button>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
          <span className="text-xs px-2" style={{ color: 'var(--text-muted)' }}>ou saisir manuellement</span>
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
        </div>

        <form onSubmit={e => { e.preventDefault(); if (barcodeInput.trim()) lookupBarcode(barcodeInput.trim()); }}
          className="flex gap-2 mb-4">
          <input
            type="text" inputMode="numeric"
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

              {barcodeResult.nutrients?.calories > 0 && (
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
                  <Check className="w-4 h-4" /><span className="text-sm font-medium">Ajouté au frigo !</span>
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
    </>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={null}>
      <ScanPageInner />
    </Suspense>
  );
}
