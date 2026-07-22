'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Users, MousePointerClick, UserPlus, LogIn, Eye, RefreshCw } from 'lucide-react';

interface AnalyticsSummary {
  summary: {
    total7: number;
    total30: number;
    uniqueSessions7: number;
    guestSessions7: number;
    conversionRate: number;
    promptShown: number;
    registerClicks: number;
    loginClicks: number;
  };
  byEvent: Array<{ event: string; count: number }>;
  daily: Array<{ day: string; count: number }>;
}

const EVENT_LABELS: Record<string, string> = {
  page_view: 'Vues de page',
  recipe_view: 'Vues recette',
  scan_attempt: 'Tentatives de scan',
  fridge_add_attempt: 'Ajouts frigo tentés',
  auth_prompt_shown: 'Prompts auth affichés',
  register_click: 'Clics inscription',
  login_click: 'Clics connexion',
  guest_banner_dismiss: 'Bannière invité fermée',
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/analytics');
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Calcul du max pour la mini bar chart
  const maxDaily = data ? Math.max(...data.daily.map(d => d.count), 1) : 1;

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 rounded-xl transition-colors hover:opacity-70"
              style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Analytics</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Trafic, engagement et conversions</p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {loading && !data ? (
          <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>Chargement…</div>
        ) : data ? (
          <div className="space-y-6">

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Sessions 7j', value: data.summary.uniqueSessions7, icon: Users, color: 'rgb(16,185,129)' },
                { label: 'Invités 7j', value: data.summary.guestSessions7, icon: Eye, color: 'rgb(99,102,241)' },
                { label: 'Conversion', value: `${data.summary.conversionRate}%`, icon: TrendingUp, color: 'rgb(245,158,11)' },
                { label: 'Évén. 30j', value: data.summary.total30, icon: MousePointerClick, color: 'rgb(239,68,68)' },
              ].map(kpi => (
                <div key={kpi.label} className="rounded-2xl p-4"
                  style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                  <kpi.icon className="w-4 h-4 mb-2" style={{ color: kpi.color }} />
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{kpi.label}</p>
                </div>
              ))}
            </div>

            {/* Funnel conversion */}
            <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
              <h2 className="font-semibold text-sm mb-4">Funnel de conversion (7 jours)</h2>
              <div className="space-y-3">
                {[
                  { label: 'Prompts auth affichés', value: data.summary.promptShown, icon: Eye, color: 'rgb(99,102,241)' },
                  { label: 'Clics inscription', value: data.summary.registerClicks, icon: UserPlus, color: 'rgb(16,185,129)' },
                  { label: 'Clics connexion', value: data.summary.loginClicks, icon: LogIn, color: 'rgb(245,158,11)' },
                ].map(row => {
                  const pct = data.summary.promptShown > 0
                    ? Math.round((row.value / data.summary.promptShown) * 100)
                    : 0;
                  return (
                    <div key={row.label}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 text-xs">
                          <row.icon className="w-3.5 h-3.5" style={{ color: row.color }} />
                          <span>{row.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">{row.value}</span>
                          <span className="text-[10px] w-8 text-right" style={{ color: 'var(--text-muted)' }}>{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-inset)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: row.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Graphe journalier */}
            {data.daily.length > 0 && (
              <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                <h2 className="font-semibold text-sm mb-4">Événements par jour (14j)</h2>
                <div className="flex items-end gap-1 h-28">
                  {data.daily.map(d => {
                    const h = Math.max(4, Math.round((d.count / maxDaily) * 100));
                    const label = d.day.slice(5); // MM-DD
                    return (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group">
                        <div
                          className="w-full rounded-t-sm transition-all"
                          style={{ height: `${h}%`, backgroundColor: 'rgb(16,185,129)', opacity: 0.8 }}
                          title={`${d.day}: ${d.count}`}
                        />
                        <span className="text-[8px] hidden group-hover:block" style={{ color: 'var(--text-muted)' }}>{label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{data.daily[0]?.day?.slice(5)}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{data.daily[data.daily.length - 1]?.day?.slice(5)}</span>
                </div>
              </div>
            )}

            {/* Événements détaillés */}
            <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
              <h2 className="font-semibold text-sm mb-4">Événements (7 jours)</h2>
              <div className="space-y-2">
                {data.byEvent.map(ev => (
                  <div key={ev.event} className="flex items-center justify-between py-1.5 border-b"
                    style={{ borderColor: 'var(--border-subtle)' }}>
                    <span className="text-xs">{EVENT_LABELS[ev.event] ?? ev.event}</span>
                    <span className="text-xs font-semibold tabular-nums">{ev.count.toLocaleString('fr-FR')}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <p className="text-center py-20" style={{ color: 'var(--text-muted)' }}>Impossible de charger les analytics.</p>
        )}
      </div>
    </div>
  );
}
