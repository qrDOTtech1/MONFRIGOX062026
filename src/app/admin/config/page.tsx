'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Check, Key, Globe, Brain, RefreshCw, Wifi, WifiOff, Shield, ChevronDown, Zap } from 'lucide-react';

interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

export default function AdminConfigPage() {
  const [host, setHost] = useState('https://ollama.com');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('qwen3.5');
  const [visionModel, setVisionModel] = useState('gemma3:27b');
  const [backupHost, setBackupHost] = useState('https://ollama.com');
  const [backupApiKey, setBackupApiKey] = useState('');
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
      });
  }, []);

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
      if (data.ok) {
        setModels(data.models || []);
      } else {
        setConnectionError(data.error || 'Connexion échouée');
      }
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
    ].filter(c => c.value.trim());

    await fetch('/api/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configs }),
    });

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
    <div className="fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-fresh-500" />
        <h1 className="text-2xl font-bold">Configuration Ollama Cloud</h1>
      </div>

      {/* Connection principale */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-1">
          <Zap className="w-5 h-5 text-fresh-500" />
          <h2 className="font-semibold text-lg">Connexion principale</h2>
          {connected !== null && (
            <span className={`badge ml-auto ${connected ? 'bg-fresh-500/20 text-fresh-400' : 'bg-red-500/20 text-red-400'}`}>
              {connected ? <><Wifi className="w-3 h-3 mr-1" /> Connecté</> : <><WifiOff className="w-3 h-3 mr-1" /> Déconnecté</>}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Connecte-toi à Ollama Cloud pour utiliser les modèles IA. Crée ta clé API sur{' '}
          <a href="https://ollama.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-fresh-500 hover:underline">
            ollama.com/settings/keys
          </a>
        </p>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-1.5">
              <Globe className="w-4 h-4" /> Host Ollama
            </label>
            <input
              type="text"
              value={host}
              onChange={e => setHost(e.target.value)}
              placeholder="https://ollama.com"
              className="input-field font-mono text-sm"
            />
            <p className="text-[10px] text-gray-600 mt-1">Par défaut: https://ollama.com — Change seulement si tu utilises un serveur Ollama custom</p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-1.5">
              <Key className="w-4 h-4" /> Clé API
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Colle ta clé API Ollama ici..."
              className="input-field font-mono text-sm"
            />
          </div>

          <button
            onClick={testConnection}
            disabled={testing || !apiKey}
            className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Test en cours...' : 'Tester la connexion'}
          </button>

          {connected === false && connectionError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {connectionError}
            </div>
          )}

          {connected && models.length > 0 && (
            <div className="bg-fresh-500/5 border border-fresh-500/20 rounded-xl px-4 py-3">
              <p className="text-fresh-400 text-sm font-medium mb-1">{models.length} modèle{models.length > 1 ? 's' : ''} disponible{models.length > 1 ? 's' : ''}</p>
              <p className="text-[10px] text-gray-500">Clique sur un modèle ci-dessous pour le sélectionner</p>
            </div>
          )}
        </div>
      </div>

      {/* Sélection des modèles */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-1">
          <Brain className="w-5 h-5 text-fresh-500" />
          <h2 className="font-semibold text-lg">Modèles</h2>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Choisis les modèles pour le chat et la vision. Voir les modèles cloud disponibles sur{' '}
          <a href="https://ollama.com/search?c=cloud" target="_blank" rel="noopener noreferrer" className="text-fresh-500 hover:underline">
            ollama.com/search?c=cloud
          </a>
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">Modèle texte (recettes, suggestions, listes)</label>
            <input
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="qwen3.5"
              className="input-field font-mono text-sm"
            />
            <p className="text-[10px] text-gray-600 mt-1">Recommandés: qwen3.5, deepseek-v4-flash, kimi-k2.6, gpt-oss:120b</p>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">Modèle vision (scan du frigo)</label>
            <input
              type="text"
              value={visionModel}
              onChange={e => setVisionModel(e.target.value)}
              placeholder="gemma3:27b"
              className="input-field font-mono text-sm"
            />
            <p className="text-[10px] text-gray-600 mt-1">Recommandés: gemma3:27b, llama4-scout, qwen3-vl:235b-instruct</p>
          </div>

          {/* Model browser from API */}
          {models.length > 0 && (
            <div>
              <button
                onClick={() => setShowModels(!showModels)}
                className="flex items-center gap-2 text-sm text-fresh-400 hover:text-fresh-300 transition-colors"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showModels ? 'rotate-180' : ''}`} />
                Parcourir mes modèles ({models.length})
              </button>

              {showModels && (
                <div className="mt-3 bg-dark-800 rounded-xl border border-dark-600/50 max-h-64 overflow-y-auto">
                  {models.map((m) => (
                    <div key={m.digest} className="flex items-center justify-between px-4 py-2.5 border-b border-dark-700/50 last:border-0 hover:bg-dark-700/30 transition-colors">
                      <div>
                        <p className="text-sm font-mono text-cream">{m.name}</p>
                        <p className="text-[10px] text-gray-500">{formatSize(m.size)}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => selectModel(m.name, 'text')}
                          className="px-2 py-1 text-[10px] bg-dark-600 hover:bg-fresh-500/20 hover:text-fresh-400 rounded-md transition-colors"
                        >
                          Texte
                        </button>
                        <button
                          onClick={() => selectModel(m.name, 'vision')}
                          className="px-2 py-1 text-[10px] bg-dark-600 hover:bg-blue-500/20 hover:text-blue-400 rounded-md transition-colors"
                        >
                          Vision
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Backup */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-1">
          <Shield className="w-5 h-5 text-yellow-500" />
          <h2 className="font-semibold text-lg">Clé de backup</h2>
          <span className="badge bg-dark-600 text-gray-400 text-[10px]">Optionnel</span>
          {backupConnected !== null && (
            <span className={`badge ml-auto ${backupConnected ? 'bg-fresh-500/20 text-fresh-400' : 'bg-red-500/20 text-red-400'}`}>
              {backupConnected ? 'OK' : 'Erreur'}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Si la clé principale échoue, le système bascule automatiquement sur la clé backup.
          Utile pour la haute disponibilité ou pour un compte secondaire.
        </p>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-1.5">
              <Globe className="w-4 h-4" /> Host backup
            </label>
            <input
              type="text"
              value={backupHost}
              onChange={e => setBackupHost(e.target.value)}
              placeholder="https://ollama.com"
              className="input-field font-mono text-sm"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-1.5">
              <Key className="w-4 h-4" /> Clé API backup
            </label>
            <input
              type="password"
              value={backupApiKey}
              onChange={e => setBackupApiKey(e.target.value)}
              placeholder="Clé API du compte backup..."
              className="input-field font-mono text-sm"
            />
          </div>

          {backupApiKey && (
            <button
              onClick={testBackupConnection}
              disabled={testingBackup}
              className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${testingBackup ? 'animate-spin' : ''}`} />
              {testingBackup ? 'Test...' : 'Tester le backup'}
            </button>
          )}

          {backupConnected === false && backupError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {backupError}
            </div>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button onClick={save} disabled={saving || !apiKey} className="btn-primary flex items-center gap-2 disabled:opacity-40">
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Sauvegardé!' : saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
        </button>
        {!apiKey && <p className="text-xs text-gray-500">Entre une clé API pour sauvegarder</p>}
      </div>

      {/* Info box */}
      <div className="glass-card p-5">
        <h3 className="font-medium text-sm mb-3">Comment ça marche</h3>
        <div className="space-y-3 text-xs text-gray-400">
          <div className="flex gap-3">
            <span className="w-6 h-6 bg-fresh-500/20 rounded-lg flex items-center justify-center text-fresh-400 text-[10px] font-bold shrink-0">1</span>
            <p>Crée un compte sur <span className="text-fresh-400">ollama.com</span> et génère une clé API dans les paramètres</p>
          </div>
          <div className="flex gap-3">
            <span className="w-6 h-6 bg-fresh-500/20 rounded-lg flex items-center justify-center text-fresh-400 text-[10px] font-bold shrink-0">2</span>
            <p>Colle ta clé ici et teste la connexion — tous les modèles cloud sont listés automatiquement</p>
          </div>
          <div className="flex gap-3">
            <span className="w-6 h-6 bg-fresh-500/20 rounded-lg flex items-center justify-center text-fresh-400 text-[10px] font-bold shrink-0">3</span>
            <p>Choisis un modèle texte (pour les recettes) et un modèle vision (pour le scan du frigo)</p>
          </div>
          <div className="flex gap-3">
            <span className="w-6 h-6 bg-yellow-500/20 rounded-lg flex items-center justify-center text-yellow-400 text-[10px] font-bold shrink-0">!</span>
            <p>Une seule clé API est partagée entre tous les utilisateurs. La clé backup prend le relais automatiquement en cas d&apos;erreur.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
