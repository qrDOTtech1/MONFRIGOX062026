'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { ArrowLeft, Plus, X, Loader2, ChefHat, Globe, Lock, Camera, ImagePlus } from 'lucide-react';

interface IngredientRow {
  name: string;
  quantity: string;
  unit: string;
}

interface IngredientSuggestion { id: string; name: string; emoji: string; }

const CUISINES = ['Maison', 'FR', 'IT', 'JP', 'MX', 'IN', 'MA', 'TH', 'VN', 'CN', 'US', 'ES', 'GR', 'Autre'];
const DIFFICULTIES = [
  { key: 'FACILE', label: 'Facile' },
  { key: 'MOYEN', label: 'Moyen' },
  { key: 'DIFFICILE', label: 'Difficile' },
];
// Pré-sélections proposées (datalists)
const COMMON_QUANTITIES = ['1', '2', '3', '4', '1/2', '1/4', '50', '100', '150', '200', '250', '300', '500', '750', '1000'];
const COMMON_UNITS = ['g', 'kg', 'ml', 'cl', 'l', 'c.à.s.', 'c.à.c.', 'pièce', 'tranche', 'gousse', 'pincée', 'poignée', 'sachet', 'boîte', 'botte', 'verre', 'tasse', 'feuille', 'brin'];

