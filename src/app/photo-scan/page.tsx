'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Loader2, Plus, Check, ChefHat, RotateCcw, Sparkles } from 'lucide-react';

export default function PhotoScanPage() {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function compressAndAnalyze(file: File) {
    setAnalyzing(true);
    setError('');
    setIngredients([]);
    setSelected(new Set());
    setAdded(false);

    const canvas = document.createElement('canvas');
    const img = new Image();
    img.onload = async () => {
      const max = 800;
      const ratio = Math.min(max / img.width, max / img.height, 1);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.75);
      setPreview(base64);

      try {
        const res = await fetch('/api/photo-ingredients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Erreur lors de l\'analyse');
          setAnalyzing(false);
          return;
        }

        const data = await res.json();
        if (data.ingredients && data.ingredients.length > 0) {
          setIngredients(data.ingredients);
          setSelected(new Set(data.ingredients.map((_: string, i: number) => i)));
        } else {
          setError('Aucun ingrédient détecté. Essaie avec une photo plus claire.');
        }
      } catch {
        setError('Erreur de connexion. Réessaie.');
      }
      setAnalyzing(false);
    };
    img.src = URL.createObjectURL(file);
  }

  function toggleIngredient(idx: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  async function addToFridge() {
    setAdding(true);
    const toAdd = ingredients.filter((_, i) => selected.has(i));

    for (const name of toAdd) {
      const searchRes = await fetch(`/api/ingredients/search?q=${encodeURIComponent(name)}`);
      if (searchRes.ok) {
        const results = await searchRes.json();
        if (results.length > 0) {
          await fetch('/api/fridge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ingredientId: results[0].id }),
          });
        } else {
          const createRes = await fetch('/api/ingredients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
          });
          if (createRes.ok) {
            const ing = await createRes.json();
            await fetch('/api/fridge', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ingredientId: ing.id }),
            });
          }
        }
      }
    }

    setAdding(false);
    setAdded(true);
  }

  function reset() {
    setPreview(null);
    setIngredients([]);
    setSelected(new Set());
    setError('');
    setAdded(false);
    fileRef.current?.click();
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
        style={{ backgroundColor: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-[var(--bg-inset)]">
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
        </button>
        <div>
          <h1 className="text-base font-semibold">Photo → Frigo</h1>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Prends en photo tes ingrédients</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Zone photo initiale */}
        {!preview && !analyzing && (
          <div className="text-center fade-in">
            <div className="mb-6">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(59,130,246,0.12))' }}>
                <Sparkles className="w-8 h-8 text-purple-500" />
              </div>
              <h2 className="text-lg font-semibold mb-1">Scanne tes ingrédients</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Prends en photo tes courses, ton plan de travail ou l{"'"}intérieur de ton frigo.
                L{"'"}IA identifie les ingrédients et les ajoute automatiquement.
              </p>
            </div>

            <label className="flex flex-col items-center justify-center gap-3 py-12 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
              style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(59,130,246,0.06))', border: '2px dashed rgba(168,85,247,0.3)' }}>
              <Camera className="w-12 h-12 text-purple-500" />
              <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">Prendre une photo</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) compressAndAnalyze(file);
                }}
              />
            </label>

            <p className="text-[10px] mt-4" style={{ color: 'var(--text-muted)' }}>
              💡 Astuce : photographie les ingrédients bien étalés pour une meilleure détection
            </p>
          </div>
        )}

        {/* Analyse en cours */}
        {analyzing && (
          <div className="text-center py-16 fade-in">
            {preview && (
              <img src={preview} alt="Photo" className="w-full rounded-xl mb-6 aspect-video object-cover"
                style={{ border: '1px solid var(--border)', opacity: 0.7 }} />
            )}
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-purple-500" />
            <p className="text-sm font-semibold">Analyse en cours…</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>L{"'"}IA identifie les ingrédients sur ta photo</p>
          </div>
        )}

        {/* Résultats */}
        {preview && !analyzing && ingredients.length > 0 && !added && (
          <div className="fade-in">
            <img src={preview} alt="Photo" className="w-full rounded-xl mb-4 aspect-video object-cover"
              style={{ border: '1px solid var(--border)' }} />

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <p className="text-sm font-semibold">{ingredients.length} ingrédient{ingredients.length > 1 ? 's' : ''} détecté{ingredients.length > 1 ? 's' : ''}</p>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
              </p>
            </div>

            <div className="space-y-1 mb-5">
              {ingredients.map((ing, i) => (
                <button key={i} onClick={() => toggleIngredient(i)}
                  className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors text-left hover:bg-[var(--bg-inset)]">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                    selected.has(i) ? 'bg-purple-500 border-purple-500' : ''
                  }`} style={!selected.has(i) ? { borderColor: 'var(--border)' } : undefined}>
                    {selected.has(i) && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className="flex-1 text-sm capitalize">{ing}</span>
                </button>
              ))}
            </div>

            <button onClick={addToFridge} disabled={adding || selected.size === 0}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 mb-3"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {adding ? 'Ajout en cours…' : `Ajouter ${selected.size} ingrédient${selected.size > 1 ? 's' : ''} au frigo`}
            </button>

            <button onClick={reset}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all"
              style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <RotateCcw className="w-4 h-4" />
              Reprendre la photo
            </button>
          </div>
        )}

        {/* Ajouté avec succès */}
        {added && (
          <div className="text-center py-12 fade-in">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-lg font-semibold mb-2">Ingrédients ajoutés !</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              {selected.size} ingrédient{selected.size > 1 ? 's' : ''} ajouté{selected.size > 1 ? 's' : ''} à ton frigo
            </p>

            <div className="flex gap-3 justify-center">
              <button onClick={() => router.push('/fridge')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
                <ChefHat className="w-4 h-4" /> Voir mon frigo
              </button>
              <button onClick={reset}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                <Camera className="w-4 h-4" /> Autre photo
              </button>
            </div>
          </div>
        )}

        {/* Erreur */}
        {error && !analyzing && (
          <div className="fade-in mt-4">
            {preview && (
              <img src={preview} alt="Photo" className="w-full rounded-xl mb-4 aspect-video object-cover"
                style={{ border: '1px solid var(--border)' }} />
            )}
            <div className="rounded-xl p-4 mb-4"
              style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
            <button onClick={reset}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all"
              style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <RotateCcw className="w-4 h-4" />
              Réessayer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
