'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import {
  ArrowLeft, Clock, Users, Heart, ShoppingCart, Check, X, ChefHat,
  Minus, Plus, Flame, Wheat, Droplets, Beef, Sparkles,
  MessageSquare, Globe, Lock, Send, Trash2, ImagePlus, Loader2,
  Euro, ExternalLink, Wand2, Crown, AlertTriangle, Ban, CalendarPlus, FolderHeart, Share2,
} from 'lucide-react';
import { ALLERGEN_LABELS } from '@/lib/dietary';

interface RevisitResult {
  title?: string; description?: string;
  ingredients?: Array<{ name: string; quantity: string; unit: string }>;
  instructions?: string; tips?: string;
}

interface CostEstimate {
  total: number;
  perServing: number;
  currency: string;
  confidence: 'high' | 'medium' | 'low';
  missingCount: number;
  breakdown: Array<{ name: string; emoji: string; price: number; source: string }>;
}

interface RecipeNote {
  id: string;
  content: string;
  photoUrl: string;
  isPublic: boolean;
  createdAt: string;
  user?: { name: string; email: string };
}

interface Recipe {
  id: string;
  name: string;
  description: string;
  instructions: string;
  difficulty: string;
  prepTime: number;
  cuisine: string;
  servings: number;
  imageUrl?: string;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  fiber: number | null;
  salt: number | null;
  nutriScore: string;
  kidFriendly: boolean;
  babyFriendly: boolean;
  ingredients: Array<{
    quantity: number;
    unit: string;
    ingredient: { id: string; name: string; emoji: string };
    inFridge: boolean;
  }>;
  isFavorite: boolean;
  allergenWarnings?: string[];
  dietConflict?: boolean;
  dietLabel?: string;
  dietConflictIngredients?: string[];
  isCommunity?: boolean;
  authorName?: string | null;
}

function parseSteps(raw: string): string[] {
  if (!raw) return [];
  const text = raw.trim();
  let parts = text.split(/\r?\n|\\n/).map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) return clean(parts);
  parts = text.split(/(?=(?:\d+[\.\)]\s)|(?:étape\s*\d+\s*[:.\-]?\s))/i).map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) return clean(parts);
  parts = text.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖÙ-Ý])/).map(s => s.trim()).filter(Boolean);
  return parts.length > 1 ? clean(parts) : [text];
}
function clean(steps: string[]): string[] {
  return steps.map(s => s.replace(/^\s*(?:étape\s*\d+\s*[:.\-]?\s*|\d+[\.\)]\s*|[-•*]\s*)/i, '').trim()).filter(Boolean);
}

const NUTRISCORE_COLORS: Record<string, string> = {
  A: 'bg-emerald-600', B: 'bg-lime-500', C: 'bg-yellow-500', D: 'bg-orange-500', E: 'bg-red-600',
};

const MEAL_TYPES = [
  { key: 'BREAKFAST', label: 'Matin' },
  { key: 'LUNCH', label: 'Déjeuner' },
  { key: 'DINNER', label: 'Dîner' },
];

