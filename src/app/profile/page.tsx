'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { useTheme } from '@/components/ThemeProvider';
import { UserCircle, LogOut, Shield, Heart, ShoppingCart, Refrigerator, Sun, Moon, Save, Check, AlertTriangle, Baby, Users } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface Stats {
  fridgeCount: number;
  favCount: number;
  listCount: number;
}

const ALLERGENS = [
  { key: 'gluten', label: 'Gluten', emoji: '🌾' },
  { key: 'lactose', label: 'Lactose', emoji: '🥛' },
  { key: 'arachides', label: 'Arachides', emoji: '🥜' },
  { key: 'fruits-a-coque', label: 'Fruits à coque', emoji: '🌰' },
  { key: 'oeufs', label: 'Oeufs', emoji: '🥚' },
  { key: 'poisson', label: 'Poisson', emoji: '🐟' },
  { key: 'crustaces', label: 'Crustacés', emoji: '🦐' },
  { key: 'soja', label: 'Soja', emoji: '🫘' },
  { key: 'celeri', label: 'Céleri', emoji: '🥬' },
  { key: 'moutarde', label: 'Moutarde', emoji: '🟡' },
  { key: 'sesame', label: 'Sésame', emoji: '⚪' },
  { key: 'sulfites', label: 'Sulfites', emoji: '🍷' },
  { key: 'lupin', label: 'Lupin', emoji: '🌱' },
  { key: 'mollusques', label: 'Mollusques', emoji: '🐚' },
];

const DIET_MODES = [
  { key: '', label: 'Aucun régime', emoji: '🍽️' },
  { key: 'vegetarien', label: 'Végétarien', emoji: '🥗' },
  { key: 'vegan', label: 'Vegan', emoji: '🌱' },
  { key: 'halal', label: 'Halal', emoji: '☪️' },
  { key: 'casher', label: 'Casher', emoji: '✡️' },
  { key: 'sans-porc', label: 'Sans porc', emoji: '🚫🐷' },
  { key: 'sans-sucre', label: 'Sans sucre', emoji: '🚫🍬' },
  { key: 'keto', label: 'Keto / Low carb', emoji: '🥑' },
];

const KID_MODES = [
  { key: '', label: 'Adulte', desc: 'Recettes pour adultes' },
  { key: 'enfant', label: 'Enfant', desc: 'Portions et recettes adaptées' },
  { key: 'bebe', label: 'Bébé', desc: 'Purées, textures adaptées à l\'âge' },
];

