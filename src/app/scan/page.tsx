'use client';

import { useState, useRef } from 'react';
import AppShell from '@/components/AppShell';
import { Camera, Upload, ScanLine, Loader2, Check, Plus, Trash2, ImagePlus, Info } from 'lucide-react';

interface DetectedItem {
  name: string;
  confidence: number;
  ingredientId?: string;
}

export default function ScanPage() {
  const [images, setImages] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<DetectedItem[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch {
      alert("Impossible d'accéder à la caméra");
    }
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setImages(prev => [...prev, dataUrl]);
    // Ne pas arrêter la caméra pour permettre plusieurs captures
  }

  function stopCamera() {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    // Reset pour pouvoir re-sélectionner
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeImage(index: number) {
    setImages(prev => prev.filter((_, i) => i !== index));
  }

  async function analyzeAllImages() {
    if (images.length === 0) return;
    setScanning(true);
    setResults([]);
    const allItems: DetectedItem[] = [];
    const seenNames = new Set<string>();

    for (const img of images) {
      try {
        const base64 = img.split(',')[1];
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });
        if (res.ok) {
          const data = await res.json();
          for (const item of data.items || []) {
            const key = item.name.toLowerCase();
            if (!seenNames.has(key)) {
              seenNames.add(key);
              allItems.push(item);
            }
          }
        }
      } catch {
        // continue avec les autres images
      }
    }
    setResults(allItems);
    setScanning(false);
  }

  async function addItem(item: DetectedItem) {
    if (!item.ingredientId) return;
    await fetch('/api/fridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredientId: item.ingredientId }),
    });
    setAdded(prev => new Set(prev).add(item.name));
  }

  async function addAll() {
    for (const item of results) {
      if (item.ingredientId && !added.has(item.name)) {
        await addItem(item);
      }
    }
  }

  const hasImages = images.length > 0;

  return (
    <AppShell>
      <div className="flex items-center gap-2.5 mb-2">
        <ScanLine className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-lg font-semibold">Scanner mon frigo ou placard</h1>
      </div>

      {/* Instructions */}
      <div className="rounded-lg p-3.5 mb-5" style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--text-secondary)' }} />
          <div>
            <p className="text-sm font-medium mb-1.5">Conseils pour un meilleur scan</p>
            <ul className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
              <li>📸 Prends <strong>plusieurs photos</strong> de ton frigo et/ou placard sous différents angles</li>
              <li>💡 Assure-toi d&apos;avoir un bon éclairage</li>
              <li>📦 Montre les étiquettes des produits si possible</li>
              <li>🥕 Sors les aliments du fond pour qu&apos;ils soient visibles</li>
              <li>🗄️ Fonctionne aussi pour un <strong>placard</strong>, un <strong>garde-manger</strong> ou un <strong>plan de travail</strong></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Zone d'images multiples */}
      {!cameraActive && (
        <>
          {hasImages && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">{images.length} photo{images.length > 1 ? 's' : ''}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tu peux en ajouter d&apos;autres</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden group" style={{ aspectRatio: '1' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {/* Bouton ajouter une photo supplémentaire */}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="rounded-lg flex flex-col items-center justify-center gap-1 transition-colors hover:bg-[var(--bg-inset)]"
                  style={{ aspectRatio: '1', border: '2px dashed var(--border)' }}
                >
                  <ImagePlus className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Ajouter</span>
                </button>
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="space-y-3 mb-4">
            {!hasImages && (
              <>
                <button onClick={startCamera} className="card w-full p-5 flex flex-col items-center gap-3 hover:shadow-sm transition-all">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg-inset)' }}>
                    <Camera className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">Prendre des photos</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Ouvre la caméra pour scanner frigo ou placard</p>
                  </div>
                </button>

                <button onClick={() => fileRef.current?.click()} className="card w-full p-5 flex flex-col items-center gap-3 hover:shadow-sm transition-all">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg-inset)' }}>
                    <Upload className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">Importer des images</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Depuis ta galerie — sélection multiple possible</p>
                  </div>
                </button>
              </>
            )}

            {hasImages && !scanning && results.length === 0 && (
              <div className="flex gap-2">
                <button onClick={startCamera} className="btn-secondary flex items-center gap-2 flex-1 justify-center">
                  <Camera className="w-4 h-4" /> Ajouter photo
                </button>
                <button onClick={analyzeAllImages} className="btn-primary flex items-center gap-2 flex-1 justify-center">
                  <ScanLine className="w-4 h-4" /> Analyser {images.length > 1 ? `(${images.length} photos)` : ''}
                </button>
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </>
      )}

      {/* Caméra */}
      {cameraActive && (
        <div className="relative rounded-xl overflow-hidden mb-4">
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl" />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
            <button onClick={stopCamera} className="btn-secondary !py-2 !px-4 text-sm">Terminé</button>
            <button onClick={capturePhoto} className="btn-primary !py-2 !px-4 text-sm flex items-center gap-1.5">
              <Camera className="w-4 h-4" /> Capturer
            </button>
          </div>
          {images.length > 0 && (
            <div className="absolute top-3 right-3 badge text-xs font-semibold" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: 'white' }}>
              {images.length} photo{images.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Scanning */}
      {scanning && (
        <div className="flex items-center justify-center gap-2.5 py-8">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Analyse de {images.length} photo{images.length > 1 ? 's' : ''} en cours...</p>
        </div>
      )}

      {/* Résultats */}
      {results.length > 0 && (
        <div className="fade-in">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm">{results.length} ingrédient{results.length > 1 ? 's' : ''} détecté{results.length > 1 ? 's' : ''}</h2>
            <button onClick={addAll} className="btn-primary !py-1.5 !px-3 text-xs">Tout ajouter</button>
          </div>
          <div className="space-y-1.5">
            {results.map((item, i) => (
              <div key={i} className="card p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Confiance: {Math.round(item.confidence * 100)}%</p>
                </div>
                {added.has(item.name) ? (
                  <div className="w-7 h-7 rounded-md flex items-center justify-center bg-emerald-500/10">
                    <Check className="w-4 h-4 text-emerald-500" />
                  </div>
                ) : (
                  <button onClick={() => addItem(item)} className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--bg-inset)]" style={{ border: '1px solid var(--border)' }}>
                    <Plus className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => { setImages([]); setResults([]); setAdded(new Set()); }}
            className="btn-secondary w-full mt-4"
          >
            Nouveau scan
          </button>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-6 text-center">
        <p className="text-[10px]" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
          monfrigo.app utilise NovaIA et peut se tromper. Vérifie toujours les ingrédients détectés avant de les ajouter.
        </p>
      </div>
    </AppShell>
  );
}
