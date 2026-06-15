'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Check, Loader2, Refrigerator, Globe } from 'lucide-react';
import { useT, LANGUAGES } from '@/lib/i18n';

const TOTAL_STEPS = 10;

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 justify-center mb-6">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div key={i} className="rounded-full transition-all duration-300"
          style={{
            width: i + 1 === current ? 16 : 5, height: 5,
            backgroundColor: i + 1 <= current ? 'var(--accent)' : 'var(--border)',
          }} />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { t, lang, setLang, isLoading: langLoading } = useT();
  const [step, setStep] = useState(-1);

  const [dietMode,   setDietMode]   = useState('');
  const [allergens,  setAllergens]  = useState<string[]>([]);
  const [skillLevel, setSkillLevel] = useState('');
  const [timePref,   setTimePref]   = useState('');
  const [goals,      setGoals]      = useState<string[]>([]);
  const [flavors,    setFlavors]    = useState<string[]>([]);
  const [cuisines,   setCuisines]   = useState<string[]>([]);
  const [servings,   setServings]   = useState(2);
  const [mealTypes,  setMealTypes]  = useState<string[]>(['LUNCH', 'DINNER']);
  const [equipment,  setEquipment]  = useState<string[]>([]);
  const [saving,     setSaving]     = useState(false);

  // Arrays defined inside component so they use t()
  const DIET_MODES = [
    { key: '',            label: t('onboarding.diet.all'),       emoji: '🍽️' },
    { key: 'vegetarien',  label: t('onboarding.diet.vegetarien'), emoji: '🥗' },
    { key: 'vegan',       label: t('onboarding.diet.vegan'),      emoji: '🌱' },
    { key: 'halal',       label: t('onboarding.diet.halal'),      emoji: '☪️' },
    { key: 'casher',      label: t('onboarding.diet.casher'),     emoji: '✡️' },
    { key: 'sans-porc',   label: t('onboarding.diet.sans-porc'),  emoji: '🚫🐷' },
    { key: 'sans-sucre',  label: t('onboarding.diet.sans-sucre'), emoji: '🚫🍬' },
    { key: 'keto',        label: t('onboarding.diet.keto'),       emoji: '🥑' },
  ];

  const ALLERGENS = [
    { key: 'gluten',         label: t('onboarding.allergen.gluten'),         emoji: '🌾' },
    { key: 'lactose',        label: t('onboarding.allergen.lactose'),        emoji: '🥛' },
    { key: 'oeufs',          label: t('onboarding.allergen.oeufs'),          emoji: '🥚' },
    { key: 'arachides',      label: t('onboarding.allergen.arachides'),      emoji: '🥜' },
    { key: 'fruits-a-coque', label: t('onboarding.allergen.fruits-a-coque'), emoji: '🌰' },
    { key: 'soja',           label: t('onboarding.allergen.soja'),           emoji: '🫘' },
    { key: 'poisson',        label: t('onboarding.allergen.poisson'),        emoji: '🐟' },
    { key: 'crustaces',      label: t('onboarding.allergen.crustaces'),      emoji: '🦐' },
    { key: 'celeri',         label: t('onboarding.allergen.celeri'),         emoji: '🥬' },
    { key: 'moutarde',       label: t('onboarding.allergen.moutarde'),       emoji: '🟡' },
    { key: 'sesame',         label: t('onboarding.allergen.sesame'),         emoji: '⚪' },
    { key: 'sulfites',       label: t('onboarding.allergen.sulfites'),       emoji: '🍷' },
  ];

  const FLAVORS = [
    { key: 'epice', label: t('onboarding.flavor.epice'), emoji: '🌶️', desc: t('onboarding.flavor.epice.desc') },
    { key: 'sucre', label: t('onboarding.flavor.sucre'), emoji: '🍯', desc: t('onboarding.flavor.sucre.desc') },
    { key: 'sale',  label: t('onboarding.flavor.sale'),  emoji: '🧂', desc: t('onboarding.flavor.sale.desc') },
    { key: 'acide', label: t('onboarding.flavor.acide'), emoji: '🍋', desc: t('onboarding.flavor.acide.desc') },
    { key: 'umami', label: t('onboarding.flavor.umami'), emoji: '🍄', desc: t('onboarding.flavor.umami.desc') },
    { key: 'amer',  label: t('onboarding.flavor.amer'),  emoji: '☕', desc: t('onboarding.flavor.amer.desc') },
  ];

  const CUISINES = [
    { key: 'Française',       emoji: '🥐' },
    { key: 'Italienne',       emoji: '🍕' },
    { key: 'Asiatique',       emoji: '🍜' },
    { key: 'Mexicaine',       emoji: '🌮' },
    { key: 'Méditerranéenne', emoji: '🫒' },
    { key: 'Indienne',        emoji: '🍛' },
    { key: 'Américaine',      emoji: '🍔' },
    { key: 'Japonaise',       emoji: '🍣' },
    { key: 'Marocaine',       emoji: '🫕' },
    { key: 'Libanaise',       emoji: '🥙' },
  ];

  const SKILL_LEVELS = [
    { key: 'debutant',      label: t('onboarding.skill.debutant'),      emoji: '🥄', desc: t('onboarding.skill.debutant.desc') },
    { key: 'intermediaire', label: t('onboarding.skill.intermediaire'), emoji: '🍳', desc: t('onboarding.skill.intermediaire.desc') },
    { key: 'passione',      label: t('onboarding.skill.passione'),      emoji: '👨‍🍳', desc: t('onboarding.skill.passione.desc') },
    { key: 'chef',          label: t('onboarding.skill.chef'),          emoji: '⭐', desc: t('onboarding.skill.chef.desc') },
  ];

  const TIME_PREFS = [
    { key: 'rapide', label: t('onboarding.time.rapide'), emoji: '⚡', desc: t('onboarding.time.rapide.desc') },
    { key: 'court',  label: t('onboarding.time.court'),  emoji: '🕐', desc: t('onboarding.time.court.desc') },
    { key: 'modere', label: t('onboarding.time.modere'), emoji: '🕑', desc: t('onboarding.time.modere.desc') },
    { key: 'long',   label: t('onboarding.time.long'),   emoji: '🕓', desc: t('onboarding.time.long.desc') },
  ];

  const GOALS = [
    { key: 'sante',     label: t('onboarding.goal.sante'),     emoji: '🥗' },
    { key: 'poids',     label: t('onboarding.goal.poids'),     emoji: '⚖️' },
    { key: 'muscle',    label: t('onboarding.goal.muscle'),    emoji: '💪' },
    { key: 'rapide',    label: t('onboarding.goal.rapide'),    emoji: '⚡' },
    { key: 'budget',    label: t('onboarding.goal.budget'),    emoji: '💰' },
    { key: 'plaisir',   label: t('onboarding.goal.plaisir'),   emoji: '😋' },
    { key: 'famille',   label: t('onboarding.goal.famille'),   emoji: '👨‍👩‍👧' },
    { key: 'decouvrir', label: t('onboarding.goal.decouvrir'), emoji: '🌍' },
  ];

  const MEAL_TYPES = [
    { key: 'BREAKFAST', label: t('onboarding.mealtype.BREAKFAST'), emoji: '🌅' },
    { key: 'LUNCH',     label: t('onboarding.mealtype.LUNCH'),     emoji: '🌞' },
    { key: 'DINNER',    label: t('onboarding.mealtype.DINNER'),    emoji: '🌙' },
    { key: 'SNACK',     label: t('onboarding.mealtype.SNACK'),     emoji: '🍎' },
  ];

  const EQUIPMENT = [
    { key: 'four',        label: t('onboarding.equip.four'),        emoji: '🔥' },
    { key: 'micro-ondes', label: t('onboarding.equip.micro-ondes'), emoji: '📡' },
    { key: 'air-fryer',   label: t('onboarding.equip.air-fryer'),   emoji: '🌪️' },
    { key: 'mixeur',      label: t('onboarding.equip.mixeur'),      emoji: '🌀' },
    { key: 'robot',       label: t('onboarding.equip.robot'),       emoji: '🤖' },
    { key: 'friteuse',    label: t('onboarding.equip.friteuse'),    emoji: '🍟' },
    { key: 'plancha',     label: t('onboarding.equip.plancha'),     emoji: '🔖' },
    { key: 'multicuiseur',label: t('onboarding.equip.multicuiseur'),emoji: '🍲' },
    { key: 'rice-cooker', label: t('onboarding.equip.rice-cooker'), emoji: '🍚' },
    { key: 'BBQ',         label: t('onboarding.equip.BBQ'),         emoji: '🍖' },
    { key: 'vapeur',      label: t('onboarding.equip.vapeur'),      emoji: '💨' },
    { key: 'four-pizza',  label: t('onboarding.equip.four-pizza'),  emoji: '🍕' },
  ];

  function toggleArr<T extends string>(arr: T[], val: T, setArr: (a: T[]) => void) {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  }

  async function finish() {
    setSaving(true);
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dietMode,
        allergens: JSON.stringify(allergens),
        defaultServings: servings,
        equipment: JSON.stringify(equipment),
        tasteProfile: JSON.stringify({ flavors, cuisines, skillLevel, timePref, goals, mealTypes }),
        onboardingDone: true,
      }),
    });
    setSaving(false);
    setStep(10);
  }

  function next() { setStep(s => s + 1); }
  function back() { setStep(s => Math.max(-1, s - 1)); }

  if (step === -1) return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center fade-in"
      style={{ backgroundColor: 'var(--bg)' }}>
      <Globe className="w-12 h-12 mb-4" style={{ color: 'var(--accent)' }} />
      <h1 className="text-2xl font-bold mb-2">{t('onboarding.lang.title')}</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{t('onboarding.lang.sub')}</p>
      <div className="grid grid-cols-2 gap-2 w-full max-w-sm mb-8">
        {LANGUAGES.map(l => (
          <button key={l.code} onClick={() => setLang(l.code)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-all"
            style={{
              backgroundColor: lang === l.code ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--bg-card)',
              border: lang === l.code ? '2px solid var(--accent)' : '2px solid var(--border)',
            }}>
            <span className="text-xl">{l.flag}</span>
            <span className="text-sm font-medium">{l.label}</span>
            {lang === l.code && <Check className="w-4 h-4 ml-auto" style={{ color: 'var(--accent)' }} />}
          </button>
        ))}
      </div>
      {langLoading && (
        <div className="flex items-center gap-2 mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Loader2 className="w-3 h-3 animate-spin" />
          {t('onboarding.lang.loading')}
        </div>
      )}
      <button onClick={next}
        className="w-full max-w-xs flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-semibold transition-all active:scale-[0.97]"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
        {t('onboarding.lang.continue')}
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );

  if (step === 0) return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center fade-in"
      style={{ backgroundColor: 'var(--bg)' }}>
      <div className="text-6xl mb-6">🍽️</div>
      <div className="flex items-center gap-2 justify-center mb-3">
        <Refrigerator className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-2xl font-bold">{t('onboarding.step0.title')}</h1>
      </div>
      <p className="text-base font-medium mb-2">{t('onboarding.step0.welcome')}</p>
      <p className="text-sm max-w-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        {t('onboarding.step0.sub')}
      </p>
      <p className="text-xs max-w-xs mb-10 px-3 py-2 rounded-xl"
        style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
        {t('onboarding.step0.fridge')}
      </p>
      <button onClick={next}
        className="w-full max-w-xs flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-semibold transition-all active:scale-[0.97]"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
        {t('onboarding.step0.cta')}
        <ChevronRight className="w-5 h-5" />
      </button>
      <button onClick={finish} className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
        {t('onboarding.step0.skip')}
      </button>
    </div>
  );

  if (step === 10) return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center fade-in"
      style={{ backgroundColor: 'var(--bg)' }}>
      <div className="text-6xl mb-6">🎉</div>
      <h1 className="text-2xl font-bold mb-2">{t('onboarding.done.title')}</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        {t('onboarding.done.sub')}
      </p>
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {dietMode && (
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
            {DIET_MODES.find(d => d.key === dietMode)?.emoji} {DIET_MODES.find(d => d.key === dietMode)?.label}
          </span>
        )}
        {allergens.length > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
            {allergens.length > 1
              ? t('onboarding.done.allergenBadgePlural', { n: allergens.length })
              : t('onboarding.done.allergenBadge', { n: allergens.length })}
          </span>
        )}
        {skillLevel && (
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
            {SKILL_LEVELS.find(s => s.key === skillLevel)?.emoji} {SKILL_LEVELS.find(s => s.key === skillLevel)?.label}
          </span>
        )}
        {goals.length > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
            {goals.length > 1
              ? t('onboarding.done.goalsBadgePlural', { n: goals.length })
              : t('onboarding.done.goalsBadge', { n: goals.length })}
          </span>
        )}
        {cuisines.length > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
            {cuisines.length > 1
              ? t('onboarding.done.cuisinesBadgePlural', { n: cuisines.length })
              : t('onboarding.done.cuisinesBadge', { n: cuisines.length })}
          </span>
        )}
      </div>
      <button onClick={() => router.replace('/dashboard')}
        className="w-full max-w-xs flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-semibold transition-all active:scale-[0.97]"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
        {t('onboarding.done.cta')}
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );

  return (
    <div className="min-h-dvh flex flex-col px-6 pt-10 pb-8" style={{ backgroundColor: 'var(--bg)' }}>
      {step > 1 && (
        <button onClick={back} className="self-start mb-3 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: 'var(--bg-raised)' }}>
          <ChevronLeft className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
        </button>
      )}
      <StepDots current={step} />
      <p className="text-center text-xs mb-5" style={{ color: 'var(--text-muted)', marginTop: '-0.75rem' }}>
        {t('onboarding.stepCounter', { step, total: TOTAL_STEPS })}
      </p>

      <div className="flex-1 fade-in">

        {step === 1 && (
          <>
            <h2 className="text-2xl font-bold mb-1">{t('onboarding.diet.title')}</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{t('onboarding.diet.sub')}</p>
            <div className="grid grid-cols-2 gap-2">
              {DIET_MODES.map(d => (
                <button key={d.key} onClick={() => setDietMode(d.key)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.97]"
                  style={{
                    backgroundColor: dietMode === d.key ? 'var(--accent)' : 'var(--bg-raised)',
                    color: dietMode === d.key ? 'var(--accent-text)' : 'var(--text)',
                    border: `1.5px solid ${dietMode === d.key ? 'var(--accent)' : 'var(--border)'}`,
                  }}>
                  <span className="text-xl">{d.emoji}</span>
                  <span className="text-sm font-medium">{d.label}</span>
                  {dietMode === d.key && <Check className="w-4 h-4 ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-2xl font-bold mb-1">{t('onboarding.allergens.title')}</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{t('onboarding.allergens.sub')}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {ALLERGENS.map(a => {
                const on = allergens.includes(a.key);
                return (
                  <button key={a.key} onClick={() => toggleArr(allergens, a.key, setAllergens)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      backgroundColor: on ? 'rgba(239,68,68,0.1)' : 'var(--bg-raised)',
                      color: on ? '#ef4444' : 'var(--text)',
                      border: `1.5px solid ${on ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
                    }}>
                    <span>{a.emoji}</span> {a.label}
                    {on && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
            {allergens.length > 0 && (
              <button onClick={() => setAllergens([])} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t('onboarding.allergens.clearAll')}
              </button>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-2xl font-bold mb-1">{t('onboarding.skill.title')}</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{t('onboarding.skill.sub')}</p>
            <div className="space-y-2">
              {SKILL_LEVELS.map(s => {
                const on = skillLevel === s.key;
                return (
                  <button key={s.key} onClick={() => setSkillLevel(s.key)}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all active:scale-[0.99]"
                    style={{
                      backgroundColor: on ? 'var(--accent)' : 'var(--bg-raised)',
                      color: on ? 'var(--accent-text)' : 'var(--text)',
                      border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    <span className="text-3xl">{s.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{s.label}</p>
                      <p className="text-xs mt-0.5" style={{ opacity: 0.65 }}>{s.desc}</p>
                    </div>
                    {on && <Check className="w-5 h-5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="text-2xl font-bold mb-1">{t('onboarding.time.title')}</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{t('onboarding.time.sub')}</p>
            <div className="space-y-2">
              {TIME_PREFS.map(tp => {
                const on = timePref === tp.key;
                return (
                  <button key={tp.key} onClick={() => setTimePref(tp.key)}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all active:scale-[0.99]"
                    style={{
                      backgroundColor: on ? 'var(--accent)' : 'var(--bg-raised)',
                      color: on ? 'var(--accent-text)' : 'var(--text)',
                      border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    <span className="text-3xl">{tp.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{tp.label}</p>
                      <p className="text-xs mt-0.5" style={{ opacity: 0.65 }}>{tp.desc}</p>
                    </div>
                    {on && <Check className="w-5 h-5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="text-2xl font-bold mb-1">{t('onboarding.goals.title')}</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{t('onboarding.goals.sub')}</p>
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map(g => {
                const on = goals.includes(g.key);
                return (
                  <button key={g.key} onClick={() => toggleArr(goals, g.key, setGoals)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.97]"
                    style={{
                      backgroundColor: on ? 'var(--accent)' : 'var(--bg-raised)',
                      color: on ? 'var(--accent-text)' : 'var(--text)',
                      border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    <span className="text-xl">{g.emoji}</span>
                    <span className="text-sm font-medium leading-tight">{g.label}</span>
                    {on && <Check className="w-4 h-4 ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <h2 className="text-2xl font-bold mb-1">{t('onboarding.flavors.title')}</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{t('onboarding.flavors.sub')}</p>
            <div className="space-y-2">
              {FLAVORS.map(f => {
                const on = flavors.includes(f.key);
                return (
                  <button key={f.key} onClick={() => toggleArr(flavors, f.key, setFlavors)}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all active:scale-[0.99]"
                    style={{
                      backgroundColor: on ? 'var(--accent)' : 'var(--bg-raised)',
                      color: on ? 'var(--accent-text)' : 'var(--text)',
                      border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    <span className="text-3xl">{f.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{f.label}</p>
                      <p className="text-xs mt-0.5" style={{ opacity: 0.65 }}>{f.desc}</p>
                    </div>
                    {on && <Check className="w-5 h-5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 7 && (
          <>
            <h2 className="text-2xl font-bold mb-1">{t('onboarding.cuisines.title')}</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{t('onboarding.cuisines.sub')}</p>
            <div className="grid grid-cols-2 gap-2">
              {CUISINES.map(c => {
                const on = cuisines.includes(c.key);
                return (
                  <button key={c.key} onClick={() => toggleArr(cuisines, c.key, setCuisines)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all"
                    style={{
                      backgroundColor: on ? 'var(--accent)' : 'var(--bg-raised)',
                      color: on ? 'var(--accent-text)' : 'var(--text)',
                      border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    <span className="text-xl">{c.emoji}</span>
                    <span className="text-sm font-medium">{c.key}</span>
                    {on && <Check className="w-4 h-4 ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 8 && (
          <>
            <h2 className="text-2xl font-bold mb-1">{t('onboarding.household.title')}</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{t('onboarding.household.sub')}</p>
            <p className="text-sm font-semibold mb-3">{t('onboarding.household.servings.label')}</p>
            <div className="flex items-center justify-center gap-6 mb-5">
              <button onClick={() => setServings(Math.max(1, servings - 1))}
                className="w-12 h-12 rounded-full text-2xl font-bold flex items-center justify-center transition-all active:scale-90"
                style={{ backgroundColor: 'var(--bg-raised)', border: '1.5px solid var(--border)' }}>
                −
              </button>
              <div className="text-center min-w-[60px]">
                <p className="text-5xl font-bold">{servings}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {servings > 1 ? t('onboarding.household.persons') : t('onboarding.household.person')}
                </p>
              </div>
              <button onClick={() => setServings(Math.min(20, servings + 1))}
                className="w-12 h-12 rounded-full text-2xl font-bold flex items-center justify-center transition-all active:scale-90"
                style={{ backgroundColor: 'var(--bg-raised)', border: '1.5px solid var(--border)' }}>
                +
              </button>
            </div>
            <div className="flex gap-2 justify-center mb-7">
              {[1, 2, 4, 6, 8].map(n => (
                <button key={n} onClick={() => setServings(n)}
                  className="w-10 h-10 rounded-full text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: servings === n ? 'var(--accent)' : 'var(--bg-raised)',
                    color: servings === n ? 'var(--accent-text)' : 'var(--text)',
                    border: `1.5px solid ${servings === n ? 'var(--accent)' : 'var(--border)'}`,
                  }}>
                  {n}
                </button>
              ))}
            </div>
            <p className="text-sm font-semibold mb-3">{t('onboarding.household.meals.label')}</p>
            <div className="grid grid-cols-2 gap-2">
              {MEAL_TYPES.map(m => {
                const on = mealTypes.includes(m.key);
                return (
                  <button key={m.key} onClick={() => toggleArr(mealTypes, m.key, setMealTypes)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all"
                    style={{
                      backgroundColor: on ? 'var(--accent)' : 'var(--bg-raised)',
                      color: on ? 'var(--accent-text)' : 'var(--text)',
                      border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    <span className="text-xl">{m.emoji}</span>
                    <span className="text-sm font-medium">{m.label}</span>
                    {on && <Check className="w-4 h-4 ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 9 && (
          <>
            <h2 className="text-2xl font-bold mb-1">{t('onboarding.equipment.title')}</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{t('onboarding.equipment.sub')}</p>
            <div className="grid grid-cols-2 gap-2">
              {EQUIPMENT.map(e => {
                const on = equipment.includes(e.key);
                return (
                  <button key={e.key} onClick={() => toggleArr(equipment, e.key, setEquipment)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.97]"
                    style={{
                      backgroundColor: on ? 'var(--accent)' : 'var(--bg-raised)',
                      color: on ? 'var(--accent-text)' : 'var(--text)',
                      border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    <span className="text-lg">{e.emoji}</span>
                    <span className="text-sm font-medium">{e.label}</span>
                    {on && <Check className="w-4 h-4 ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 10 && (
          <>
            <h2 className="text-2xl font-bold mb-1">{t('onboarding.summary.title')}</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>{t('onboarding.summary.sub')}</p>
            <div className="space-y-2 mb-8">
              {[
                {
                  emoji: '🍽️',
                  label: t('onboarding.summary.diet'),
                  value: DIET_MODES.find(d => d.key === dietMode)?.label || t('onboarding.summary.none'),
                },
                {
                  emoji: '⚠️',
                  label: t('onboarding.summary.allergens'),
                  value: allergens.length > 0
                    ? allergens.map(k => ALLERGENS.find(a => a.key === k)?.label).join(', ')
                    : t('onboarding.summary.none'),
                },
                {
                  emoji: '👨‍🍳',
                  label: t('onboarding.summary.skill'),
                  value: SKILL_LEVELS.find(s => s.key === skillLevel)?.label || t('onboarding.summary.notSet'),
                },
                {
                  emoji: '⏱️',
                  label: t('onboarding.summary.time'),
                  value: TIME_PREFS.find(tp => tp.key === timePref)?.label || t('onboarding.summary.notSet'),
                },
                {
                  emoji: '🎯',
                  label: t('onboarding.summary.goals'),
                  value: goals.length > 0
                    ? goals.map(k => GOALS.find(g => g.key === k)?.label).join(', ')
                    : t('onboarding.summary.notSet'),
                },
                {
                  emoji: '👅',
                  label: t('onboarding.summary.flavors'),
                  value: flavors.length > 0
                    ? flavors.map(k => FLAVORS.find(f => f.key === k)?.label).join(', ')
                    : t('onboarding.summary.notSet'),
                },
                {
                  emoji: '🌍',
                  label: t('onboarding.summary.cuisines'),
                  value: cuisines.length > 0
                    ? cuisines.slice(0, 3).join(', ') + (cuisines.length > 3 ? ` +${cuisines.length - 3}` : '')
                    : t('onboarding.summary.notSet'),
                },
                {
                  emoji: '👥',
                  label: t('onboarding.summary.servings'),
                  value: servings > 1
                    ? t('onboarding.summary.servingsValuePlural', { n: servings })
                    : t('onboarding.summary.servingsValue', { n: servings }),
                },
                {
                  emoji: '🔥',
                  label: t('onboarding.summary.equipment'),
                  value: equipment.length > 0
                    ? equipment.map(k => EQUIPMENT.find(e => e.key === k)?.label).join(', ')
                    : t('onboarding.summary.none'),
                },
              ].map(row => (
                <div key={row.label} className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                  <span className="text-lg mt-0.5">{row.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{row.label}</p>
                    <p className="text-sm font-medium mt-0.5 truncate">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        {step > 1 && (
          <button onClick={back} className="flex-1 py-3.5 rounded-2xl text-sm font-medium transition-all"
            style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            {t('onboarding.btn.back')}
          </button>
        )}
        {step < 10 ? (
          <button onClick={next} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97]"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
            {t('onboarding.btn.next')} <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={finish} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? t('onboarding.btn.saving') : t('onboarding.btn.save')}
          </button>
        )}
      </div>

      {step <= 8 && (
        <button onClick={next} className="text-center mt-3 text-xs py-1" style={{ color: 'var(--text-muted)' }}>
          {t('onboarding.btn.skip')}
        </button>
      )}
    </div>
  );
}
