'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Check, Key, Globe, Brain } from 'lucide-react';

interface ConfigItem {
  key: string;
  value: string;
  label: string;
  icon: React.ElementType;
  placeholder: string;
  secret?: boolean;
}

const configItems: ConfigItem[] = [
  { key: 'OLLAMA_API_URL', value: '', label: 'API URL (principale)', icon: Globe, placeholder: 'https://api.together.xyz/v1' },
  { key: 'OLLAMA_API_KEY', value: '', label: 'API Key (principale)', icon: Key, placeholder: 'sk-...', secret: true },
  { key: 'OLLAMA_MODEL', value: '', label: 'Modèle texte', icon: Brain, placeholder: 'meta-llama/Llama-3-70b-chat-hf' },
  { key: 'OLLAMA_VISION_MODEL', value: '', label: 'Modèle vision', icon: Brain, placeholder: 'meta-llama/Llama-4-Scout-17B-16E-Instruct' },
  { key: 'OLLAMA_BACKUP_API_URL', value: '', label: 'API URL (backup)', icon: Globe, placeholder: 'https://api.groq.com/openai/v1' },
  { key: 'OLLAMA_BACKUP_API_KEY', value: '', label: 'API Key (backup)', icon: Key, placeholder: 'gsk_...', secret: true },
];

export default function AdminConfigPage() {
  const [configs, setConfigs] = useState(configItems);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/config')
      .then(r => r.ok ? r.json() : [])
      .then((data: Array<{ key: string; value: string }>) => {
        setConfigs(prev => prev.map(c => {
          const found = data.find((d: { key: string }) => d.key === c.key);
          return found ? { ...c, value: found.value } : c;
        }));
      });
  }, []);

  async function save() {
    setSaving(true);
    const entries = configs
      .filter(c => c.value.trim())
      .map(c => ({ key: c.key, value: c.value.trim() }));

    await fetch('/api/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configs: entries }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-fresh-500" />
        <h1 className="text-2xl font-bold">Configuration</h1>
      </div>

      <div className="glass-card p-6 mb-6">
        <h2 className="font-semibold mb-1">Configuration IA</h2>
        <p className="text-xs text-gray-500 mb-6">
          Configure les clés API pour l&apos;IA (compatible OpenAI API format: Together, Groq, Ollama, etc.).
          La clé backup est utilisée si la principale échoue.
        </p>

        <div className="space-y-4">
          {configs.map((item, i) => (
            <div key={item.key}>
              <label className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                <item.icon className="w-4 h-4" />
                {item.label}
              </label>
              <input
                type={item.secret ? 'password' : 'text'}
                value={item.value}
                onChange={e => {
                  const updated = [...configs];
                  updated[i] = { ...updated[i], value: e.target.value };
                  setConfigs(updated);
                }}
                placeholder={item.placeholder}
                className="input-field font-mono text-sm"
              />
            </div>
          ))}
        </div>

        <button onClick={save} disabled={saving} className="btn-primary mt-6 flex items-center gap-2">
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Sauvegardé!' : saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      <div className="glass-card p-6">
        <h2 className="font-semibold mb-1">Variables d&apos;environnement Railway</h2>
        <p className="text-xs text-gray-500 mb-4">
          Ces variables peuvent aussi être configurées directement sur Railway. Les valeurs ci-dessus ont priorité.
        </p>
        <div className="bg-dark-800 rounded-xl p-4 font-mono text-xs space-y-1 text-gray-400">
          <p>DATABASE_URL=postgresql://...</p>
          <p>JWT_SECRET=votre-secret-ici</p>
          <p>ADMIN_EMAIL=admin@example.com</p>
          <p>ADMIN_PASSWORD=votre-mdp-admin</p>
          <p>OLLAMA_API_URL=https://api.together.xyz/v1</p>
          <p>OLLAMA_API_KEY=sk-...</p>
          <p>OLLAMA_MODEL=meta-llama/Llama-3-70b-chat-hf</p>
          <p>OLLAMA_VISION_MODEL=meta-llama/Llama-4-Scout-17B-16E-Instruct</p>
        </div>
      </div>
    </div>
  );
}