export default function RecipeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState<number>(4);
  const [enriching, setEnriching] = useState(false);
  const enrichTriggered = useRef(false);
  const [showNutritionDetails, setShowNutritionDetails] = useState(false);

  // Substitution IA
  const [subLoading, setSubLoading] = useState<string | null>(null);
  const [substitutions, setSubstitutions] = useState<Record<string, { substitute: string; quantity: number; unit: string; reason: string; inFridge: boolean }>>({});

  // Cook log + rating
  const [showCookLog, setShowCookLog] = useState(false);
  const [cookRating, setCookRating] = useState(0);
  const [cookSaving, setCookSaving] = useState(false);
  const [cookDone, setCookDone] = useState(false);

  // EAN nutrition
  const [eanNutrition, setEanNutrition] = useState<{
    available: boolean; coverage: number;
    perServing: { kcal: number; protein: number; fat: number; carbs: number };
    micros?: Record<string, number>;
    microAjr?: Record<string, { ajr: number; unit: string; label: string; emoji: string }>;
  } | null>(null);

  // Coût estimé
  const [cost, setCost] = useState<CostEstimate | null>(null);

  // Revisit IA
  const [revisitOpen, setRevisitOpen]       = useState(false);
  const [revisitInstruction, setRevisitInstruction] = useState('');
  const [revisiting, setRevisiting]         = useState(false);
  const [revisitResult, setRevisitResult]   = useState<RevisitResult | null>(null);
  const [revisitError, setRevisitError]     = useState('');
  const [revisitRemaining, setRevisitRemaining] = useState<number | null>(null);
  const [savingRevisit, setSavingRevisit]   = useState(false);

  // Notes communautaires
  const [myNote, setMyNote]           = useState<RecipeNote | null>(null);
  const [communityNotes, setCommunityNotes] = useState<RecipeNote[]>([]);
  const [noteContent, setNoteContent] = useState('');
  const [notePublic, setNotePublic]   = useState(false);
  const [notePhoto, setNotePhoto]     = useState('');
  const [savingNote, setSavingNote]   = useState(false);
  const [noteSaved, setNoteSaved]     = useState(false);
  const [deletingNote, setDeletingNote] = useState(false);
  const notePhotoRef = useRef<HTMLInputElement>(null);

  // Planning des repas
  const [showPlan, setShowPlan] = useState(false);
  const [planDate, setPlanDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [planMeal, setPlanMeal] = useState('DINNER');
  const [planSaved, setPlanSaved] = useState(false);

  // Carnets / collections
  const [showCollections, setShowCollections] = useState(false);
  const [collections, setCollections] = useState<Array<{ id: string; name: string; emoji: string; hasRecipe?: boolean }>>([]);
  const [newColName, setNewColName] = useState('');
  const [sharing, setSharing] = useState(false);

  async function shareAsImage() {
    if (!recipe || sharing) return;
    setSharing(true);
    try {
      const W = 1080, H = 1350;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d')!;

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#065f46');
      grad.addColorStop(0.4, '#047857');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Decorative circles
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(W * 0.85, H * 0.12, 200, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(W * 0.1, H * 0.9, 150, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;

      // Load image if exists
      let imgLoaded = false;
      if (recipe.imageUrl) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject();
            img.src = recipe.imageUrl!;
          });
          const imgH = 480;
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(60, 60, W - 120, imgH, [24, 24, 0, 0]);
          ctx.clip();
          const scale = Math.max((W - 120) / img.width, imgH / img.height);
          const sw = img.width * scale, sh = img.height * scale;
          ctx.drawImage(img, 60 + (W - 120 - sw) / 2, 60 + (imgH - sh) / 2, sw, sh);
          ctx.restore();
          imgLoaded = true;
        } catch { /* no image fallback */ }
      }

      let y = imgLoaded ? 580 : 120;

      // Recipe name
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 52px system-ui, sans-serif';
      const nameLines = wrapText(ctx, recipe.name, W - 140);
      for (const line of nameLines) { ctx.fillText(line, 70, y); y += 62; }
      y += 10;

      // Metadata line
      ctx.font = '28px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      const meta = `${recipe.prepTime} min · ${recipe.servings} pers. · ${recipe.difficulty}${recipe.cuisine ? ' · ' + recipe.cuisine : ''}`;
      ctx.fillText(meta, 70, y); y += 50;

      // Divider
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(70, y); ctx.lineTo(W - 70, y); ctx.stroke();
      y += 35;

      // Ingredients
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.fillText('Ingrédients', 70, y); y += 40;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '26px system-ui, sans-serif';
      const ratio = servings / (recipe.servings || 1);
      for (const ing of recipe.ingredients.slice(0, 12)) {
        const qty = ing.quantity * ratio;
        const qtyStr = qty % 1 === 0 ? qty.toString() : qty.toFixed(1);
        const line = `${ing.ingredient.emoji} ${qtyStr} ${ing.unit} ${ing.ingredient.name}`;
        ctx.fillText(line, 90, y); y += 36;
      }
      if (recipe.ingredients.length > 12) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText(`+ ${recipe.ingredients.length - 12} autres...`, 90, y); y += 36;
      }

      // Footer branding
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '24px system-ui, sans-serif';
      ctx.fillText('🥦 MonFrigo.app — Cuisine anti-gaspi', 70, H - 50);

      // Nutrition badge
      if (recipe.calories) {
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath(); ctx.roundRect(W - 280, H - 90, 210, 50, 25); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '22px system-ui, sans-serif';
        ctx.fillText(`🔥 ${recipe.calories} kcal/pers`, W - 265, H - 58);
      }

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob(b => resolve(b!), 'image/png', 0.95)
      );
      const file = new File([blob], `monfrigo-${recipe.name.slice(0, 30).replace(/\s+/g, '-')}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: recipe.name, text: `${recipe.name} — recette sur MonFrigo 🥦` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('Share error:', e);
    } finally { setSharing(false); }
  }

  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  async function openCollections() {
    setShowCollections(true);
    const res = await fetch(`/api/collections?recipeId=${id}`);
    if (res.ok) setCollections(await res.json());
  }
  async function toggleCollection(collectionId: string) {
    const res = await fetch('/api/collections/toggle', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionId, recipeId: id }),
    });
    if (res.ok) {
      const { inCollection } = await res.json();
      setCollections(prev => prev.map(c => c.id === collectionId ? { ...c, hasRecipe: inCollection } : c));
    }
  }
  async function createCollectionAndAdd() {
    if (!newColName.trim()) return;
    const res = await fetch('/api/collections', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newColName }),
    });
    if (res.ok) {
      const col = await res.json();
      await fetch('/api/collections/toggle', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId: col.id, recipeId: id }),
      });
      setNewColName('');
      setCollections(prev => [{ id: col.id, name: col.name, emoji: col.emoji, hasRecipe: true }, ...prev]);
    }
  }

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setRecipe(data);
        if (data) setServings(data.servings);
        setLoading(false);
      });
  }, [id]);

  // Chargement du coût estimé
  useEffect(() => {
    if (!id) return;
    fetch(`/api/recipes/${id}/cost`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setCost(data); });
  }, [id]);

  // Chargement nutrition EAN
  useEffect(() => {
    if (!id) return;
    fetch(`/api/recipes/${id}/nutrition-ean`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.available) setEanNutrition(data); });
  }, [id]);

  async function requestSubstitute(ingredientName: string) {
    setSubLoading(ingredientName);
    try {
      const res = await fetch(`/api/recipes/${id}/substitute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredientName }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubstitutions(prev => ({ ...prev, [ingredientName]: data }));
      }
    } finally { setSubLoading(null); }
  }

  async function logCook() {
    setCookSaving(true);
    await fetch('/api/cook-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId: id, servings, rating: cookRating || undefined }),
    });
    setCookSaving(false);
    setCookDone(true);
    setShowCookLog(false);
    setTimeout(() => setCookDone(false), 3000);
  }

  // Chargement des notes
  useEffect(() => {
    if (!id) return;
    fetch(`/api/recipes/${id}/notes`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setCommunityNotes(data.communityNotes || []);
        if (data.myNote) {
          setMyNote(data.myNote);
          setNoteContent(data.myNote.content || '');
          setNotePublic(data.myNote.isPublic || false);
          setNotePhoto(data.myNote.photoUrl || '');
        }
      });
  }, [id]);

  async function compressNotePhoto(file: File): Promise<string> {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const max = 600;
          let { width, height } = img;
          if (width > max || height > max) {
            if (width > height) { height = Math.round(height * max / width); width = max; }
            else { width = Math.round(width * max / height); height = max; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.72));
        };
        img.src = e.target!.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  async function saveNote() {
    if (!noteContent.trim() && !notePhoto) return;
    setSavingNote(true);
    const res = await fetch(`/api/recipes/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: noteContent, photoUrl: notePhoto, isPublic: notePublic }),
    });
    if (res.ok) {
      const saved = await res.json();
      setMyNote(saved.note);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    }
    setSavingNote(false);
  }

  async function deleteNote() {
    setDeletingNote(true);
    await fetch(`/api/recipes/${id}/notes`, { method: 'DELETE' });
    setMyNote(null);
    setNoteContent('');
    setNotePhoto('');
    setNotePublic(false);
    setDeletingNote(false);
  }

  // Auto-enrichissement : si la recette n'a pas de nutrition → l'IA traduit + calcule en arrière-plan
  useEffect(() => {
    if (!recipe || recipe.calories !== null || enrichTriggered.current) return;
    enrichTriggered.current = true;
    setEnriching(true);

    fetch(`/api/recipes/${id}/enrich`, { method: 'POST' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.recipe) {
          setRecipe(prev => prev ? { ...prev, ...data.recipe } : prev);
        }
      })
      .catch(() => {})
      .finally(() => setEnriching(false));
  }, [recipe, id]);

  async function addToPlanning() {
    await fetch('/api/meal-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId: id, date: planDate, mealType: planMeal }),
    });
    setPlanSaved(true);
    setTimeout(() => { setPlanSaved(false); setShowPlan(false); }, 1500);
  }

  const ratio = recipe ? servings / recipe.servings : 1;

  function adjustQuantity(qty: number): string {
    const adjusted = qty * ratio;
    if (adjusted === Math.round(adjusted)) return String(adjusted);
    return adjusted.toFixed(1).replace(/\.0$/, '');
  }

  async function toggleFav() {
    if (!recipe) return;
    await fetch(`/api/recipes/${id}/favorite`, { method: 'POST' });
    setRecipe({ ...recipe, isFavorite: !recipe.isFavorite });
  }

  async function generateList() {
    if (!recipe) return;
    const missing = recipe.ingredients.filter(i => !i.inFridge).map(i => ({
      ingredientId: i.ingredient.id,
      quantity: parseFloat(adjustQuantity(i.quantity)),
      unit: i.unit,
    }));
    await fetch('/api/shopping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Pour: ${recipe.name} (${servings} pers.)`, items: missing }),
    });
    router.push('/shopping');
  }

  async function revisitRecipe() {
    if (!revisitInstruction.trim()) return;
    setRevisiting(true); setRevisitError(''); setRevisitResult(null);
    const res = await fetch(`/api/recipes/${id}/revisit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction: revisitInstruction }),
    });
    const data = await res.json();
    if (!res.ok) {
      setRevisitError(data.error || 'Erreur');
      if (data.upgrade) setRevisitError('🔒 ' + data.error);
    } else {
      setRevisitResult(data.revisited);
      if (data.remaining !== undefined) setRevisitRemaining(data.remaining);
    }
    setRevisiting(false);
  }

  async function saveRevisit() {
    if (!revisitResult) return;
    setSavingRevisit(true);
    try {
      const res = await fetch(`/api/recipes/${id}/revisit/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: revisitResult.title || `Revisite de ${recipe?.name}`,
          description: revisitResult.description,
          ingredients: revisitResult.ingredients,
          instructions: revisitResult.instructions,
          tips: revisitResult.tips,
        }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        router.push(`/recipes/${data.id}`);
      } else {
        setRevisitError(data.error || 'Erreur enregistrement');
      }
    } finally {
      setSavingRevisit(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
        </div>
      </AppShell>
    );
  }

  if (!recipe) {
    return (
      <AppShell>
        <p className="text-center py-20" style={{ color: 'var(--text-muted)' }}>Recette introuvable</p>
      </AppShell>
    );
  }

  const available = recipe.ingredients.filter(i => i.inFridge).length;
  const total = recipe.ingredients.length;
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;

  const diffColors: Record<string, string> = { FACILE: 'badge-easy', MOYEN: 'badge-medium', DIFFICILE: 'badge-hard' };
  const diffLabels: Record<string, string> = { FACILE: 'Facile', MOYEN: 'Moyen', DIFFICILE: 'Difficile' };

  return (
    <AppShell>
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm mb-4 transition-colors" style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      {recipe.imageUrl && (
        <div className="rounded-xl overflow-hidden mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-52 object-cover"
            onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
        </div>
      )}

      <div className="mb-5">
        <h1 className="text-xl font-semibold mb-1.5">{recipe.name}</h1>
        {recipe.isCommunity && recipe.authorName && (
          <p className="text-xs mb-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: 'rgb(59,130,246)' }}>
            👥 Partagé par {recipe.authorName}
          </p>
        )}
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{recipe.description}</p>

        {/* Avertissement allergènes / régime */}
        {(recipe.allergenWarnings?.length ?? 0) > 0 && (
          <div className="rounded-lg p-3 mb-3 flex items-start gap-2.5" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Attention — allergènes détectés</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Cette recette peut contenir : {recipe.allergenWarnings!.map(a => ALLERGEN_LABELS[a] || a).join(', ')}.
              </p>
            </div>
          </div>
        )}
        {recipe.dietConflict && (
          <div className="rounded-lg p-3 mb-3 flex items-start gap-2.5" style={{ backgroundColor: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)' }}>
            <Ban className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Non compatible avec votre régime {recipe.dietLabel}</p>
              {(recipe.dietConflictIngredients?.length ?? 0) > 0 && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  En cause : {recipe.dietConflictIngredients!.slice(0, 4).join(', ')}.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          <span className={diffColors[recipe.difficulty]}>{diffLabels[recipe.difficulty]}</span>
          <span className="badge" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}><Clock className="w-3 h-3 mr-1" />{recipe.prepTime} min</span>
          <span className="badge" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>{recipe.cuisine}</span>
          {recipe.kidFriendly && <span className="badge" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: 'rgb(59,130,246)' }}>👶 Enfants</span>}
          {recipe.babyFriendly && <span className="badge" style={{ backgroundColor: 'rgba(168,85,247,0.1)', color: 'rgb(168,85,247)' }}>🍼 Bébés</span>}
          {recipe.nutriScore && (
            <span className={`badge text-white font-bold ${NUTRISCORE_COLORS[recipe.nutriScore] || ''}`}>
              Nutri-Score {recipe.nutriScore}
            </span>
          )}
        </div>

        {/* Sélecteur de portions */}
        <div className="card p-3.5 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-sm font-medium">Portions</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setServings(Math.max(1, servings - 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-lg font-semibold w-8 text-center">{servings}</span>
              <button
                onClick={() => setServings(Math.min(20, servings + 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>pers.</span>
            </div>
          </div>
          {servings !== recipe.servings && (
            <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
              Quantités ajustées (base {recipe.servings} pers.)
            </p>
          )}
        </div>

        <button
          onClick={() => router.push(`/recipes/${recipe.id}/cook`)}
          className="btn-primary w-full flex items-center justify-center gap-2 mb-3 !py-3 text-base"
        >
          <ChefHat className="w-5 h-5" /> Cuisiner ({servings} pers.)
        </button>

        <div className="flex gap-2">
          <button onClick={toggleFav} className={`btn-secondary flex items-center gap-2 flex-1 justify-center ${recipe.isFavorite ? '!border-red-400' : ''}`}>
            <Heart className={`w-4 h-4 ${recipe.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            {recipe.isFavorite ? 'Favori' : 'Ajouter'}
          </button>
          {pct < 100 && (
            <button onClick={generateList} className="btn-primary flex items-center gap-2 flex-1 justify-center">
              <ShoppingCart className="w-4 h-4" /> Liste de courses
            </button>
          )}
        </div>

        {/* Partager en image */}
        <button onClick={shareAsImage} disabled={sharing} className="btn-secondary w-full flex items-center justify-center gap-2 mt-2">
          {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          {sharing ? 'Création...' : 'Partager en image'}
        </button>

        {/* Ajouter au planning */}
        <button onClick={() => setShowPlan(!showPlan)} className="btn-secondary w-full flex items-center justify-center gap-2 mt-2">
          <CalendarPlus className="w-4 h-4" /> Ajouter au planning
        </button>
        {showPlan && (
          <div className="card p-3.5 mt-2 fade-in">
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              <div>
                <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Date</label>
                <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} className="input-field !py-2 text-sm" />
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Repas</label>
                <select value={planMeal} onChange={e => setPlanMeal(e.target.value)} className="input-field !py-2 text-sm">
                  {MEAL_TYPES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
            </div>
            <button onClick={addToPlanning} disabled={planSaved} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
              {planSaved ? <><Check className="w-4 h-4" /> Ajouté au planning</> : <><CalendarPlus className="w-4 h-4" /> Confirmer</>}
            </button>
          </div>
        )}

        {/* Ajouter à un carnet */}
        <button onClick={openCollections} className="btn-secondary w-full flex items-center justify-center gap-2 mt-2">
          <FolderHeart className="w-4 h-4" /> Ajouter à un carnet
        </button>

        {/* Bouton "J'ai cuisiné" + notation */}
        <button
          onClick={() => setShowCookLog(!showCookLog)}
          className="w-full flex items-center justify-center gap-2 mt-2 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={cookDone
            ? { backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }
            : { backgroundColor: 'rgba(234,179,8,0.08)', color: '#ca8a04', border: '1px solid rgba(234,179,8,0.15)' }}
        >
          {cookDone ? <><Check className="w-4 h-4" /> Enregistré !</> : '🍳 J\'ai cuisiné cette recette'}
        </button>

        {showCookLog && (
          <div className="card p-3.5 mt-2 fade-in">
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Note cette recette</p>
            <div className="flex gap-1 mb-3 justify-center">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setCookRating(star)} className="text-2xl transition-transform hover:scale-110">
                  {star <= cookRating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
            <button onClick={logCook} disabled={cookSaving} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
              {cookSaving ? 'Enregistrement...' : `Valider${cookRating > 0 ? ` (${cookRating}/5)` : ''}`}
            </button>
          </div>
        )}
      </div>

      {/* Valeurs nutritionnelles */}
      <div className="card p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-sm">
            Valeurs nutritionnelles{' '}
            <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>(par portion)</span>
          </h2>
          {enriching && (
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              <Sparkles className="w-3 h-3 animate-pulse" /> calcul en cours…
            </span>
          )}
        </div>

        {recipe.calories !== null ? (
          <>
            {/* NutriScore band */}
            {recipe.nutriScore && (() => {
              const NS_DATA: Record<string, { color: string; bg: string; label: string; desc: string }> = {
                A: { color: '#fff', bg: '#1a7f37', label: 'Excellent', desc: 'Qualité nutritionnelle excellente' },
                B: { color: '#fff', bg: '#5aab28', label: 'Bon',       desc: 'Bonne qualité nutritionnelle' },
                C: { color: '#333', bg: '#f5c400', label: 'Moyen',     desc: 'Qualité nutritionnelle moyenne' },
                D: { color: '#fff', bg: '#e67e00', label: 'Mauvais',   desc: 'Qualité nutritionnelle insuffisante' },
                E: { color: '#fff', bg: '#d63031', label: 'À éviter',  desc: 'Qualité nutritionnelle médiocre' },
              };
              const grades = ['A','B','C','D','E'];
              const current = recipe.nutriScore;
              const info = NS_DATA[current];
              return (
                <div className="mb-3 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex">
                    {grades.map(g => (
                      <div key={g} className="flex-1 py-1.5 text-center text-xs font-bold transition-all"
                        style={{
                          backgroundColor: g === current ? NS_DATA[g].bg : 'var(--bg-inset)',
                          color: g === current ? NS_DATA[g].color : 'var(--text-muted)',
                          fontSize: g === current ? '13px' : '11px',
                          fontWeight: g === current ? '800' : '500',
                        }}>{g}</div>
                    ))}
                  </div>
                  {info && (
                    <div className="px-3 py-1.5 flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: info.bg }}>{info.label}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>— {info.desc}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 4 macro tiles */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {(() => {
                const AJR_KCAL = 2000;
                const pct = Math.round((recipe.calories / AJR_KCAL) * 100);
                return (
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-inset)' }}>
                    <Flame className="w-4 h-4 mx-auto mb-1 text-orange-500" />
                    <p className="text-sm font-semibold">{Math.round(recipe.calories)}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>kcal</p>
                    <p className="text-[9px] mt-0.5 text-orange-400 font-medium">{pct}% AJR</p>
                  </div>
                );
              })()}
              {(() => {
                const AJR_PROT = 50;
                const pct = recipe.protein != null ? Math.round((recipe.protein / AJR_PROT) * 100) : null;
                return (
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-inset)' }}>
                    <Beef className="w-4 h-4 mx-auto mb-1 text-red-500" />
                    <p className="text-sm font-semibold">{recipe.protein != null ? recipe.protein.toFixed(1) : '–'}g</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Protéines</p>
                    {pct != null && <p className="text-[9px] mt-0.5 text-red-400 font-medium">{pct}% AJR</p>}
                  </div>
                );
              })()}
              {(() => {
                const AJR_CARBS = 260;
                const pct = recipe.carbs != null ? Math.round((recipe.carbs / AJR_CARBS) * 100) : null;
                return (
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-inset)' }}>
                    <Wheat className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                    <p className="text-sm font-semibold">{recipe.carbs != null ? recipe.carbs.toFixed(1) : '–'}g</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Glucides</p>
                    {pct != null && <p className="text-[9px] mt-0.5 text-amber-400 font-medium">{pct}% AJR</p>}
                  </div>
                );
              })()}
              {(() => {
                const AJR_FAT = 70;
                const pct = recipe.fat != null ? Math.round((recipe.fat / AJR_FAT) * 100) : null;
                return (
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-inset)' }}>
                    <Droplets className="w-4 h-4 mx-auto mb-1 text-yellow-500" />
                    <p className="text-sm font-semibold">{recipe.fat != null ? recipe.fat.toFixed(1) : '–'}g</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Lipides</p>
                    {pct != null && <p className="text-[9px] mt-0.5 text-yellow-400 font-medium">{pct}% AJR</p>}
                  </div>
                );
              })()}
            </div>

            {/* Progress bars AJR */}
            <div className="space-y-1.5 mb-3">
              {[
                { label: 'Calories', value: recipe.calories, ajr: 2000, unit: 'kcal', color: '#f97316' },
                { label: 'Protéines', value: recipe.protein, ajr: 50, unit: 'g', color: '#ef4444' },
                { label: 'Glucides', value: recipe.carbs, ajr: 260, unit: 'g', color: '#f59e0b' },
                { label: 'Lipides', value: recipe.fat, ajr: 70, unit: 'g', color: '#eab308' },
              ].map(({ label, value, ajr, unit, color }) => {
                if (value == null) return null;
                const pct = Math.min(100, Math.round((value / ajr) * 100));
                return (
                  <div key={label}>
                    <div className="flex justify-between text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>
                      <span>{label}</span>
                      <span>{value.toFixed(0)}{unit} / {ajr}{unit} <span style={{ color }}> ({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-inset)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `{pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calorie equivalents */}
            {recipe.calories != null && recipe.calories > 0 && (
              <div className="rounded-lg px-3 py-2 mb-3 text-[11px] flex flex-wrap gap-2" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)' }}>
                <span>🚶 {Math.round(recipe.calories / 4.5)} min de marche</span>
                <span>🏃 {Math.round(recipe.calories / 10)} min de course</span>
                <span>🚴 {Math.round(recipe.calories / 8)} min de vélo</span>
              </div>
            )}

            {/* Fibres + Sel */}
            {(recipe.fiber != null || recipe.salt != null) && (
              <div className="flex gap-4 text-xs justify-center mb-3" style={{ color: 'var(--text-muted)' }}>
                {recipe.fiber != null && <span>🌾 Fibres : <strong>{recipe.fiber.toFixed(1)}g</strong>{recipe.fiber >= 3 ? ' ✅' : ''}</span>}
                {recipe.salt != null && <span>🧂 Sel : <strong>{recipe.salt.toFixed(1)}g</strong>{recipe.salt > 2.5 ? ' ⚠️' : ' ✅'}</span>}
              </div>
            )}

            {/* Bouton Plus de détails */}
            <button
              onClick={() => setShowNutritionDetails(v => !v)}
              className="w-full text-xs flex items-center justify-center gap-1 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-inset)' }}
            >
              {showNutritionDetails ? '▲ Moins de détails' : '▼ Plus de détails'}
            </button>

            {/* Détails étendus */}
            {showNutritionDetails && (
              <div className="mt-3 space-y-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <p className="font-semibold text-xs mb-2" style={{ color: 'var(--text-primary)' }}>Détails nutritionnels</p>

                {recipe.fiber != null && (
                  <div className="rounded-lg p-2.5" style={{ backgroundColor: 'var(--bg-inset)' }}>
                    <div className="flex justify-between mb-1">
                      <span>🌾 Fibres alimentaires</span>
                      <span className="font-medium">{recipe.fiber.toFixed(1)}g / 25g AJR</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                      <div className="h-full rounded-full" style={{ width: `{Math.min(100, (recipe.fiber / 25) * 100)}%`, backgroundColor: '#22c55e' }} />
                    </div>
                    <p className="mt-1 text-[10px]">{recipe.fiber < 2 ? 'Faible teneur en fibres' : recipe.fiber < 5 ? 'Bonne source de fibres' : 'Excellente source de fibres'}</p>
                  </div>
                )}

                {recipe.salt != null && (
                  <div className="rounded-lg p-2.5" style={{ backgroundColor: 'var(--bg-inset)' }}>
                    <div className="flex justify-between mb-1">
                      <span>🧂 Sel (sodium)</span>
                      <span className="font-medium">{recipe.salt.toFixed(1)}g / 6g max OMS</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                      <div className="h-full rounded-full" style={{ width: `{Math.min(100, (recipe.salt / 6) * 100)}%`, backgroundColor: recipe.salt > 3 ? '#ef4444' : recipe.salt > 1.5 ? '#f59e0b' : '#22c55e' }} />
                    </div>
                    <p className="mt-1 text-[10px]">{recipe.salt > 3 ? '⚠️ Teneur en sel élevée' : recipe.salt > 1.5 ? 'Teneur en sel modérée' : '✅ Teneur en sel raisonnable'}</p>
                  </div>
                )}

                {recipe.fat != null && (
                  <div className="rounded-lg p-2.5" style={{ backgroundColor: 'var(--bg-inset)' }}>
                    <span>💧 Lipides : {recipe.fat.toFixed(1)}g → {(recipe.fat * 9).toFixed(0)} kcal ({Math.round((recipe.fat * 9 / (recipe.calories ?? 1)) * 100)}% des calories)</span>
                  </div>
                )}

                {recipe.carbs != null && (
                  <div className="rounded-lg p-2.5" style={{ backgroundColor: 'var(--bg-inset)' }}>
                    <span>🌾 Glucides : {recipe.carbs.toFixed(1)}g → {(recipe.carbs * 4).toFixed(0)} kcal ({Math.round((recipe.carbs * 4 / (recipe.calories ?? 1)) * 100)}% des calories)</span>
                  </div>
                )}

                <p className="text-[10px] italic pt-1" style={{ color: 'var(--text-muted)' }}>
                  AJR = Apports Journaliers de Référence pour un adulte moyen (2000 kcal/j). Les besoins varient selon l&apos;âge, le sexe et l&apos;activité physique.
                </p>
              </div>
            )}
          </>
        ) : enriching ? (
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg p-2 text-center" style={{ backgroundColor: 'var(--bg-inset)' }}>
                <div className="w-4 h-4 rounded mx-auto mb-1 animate-pulse" style={{ backgroundColor: 'var(--border)' }} />
                <div className="h-4 w-8 mx-auto rounded animate-pulse mb-1" style={{ backgroundColor: 'var(--border)' }} />
                <div className="h-2.5 w-10 mx-auto rounded animate-pulse" style={{ backgroundColor: 'var(--border)' }} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
            Aucune donnée — l&apos;IA calculera automatiquement à la prochaine visite.
          </p>
        )}
      </div>

      {/* Score EAN réel */}
      {eanNutrition && (
        <div className="card p-3 mb-3 flex items-center gap-3">
          <span className="text-lg">📊</span>
          <div className="flex-1">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Nutrition réelle (EAN)</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Calculé depuis les codes-barres scannés — couverture {eanNutrition.coverage}%
            </p>
            <div className="flex gap-3 mt-1.5 text-[10px] font-medium">
              <span className="text-orange-500">{eanNutrition.perServing.kcal} kcal</span>
              <span className="text-red-400">{eanNutrition.perServing.protein}g prot</span>
              <span className="text-amber-400">{eanNutrition.perServing.carbs}g gluc</span>
              <span className="text-yellow-400">{eanNutrition.perServing.fat}g lip</span>
            </div>
          </div>
        </div>
      )}

      {/* Micronutriments / Molécules */}
      {eanNutrition?.micros && eanNutrition.microAjr && (() => {
        const micros = eanNutrition.micros;
        const ajr = eanNutrition.microAjr;
        const entries = Object.entries(ajr)
          .map(([key, info]) => ({ key, ...info, value: micros[key] || 0 }))
          .filter(e => e.value > 0.01)
          .sort((a, b) => (b.value / b.ajr) - (a.value / a.ajr));
        if (entries.length === 0) return null;
        const highlights = entries.filter(e => (e.value / e.ajr) >= 0.15).slice(0, 4);
        return (
          <div className="card p-4 mb-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🧬</span>
              <div>
                <h2 className="font-medium text-sm">Micronutriments & Molécules</h2>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Par portion · Couverture {micros.coverage || 0}% des ingrédients
                </p>
              </div>
            </div>

            {/* Top highlights */}
            {highlights.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                {highlights.map(e => {
                  const pct = Math.round((e.value / e.ajr) * 100);
                  return (
                    <div key={e.key} className="shrink-0 px-2.5 py-2 rounded-lg text-center min-w-[70px]"
                      style={{ backgroundColor: pct >= 50 ? 'rgba(16,185,129,0.08)' : 'var(--bg-inset)' }}>
                      <span className="text-lg block">{e.emoji}</span>
                      <p className="text-[10px] font-semibold mt-0.5" style={{ color: pct >= 50 ? 'rgb(16,185,129)' : 'var(--text)' }}>
                        {e.value < 1 ? e.value.toFixed(2) : e.value < 10 ? e.value.toFixed(1) : Math.round(e.value)}{e.unit}
                      </p>
                      <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{pct}% AJR</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full list with bars */}
            <div className="space-y-2">
              {entries.map(e => {
                const pct = Math.min(Math.round((e.value / e.ajr) * 100), 200);
                const barPct = Math.min(pct, 100);
                const barColor = pct >= 50 ? '#10b981' : pct >= 25 ? '#f59e0b' : 'var(--text-muted)';
                return (
                  <div key={e.key}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] flex items-center gap-1">
                        <span>{e.emoji}</span>
                        <span className="font-medium">{e.label}</span>
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {e.value < 1 ? e.value.toFixed(2) : e.value < 10 ? e.value.toFixed(1) : Math.round(e.value)}{e.unit}
                        <span className="ml-1 font-semibold" style={{ color: barColor }}>{pct}%</span>
                      </span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-inset)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, backgroundColor: barColor }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[9px] mt-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Estimations basées sur les données EAN scannées et la table CIQUAL/USDA. Les valeurs réelles varient selon les produits utilisés. Consultez un professionnel de santé pour un suivi personnalisé.
            </p>
          </div>
        );
      })()}

      {/* Ingrédients avec grammages ajustés */}
      <div className="card p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-sm">Ingrédients</h2>
          <span className={`text-sm font-semibold ${pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-orange-600 dark:text-orange-400'}`}>
            {available}/{total}
          </span>
        </div>
        <div className="space-y-1">
          {recipe.ingredients.map((ing, i) => {
            const sub = substitutions[ing.ingredient.name];
            return (
              <div key={i}>
                <div className="flex items-center gap-2.5 py-1.5">
                  {ing.inFridge ? (
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span className="text-sm">{ing.ingredient.emoji}</span>
                  <span className="text-sm flex-1" style={{ color: ing.inFridge ? 'var(--text)' : 'var(--text-muted)' }}>
                    {ing.ingredient.name}
                  </span>
                  <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {adjustQuantity(ing.quantity)} {ing.unit}
                  </span>
                  {!ing.inFridge && !sub && (
                    <button
                      onClick={() => requestSubstitute(ing.ingredient.name)}
                      disabled={subLoading === ing.ingredient.name}
                      className="text-[9px] px-1.5 py-0.5 rounded-md shrink-0"
                      style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#818cf8' }}
                      title="Substitut IA"
                    >
                      {subLoading === ing.ingredient.name ? '...' : '✂️'}
                    </button>
                  )}
                </div>
                {sub && (
                  <div className="ml-9 mb-1 px-2.5 py-1.5 rounded-lg text-[11px] flex items-center gap-2"
                    style={{ backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                    <span style={{ color: '#818cf8' }}>✂️</span>
                    <span className="flex-1">
                      <strong>{sub.substitute}</strong> ({sub.quantity} {sub.unit})
                      {sub.inFridge && <span className="ml-1 text-emerald-500">dans ton frigo</span>}
                      <span className="block text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub.reason}</span>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Coût estimé ── */}
      {cost && (
        <div className="card p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Euro className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <h2 className="font-medium text-sm">Coût estimé</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: cost.confidence === 'high' ? 'rgba(16,185,129,0.1)' : cost.confidence === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(107,114,128,0.1)',
                  color: cost.confidence === 'high' ? 'rgb(16,185,129)' : cost.confidence === 'medium' ? 'rgb(180,120,0)' : 'var(--text-muted)',
                }}>
                {cost.confidence === 'high' ? 'fiable' : cost.confidence === 'medium' ? 'approx.' : 'indicatif'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold">{cost.total.toFixed(2)}€</span>
              <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>total</span>
            </div>
          </div>

          {/* Prix par portion */}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg mb-3"
            style={{ backgroundColor: 'var(--bg-inset)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Par portion ({servings > recipe.servings ? servings : recipe.servings} pers.)
            </span>
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              ~{cost.perServing.toFixed(2)}€ / pers.
            </span>
          </div>

          {/* Comparaison */}
          <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>
            {cost.total < 5
              ? '🏆 Moins cher qu\'un café ! Cuisine maison imbattable.'
              : cost.total < 12
              ? '✅ Bien moins cher qu\'une livraison ou un restaurant.'
              : '🍽️ Un repas fait maison reste plus sain qu\'un plat tout prêt.'}
            {cost.missingCount > 0 && ` (${cost.missingCount} ingrédient${cost.missingCount > 1 ? 's' : ''} sans prix estimé)`}
          </p>

          {/* CTA Carrefour Drive */}
          <a
            href={`https://www.carrefour.fr/r/recherche?query=${encodeURIComponent(
              recipe.ingredients.filter(i => !i.inFridge).slice(0, 3).map(i => i.ingredient.name).join(' ')
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'rgba(0,88,179,0.08)', color: 'rgb(0,88,179)', border: '1px solid rgba(0,88,179,0.2)' }}
          >
            <span>🛒 Commander les ingrédients manquants sur Carrefour Drive</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-2" />
          </a>
          <p className="text-[10px] mt-1.5 text-center" style={{ color: 'var(--text-muted)' }}>
            Prix indicatifs supermarché France · Open Food Facts
          </p>
        </div>
      )}

      {/* Préparation */}
      <div className="card p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-sm">Préparation</h2>
          {enriching && (
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              <Sparkles className="w-3 h-3 animate-pulse" /> traduction en cours…
            </span>
          )}
        </div>
        <div className="space-y-3">
          {parseSteps(recipe.instructions).map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs font-semibold" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
                {i + 1}
              </div>
              <p className="text-sm leading-relaxed pt-0.5" style={{ color: 'var(--text-secondary)' }}>{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Revisit IA ── */}
      <div className="card p-4 mb-3">
        <button onClick={() => { setRevisitOpen(o => !o); setRevisitResult(null); setRevisitError(''); }}
          className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <h2 className="font-medium text-sm">Revisiter avec l&apos;IA</h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-amber-600 dark:text-amber-400"
              style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}>Premium / VIP</span>
          </div>
          {revisitRemaining !== null && (
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{revisitRemaining} restante{revisitRemaining !== 1 ? 's' : ''}</span>
          )}
        </button>

        {revisitOpen && !revisitResult && (
          <div className="mt-3 space-y-2">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Demande à l&apos;IA de réécrire cette recette selon ton instruction.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {['Rends-la végétarienne', 'Version sans gluten', 'Plus rapide (< 20 min)', 'Moins calorique'].map(s => (
                <button key={s} onClick={() => setRevisitInstruction(s)}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg text-left transition-colors hover:bg-[var(--bg-inset)]"
                  style={{ border: '1px solid var(--border)', color: revisitInstruction === s ? 'var(--accent)' : 'var(--text-secondary)',
                    borderColor: revisitInstruction === s ? 'var(--accent)' : undefined }}>
                  {s}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Ou écris ta propre instruction… (ex: adapte pour 2 personnes avec du boeuf)"
              value={revisitInstruction}
              onChange={e => setRevisitInstruction(e.target.value)}
              rows={2}
              className="input-field w-full text-sm resize-none"
              onKeyDown={e => e.stopPropagation()}
            />
            <button onClick={revisitRecipe} disabled={revisiting || !revisitInstruction.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40">
              {revisiting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Génération en cours…</>
                : <><Wand2 className="w-4 h-4" /> Générer la version revisitée</>}
            </button>
            {revisitError && (
              <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: 'rgb(239,68,68)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {revisitError}
                {revisitError.startsWith('🔒') && (
                  <a href="/profile" className="block mt-1.5 underline text-xs">Passer Premium →</a>
                )}
              </div>
            )}
          </div>
        )}

        {revisitResult && (
          <div className="mt-3 space-y-3 fade-in">
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
              {revisitResult.title && <h3 className="font-bold text-base mb-1">✨ {revisitResult.title}</h3>}
              {revisitResult.description && <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{revisitResult.description}</p>}
              {revisitResult.ingredients && revisitResult.ingredients.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>INGRÉDIENTS</p>
                  <ul className="space-y-1">
                    {revisitResult.ingredients.map((ing, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="font-mono text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{ing.quantity} {ing.unit}</span>
                        <span>{ing.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {revisitResult.instructions && (
                <div className="mb-3">
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>PRÉPARATION</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{revisitResult.instructions}</p>
                </div>
              )}
              {revisitResult.tips && (
                <div className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: 'rgba(245,158,11,0.08)', color: 'rgb(180,120,0)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  💡 {revisitResult.tips}
                </div>
              )}
            </div>
            <button onClick={saveRevisit} disabled={savingRevisit}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50">
              {savingRevisit
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</>
                : <><Sparkles className="w-4 h-4" /> Enregistrer comme recette</>}
            </button>
            <div className="flex gap-2">
              <button onClick={() => { setRevisitResult(null); setRevisitInstruction(''); }}
                className="btn-secondary flex-1 text-sm">Nouvelle revisit</button>
              <button onClick={() => setRevisitOpen(false)} className="btn-secondary flex-1 text-sm">Fermer</button>
            </div>
            {revisitRemaining !== null && (
              <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
                {revisitRemaining} revisit{revisitRemaining !== 1 ? 's' : ''} restante{revisitRemaining !== 1 ? 's' : ''} cette semaine
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Ma note ── */}
      <div className="card p-4 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <h2 className="font-medium text-sm">Ma note</h2>
          {myNote && (
            <button onClick={deleteNote} disabled={deletingNote}
              className="ml-auto p-1 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}>
              {deletingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        <textarea
          placeholder="Écris tes astuces, modifications, avis… (visible que par toi sauf si tu rends public)"
          value={noteContent}
          onChange={e => setNoteContent(e.target.value)}
          rows={3}
          className="w-full text-sm rounded-xl p-3 resize-none outline-none"
          style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />

        {/* Photo */}
        <input ref={notePhotoRef} type="file" accept="image/*" className="hidden"
          onChange={async e => {
            const f = e.target.files?.[0];
            if (f) setNotePhoto(await compressNotePhoto(f));
          }} />

        {notePhoto && (
          <div className="relative mt-2 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={notePhoto} alt="note" className="w-20 h-20 object-cover rounded-xl" />
            <button onClick={() => setNotePhoto('')}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white bg-red-500">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <button onClick={() => notePhotoRef.current?.click()}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <ImagePlus className="w-3.5 h-3.5" /> Photo
            </button>

            <button onClick={() => setNotePublic(p => !p)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${notePublic ? 'text-amber-600 dark:text-amber-400' : ''}`}
              style={{ backgroundColor: notePublic ? 'rgba(245,158,11,0.1)' : 'var(--bg-inset)', border: `1px solid ${notePublic ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`, color: notePublic ? undefined : 'var(--text-muted)' }}>
              {notePublic ? <><Globe className="w-3.5 h-3.5" /> Public</> : <><Lock className="w-3.5 h-3.5" /> Privé</>}
            </button>
          </div>

          <button onClick={saveNote} disabled={savingNote || (!noteContent.trim() && !notePhoto)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-40 transition-all"
            style={{ backgroundColor: noteSaved ? 'rgba(16,185,129,0.15)' : 'var(--accent)', color: noteSaved ? 'rgb(16,185,129)' : 'var(--accent-text)' }}>
            {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : noteSaved ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
            {noteSaved ? 'Sauvegardé' : 'Sauvegarder'}
          </button>
        </div>

        {notePublic && (
          <p className="text-[10px] mt-2 px-1" style={{ color: 'var(--text-muted)' }}>
            🌍 Ta note et ta photo seront visibles par tous les utilisateurs sur cette recette.
          </p>
        )}
      </div>

      {/* ── Notes de la communauté ── */}
      {communityNotes.length > 0 && (
        <div className="card p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <h2 className="font-medium text-sm">Communauté</h2>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)' }}>
              {communityNotes.length}
            </span>
          </div>
          <div className="space-y-3">
            {communityNotes.map(note => (
              <div key={note.id} className="pb-3 last:pb-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
                    {(note.user?.name || note.user?.email || '?')[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-medium">{note.user?.name || note.user?.email?.split('@')[0] || 'Anonyme'}</span>
                  <span className="text-[10px] ml-auto" style={{ color: 'var(--text-muted)' }}>
                    {new Date(note.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                {note.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={note.photoUrl} alt="création" className="w-full max-h-48 object-cover rounded-xl mb-2" />
                )}
                {note.content && (
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{note.content}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal carnets */}
      {showCollections && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowCollections(false)}>
          <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-4 max-h-[80vh] flex flex-col" style={{ backgroundColor: 'var(--bg-raised)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <FolderHeart className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} /> Ajouter à un carnet
              </h2>
              <button onClick={() => setShowCollections(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-inset)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-1.5 mb-3">
              {collections.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>Aucun carnet. Crée-en un ci-dessous.</p>
              ) : collections.map(c => (
                <button key={c.id} onClick={() => toggleCollection(c.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors hover:bg-[var(--bg-inset)]"
                  style={c.hasRecipe ? { backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)' } : undefined}>
                  <span className="text-lg">{c.emoji}</span>
                  <span className="text-sm flex-1 text-left">{c.name}</span>
                  <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0"
                    style={c.hasRecipe ? { backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' } : { borderColor: 'var(--border)' }}>
                    {c.hasRecipe && <Check className="w-3.5 h-3.5" style={{ color: 'var(--accent-text)' }} />}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <input value={newColName} onChange={e => setNewColName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createCollectionAndAdd()}
                placeholder="Nouveau carnet…" className="input-field !py-2 text-sm flex-1" />
              <button onClick={createCollectionAndAdd} disabled={!newColName.trim()} className="btn-primary !px-3 disabled:opacity-40">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
