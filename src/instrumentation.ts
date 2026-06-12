/**
 * Next.js instrumentation — exécuté une fois au démarrage du serveur.
 * Démarre le scheduler interne des notifications push (Railway = serveur persistant).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startNotificationScheduler } = await import('./lib/notifications-cron');
    startNotificationScheduler();
  }
}
