'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import MascotLoader from '@/components/MascotLoader';
import { useT } from '@/lib/i18n';
import {
  Heart, Dumbbell, Moon, Zap, ChevronRight, ChevronLeft,
  Check, Plus, X, Loader2, Crown, Pill, Target, Clock,
  Activity, Scale, Flame, Brain, ArrowRight, Sparkles,
} from 'lucide-react';

interface CoachProfile {
  height: number | null; weight: number | null; age: number | null; sex: string | null;
  activityLevel: string; sportTypes: string; sportFrequency: number | null;
  goal: string; targetCalories: number | null; schedule: string;
  tdee: number | null; bmr: number | null;
}

interface Supplement { id: string; name: string; dosage: string; timing: string; category: string; active: boolean }

export default function CoachPage() {
  const router = useRouter();
  const { t } = useT();

  const ACTIVITY_LEVELS = [
    { key: 'sedentary', label: t('coach.activity.sedentary'), desc: t('coach.activity.sedentary.desc'), emoji: '🪑' },
    { key: 'light', label: t('coach.activity.light'), desc: t('coach.activity.light.desc'), emoji: '🚶' },
    { key: 'moderate', label: t('coach.activity.moderate'), desc: t('coach.activity.moderate.desc'), emoji: '🏃' },
    { key: 'active', label: t('coach.activity.active'), desc: t('coach.activity.active.desc'), emoji: '💪' },
    { key: 'very_active', label: t('coach.activity.very_active'), desc: t('coach.activity.very_active.desc'), emoji: '🏋️' },
  ];

  const GOALS = [
    { key: 'maintain', label: t('coach.goal.maintain'), desc: t('coach.goal.maintain.desc'), emoji: '⚖️', color: '#6b7280' },
    { key: 'lose', label: t('coach.goal.lose'), desc: t('coach.goal.lose.desc'), emoji: '📉', color: '#10b981' },
    { key: 'gain', label: t('coach.goal.gain'), desc: t('coach.goal.gain.desc'), emoji: '📈', color: '#8b5cf6' },
    { key: 'energy', label: t('coach.goal.energy'), desc: t('coach.goal.energy.desc'), emoji: '⚡', color: '#f59e0b' },
    { key: 'health', label: t('coach.goal.health'), desc: t('coach.goal.health.desc'), emoji: '❤️', color: '#ef4444' },
  ];

  const SPORT_TYPES = [
    { key: 'running', label: t('coach.sport.running'), emoji: '🏃' },
    { key: 'musculation', label: t('coach.sport.musculation'), emoji: '🏋️' },
    { key: 'cycling', label: t('coach.sport.cycling'), emoji: '🚴' },
    { key: 'swimming', label: t('coach.sport.swimming'), emoji: '🏊' },
    { key: 'yoga', label: t('coach.sport.yoga'), emoji: '🧘' },
    { key: 'football', label: t('coach.sport.football'), emoji: '⚽' },
    { key: 'boxing', label: t('coach.sport.boxing'), emoji: '🥊' },
    { key: 'hiking', label: t('coach.sport.hiking'), emoji: '🥾' },
    { key: 'dance', label: t('coach.sport.dance'), emoji: '💃' },
    { key: 'other', label: t('coach.sport.other'), emoji: '🏅' },
  ];

  const SUPPLEMENT_PRESETS = [
    { name: 'Vitamine D', dosage: '1000 UI', category: 'vitamin', timing: 'morning' },
    { name: 'Fer', dosage: '14 mg', category: 'mineral', timing: 'morning' },
    { name: 'Magnésium', dosage: '300 mg', category: 'mineral', timing: 'evening' },
    { name: 'Vitamine B12', dosage: '1000 µg', category: 'vitamin', timing: 'morning' },
    { name: 'Oméga-3', dosage: '1000 mg', category: 'omega', timing: 'morning' },
    { name: 'Zinc', dosage: '15 mg', category: 'mineral', timing: 'morning' },
    { name: 'Vitamine C', dosage: '500 mg', category: 'vitamin', timing: 'morning' },
    { name: 'Calcium', dosage: '500 mg', category: 'mineral', timing: 'evening' },
    { name: 'Whey Protein', dosage: '30 g', category: 'protein', timing: 'post_workout' },
    { name: 'Créatine', dosage: '5 g', category: 'amino', timing: 'post_workout' },
    { name: 'BCAA', dosage: '5 g', category: 'amino', timing: 'pre_workout' },
    { name: 'Acide folique', dosage: '400 µg', category: 'vitamin', timing: 'morning' },
    { name: 'Collagène', dosage: '10 g', category: 'protein', timing: 'morning' },
    { name: 'Probiotiques', dosage: '10 Mds UFC', category: 'other', timing: 'morning' },
    { name: 'Spiruline', dosage: '3 g', category: 'other', timing: 'morning' },
    { name: 'Ashwagandha', dosage: '600 mg', category: 'other', timing: 'evening' },
  ];

  const TIMING_LABELS: Record<string, string> = {
    morning: t('coach.timing.morning'),
    noon: t('coach.timing.noon'),
    evening: t('coach.timing.evening'),
    pre_workout: t('coach.timing.pre_workout'),
    post_workout: t('coach.timing.post_workout'),
  };

  const STEPS = [
    t('coach.step.physique'),
    t('coach.step.activite'),
    t('coach.step.objectif'),
    t('coach.step.complements'),
    t('coach.step.resume'),
  ];

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile fields
  const [height, setHeight] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [sex, setSex] = useState<string | null>(null);
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [sportTypes, setSportTypes] = useState<string[]>([]);
  const [sportFrequency, setSportFrequency] = useState<number | null>(null);
  const [goal, setGoal] = useState('maintain');

  // Supplements
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [showAddSupplement, setShowAddSupplement] = useState(false);
  const [customSuppName, setCustomSuppName] = useState('');
  const [customSuppDosage, setCustomSuppDosage] = useState('');
  const [customSuppTiming, setCustomSuppTiming] = useState('morning');

  // Computed
  const [tdee, setTdee] = useState<number | null>(null);
  const [bmr, setBmr] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/coach').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.profile) {
        const p = d.profile;
        setHeight(p.height); setWeight(p.weight); setAge(p.age); setSex(p.sex);
        setActivityLevel(p.activityLevel || 'moderate');
        try { setSportTypes(JSON.parse(p.sportTypes || '[]')); } catch { setSportTypes([]); }
        setSportFrequency(p.sportFrequency);
        setGoal(p.goal || 'maintain');
        setTdee(p.tdee); setBmr(p.bmr);
      }
      if (d?.supplements) setSupplements(d.supplements);
      setLoading(false);
    });
  }, []);

  // Recalculate TDEE locally
  useEffect(() => {
    if (weight && height && age && sex) {
      const b = sex === 'M'
        ? Math.round(10 * weight + 6.25 * height - 5 * age + 5)
        : Math.round(10 * weight + 6.25 * height - 5 * age - 161);
      setBmr(b);
      const mult: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
      let td = Math.round(b * (mult[activityLevel] || 1.55));
      if (goal === 'lose') td = Math.round(td * 0.85);
      else if (goal === 'gain') td = Math.round(td * 1.15);
      setTdee(td);
    }
  }, [weight, height, age, sex, activityLevel, goal]);

  async function saveProfile() {
    setSaving(true);
    await fetch('/api/coach', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        height, weight, age, sex, activityLevel,
        sportTypes, sportFrequency, goal,
      }),
    });
    setSaving(false);
  }

  async function addSupplement(preset?: typeof SUPPLEMENT_PRESETS[0]) {
    const name = preset?.name || customSuppName.trim();
    if (!name) return;
    const res = await fetch('/api/coach/supplements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        dosage: preset?.dosage || customSuppDosage,
        timing: preset?.timing || customSuppTiming,
        category: preset?.category || 'other',
      }),
    });
    if (res.ok) {
      const s = await res.json();
      setSupplements(prev => [...prev, s]);
      setCustomSuppName(''); setCustomSuppDosage('');
      setShowAddSupplement(false);
    }
  }

  async function removeSupplement(id: string) {
    await fetch('/api/coach/supplements', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setSupplements(prev => prev.filter(s => s.id !== id));
  }

  async function finish() {
    await saveProfile();
    router.push('/shopping');
  }

  if (loading) return <AppShell><MascotLoader /></AppShell>;

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgb(168,85,247), rgb(59,130,246))' }}>
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base">{t('coach.header.title')}</h1>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {t('coach.header.sub')}
          </p>
        </div>
        <Crown className="w-4 h-4 text-purple-500 ml-auto" />
      </div>

      {/* Step indicator */}
      <div className="flex gap-1 mb-5">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(i)}
            className="flex-1 text-center py-1.5 rounded-lg text-[10px] font-medium transition-all"
            style={i === step
              ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
              : i < step
              ? { backgroundColor: 'rgba(16,185,129,0.1)', color: 'rgb(16,185,129)' }
              : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)' }}>
            {i < step ? '✓' : ''} {s}
          </button>
        ))}
      </div>

      {/* ── Step 0: Physique ── */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('coach.physique.hint')}
          </p>

          <div className="flex gap-2">
            {[{ k: 'M', label: t('coach.physique.homme'), emoji: '👨' }, { k: 'F', label: t('coach.physique.femme'), emoji: '👩' }].map(s => (
              <button key={s.k} onClick={() => setSex(s.k)}
                className="flex-1 py-3 rounded-xl text-center transition-all"
                style={sex === s.k
                  ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                  : { backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
                <span className="text-xl block mb-1">{s.emoji}</span>
                <span className="text-xs font-medium">{s.label}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t('coach.physique.taille'), value: height, set: setHeight, placeholder: '175' },
              { label: t('coach.physique.poids'), value: weight, set: setWeight, placeholder: '70' },
              { label: t('coach.physique.age'), value: age, set: setAge, placeholder: '30' },
            ].map(f => (
              <div key={f.label}>
                <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
                <input type="number" value={f.value ?? ''} onChange={e => f.set(e.target.value ? Number(e.target.value) : null)}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2.5 rounded-lg text-sm bg-transparent outline-none"
                  style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }} />
              </div>
            ))}
          </div>

          {tdee && (
            <div className="card p-3 flex items-center gap-3">
              <Flame className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-semibold">{t('coach.physique.tdee', { tdee: String(tdee) })}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {t('coach.physique.bmr', { bmr: String(bmr), level: ACTIVITY_LEVELS.find(a => a.key === activityLevel)?.label ?? '' })}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 1: Activité ── */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('coach.activite.hint')}
          </p>

          <div className="space-y-2">
            {ACTIVITY_LEVELS.map(a => (
              <button key={a.key} onClick={() => setActivityLevel(a.key)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                style={activityLevel === a.key
                  ? { backgroundColor: 'rgba(168,85,247,0.08)', border: '1.5px solid rgba(168,85,247,0.3)' }
                  : { backgroundColor: 'var(--bg-inset)', border: '1.5px solid transparent' }}>
                <span className="text-xl">{a.emoji}</span>
                <div>
                  <p className="text-sm font-medium">{a.label}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{a.desc}</p>
                </div>
                {activityLevel === a.key && <Check className="w-4 h-4 text-purple-500 ml-auto" />}
              </button>
            ))}
          </div>

          <div>
            <p className="text-xs font-medium mb-2">{t('coach.activite.sports')}</p>
            <div className="flex flex-wrap gap-2">
              {SPORT_TYPES.map(s => {
                const active = sportTypes.includes(s.key);
                return (
                  <button key={s.key} onClick={() => setSportTypes(prev =>
                    active ? prev.filter(x => x !== s.key) : [...prev, s.key]
                  )}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={active
                      ? { backgroundColor: 'rgba(168,85,247,0.12)', color: 'rgb(168,85,247)', border: '1px solid rgba(168,85,247,0.3)' }
                      : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    {s.emoji} {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {sportTypes.length > 0 && (
            <div>
              <label className="text-xs font-medium block mb-1">{t('coach.activite.sessions')}</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <button key={n} onClick={() => setSportFrequency(n)}
                    className="w-9 h-9 rounded-full text-xs font-bold transition-all"
                    style={sportFrequency === n
                      ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                      : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Objectif ── */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('coach.objectif.hint')}
          </p>

          <div className="space-y-2">
            {GOALS.map(g => (
              <button key={g.key} onClick={() => setGoal(g.key)}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all"
                style={goal === g.key
                  ? { backgroundColor: `${g.color}12`, border: `1.5px solid ${g.color}40` }
                  : { backgroundColor: 'var(--bg-inset)', border: '1.5px solid transparent' }}>
                <span className="text-2xl">{g.emoji}</span>
                <div>
                  <p className="text-sm font-semibold">{g.label}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{g.desc}</p>
                </div>
                {goal === g.key && <Check className="w-4 h-4 ml-auto" style={{ color: g.color }} />}
              </button>
            ))}
          </div>

          {tdee && (
            <div className="card p-3">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t('coach.objectif.calories')} <span className="font-bold" style={{ color: 'var(--text)' }}>{t('coach.objectif.kcalDay', { n: String(tdee) })}</span>
                {goal === 'lose' && ` ${t('coach.objectif.deficit')}`}
                {goal === 'gain' && ` ${t('coach.objectif.surplus')}`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Compléments alimentaires ── */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('coach.complements.hint')}
          </p>

          {/* Current supplements */}
          {supplements.length > 0 && (
            <div className="space-y-1.5">
              {supplements.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-inset)' }}>
                  <Pill className="w-4 h-4 text-purple-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {s.dosage} · {TIMING_LABELS[s.timing] || s.timing}
                    </p>
                  </div>
                  <button onClick={() => removeSupplement(s.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-500/10">
                    <X className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Quick add presets */}
          <div>
            <p className="text-xs font-medium mb-2">{t('coach.complements.quickAdd')}</p>
            <div className="flex flex-wrap gap-1.5">
              {SUPPLEMENT_PRESETS.filter(p => !supplements.some(s => s.name === p.name)).map(p => (
                <button key={p.name} onClick={() => addSupplement(p)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  <Plus className="w-3 h-3" /> {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Custom supplement */}
          <button onClick={() => setShowAddSupplement(!showAddSupplement)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium"
            style={{ border: '1.5px dashed var(--border)', color: 'var(--text-muted)' }}>
            <Plus className="w-3.5 h-3.5" /> {t('coach.complements.custom')}
          </button>

          {showAddSupplement && (
            <div className="card p-3 space-y-2">
              <input type="text" placeholder={t('coach.complements.namePlaceholder')} value={customSuppName}
                onChange={e => setCustomSuppName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }} />
              <input type="text" placeholder={t('coach.complements.dosagePlaceholder')} value={customSuppDosage}
                onChange={e => setCustomSuppDosage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }} />
              <div className="flex gap-2 flex-wrap">
                {Object.entries(TIMING_LABELS).map(([k, v]) => (
                  <button key={k} onClick={() => setCustomSuppTiming(k)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-medium"
                    style={customSuppTiming === k
                      ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                      : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)' }}>
                    {v}
                  </button>
                ))}
              </div>
              <button onClick={() => addSupplement()} disabled={!customSuppName.trim()}
                className="w-full py-2 rounded-lg text-xs font-semibold disabled:opacity-40"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
                {t('coach.complements.add')}
              </button>
            </div>
          )}

          <p className="text-[9px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {t('coach.complements.disclaimer')}
          </p>
        </div>
      )}

      {/* ── Step 4: Résumé ── */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" /> {t('coach.resume.title')}
            </h3>

            <div className="space-y-2">
              {sex && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>{t('coach.resume.profil')}</span>
                  <span className="font-medium">
                    {sex === 'M' ? t('coach.resume.homme') : t('coach.resume.femme')}
                    {age ? `, ${t('coach.resume.ans', { n: String(age) })}` : ''}
                    {height ? `, ${t('coach.resume.cm', { n: String(height) })}` : ''}
                    {weight ? `, ${t('coach.resume.kg', { n: String(weight) })}` : ''}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--text-muted)' }}>{t('coach.resume.activite')}</span>
                <span className="font-medium">{ACTIVITY_LEVELS.find(a => a.key === activityLevel)?.label}</span>
              </div>
              {sportTypes.length > 0 && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>{t('coach.resume.sports')}</span>
                  <span className="font-medium">{sportTypes.map(s => SPORT_TYPES.find(tp => tp.key === s)?.emoji).join(' ')} {sportFrequency}{t('coach.resume.sportFreq', { n: '' }).replace('{n}', String(sportFrequency ?? ''))}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--text-muted)' }}>{t('coach.resume.objectif')}</span>
                <span className="font-medium">{GOALS.find(g => g.key === goal)?.emoji} {GOALS.find(g => g.key === goal)?.label}</span>
              </div>
              {tdee && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>{t('coach.resume.caloriesCible')}</span>
                  <span className="font-bold text-orange-500">{t('coach.resume.kcalDay', { n: String(tdee) })}</span>
                </div>
              )}
            </div>
          </div>

          {supplements.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Pill className="w-4 h-4 text-purple-500" /> {t('coach.resume.complements', { n: String(supplements.length) })}
              </h3>
              <div className="space-y-1">
                {supplements.map(s => (
                  <div key={s.id} className="flex items-center justify-between text-xs py-1">
                    <span className="font-medium">{s.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{s.dosage} · {TIMING_LABELS[s.timing]?.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-4" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(59,130,246,0.06))' }}>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t('coach.resume.coachWillAdapt')}
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {step > 0 ? (
          <button onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-xs font-medium"
            style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
            <ChevronLeft className="w-3.5 h-3.5" /> {t('coach.nav.retour')}
          </button>
        ) : (
          <button onClick={() => router.push('/profile')}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-xs font-medium"
            style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
            {t('coach.nav.passer')}
          </button>
        )}

        <div className="flex-1" />

        {step < STEPS.length - 1 ? (
          <button onClick={() => { if (step <= 2) saveProfile(); setStep(s => s + 1); }}
            className="flex items-center gap-1 px-5 py-2.5 rounded-xl text-xs font-semibold"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
            {t('coach.nav.suivant')} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button onClick={finish} disabled={saving}
            className="flex items-center gap-1 px-5 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, rgb(168,85,247), rgb(59,130,246))', color: 'white' }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {t('coach.nav.terminer')}
          </button>
        )}
      </div>
    </AppShell>
  );
}
