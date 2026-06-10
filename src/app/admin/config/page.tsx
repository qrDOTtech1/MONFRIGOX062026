'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Check, Key, Globe, Brain, RefreshCw, Wifi, WifiOff, Shield, ChevronDown, Zap, Database, Utensils, Barcode, FlaskConical, ImagePlus, ExternalLink, Loader2 } from 'lucide-react';

interface EnrichStats { total: number; withImage: number; withBarcode: number; missingImage: number; }
interface EnrichResult { ok: boolean; processed: number; enriched: number; skipped: number; remaining: number; }

interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

interface ApiStatusEntry {
  configured: boolean;
  label: string;
  free: boolean;
}

export default function AdminConfigPage() {
  // Ollama
  const [host, setHost] = useState('https://ollama.com');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('qwen3.5');
  const [visionModel, setVisionModel] = useState('gemma3:27b');
  const [backupHost, setBackupHost] = useState('https://ollama.com');
  const [backupApiKey, setBackupApiKey] = useState('');

  // Clés API externes
  const [spoonacularKey, setSpoonacularKey] = useState('');
  const [usdaKey, setUsdaKey] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [connectionError, setConnectionError] = useState('');
  const [showModels, setShowModels] = useState(false);
  const [testingBackup, setTestingBackup] = useState(false);
  const [backupConnected, setBackupConnected] = useState<boolean | null>(null);
  const [backupError, setBackupError] = useState('');
  const [apiStatus, setApiStatus] = useState<Record<string, ApiStatusEntry>>({});
  const [activeTab, setActiveTab] = useState<'ollama' | 'apis'>('ollama');

  // Enrichissement OFF
  const [enrichStats, setEnrichStats]   = useState<EnrichStats | null>(null);
  const [enriching, setEnriching]       = useState(false);
  const [enrichResult, setEnrichResult] = useState<EnrichResult | null>(null);

  useEffect(() => {
    fetch('/api/admin/config')
      .then(r => r.ok ? r.json() : [])
      .then((data: Array<{ key: string; value: string }>) => {
        const map = Object.fromEntries(data.map(d => [d.key, d.value]));
        if (map['OLLAMA_HOST']) setHost(map['OLLAMA_HOST']);
        if (map['OLLAMA_API_KEY']) setApiKey(map['OLLAMA_API_KEY']);
        if (map['OLLAMA_MODEL']) setModel(map['OLLAMA_MODEL']);
        if (map['OLLAMA_VISION_MODEL']) setVisionModel(map['OLLAMA_VISION_MODEL']);
        if (map['OLLAMA_BACKUP_HOST']) setBackupHost(map['OLLAMA_BACKUP_HOST']);
        if (map['OLLAMA_BACKUP_API_KEY']) setBackupApiKey(map['OLLAMA_BACKUP_API_KEY']);
        if (map['SPOONACULAR_API_KEY']) setSpoonacularKey(map['SPOONACULAR_API_KEY']);
        if (map['USDA_API_KEY']) setUsdaKey(map['USDA_API_KEY']);
      });
    fetch('/api/external/status')
      .then(r => r.ok ? r.json() : {})
      .then(setApiStatus);
    fetch('/api/admin/enrich-ingredients')
      .then(r => r.ok ? r.json() : null)
      .then(setEnrichStats);
  }, []);

  async function runEnrichment() {
    setEnriching(true); setEnrichResult(null);
    const res = await fetch('/api/admin/enrich-ingredients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 30 }),
    });
    const data = await res.json();
    setEnrichResult(data);
    setEnriching(false);
    // Refresh stats
    fetch('/api/admin/enrich-ingredients').then(r => r.ok ? r.json() : null).then(setEnrichStats);
  }

  async function testConnection() {
    setTesting(true);
    setConnected(null);
    setConnectionError('');
    try {
      const res = await fetch('/api/admin/ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, apiKey }),
      });
      const data = await res.json();
      setConnected(data.ok);
      if (data.ok) setModels(data.models || []);
      else setConnectionError(data.error || 'Connexion échouée');
    } catch {
      setConnected(false);
      setConnectionError('Erreur réseau');
    } finally {
      setTesting(false);
    }
  }

  async function testBackupConnection() {
    setTestingBackup(true);
    setBackupConnected(null);
    setBackupError('');
    try {
      const res = await fetch('/api/admin/ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: backupHost, apiKey: backupApiKey }),
      });
      const data = await res.json();
      setBackupConnected(data.ok);
      if (!data.ok) setBackupError(data.error || 'Connexion échouée');
    } catch {
      setBackupConnected(false);
      setBackupError('Erreur réseau');
    } finally {
      setTestingBackup(false);
    }
  }

  async function save() {
    setSaving(true);
    const configs = [
      { key: 'OLLAMA_HOST', value: host },
      { key: 'OLLAMA_API_KEY', value: apiKey },
      { key: 'OLLAMA_MODEL', value: model },
      { key: 'OLLAMA_VISION_MODEL', value: visionModel },
      { key: 'OLLAMA_BACKUP_HOST', value: backupHost },
      { key: 'OLLAMA_BACKUP_API_KEY', value: backupApiKey },
      { key: 'SPOONACULAR_API_KEY', value: spoonacularKey },
      { key: 'USDA_API_KEY', value: usdaKey },
    ].filter(c => c.value.trim());

    await fetch('/api/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configs }),
    });

    // Refresh API status
    const statusRes = await fetch('/api/external/status');
    if (statusRes.ok) setApiStatus(await statusRes.json());

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function selectModel(name: string, target: 'text' | 'vision') {
    if (target === 'text') setModel(name);
    else setVisionModel(name);
    setShowModels(false);
  }

  function formatSize(bytes: number) {
    if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    if (bytes > 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
    return `${bytes} B`;
  }

  return (
    <div className="fade-in space-y-5">
      <div className="flex items-center gap-2.5">
        <Settings className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-xl font-semibold">Configuration</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--bg-inset)' }}>
        <button
          onClick={() => setActiveTab('ollama')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            activeTab === 'ollama' ? 'shadow-sm' : ''
          }`}
          style={{
            backgroundColor: activeTab === 'ollama' ? 'var(--bg-raised)' : 'transparent',
            color: activeTab === 'ollama' ? 'var(--text)' : 'var(--text-muted)',
          }}
        >
          <Brain className="w-4 h-4" /> Ollama IA
        </button>
        <button
          onClick={() => setActiveTab('apis')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            activeTab === 'apis' ? 'shadow-sm' : ''
          }`}
          style={{
            backgroundColor: activeTab === 'apis' ? 'var(--bg-raised)' : 'transparent',
            color: activeTab === 'apis' ? 'var(--text)' : 'var(--text-muted)',
          }}
        >
          <Database className="w-4 h-4" /> APIs Externes
        </button>
      </div>

      {/* ====== ONGLET OLLAMA ====== */}
      {activeTab === 'ollama' && (
        <>
          <div className="card p-5">
            <div className="flex items-center gap-2.5 mb-1">
              <Zap className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <h2 className="font-medium">Connexion principale</h2>
              {connected !== null && (
                <span className={`badge ml-auto ${connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}
                  style={{ backgroundColor: connected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}
                >
                  {connected ? <><Wifi className="w-3 h-3 mr-1" /> Connecté</> : <><WifiOff className="w-3 h-3 mr-1" /> Erreur</>}
                </span>
              )}
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Crée ta clé API sur{' '}
              <a href="https://ollama.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline">ollama.com/settings/keys</a>
            </p>

            <div className="space-y-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  <Globe className="w-3.5 h-3.5" /> Host
                </label>
                <input type="text" value={host} onChange={e => setHost(e.target.value)} placeholder="https://ollama.com" className="input-field font-mono text-sm" />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  <Key className="w-3.5 h-3.5" /> Clé API
                </label>
                <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Clé API Ollama" className="input-field font-mono text-sm" />
              </div>
              <button onClick={testConnection} disabled={testing || !apiKey} className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-40">
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                {testing ? 'Test...' : 'Tester'}
              </button>
              {connected === false && connectionError && (
                <div className="rounded-lg px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {connectionError}
                </div>
              )}
              {connected && models.length > 0 && (
                <div className="rounded-lg px-3.5 py-2.5 text-sm text-emerald-600 dark:text-emerald-400" style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  {models.length} modèle{models.length > 1 ? 's' : ''} disponible{models.length > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2.5 mb-1">
              <Brain className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <h2 className="font-medium">Modèles</h2>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Modèles cloud:{' '}
              <a href="https://ollama.com/search?c=cloud" target="_blank" rel="noopener noreferrer" className="underline">ollama.com/search?c=cloud</a>
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Modèle texte</label>
                <input type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="qwen3.5" className="input-field font-mono text-sm" />
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Recommandés: qwen3.5, deepseek-v4-flash, kimi-k2.6</p>
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Modèle vision</label>
                <input type="text" value={visionModel} onChange={e => setVisionModel(e.target.value)} placeholder="gemma3:27b" className="input-field font-mono text-sm" />
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Recommandés: gemma3:27b, llama4-scout</p>
              </div>
              {models.length > 0 && (
                <div>
                  <button onClick={() => setShowModels(!showModels)} className="flex items-center gap-1.5 text-xs font-medium transition-colors" style={{ color: 'var(--text-secondary)' }}>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showModels ? 'rotate-180' : ''}`} />
                    Parcourir ({models.length})
                  </button>
                  {showModels && (
                    <div className="mt-2 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                      {models.map((m) => (
                        <div key={m.digest} className="flex items-center justify-between px-3.5 py-2 transition-colors hover:bg-[var(--bg-inset)]" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <div>
                            <p className="text-sm font-mono">{m.name}</p>
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatSize(m.size)}</p>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => selectModel(m.name, 'text')} className="px-2 py-0.5 text-[10px] rounded transition-colors hover:bg-[var(--bg-inset)]" style={{ border: '1px solid var(--border)' }}>Texte</button>
                            <button onClick={() => selectModel(m.name, 'vision')} className="px-2 py-0.5 text-[10px] rounded transition-colors hover:bg-[var(--bg-inset)]" style={{ border: '1px solid var(--border)' }}>Vision</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2.5 mb-1">
              <Shield className="w-4 h-4 text-amber-500" />
              <h2 className="font-medium">Backup</h2>
              <span className="badge text-[10px]" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)' }}>Optionnel</span>
              {backupConnected !== null && (
                <span className={`badge ml-auto ${backupConnected ? 'text-emerald-500' : 'text-red-500'}`}
                  style={{ backgroundColor: backupConnected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}
                >{backupConnected ? 'OK' : 'Erreur'}</span>
              )}
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Basculement automatique en cas d&apos;erreur sur la clé principale.</p>
            <div className="space-y-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}><Globe className="w-3.5 h-3.5" /> Host backup</label>
                <input type="text" value={backupHost} onChange={e => setBackupHost(e.target.value)} placeholder="https://ollama.com" className="input-field font-mono text-sm" />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}><Key className="w-3.5 h-3.5" /> Clé API backup</label>
                <input type="password" value={backupApiKey} onChange={e => setBackupApiKey(e.target.value)} placeholder="Clé API backup" className="input-field font-mono text-sm" />
              </div>
              {backupApiKey && (
                <button onClick={testBackupConnection} disabled={testingBackup} className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-40">
                  <RefreshCw className={`w-3.5 h-3.5 ${testingBackup ? 'animate-spin' : ''}`} />
                  {testingBackup ? 'Test...' : 'Tester'}
                </button>
              )}
              {backupConnected === false && backupError && (
                <div className="rounded-lg px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>{backupError}</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ====== ONGLET APIs EXTERNES ====== */}
      {activeTab === 'apis' && (
        <>
          {/* Status overview */}
          <div className="card p-5">
            <h2 className="font-medium mb-3 flex items-center gap-2">
              <Database className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              État des APIs
            </h2>
            <div className="space-y-2">
              {Object.entries(apiStatus).map(([key, s]) => (
                <div key={key} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--bg-inset)' }}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${s.configured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="text-sm font-medium">{s.label}</span>
                    {s.free && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium text-emerald-600 dark:text-emerald-400" style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}>
                        GRATUIT
                      </span>
                    )}
                  </div>
                  <span className="text-xs" style={{ color: s.configured ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                    {s.configured ? 'Actif' : 'Clé requise'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* TheMealDB — toujours actif */}
          <div className="card p-5">
            <div className="flex items-center gap-2.5 mb-1">
              <Utensils className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <h2 className="font-medium">TheMealDB</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium text-emerald-600 dark:text-emerald-400" style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}>
                GRATUIT — Aucune clé
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              ~300 recettes mondiales. Toujours actif, aucune configuration requise.
              <br />
              <a href="https://www.themealdb.com/api.php" target="_blank" rel="noopener noreferrer" className="underline">Documentation</a>
            </p>
          </div>

          {/* Open Food Facts — toujours actif */}
          <div className="card p-5">
            <div className="flex items-center gap-2.5 mb-1">
              <Barcode className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <h2 className="font-medium">Open Food Facts</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium text-emerald-600 dark:text-emerald-400" style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}>
                GRATUIT — Aucune clé
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              3 millions de produits alimentaires. Scan de codes-barres, nutrition, NutriScore.
              Toujours actif, aucune configuration requise.
              <br />
              <a href="https://world.openfoodfacts.org/data" target="_blank" rel="noopener noreferrer" className="underline">Documentation</a>
            </p>
          </div>

          {/* USDA — clé gratuite requise */}
          <div className="card p-5">
            <div className="flex items-center gap-2.5 mb-1">
              <FlaskConical className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <h2 className="font-medium">USDA FoodData Central</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium text-emerald-600 dark:text-emerald-400" style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}>
                GRATUIT — Clé requise
              </span>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              600 000+ aliments avec données nutritionnelles détaillées. Clé gratuite et illimitée.
              <br />
              <a href="https://fdc.nal.usda.gov/api-guide" target="_blank" rel="noopener noreferrer" className="underline">Obtenir une clé gratuite</a>
            </p>
            <div>
              <label className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                <Key className="w-3.5 h-3.5" /> Clé API USDA
              </label>
              <input
                type="password"
                value={usdaKey}
                onChange={e => setUsdaKey(e.target.value)}
                placeholder="Colle ta clé ici"
                className="input-field font-mono text-sm"
              />
            </div>
          </div>

          {/* Spoonacular — clé freemium requise */}
          <div className="card p-5">
            <div className="flex items-center gap-2.5 mb-1">
              <Utensils className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <h2 className="font-medium">Spoonacular</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium text-amber-600 dark:text-amber-400" style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}>
                FREEMIUM — 50 pts/jour gratuit
              </span>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              365 000+ recettes. Recherche par ingrédients, cuisines du monde, instructions complètes.
              <br />
              50 points/jour gratuits (1 recherche = ~1 point). 29$/mois pour 1 500 pts/jour.
              <br />
              <a href="https://spoonacular.com/food-api/console#Dashboard" target="_blank" rel="noopener noreferrer" className="underline">Créer un compte et obtenir la clé</a>
            </p>
            <div>
              <label className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                <Key className="w-3.5 h-3.5" /> Clé API Spoonacular
              </label>
              <input
                type="password"
                value={spoonacularKey}
                onChange={e => setSpoonacularKey(e.target.value)}
                placeholder="Colle ta clé ici"
                className="input-field font-mono text-sm"
              />
            </div>
          </div>

          {/* ── Enrichissement Open Food Facts ── */}
          <div className="card p-5">
            <div className="flex items-center gap-2.5 mb-1">
              <ImagePlus className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <h2 className="font-medium">Enrichir les ingrédients depuis OFF</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium text-emerald-600 dark:text-emerald-400" style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}>
                GRATUIT
              </span>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Cherche les photos, marques et données sur Open Food Facts pour chaque ingrédient sans image dans la base.
              Lance par batch de 30. Relancer plusieurs fois pour tout couvrir.
            </p>

            {enrichStats && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Total',         value: enrichStats.total },
                  { label: 'Avec photo',    value: enrichStats.withImage },
                  { label: 'Sans photo',    value: enrichStats.missingImage },
                ].map(s => (
                  <div key={s.label} className="rounded-lg p-2.5 text-center" style={{ backgroundColor: 'var(--bg-inset)' }}>
                    <p className="text-base font-bold">{s.value}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            <button onClick={runEnrichment} disabled={enriching}
              className="btn-primary flex items-center gap-2 disabled:opacity-40 w-full justify-center">
              {enriching
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Enrichissement en cours (30 ingrédients)…</>
                : <><ImagePlus className="w-4 h-4" /> Lancer l&apos;enrichissement (batch 30)</>
              }
            </button>

            {enrichResult && (
              <div className="mt-3 rounded-lg p-3 text-sm" style={{
                backgroundColor: enrichResult.enriched > 0 ? 'rgba(16,185,129,0.08)' : 'var(--bg-inset)',
                border: `1px solid ${enrichResult.enriched > 0 ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
              }}>
                ✅ {enrichResult.enriched} enrichis · ⏭ {enrichResult.skipped} ignorés · 📦 {enrichResult.remaining} restants
              </div>
            )}

            <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
              <a href="https://world.openfoodfacts.org/data" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline">
                Open Food Facts <ExternalLink className="w-2.5 h-2.5" />
              </a>
              {' '}— base libre, 3M+ produits
            </p>
          </div>
        </>
      )}

      {/* Bouton sauvegarder (commun) */}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-40">
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Sauvegardé' : saving ? 'Sauvegarde...' : 'Sauvegarder tout'}
        </button>
      </div>
    </div>
  );
}
