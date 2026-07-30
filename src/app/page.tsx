import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import LandingPage from '@/components/LandingPage';

// Racine du site : la landing (SEO + acquisition) pour les visiteurs anonymes
// et les robots — dont Googlebot, qui n'a jamais de cookie de session.
// Un utilisateur DÉJÀ connecté file direct dans l'app, sans revoir la landing.
export default async function RootPage() {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');
  return <LandingPage />;
}
