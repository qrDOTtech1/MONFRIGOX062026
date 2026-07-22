// Analytics léger : fire-and-forget côté client
// Aucune dépendance externe, stockage en base locale.

export type AnalyticsEventName =
  | 'page_view'
  | 'recipe_view'
  | 'scan_attempt'
  | 'fridge_add_attempt'
  | 'auth_prompt_shown'
  | 'register_click'
  | 'login_click'
  | 'guest_banner_dismiss';

let _sessionId: string | null = null;

function getSessionId(): string {
  if (_sessionId) return _sessionId;
  try {
    let id = localStorage.getItem('mf_sid');
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('mf_sid', id);
    }
    _sessionId = id;
    return id;
  } catch {
    _sessionId = Math.random().toString(36).slice(2);
    return _sessionId;
  }
}

export function trackEvent(event: AnalyticsEventName, meta?: Record<string, unknown>) {
  const sessionId = getSessionId();
  const page = typeof window !== 'undefined' ? window.location.pathname : undefined;
  // fire-and-forget, on ne bloque jamais l'UI
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, page, sessionId, meta }),
  }).catch(() => {});
}
