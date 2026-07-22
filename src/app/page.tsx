import { redirect } from 'next/navigation';

// La landing marketing est supprimée : l'app s'ouvre directement
// sur le dashboard (mode invité ou connecté).
export default function RootPage() {
  redirect('/dashboard');
}