export default function ProfilePage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({ fridgeCount: 0, favCount: 0, listCount: 0 });

  // Préférences
  const [allergens, setAllergens] = useState<string[]>([]);
  const [dietMode, setDietMode] = useState('');
  const [kidMode, setKidMode] = useState('');
  const [kidAgeMonths, setKidAgeMonths] = useState<number | null>(null);
  const [defaultServings, setDefaultServings] = useState(4);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => d && setUser(d.user));
    fetch('/api/profile/stats').then(r => r.ok ? r.json() : null).then(d => d && setStats(d));
    fetch('/api/profile').then(r => r.ok ? r.json() : null).then(d => {
      if (d) {
        try { setAllergens(d.allergens ? JSON.parse(d.allergens) : []); } catch { setAllergens([]); }
        setDietMode(d.dietMode || '');
        setKidMode(d.kidMode || '');
        setKidAgeMonths(d.kidAgeMonths);
        setDefaultServings(d.defaultServings || 4);
      }
    });
  }, []);

  function toggleAllergen(key: string) {
    setAllergens(prev => prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]);
  }

  async function savePreferences() {
    setSaving(true);
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allergens: JSON.stringify(allergens),
        dietMode,
        kidMode,
        kidAgeMonths: kidMode === 'bebe' || kidMode === 'enfant' ? kidAgeMonths : null,
        defaultServings,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  async function deleteAccount() {
    if (!confirm('Supprimer ton compte? Cette action est irréversible.')) return;
    const res = await fetch('/api/profile', { method: 'DELETE' });
    if (res.ok) { await logout(); }
  }

  return (
    <AppShell>
      <div className="flex items-center gap-2.5 mb-6">
        <UserCircle className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-lg font-semibold">Mon profil</h1>
      </div>

      {user && (
        <>
          {/* Info utilisateur */}
          <div className="card p-5 text-center mb-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--bg-inset)' }}>
              <span className="text-2xl font-semibold" style={{ color: 'var(--text-secondary)' }}>{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <h2 className="text-base font-semibold">{user.name}</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
            {user.role === 'ADMIN' && (
              <span className="inline-flex items-center gap-1 mt-2 badge" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
                <Shield className="w-3 h-3" /> Admin
              </span>
            )}
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="card p-3.5 text-center">
              <Refrigerator className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--text-muted)' }} />
              <p className="text-base font-semibold">{stats.fridgeCount}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Ingrédients</p>
            </div>
            <div className="card p-3.5 text-center">
              <Heart className="w-4 h-4 mx-auto mb-1 text-red-400" />
              <p className="text-base font-semibold">{stats.favCount}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Favoris</p>
            </div>
            <div className="card p-3.5 text-center">
              <ShoppingCart className="w-4 h-4 mx-auto mb-1 text-amber-400" />
              <p className="text-base font-semibold">{stats.listCount}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Listes</p>
            </div>
          </div>

          {/* === PRÉFÉRENCES ALIMENTAIRES === */}
          <div className="card p-5 mb-5">
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Mes allergènes
            </h2>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Les recettes contenant ces allergènes seront signalées
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ALLERGENS.map(a => (
                <button
                  key={a.key}
                  onClick={() => toggleAllergen(a.key)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                    allergens.includes(a.key) ? 'ring-1 ring-red-400' : ''
                  }`}
                  style={{
                    backgroundColor: allergens.includes(a.key) ? 'rgba(239,68,68,0.1)' : 'var(--bg-inset)',
                    color: allergens.includes(a.key) ? 'var(--text)' : 'var(--text-secondary)',
                    border: `1px solid ${allergens.includes(a.key) ? 'rgba(239,68,68,0.3)' : 'var(--border-subtle)'}`,
                  }}
                >
                  <span>{a.emoji}</span> {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5 mb-5">
            <h2 className="font-semibold text-sm mb-3">Régime alimentaire</h2>
            <div className="grid grid-cols-2 gap-1.5">
              {DIET_MODES.map(d => (
                <button
                  key={d.key}
                  onClick={() => setDietMode(d.key)}
                  className="px-3 py-2.5 rounded-lg text-left text-xs font-medium transition-all flex items-center gap-2"
                  style={{
                    backgroundColor: dietMode === d.key ? 'var(--accent)' : 'var(--bg-inset)',
                    color: dietMode === d.key ? 'var(--accent-text)' : 'var(--text-secondary)',
                    border: `1px solid ${dietMode === d.key ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  }}
                >
                  <span>{d.emoji}</span> {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5 mb-5">
            <h2 className="font-semibold text-sm mb-1 flex items-center gap-2">
              <Baby className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              Mode famille
            </h2>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Adapte les recettes et portions pour les enfants et bébés
            </p>
            <div className="space-y-1.5 mb-3">
              {KID_MODES.map(k => (
                <button
                  key={k.key}
                  onClick={() => setKidMode(k.key)}
                  className="w-full px-3.5 py-3 rounded-lg text-left text-sm transition-all flex items-center justify-between"
                  style={{
                    backgroundColor: kidMode === k.key ? 'var(--accent)' : 'var(--bg-inset)',
                    color: kidMode === k.key ? 'var(--accent-text)' : 'var(--text)',
                    border: `1px solid ${kidMode === k.key ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  }}
                >
                  <div>
                    <p className="font-medium">{k.label}</p>
                    <p className="text-[10px] mt-0.5" style={{ opacity: 0.7 }}>{k.desc}</p>
                  </div>
                  {kidMode === k.key && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>

            {(kidMode === 'bebe' || kidMode === 'enfant') && (
              <div className="fade-in">
                <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Âge de l&apos;enfant (en mois)
                </label>
                <input
                  type="number"
                  min={0}
                  max={216}
                  value={kidAgeMonths ?? ''}
                  onChange={e => setKidAgeMonths(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Ex: 8 mois"
                  className="input-field"
                />
                {kidMode === 'bebe' && kidAgeMonths !== null && (
                  <div className="mt-2 rounded-lg p-2.5 text-xs" style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', color: 'var(--text-secondary)' }}>
                    {kidAgeMonths < 4 && "⚠️ Avant 4 mois, seul le lait est recommandé. Consultez votre pédiatre."}
                    {kidAgeMonths >= 4 && kidAgeMonths < 6 && "🍼 Début de diversification possible : purées lisses de légumes et fruits."}
                    {kidAgeMonths >= 6 && kidAgeMonths < 9 && "🥕 Purées, compotes, céréales infantiles. Introduction protéines en petite quantité."}
                    {kidAgeMonths >= 9 && kidAgeMonths < 12 && "🍝 Textures écrasées, petits morceaux fondants. Variété de protéines."}
                    {kidAgeMonths >= 12 && kidAgeMonths < 36 && "🍽️ Repas mixés ou en petits morceaux. L'enfant mange presque comme un adulte."}
                    {kidAgeMonths >= 36 && "👧 Portions enfant des recettes classiques."}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card p-5 mb-5">
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              Nombre de personnes par défaut
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDefaultServings(Math.max(1, defaultServings - 1))}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold"
                style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}
              >−</button>
              <span className="text-2xl font-semibold w-12 text-center">{defaultServings}</span>
              <button
                onClick={() => setDefaultServings(Math.min(20, defaultServings + 1))}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold"
                style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}
              >+</button>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>personne{defaultServings > 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Sauvegarder préférences */}
          <button onClick={savePreferences} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 mb-5 disabled:opacity-40">
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Préférences sauvegardées' : saving ? 'Sauvegarde...' : 'Sauvegarder mes préférences'}
          </button>

          {/* Actions */}
          <div className="space-y-2">
            <button onClick={toggle} className="btn-secondary w-full flex items-center justify-center gap-2">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            </button>

            {user.role === 'ADMIN' && (
              <button onClick={() => router.push('/admin')} className="btn-secondary w-full flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" /> Portail Admin
              </button>
            )}

            <button onClick={logout} className="btn-secondary w-full flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" /> Se déconnecter
            </button>

            <button onClick={deleteAccount} className="w-full py-3 text-sm text-red-500 hover:text-red-400 transition-colors">
              Supprimer mon compte
            </button>
          </div>
        </>
      )}
    </AppShell>
  );
}
