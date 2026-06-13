'use client';

import { useState, useEffect } from 'react';

export type UserPlan = 'FREE' | 'PREMIUM' | 'VIP';

interface PlanInfo { plan: UserPlan; role: string }

let cached: PlanInfo | null = null;
const listeners = new Set<(p: PlanInfo) => void>();

export function useUserPlan(): PlanInfo {
  const [info, setInfo] = useState<PlanInfo>(cached ?? { plan: 'FREE', role: 'USER' });

  useEffect(() => {
    if (cached) { setInfo(cached); return; }
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const u = data.user || data;
        const p: PlanInfo = { plan: u.plan || 'FREE', role: u.role || 'USER' };
        cached = p;
        listeners.forEach(fn => fn(p));
      })
      .catch(() => {});
    const handler = (p: PlanInfo) => setInfo(p);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  return info;
}

/* Helper: should we show the lock badge for a given level? */
export function showPlanBadge(userPlan: UserPlan, required: 'PREMIUM' | 'VIP', role = 'USER') {
  if (role === 'ADMIN') return false;
  if (required === 'PREMIUM') return !['PREMIUM', 'VIP'].includes(userPlan);
  if (required === 'VIP')     return userPlan !== 'VIP';
  return false;
}