export default function NewRecipePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cuisine, setCuisine] = useState('Maison');
  const [difficulty, setDifficulty] = useState('FACILE');
  const [prepTime, setPrepTime] = useState(30);
  const [servings, setServings] = useState(4);
  const [instructions, setInstructions] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([{ name: '', quantity: '', unit: '' }]);
  const [image, setImage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);

  // Compresse la photo du résultat (max 800px, JPEG) pour limiter le poids
  async function compressImage(file: File): Promise<string> {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const max = 800;
          let { width, height } = img;
          if (width > max || height > max) {
            if (width > height) { height = Math.round(height * max / width); width = max; }
            else { width = Math.round(width * max / height); height = max; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.src = e.target!.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setImage(compressed);
    if (photoRef.current) photoRef.current.value = '';
  }

  // Autocomplétion des ingrédients
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([]);

  useEffect(() => {
    if (activeRow === null) { setSuggestions([]); return; }
    const q = ingredients[activeRow]?.name.trim() || '';
    if (q.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ingredients/search?q=${encodeURIComponent(q)}`);
        if (res.ok) setSuggestions(await res.json());
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(timer);
  }, [activeRow, ingredients]);

  function updateIngredient(i: number, field: keyof IngredientRow, value: string) {
    setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing));
  }
  function pickSuggestion(i: number, s: IngredientSuggestion) {
    updateIngredient(i, 'name', s.name);
    setActiveRow(null);
    setSuggestions([]);
  }
  function addRow() { setIngredients(prev => [...prev, { name: '', quantity: '', unit: '' }]); }
  function removeRow(i: number) { setIngredients(prev => prev.filter((_, idx) => idx !== i)); }

  const canSubmit = name.trim().length > 1 && instructions.trim().length > 5 && ingredients.some(i => i.name.trim());

  async function submit() {
    if (!canSubmit) { setError('Renseigne au moins un nom, une préparation et un ingrédient.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description, cuisine, difficulty, prepTime, servings, isPublic,
          instructions, imageUrl: image,
          ingredients: ingredients.filter(i => i.name.trim()),
        }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        router.push(`/recipes/${data.id}`);
      } else {
        setError(data.error || 'Erreur lors de la création');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <div className="flex items-center gap-2.5 mb-5">
        <ChefHat className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-lg font-semibold">Partager ma recette</h1>
      </div>

      {/* Infos générales */}
      <div className="card p-4 mb-3 space-y-3">
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nom de la recette *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Gratin de courgettes de mamie" className="input-field" />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Description courte</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Un plat réconfortant et simple…" className="input-field" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Cuisine</label>
            <select value={cuisine} onChange={e => setCuisine(e.target.value)} className="input-field">
              {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Difficulté</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="input-field">
              {DIFFICULTIES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Temps (min)</label>
            <input type="number" min={1} value={prepTime} onChange={e => setPrepTime(parseInt(e.target.value) || 0)} className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Portions</label>
            <input type="number" min={1} value={servings} onChange={e => setServings(parseInt(e.target.value) || 0)} className="input-field" />
          </div>
        </div>
      </div>

      {/* Photo du résultat */}
      <div className="card p-4 mb-3">
        <label className="text-xs font-medium block mb-2.5" style={{ color: 'var(--text-secondary)' }}>Photo du résultat</label>
        <input ref={photoRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
        {image ? (
          <div className="relative rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="Aperçu du plat" className="w-full h-48 object-cover" />
            <button
              onClick={() => setImage('')}
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            >
              <X className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => photoRef.current?.click()}
              className="absolute bottom-2 right-2 px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: 'white' }}
            >
              <Camera className="w-3.5 h-3.5" /> Changer
            </button>
          </div>
        ) : (
          <button
            onClick={() => photoRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl transition-colors hover:bg-[var(--bg-inset)]"
            style={{ border: '2px dashed var(--border)' }}
          >
            <ImagePlus className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Ajouter une photo de ton plat</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Appareil photo ou galerie</span>
          </button>
        )}
      </div>

      {/* Ingrédients */}
      <div className="card p-4 mb-3">
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Ingrédients *</label>
        <p className="text-[10px] mb-2.5" style={{ color: 'var(--text-muted)' }}>
          Commence à taper un ingrédient pour le retrouver, ou choisis une quantité/unité suggérée.
        </p>

        {/* Listes de pré-sélection (suggestions natives) */}
        <datalist id="quantities">
          {COMMON_QUANTITIES.map(q => <option key={q} value={q} />)}
        </datalist>
        <datalist id="units">
          {COMMON_UNITS.map(u => <option key={u} value={u} />)}
        </datalist>

        <div className="space-y-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input
                list="quantities"
                value={ing.quantity}
                onChange={e => updateIngredient(i, 'quantity', e.target.value)}
                placeholder="200"
                className="input-field !py-2 w-16 text-sm shrink-0"
              />
              <input
                list="units"
                value={ing.unit}
                onChange={e => updateIngredient(i, 'unit', e.target.value)}
                placeholder="g"
                className="input-field !py-2 w-20 text-sm shrink-0"
              />
              <div className="relative flex-1">
                <input
                  value={ing.name}
                  onChange={e => { updateIngredient(i, 'name', e.target.value); setActiveRow(i); }}
                  onFocus={() => setActiveRow(i)}
                  onBlur={() => setTimeout(() => setActiveRow(r => (r === i ? null : r)), 150)}
                  placeholder="Ingrédient"
                  className="input-field !py-2 w-full text-sm"
                  autoComplete="off"
                />
                {activeRow === i && suggestions.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 rounded-lg overflow-hidden shadow-lg max-h-44 overflow-y-auto"
                    style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                    {suggestions.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={e => { e.preventDefault(); pickSuggestion(i, s); }}
                        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-[var(--bg-inset)]"
                      >
                        <span>{s.emoji || '🍽️'}</span> {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => removeRow(i)} disabled={ingredients.length === 1} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-30 hover:bg-[var(--bg-inset)]">
                <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addRow} className="mt-2.5 flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--accent)' }}>
          <Plus className="w-4 h-4" /> Ajouter un ingrédient
        </button>
      </div>

      {/* Préparation */}
      <div className="card p-4 mb-3">
        <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Préparation *</label>
        <p className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>Une étape par ligne.</p>
        <textarea
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          rows={7}
          placeholder={"Émincer les oignons.\nFaire revenir à la poêle 5 min.\nAjouter les courgettes…"}
          className="input-field resize-none"
        />
      </div>

      {/* Visibilité */}
      <div className="card p-4 mb-4">
        <label className="text-xs font-medium block mb-2.5" style={{ color: 'var(--text-secondary)' }}>Visibilité</label>
        <div className="flex gap-2">
          <button onClick={() => setIsPublic(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={isPublic ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' } : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
            <Globe className="w-4 h-4" /> Publique
          </button>
          <button onClick={() => setIsPublic(false)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={!isPublic ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' } : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
            <Lock className="w-4 h-4" /> Privée
          </button>
        </div>
        <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
          {isPublic
            ? 'Visible par toute la communauté dans Explorer (filtre Communauté).'
            : 'Visible uniquement par toi.'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg px-3.5 py-2.5 text-sm mb-3 text-red-600 dark:text-red-400" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      <button onClick={submit} disabled={saving || !canSubmit} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40 mb-4">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Publication…</> : <><ChefHat className="w-4 h-4" /> Publier ma recette</>}
      </button>
    </AppShell>
  );
}
