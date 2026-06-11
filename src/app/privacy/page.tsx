import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Mon Frigo',
  description: 'Comment Mon Frigo utilise et protège vos données personnelles. Conformité RGPD, sans publicité, sans revente.',
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <div className="max-w-2xl mx-auto px-5 py-10 pb-20">

        {/* Header */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm mb-8 opacity-60 hover:opacity-100 transition-opacity">
          ← Retour
        </Link>

        <div className="mb-8">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-2xl font-bold mb-2">Politique de confidentialité</h1>
          <p className="text-sm opacity-60">Dernière mise à jour : juin 2026 · Applicable à monfrigo.app</p>
        </div>

        {/* Message humain en intro */}
        <div className="rounded-2xl p-5 mb-8 text-sm leading-relaxed"
          style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1.5px solid rgba(16,185,129,0.2)', color: 'var(--text-secondary)' }}>
          <p className="font-semibold mb-2" style={{ color: 'rgb(16,185,129)' }}>Notre engagement, en clair</p>
          <p>
            On sait très bien ce que certaines apps font avec les données de leurs utilisateurs. On trouve ça problématique.
            Alors avant de rentrer dans le détail légal : <strong>tes données ne sont pas vendues, ne servent pas à de la pub,
            et ne sont pas partagées à des fins commerciales.</strong> On a pas envie de devenir le genre de boîte qu'on déteste.
            Donc on ne le sera pas.
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>

          {/* 1 */}
          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text)' }}>1. Qui sommes-nous ?</h2>
            <p>
              Mon Frigo est une application web progressive (PWA) développée et exploitée de manière indépendante,
              accessible à l'adresse <strong>monfrigo.app</strong>. Pour toute question relative à tes données,
              tu peux nous contacter à : <a href="mailto:privacy@monfrigo.app"
                className="underline">privacy@monfrigo.app</a>
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text)' }}>2. Quelles données on collecte ?</h2>
            <div className="space-y-3">
              <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-inset)' }}>
                <p className="font-semibold mb-1">Données de compte</p>
                <p>Adresse e-mail et nom ou pseudo fournis à l'inscription. C'est tout — pas de numéro de téléphone, pas de date de naissance obligatoire.</p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-inset)' }}>
                <p className="font-semibold mb-1">Données d'utilisation</p>
                <p>Les ingrédients que tu ajoutes à ton frigo, les recettes que tu consultes ou enregistres, ton planning repas, tes préférences alimentaires et allergies.</p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-inset)' }}>
                <p className="font-semibold mb-1">Données de scan</p>
                <p>Les codes-barres scannés sont envoyés à l'API OpenFoodFacts (base de données publique et open-source) pour identifier les produits. On ne stocke pas les images de ton frigo.</p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-inset)' }}>
                <p className="font-semibold mb-1">Données du coach IA (optionnel)</p>
                <p>Si tu utilises la fonctionnalité coach : taille, poids, âge, sexe, niveau d'activité, objectifs et compléments alimentaires. Ces données sont strictement facultatives et servent uniquement à personnaliser tes suggestions.</p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-inset)' }}>
                <p className="font-semibold mb-1">Données de paiement</p>
                <p>Si tu souscris à un abonnement, le paiement est géré intégralement par <strong>Stripe</strong>. On ne voit jamais ton numéro de carte bancaire. Stripe est certifié PCI-DSS.</p>
              </div>
            </div>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text)' }}>3. Comment on utilise tes données ?</h2>
            <ul className="space-y-2">
              {[
                'Faire fonctionner l\'app : générer les recettes, le planning, la liste de courses',
                'Personnaliser les suggestions selon tes préférences et allergies',
                'Te prévenir quand des ingrédients approchent de leur date de péremption',
                'Améliorer les fonctionnalités de l\'app (analyses agrégées et anonymisées uniquement)',
                'T\'envoyer des e-mails transactionnels : confirmation de compte, facturation',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-xl p-4 font-medium"
              style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgb(239,68,68)' }}>
              ✗ Tes données ne sont jamais utilisées pour de la publicité ciblée<br />
              ✗ Tes données ne sont jamais vendues à des tiers<br />
              ✗ Tes données ne sont jamais partagées à des fins commerciales
            </div>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text)' }}>4. Partage avec des tiers</h2>
            <p className="mb-3">On fait appel à un nombre limité de services tiers, uniquement pour faire fonctionner l'app :</p>
            <div className="space-y-2">
              {[
                { name: 'Railway', role: 'Hébergement de l\'app et de la base de données (serveurs en Europe)' },
                { name: 'Stripe', role: 'Traitement des paiements (certifié PCI-DSS)' },
                { name: 'OpenFoodFacts', role: 'Base de données alimentaire open-source pour la reconnaissance des produits' },
                { name: 'Ollama / IA locale', role: 'Génération de recettes — les requêtes ne contiennent pas d\'informations personnelles identifiables' },
              ].map((s) => (
                <div key={s.name} className="flex gap-3 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-inset)' }}>
                  <span className="font-semibold shrink-0 w-32">{s.name}</span>
                  <span>{s.role}</span>
                </div>
              ))}
            </div>
            <p className="mt-3">Aucun autre partage. Aucune régie publicitaire. Aucun réseau de tracking.</p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text)' }}>5. Durée de conservation</h2>
            <p>
              Tes données sont conservées aussi longtemps que ton compte est actif. Si tu supprimes ton compte,
              l'ensemble de tes données personnelles est supprimé dans un délai de <strong>30 jours</strong>,
              à l'exception des données de facturation que nous sommes légalement tenus de conserver 10 ans.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text)' }}>6. Tes droits (RGPD)</h2>
            <p className="mb-3">Conformément au Règlement Général sur la Protection des Données (RGPD), tu disposes des droits suivants :</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { emoji: '👁️', label: 'Accès', desc: 'Consulter toutes tes données' },
                { emoji: '✏️', label: 'Rectification', desc: 'Corriger des données inexactes' },
                { emoji: '🗑️', label: 'Suppression', desc: 'Demander l\'effacement complet' },
                { emoji: '📦', label: 'Portabilité', desc: 'Exporter tes données (JSON)' },
                { emoji: '🚫', label: 'Opposition', desc: 'T\'opposer à certains traitements' },
                { emoji: '⏸️', label: 'Limitation', desc: 'Limiter le traitement de tes données' },
              ].map((r) => (
                <div key={r.label} className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-inset)' }}>
                  <p className="font-semibold">{r.emoji} {r.label}</p>
                  <p className="text-xs opacity-70 mt-0.5">{r.desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-4">
              Pour exercer ces droits : <a href="mailto:privacy@monfrigo.app" className="underline font-medium">privacy@monfrigo.app</a>.
              On s'engage à répondre dans un délai de <strong>30 jours maximum</strong>. En cas de litige non résolu,
              tu peux saisir la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="underline">CNIL</a>.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text)' }}>7. Cookies</h2>
            <p>
              On utilise uniquement les cookies strictement nécessaires au fonctionnement de l'app : cookie de session
              d'authentification (JWT). Aucun cookie publicitaire. Aucun cookie de tracking tiers. Aucun bandeau
              cookie intrusif — parce qu'il n'y a rien à accepter au-delà du strict nécessaire.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text)' }}>8. Sécurité</h2>
            <p>
              Les mots de passe sont chiffrés avec bcrypt. Les connexions sont sécurisées en HTTPS. La base de données
              est hébergée sur des serveurs en Europe (Railway, Frankfurt). L'accès aux données est strictement
              limité aux personnes qui en ont besoin pour faire fonctionner le service.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text)' }}>9. Mineurs</h2>
            <p>
              Mon Frigo n'est pas destiné aux enfants de moins de 15 ans. On ne collecte pas sciemment de données
              concernant des mineurs. Si tu penses que des données d'un mineur ont été enregistrées par erreur,
              contacte-nous pour les supprimer immédiatement.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text)' }}>10. Modifications</h2>
            <p>
              Si cette politique change de manière significative, on t'en informera par e-mail au moins 30 jours
              avant l'entrée en vigueur des changements. On ne fera pas de mise à jour silencieuse.
            </p>
          </section>

          {/* Contact */}
          <div className="rounded-2xl p-5 text-center"
            style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
            <p className="font-semibold mb-1">Une question sur tes données ?</p>
            <p className="text-xs opacity-70 mb-3">On répond en moins de 48h en général.</p>
            <a href="mailto:privacy@monfrigo.app"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
              ✉️ privacy@monfrigo.app
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
