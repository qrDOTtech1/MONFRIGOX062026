'use client';

import { useState, useRef } from 'react';
import AppShell from '@/components/AppShell';
import { Camera, Upload, ScanLine, Loader2, Check, Plus } from 'lucide-react';

interface DetectedItem {
  name: string;
  confidence: number;
  ingredientId?: string;
}

export default function ScanPage() {
  const [image, setImage] = useState<string | null>(null);
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
      alert('Impossible d\'accéder à la caméra');
    }
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setImage(dataUrl);
    stopCamera();
    analyzeImage(dataUrl);
  }

  function stopCamera() {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImage(dataUrl);
      analyzeImage(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function analyzeImage(dataUrl: string) {
    setScanning(true);
    setResults([]);
    try {
      const base64 = dataUrl.split(',')[1];
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.items || []);
      }
    } catch {
      // silent
    } finally {
      setScanning(false);
    }
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

  return (
    <AppShell>
      <div className="flex items-center gap-2.5 mb-6">
        <ScanLine className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-lg font-semibold">Scanner mon frigo</h1>
      </div>

      {!image && !cameraActive && (
        <div className="space-y-3">
          <button onClick={startCamera} className="card w-full p-6 flex flex-col items-center gap-3 hover:shadow-sm transition-all">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg-inset)' }}>
              <Camera className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">Prendre une photo</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Ouvre la caméra pour scanner ton frigo</p>
            </div>
          </button>

          <button onClick={() => fileRef.current?.click()} className="card w-full p-6 flex flex-col items-center gap-3 hover:shadow-sm transition-all">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg-inset)' }}>
              <Upload className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">Importer une image</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Depuis ta galerie ou tes fichiers</p>
            </div>
          </button>

          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        </div>
      )}

      {cameraActive && (
        <div className="relative rounded-xl overflow-hidden mb-4">
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl" />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
            <button onClick={stopCamera} className="btn-secondary !py-2 !px-4 text-sm">Annuler</button>
            <button onClick={capturePhoto} className="btn-primary !py-2 !px-4 text-sm">Capturer</button>
          </div>
        </div>
      )}

      {image && (
        <div className="mb-4">
          <img src={image} alt="Scan" className="w-full rounded-xl mb-4" />
          {scanning && (
            <div className="flex items-center justify-center gap-2.5 py-6">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Analyse en cours...</p>
            </div>
          )}
        </div>
      )}

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
            onClick={() => { setImage(null); setResults([]); setAdded(new Set()); }}
            className="btn-secondary w-full mt-4"
          >
            Nouveau scan
          </button>
        </div>
      )}
    </AppShell>
  );
}
