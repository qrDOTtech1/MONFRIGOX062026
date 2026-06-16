'use client';

import { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Link from 'next/link';
import {
  Camera, Upload, ScanLine, Loader2, Check, Plus,
  Trash2, ImagePlus, Info, Barcode, X, Lock, ReceiptText,
} from 'lucide-react';

interface DetectedItem {
  name: string;
  confidence: number;
  ingredientId?: string;
  manual?: boolean; // ajouté à la main (produit manqué par l'IA)
  expiresAt?: string | null;   // date de péremption estimée (yyyy-mm-dd)
  quantity?: number;
  unit?: string;
  freezable?: boolean;
  freezeTip?: string | null;
}

interface IngredientSuggestion { id: string; name: string; emoji: string; }

const keyOf = (name: string) => name.trim().toLowerCase();

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
  photos = [],
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onCapture?: () => void;
  onClose: () => void;
  captureLabel?: string;
  children?: React.ReactNode; // viseur custom (barcode)
  photos?: string[]; // photos déjà prises (pour le compteur/miniatures)
}) {
  const [flash, setFlash] = useState(false);
  const count = photos.length;
  const lastPhotos = photos.slice(-3);

  function handleCapture() {
    if (!onCapture) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    onCapture();
  }

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

      {/* Flash de capture */}
      {flash && <div className="absolute inset-0 bg-white pointer-events-none" style={{ animation: 'none', opacity: 0.85 }} />}

      {/* Overlay custom (viseur barcode etc.) */}
      {children && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {children}
        </div>
      )}

      {/* Compteur de photos (en haut) */}
      {onCapture && count > 0 && (
        <div className="absolute top-0 left-0 right-0 flex items-center justify-center gap-2 px-4 py-3"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)', paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center gap-1.5">
            {lastPhotos.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={p} alt="" className="w-9 h-9 rounded-md object-cover" style={{ border: '2px solid rgba(255,255,255,0.85)' }} />
            ))}
          </div>
          <span className="text-white text-sm font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
            {count} photo{count > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Boutons — toujours visibles en bas, padding safe-area iOS */}
      <div
        className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 px-6 py-5"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
          paddingBottom: 'calc(4.5rem + max(0.5rem, env(safe-area-inset-bottom)))',
        }}
      >
        <button
          onClick={onClose}
          className="flex-1 max-w-[160px] py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
          style={{ backgroundColor: count > 0 ? 'var(--accent)' : 'rgba(255,255,255,0.18)', color: count > 0 ? 'var(--accent-text)' : 'white', backdropFilter: 'blur(4px)' }}
        >
          {count > 0 ? <><Check className="w-4 h-4" /> Terminé · {count}</> : 'Fermer'}
        </button>
        {onCapture && (
          <button
            onClick={handleCapture}
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
  // Type de scan photo : frigo (objets) ou ticket de caisse (OCR)
  const [scanType, setScanType] = useState<'fridge' | 'receipt'>('fridge');
  useEffect(() => {
    if (searchParams.get('mode') === 'barcode') setMode('barcode');
  }, [searchParams]);

  // ── Mode photo ──
  const [images, setImages]     = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [results, setResults]   = useState<DetectedItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addingToFridge, setAddingToFridge] = useState(false);
  const [addedCount, setAddedCount] = useState<number | null>(null);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const fileRef                 = useRef<HTMLInputElement>(null);
  const videoRef                = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // ── Ajout produit manquant (autocomplétion) ──
  const [manualQuery, setManualQuery] = useState('');
  const [manualSuggestions, setManualSuggestions] = useState<IngredientSuggestion[]>([]);
  const [manualFocused, setManualFocused] = useState(false);

  useEffect(() => {
    const q = manualQuery.trim();
    if (q.length < 2) { setManualSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ingredients/search?q=${encodeURIComponent(q)}`);
        if (res.ok) setManualSuggestions(await res.json());
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(timer);
  }, [manualQuery]);

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
  // On affiche d'abord le composant (setCameraActive=true) pour que videoRef soit monté,
  // puis useEffect démarre le stream une fois le <video> disponible dans le DOM.
  function startCamera() {
    setCameraActive(true);
  }

  useEffect(() => {
    if (!cameraActive) return;
    let active = true;
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
    }).then(stream => {
      if (active && videoRef.current) {
        videoRef.current.srcObject = stream;
      } else {
        stream.getTracks().forEach(t => t.stop());
      }
    }).catch(() => {
      if (active) {
        setCameraActive(false);
        alert("Impossible d'accéder à la caméra");
      }
    });
    return () => { active = false; };
  }, [cameraActive]);

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

  // OCR local (Tesseract.js) pour les tickets — zéro consommation IA, gratuit pour tous
  // Prétraitement : agrandit si petit, niveaux de gris + contraste → meilleur OCR ticket
  function preprocessForOcr(dataUrl: string): Promise<string> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const minW = 1000;
        const scale = img.width < minW ? minW / img.width : 1;
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(dataUrl); return; }
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;
        // Niveaux de gris + renforcement de contraste
        const contrast = 1.5;
        const intercept = 128 * (1 - contrast);
        for (let i = 0; i < d.length; i += 4) {
          let g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          g = g * contrast + intercept;
          g = Math.max(0, Math.min(255, g));
          d[i] = d[i + 1] = d[i + 2] = g;
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  async function ocrReceiptImages(): Promise<string> {
    setOcrProgress(0);
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('fra', 1, {
      logger: m => {
        if (m.status === 'recognizing text') setOcrProgress(Math.round(m.progress * 100));
      },
    });
    let fullText = '';
    try {
      for (const img of images) {
        const prepped = await preprocessForOcr(img);
        const { data } = await worker.recognize(prepped);
        fullText += data.text + '\n';
      }
    } finally {
      await worker.terminate();
    }
    return fullText;
  }

  async function analyzeAllImages() {
    setScanning(true); setResults([]); setAddedCount(null);
    const seen = new Set<string>(); const all: DetectedItem[] = [];

    if (scanType === 'receipt') {
      // Ticket : OCR côté client puis matching texte côté serveur (pas d'IA)
      try {
        const text = await ocrReceiptImages();
        const res = await fetch('/api/scan/receipt', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (res.ok) {
          const data = await res.json();
          for (const item of data.items || []) {
            if (!seen.has(item.name.toLowerCase())) { seen.add(item.name.toLowerCase()); all.push(item); }
          }
          if (data.message && all.length === 0) alert(data.message);
        }
      } catch { alert('Erreur pendant la lecture du ticket. Réessaie avec une photo plus nette.'); }
      setOcrProgress(null);
    } else {
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
    }
    setResults(all);
    // Tout pré-sélectionné par défaut
    setSelected(new Set(all.map(i => keyOf(i.name))));
    setScanning(false);
  }

  function toggleSelect(name: string) {
    const k = keyOf(name);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  }
  function selectAll() { setSelected(new Set(results.map(i => keyOf(i.name)))); }
  function deselectAll() { setSelected(new Set()); }

  // Ajoute un produit manqué par l'IA (depuis l'autocomplétion ou texte libre)
  function addManualItem(name: string, ingredientId?: string) {
    const k = keyOf(name);
    if (!name.trim()) return;
    setResults(prev => prev.some(i => keyOf(i.name) === k)
      ? prev
      : [...prev, { name: name.trim(), confidence: 1, ingredientId, manual: true }]);
    setSelected(prev => new Set(prev).add(k));
    setManualQuery('');
    setManualSuggestions([]);
    setManualFocused(false);
  }

  // Résout l'id d'ingrédient (le crée si besoin) puis l'ajoute au frigo
  async function resolveAndAdd(item: DetectedItem): Promise<boolean> {
    let ingredientId = item.ingredientId;
    if (!ingredientId) {
      try {
        const res = await fetch('/api/ingredients', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: item.name }),
        });
        if (res.ok) { const ing = await res.json(); ingredientId = ing.id; }
      } catch { /* ignore */ }
    }
    if (!ingredientId) return false;
    try {
      await fetch('/api/fridge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredientId,
          quantity: item.quantity,
          unit: item.unit,
          expiresAt: item.expiresAt || undefined, // date de péremption estimée
        }),
      });
      return true;
    } catch { return false; }
  }

  async function addSelectedToFridge() {
    const toAdd = results.filter(i => selected.has(keyOf(i.name)));
    if (toAdd.length === 0) return;
    setAddingToFridge(true);
    let count = 0;
    for (const item of toAdd) {
      if (await resolveAndAdd(item)) count++;
    }
    setAddedCount(count);
    setAddingToFridge(false);
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
        <button onClick={() => { setScanType('fridge'); setMode('scan'); }}
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
        <button onClick={() => { setScanType('receipt'); setMode('scan'); }}
          className="card w-full p-5 flex items-center gap-4 hover:shadow-sm transition-all text-left relative overflow-hidden">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--bg-inset)' }}>
            <ReceiptText className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Scanner un ticket de caisse</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Photo du reçu, tous tes achats ajoutés d&apos;un coup</p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0"
            style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: 'rgb(16,185,129)' }}>Gratuit</span>
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
          photos={images}
        />
      )}

      <AppShell>
        <div className="flex items-center gap-2.5 mb-4">
          <button onClick={() => { setMode('choose'); setImages([]); setResults([]); setSelected(new Set()); setAddedCount(null); }}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-inset)]">
            <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
          {scanType === 'receipt'
            ? <ReceiptText className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            : <ScanLine className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />}
          <h1 className="text-base font-semibold">{scanType === 'receipt' ? 'Scanner un ticket' : 'Scanner le frigo'}</h1>
        </div>

        <div className="rounded-lg p-3.5 mb-4" style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--text-secondary)' }} />
            {scanType === 'receipt' ? (
              <ul className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                <li>🧾 Photographie le ticket bien à plat</li>
                <li>💡 Bon éclairage, texte net et lisible</li>
                <li>🛒 L&apos;IA extrait seulement les produits alimentaires</li>
              </ul>
            ) : (
              <ul className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                <li>📸 Plusieurs photos sous différents angles</li>
                <li>💡 Bon éclairage, étiquettes visibles</li>
                <li>🗄️ Fonctionne aussi pour un placard ou garde-manger</li>
              </ul>
            )}
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
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <div className="flex items-center gap-2.5">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {scanType === 'receipt'
                  ? (ocrProgress !== null ? `Lecture du ticket… ${ocrProgress}%` : 'Préparation OCR…')
                  : 'Analyse en cours…'}
              </p>
            </div>
            {scanType === 'receipt' && ocrProgress !== null && (
              <div className="w-48 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-inset)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${ocrProgress}%`, backgroundColor: 'var(--accent)' }} />
              </div>
            )}
          </div>
        )}

        {results.length > 0 && addedCount === null && (
          <div className="fade-in">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-medium text-sm">{results.length} ingrédient{results.length > 1 ? 's' : ''} · {selected.size} sélectionné{selected.size > 1 ? 's' : ''}</h2>
              <button
                onClick={() => selected.size === results.length ? deselectAll() : selectAll()}
                className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                {selected.size === results.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>

            {/* Rappel congélation */}
            {results.some(r => r.freezable) && (
              <div className="rounded-lg px-3 py-2 mb-2 text-xs flex items-start gap-2" style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', color: 'var(--text-secondary)' }}>
                <span>❄️</span>
                <span>Certains aliments (marqués <strong>congelable</strong>) peuvent être congelés pour éviter le gaspillage et se conserver bien plus longtemps.</span>
              </div>
            )}

            {/* Liste avec cases à cocher */}
            <div className="space-y-1.5">
              {results.map((item, i) => {
                const isSel = selected.has(keyOf(item.name));
                return (
                  <button key={i} onClick={() => toggleSelect(item.name)}
                    className="card p-3 flex items-center gap-3 w-full text-left transition-colors"
                    style={isSel ? { borderColor: 'var(--accent)' } : undefined}>
                    <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all"
                      style={isSel
                        ? { backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }
                        : { borderColor: 'var(--border)' }}>
                      {isSel && <Check className="w-3.5 h-3.5" style={{ color: 'var(--accent-text)' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.name}
                        {item.quantity && item.quantity !== 1 && (
                          <span className="font-normal" style={{ color: 'var(--text-muted)' }}> · {item.quantity} {item.unit}</span>
                        )}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {item.manual ? 'Ajouté manuellement' : `${Math.round(item.confidence * 100)}% confiance`}
                        </span>
                        {item.expiresAt && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(234,179,8,0.12)', color: 'rgb(180,120,0)' }}>
                            ⏳ ~{new Date(item.expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        {item.freezable && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: 'rgb(59,130,246)' }} title={item.freezeTip || 'Peut être congelé'}>
                            ❄️ congelable
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Ajouter un produit manqué par l'IA */}
            <div className="card p-3.5 mt-3">
              <p className="text-xs font-medium mb-2">L&apos;IA a oublié un produit ?</p>

              {/* Autocomplétion ingrédient */}
              <div className="relative mb-2">
                <input
                  value={manualQuery}
                  onChange={e => setManualQuery(e.target.value)}
                  onFocus={() => setManualFocused(true)}
                  onBlur={() => setTimeout(() => setManualFocused(false), 150)}
                  onKeyDown={e => { if (e.key === 'Enter' && manualQuery.trim()) addManualItem(manualQuery); }}
                  placeholder="Chercher / ajouter un ingrédient…"
                  className="input-field !py-2 text-sm w-full"
                  autoComplete="off"
                />
                {manualFocused && (manualSuggestions.length > 0 || manualQuery.trim().length >= 2) && (
                  <div className="absolute z-20 left-0 right-0 mt-1 rounded-lg overflow-hidden shadow-lg max-h-44 overflow-y-auto"
                    style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                    {manualSuggestions.map(s => (
                      <button key={s.id} type="button"
                        onMouseDown={e => { e.preventDefault(); addManualItem(s.name, s.id); }}
                        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-[var(--bg-inset)]">
                        <span>{s.emoji || '🍽️'}</span> {s.name}
                      </button>
                    ))}
                    {manualQuery.trim().length >= 2 && !manualSuggestions.some(s => keyOf(s.name) === keyOf(manualQuery)) && (
                      <button type="button"
                        onMouseDown={e => { e.preventDefault(); addManualItem(manualQuery); }}
                        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-[var(--bg-inset)]"
                        style={{ color: 'var(--accent)' }}>
                        <Plus className="w-3.5 h-3.5" /> Ajouter « {manualQuery.trim()} »
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Via code-barres EAN */}
              <button onClick={() => setMode('barcode')}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                <Barcode className="w-4 h-4" /> Ajouter via code-barres (EAN)
              </button>
            </div>

            {/* CTA ajouter au frigo */}
            <button onClick={addSelectedToFridge} disabled={selected.size === 0 || addingToFridge}
              className="btn-primary w-full mt-3 flex items-center justify-center gap-2 disabled:opacity-40">
              {addingToFridge
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Ajout en cours…</>
                : <><Plus className="w-4 h-4" /> Ajouter au frigo ({selected.size})</>}
            </button>
            <button onClick={() => { setImages([]); setResults([]); setSelected(new Set()); setAddedCount(null); }}
              className="btn-secondary w-full mt-2">
              Nouveau scan
            </button>
          </div>
        )}

        {/* Succès */}
        {addedCount !== null && (
          <div className="fade-in text-center py-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}>
              <Check className="w-7 h-7 text-emerald-500" />
            </div>
            <p className="font-semibold text-sm mb-1">{addedCount} ingrédient{addedCount > 1 ? 's' : ''} ajouté{addedCount > 1 ? 's' : ''} au frigo !</p>
            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Retrouve-les dans ton frigo.</p>
            <div className="flex gap-2">
              <Link href="/fridge" className="btn-secondary flex-1">Voir mon frigo</Link>
              <button onClick={() => { setImages([]); setResults([]); setSelected(new Set()); setAddedCount(null); }} className="btn-primary flex-1">
                Nouveau scan
              </button>
            </div>
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
