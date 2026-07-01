'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, ExternalLink, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';

interface RappelAlert {
  id: string;
  brand: string;
  product: string;
  reason: string;
  risks: string;
  action: string;
  date: string;
  link: string;
  distributors: string;
  lotInfo: string;
  matchedIngredients: string[];
}

export default function RappelsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<RappelAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/rappel-conso')
      .then(r => r.ok ? r.json() : [])
      .then(setAlerts)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
        style={{ backgroundColor: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-[var(--bg-inset)]">
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
        </button>
        <div>
          <h1 className="text-base font-semibold">Rappels produits</h1>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Source : RappelConso.gouv.fr</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-16 fade-in">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-lg font-semibold mb-2">Aucun rappel détecté</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Aucun produit de ton frigo n{"'"}est concerné par un rappel en cours.
              On vérifie automatiquement à chaque visite.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4 px-1">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {alerts.length} rappel{alerts.length > 1 ? 's' : ''} concerne{alerts.length > 1 ? 'nt' : ''} ton frigo
              </p>
            </div>

            <div className="space-y-3">
              {alerts.map(alert => (
                <div key={alert.id} className="rounded-xl overflow-hidden fade-in"
                  style={{ border: '1px solid rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.04)' }}>
                  <button
                    onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                    className="w-full text-left px-4 py-3.5 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-red-700 dark:text-red-400">{alert.brand}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{alert.product}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {alert.matchedIngredients.map(ing => (
                          <span key={ing} className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                    {expandedId === alert.id
                      ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                      : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />}
                  </button>

                  {expandedId === alert.id && (
                    <div className="px-4 pb-4 space-y-3 fade-in" style={{ borderTop: '1px solid rgba(239,68,68,0.15)' }}>
                      <div className="pt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-red-600">Motif du rappel</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{alert.reason}</p>
                      </div>

                      {alert.risks && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Risques</p>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{alert.risks}</p>
                        </div>
                      )}

                      {alert.action && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Que faire ?</p>
                          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{alert.action}</p>
                        </div>
                      )}

                      {alert.lotInfo && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Identification</p>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{alert.lotInfo}</p>
                        </div>
                      )}

                      {alert.distributors && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Distributeurs</p>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{alert.distributors}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          Publié le {new Date(alert.date).toLocaleDateString('fr-FR')}
                        </p>
                        {alert.link && (
                          <a href={alert.link} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                            Fiche officielle <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
