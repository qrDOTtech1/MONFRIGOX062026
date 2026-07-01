'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Home, Users, LogIn, CheckCircle } from 'lucide-react';

interface InviteInfo {
  householdName: string;
  memberCount: number;
  expiresAt: string;
}

export default function JoinHouseholdPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    fetch(`/api/household/join/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setInfo(data);
      })
      .catch(() => setError('Erreur réseau'));
  }, [token]);

  async function join() {
    setJoining(true); setError('');
    const res = await fetch(`/api/household/join/${token}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setJoining(false);
      return;
    }
    setJoined(true);
    setTimeout(() => router.replace('/fridge'), 2000);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
            style={{ backgroundColor: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)' }}>
            🏠
          </div>
          <h1 className="text-xl font-bold mb-1">Rejoindre un foyer</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Vous avez été invité à partager un frigo commun
          </p>
        </div>

        {joined ? (
          <div className="card p-6 text-center fade-in">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <p className="font-semibold mb-1">Bienvenue dans le foyer !</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Redirection vers votre frigo…</p>
          </div>
        ) : error ? (
          <div className="card p-6 text-center">
            <p className="text-sm font-medium text-red-500 mb-4">{error}</p>
            <Link href="/home"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold inline-block"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
              Retour à l&apos;accueil
            </Link>
          </div>
        ) : info ? (
          <div className="card p-5 fade-in">
            <div className="flex items-center gap-3 mb-5 p-3 rounded-xl"
              style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
              <Home className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold">{info.householdName}</p>
                <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <Users className="w-3 h-3" />
                  <span>{info.memberCount} membre{info.memberCount > 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
            <p className="text-xs mb-5 text-center" style={{ color: 'var(--text-muted)' }}>
              En rejoignant, votre frigo sera fusionné avec celui du foyer.<br />
              Tous les membres pourront voir vos aliments.
            </p>
            <button
              onClick={join}
              disabled={joining}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 hover:scale-[1.01]"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
              <LogIn className="w-4 h-4" />
              {joining ? 'Rejoindre…' : 'Rejoindre le foyer'}
            </button>
            <p className="text-[10px] text-center mt-3" style={{ color: 'var(--text-muted)' }}>
              Vous devez être connecté pour rejoindre. <Link href="/login" className="underline">Se connecter</Link>
            </p>
          </div>
        ) : (
          <div className="card p-6 flex justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)' }} />
          </div>
        )}
      </div>
    </div>
  );
}
