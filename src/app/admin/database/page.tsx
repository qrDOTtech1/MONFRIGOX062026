'use client';

import { useState, useEffect } from 'react';
import { Database, RefreshCw, Download, Check, AlertTriangle, Server, Loader2, ChefHat, Utensils, Zap, Play, X, Languages, Flame } from 'lucide-react';

interface DbStatus {
  connected: boolean;
  counts: { users: number; recipes: number; ingredients: number };
  dbUrl: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
}

export default function AdminDatabasePage() {
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Migration
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);

  // Seed
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);

  // Import TheMealDB
  const [importingMealDB, setImportingMealDB] = useState(false);
  const [mealDBQuery, setMealDBQuery] = useState('');
  const [mealDBResult, setMealDBResult] = useState<ImportResult | null>(null);
  const [mealDBError, setMealDBError] = useState('');

  // Import Spoonacular
  const [importingSpoon, setImportingSpoon] = useState(false);
  const [spoonQuery, setSpoonQuery] = useState('');
  const [spoonResult, setSpoonResult] = useState<ImportResult | null>(null);
  const [spoonError, setSpoonError] = useState('');

  // Translate & Nutrition
  const [translating, setTranslating] = useState(false);
  const [translateResult, setTranslateResult] = useState<{ translated: number; nutritionAdded: number; failed: number; total: number } | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<{ nutritionAdded: number; failed: number; total: number } | null>(null);

  // Logs
  const [logs, setLogs] = useState<string[]>([]);

  function log(msg: string) {
    setLogs(prev => [`[${new Date().toLocaleTimeString('fr-FR')}] ${msg}`, ...prev].slice(0, 50));
  }

  async function loadStatus() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' }),
      });
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
        log('Statut DB chargé');
      }
    } catch {
      log('Erreur connexion DB');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStatus(); }, []);

  async function runMigration() {
    setMigrating(true);
    setMigrateResult(null);
    log('Migration en cours (prisma db push)...');
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'push' }),
      });
      const data = await res.json();
      setMigrateResult(data);
      log(data.ok ? 'Migration réussie' : `Migration échouée: ${data.error}`);
      if (data.ok) loadStatus();
    } catch (e: any) {
      setMigrateResult({ ok: false, error: e.message });
      log(`Erreur migration: ${e.message}`);
    } finally {
      setMigrating(false);
    }
  }

  async function runSeed() {
    setSeeding(true);
    setSeedResult(null);
    log('Seed en cours...');
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      });
      const data = await res.json();
      setSeedResult(data);
      log(data.ok ? 'Seed terminé' : `Seed échoué: ${data.error}`);
      if (data.ok) loadStatus();
    } catch (e: any) {
      setSeedResult({ ok: false, error: e.message });
      log(`Erreur seed: ${e.message}`);
    } finally {
      setSeeding(false);
    }
  }

  async function translateRecipes() {
    setTranslating(true);
    setTranslateResult(null);
    log('Traduction + enrichissement des recettes via IA... (peut prendre plusieurs minutes)');
    try {
      const res = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'all' }),
      });
      const data = await res.json();
      if (res.ok) {
        setTranslateResult(data);
        log(`Traduction: ${data.translated} traduites, ${data.nutritionAdded} nutrition ajoutée, ${data.failed} échouées`);
        loadStatus();
      } else {
        log(`Erreur: ${data.error}`);
      }
    } catch (e: any) {
      log(`Erreur: ${e.message}`);
    } finally {
      setTranslating(false);
    }
  }

  async function enrichNutrition() {
    setEnriching(true);
    setEnrichResult(null);
    log('Calcul des valeurs nutritionnelles via IA...');
    try {
      const res = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'nutrition' }),
      });
      const data = await res.json();
      if (res.ok) {
        setEnrichResult(data);
        log(`Nutrition: ${data.nutritionAdded} recettes enrichies, ${data.failed} échouées`);
      } else {
        log(`Erreur: ${data.error}`);
      }
    } catch (e: any) {
      log(`Erreur: ${e.message}`);
    } finally {
      setEnriching(false);
    }
  }

  async function importMealDB(mode: 'search' | 'popular') {
    setImportingMealDB(true);
    setMealDBResult(null);
    setMealDBError('');
    const action = mode === 'popular' ? 'all-areas' : 'search';
    const label = mode === 'popular' ? 'toutes les cuisines' : `"${mealDBQuery}"`;
    log(`Import TheMealDB: ${label}...`);
    try {
      const res = await fetch('/api/external/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'mealdb',
          action,
          query: mealDBQuery || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMealDBResult(data);
        log(`TheMealDB: ${data.imported} importées, ${data.skipped} ignorées`);
        loadStatus();
      } else {
        setMealDBError(data.error || 'Erreur');
        log(`TheMealDB erreur: ${data.error}`);
      }
    } catch (e: any) {
      setMealDBError(e.message);
      log(`TheMealDB erreur: ${e.message}`);
    } finally {
      setImportingMealDB(false);
    }
  }

  async function importSpoonacular(mode: 'search' | 'random') {
    setImportingSpoon(true);
    setSpoonResult(null);
    setSpoonError('');
    const label = mode === 'random' ? 'recettes aléatoires' : `"${spoonQuery}"`;
    log(`Import Spoonacular: ${label}...`);
    try {
      const res = await fetch('/api/external/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'spoonacular',
          action: mode,
          query: spoonQuery || undefined,
          count: 10,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSpoonResult(data);
        log(`Spoonacular: ${data.imported} importées, ${data.skipped} ignorées`);
        loadStatus();
      } else {
        setSpoonError(data.error || 'Erreur');
        log(`Spoonacular erreur: ${data.error}`);
      }
    } catch (e: any) {
      setSpoonError(e.message);
      log(`Spoonacular erreur: ${e.message}`);
    } finally {
      setImportingSpoon(false);
    }
  }

  return (
    <div className="fade-in space-y-5">
      <div className="flex items-center gap-2.5">
        <Database className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-xl font-semibold">Base de données & Import</h1>
      </div>

      {/* === STATUT DB === */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <h2 className="font-medium">Statut de la base</h2>
          </div>
          <button onClick={loadStatus} disabled={loading} className="btn-secondary !py-1.5 !px-2.5 text-xs flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {dbStatus ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${dbStatus.connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="text-sm">{dbStatus.connected ? 'Connectée' : 'Déconnectée'}</span>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{dbStatus.dbUrl}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-inset)' }}>
                <p className="text-xl font-semibold">{dbStatus.counts.users}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Utilisateurs</p>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-inset)' }}>
                <p className="text-xl font-semibold">{dbStatus.counts.recipes}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Recettes</p>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-inset)' }}>
                <p className="text-xl font-semibold">{dbStatus.counts.ingredients}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Ingrédients</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
          </div>
        )}
      </div>

      {/* === MIGRATION === */}
      <div className="card p-5">
        <div className="flex items-center gap-2.5 mb-1">
          <Zap className="w-4 h-4 text-amber-500" />
          <h2 className="font-medium">Migration de la base</h2>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Synchronise le schema Prisma avec la base PostgreSQL. Ajoute les nouvelles tables et colonnes sans perdre les données existantes.
        </p>

        <div className="flex gap-2">
          <button
            onClick={runMigration}
            disabled={migrating}
            className="btn-primary flex items-center gap-2 disabled:opacity-40"
          >
            {migrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {migrating ? 'Migration en cours...' : 'Lancer prisma db push'}
          </button>
          <button
            onClick={runSeed}
            disabled={seeding}
            className="btn-secondary flex items-center gap-2 disabled:opacity-40"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {seeding ? 'Seed en cours...' : 'Re-lancer le Seed'}
          </button>
        </div>

        {migrateResult && (
          <div className={`mt-3 rounded-lg px-3.5 py-2.5 text-sm ${migrateResult.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
            style={{ backgroundColor: migrateResult.ok ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.08)', border: `1px solid ${migrateResult.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.2)'}` }}
          >
            {migrateResult.ok ? <><Check className="w-4 h-4 inline mr-1" />{migrateResult.message}</> : <><X className="w-4 h-4 inline mr-1" />{migrateResult.error}</>}
          </div>
        )}
        {seedResult && (
          <div className={`mt-2 rounded-lg px-3.5 py-2.5 text-sm ${seedResult.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
            style={{ backgroundColor: seedResult.ok ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.08)', border: `1px solid ${seedResult.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.2)'}` }}
          >
            {seedResult.ok ? <><Check className="w-4 h-4 inline mr-1" />{seedResult.message}</> : <><X className="w-4 h-4 inline mr-1" />{seedResult.error}</>}
          </div>
        )}
      </div>

      {/* === TRADUCTION FR + NUTRITION === */}
      <div className="card p-5">
        <div className="flex items-center gap-2.5 mb-1">
          <Languages className="w-4 h-4 text-blue-500" />
          <h2 className="font-medium">Traduire & Enrichir les recettes</h2>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Traduit les recettes anglaises en français (nom, description, instructions, ingrédients, unités) et calcule les valeurs nutritionnelles manquantes (calories, macros, NutriScore, badges enfants) via Ollama IA.
        </p>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={translateRecipes}
            disabled={translating || enriching}
            className="btn-primary flex items-center gap-2 disabled:opacity-40"
          >
            {translating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
            {translating ? 'En cours...' : 'Traduire + Nutrition (tout)'}
          </button>
          <button
            onClick={enrichNutrition}
            disabled={enriching || translating}
            className="btn-secondary flex items-center gap-2 disabled:opacity-40"
          >
            {enriching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4 text-orange-500" />}
            {enriching ? 'Calcul en cours...' : 'Nutrition seule'}
          </button>
        </div>

        <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
          ⏱️ Peut prendre plusieurs minutes selon le nombre de recettes. Chaque recette nécessite un appel IA.
        </p>

        {translateResult && (
          <div className="mt-3 rounded-lg px-3.5 py-2.5 text-sm text-emerald-600 dark:text-emerald-400" style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <Check className="w-4 h-4 inline mr-1" />
            {translateResult.translated} traduites, {translateResult.nutritionAdded} nutrition ajoutée{translateResult.failed > 0 ? `, ${translateResult.failed} échouées` : ''}
          </div>
        )}
        {enrichResult && (
          <div className="mt-2 rounded-lg px-3.5 py-2.5 text-sm text-emerald-600 dark:text-emerald-400" style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <Check className="w-4 h-4 inline mr-1" />
            {enrichResult.nutritionAdded} recettes enrichies (nutrition){enrichResult.failed > 0 ? `, ${enrichResult.failed} échouées` : ''}
          </div>
        )}
      </div>

      {/* === IMPORT TheMealDB === */}
      <div className="card p-5">
        <div className="flex items-center gap-2.5 mb-1">
          <Utensils className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <h2 className="font-medium">Importer depuis TheMealDB</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium text-emerald-600 dark:text-emerald-400" style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}>
            GRATUIT
          </span>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Importe des recettes mondiales dans ta base. Les ingrédients manquants sont créés automatiquement.
        </p>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={mealDBQuery}
              onChange={e => setMealDBQuery(e.target.value)}
              placeholder="Rechercher (ex: chicken, pasta, curry...)"
              className="input-field flex-1"
            />
            <button
              onClick={() => importMealDB('search')}
              disabled={importingMealDB || !mealDBQuery.trim()}
              className="btn-primary !py-2 !px-4 flex items-center gap-1.5 disabled:opacity-40"
            >
              {importingMealDB ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Importer
            </button>
          </div>

          <button
            onClick={() => importMealDB('popular')}
            disabled={importingMealDB}
            className="btn-secondary w-full flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {importingMealDB ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {importingMealDB ? 'Import en cours...' : 'Importer TOUTES les cuisines du monde'}
          </button>

          {mealDBResult && (
            <div className="rounded-lg px-3.5 py-2.5 text-sm text-emerald-600 dark:text-emerald-400" style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <Check className="w-4 h-4 inline mr-1" />
              {mealDBResult.imported} recettes importées, {mealDBResult.skipped} déjà existantes
            </div>
          )}
          {mealDBError && (
            <div className="rounded-lg px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle className="w-4 h-4 inline mr-1" />{mealDBError}
            </div>
          )}
        </div>
      </div>

      {/* === IMPORT Spoonacular === */}
      <div className="card p-5">
        <div className="flex items-center gap-2.5 mb-1">
          <ChefHat className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <h2 className="font-medium">Importer depuis Spoonacular</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium text-amber-600 dark:text-amber-400" style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}>
            FREEMIUM — Clé requise
          </span>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          365 000+ recettes avec instructions complètes. Configure ta clé dans Config &rarr; APIs Externes.
        </p>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={spoonQuery}
              onChange={e => setSpoonQuery(e.target.value)}
              placeholder="Rechercher (ex: pizza, sushi, french...)"
              className="input-field flex-1"
            />
            <button
              onClick={() => importSpoonacular('search')}
              disabled={importingSpoon || !spoonQuery.trim()}
              className="btn-primary !py-2 !px-4 flex items-center gap-1.5 disabled:opacity-40"
            >
              {importingSpoon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Importer
            </button>
          </div>

          <button
            onClick={() => importSpoonacular('random')}
            disabled={importingSpoon}
            className="btn-secondary w-full flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {importingSpoon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {importingSpoon ? 'Import en cours...' : 'Importer 10 recettes aléatoires'}
          </button>

          {spoonResult && (
            <div className="rounded-lg px-3.5 py-2.5 text-sm text-emerald-600 dark:text-emerald-400" style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <Check className="w-4 h-4 inline mr-1" />
              {spoonResult.imported} recettes importées, {spoonResult.skipped} ignorées
            </div>
          )}
          {spoonError && (
            <div className="rounded-lg px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle className="w-4 h-4 inline mr-1" />{spoonError}
            </div>
          )}
        </div>
      </div>

      {/* === LOGS === */}
      {logs.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium text-sm">Logs</h2>
            <button onClick={() => setLogs([])} className="text-xs" style={{ color: 'var(--text-muted)' }}>Effacer</button>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-0.5 font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {logs.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
