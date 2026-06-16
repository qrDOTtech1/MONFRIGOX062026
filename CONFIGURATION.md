# Configuration — Mon Frigo

Guide de mise en production. Deux niveaux : **variables d'environnement** (Railway)
et **configuration admin** (dans l'app, après connexion en admin).

---

## 1. Variables d'environnement (Railway → Variables)

Voir `.env.example` pour la liste complète et commentée. Le minimum vital :

| Variable | Obligatoire | Rôle |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL (fourni par Railway) |
| `JWT_SECRET` | ✅ | Sécurité des sessions. **Sans ça = secret par défaut connu = faille.** Générer : `openssl rand -base64 48` |
| `ADMIN_EMAIL` | ✅ | Le 1er compte inscrit avec cet email devient ADMIN |
| `NEXT_PUBLIC_APP_URL` | ⭐ | URL publique (redirections Stripe, sitemap, partages) |
| `STRIPE_SECRET_KEY` | 💳 | Paiements (voir §3) |
| `STRIPE_WEBHOOK_SECRET` | 💳 | Vérification du webhook (voir §3) |
| `CRON_SECRET` | ◽ | Seulement si cron externe pour les notifs |
| `GOOGLE_SITE_VERIFICATION` | ◽ | SEO, optionnel |

> Après avoir mis/modifié des variables, **redeploie** le service Railway.

---

## 2. Premier démarrage

1. Déploie. Le conteneur lance `prisma db push` (crée/maj les tables) puis le serveur.
2. Va sur l'app, **inscris-toi avec l'email = `ADMIN_EMAIL`** → tu es ADMIN.
3. **Admin → Config** : renseigne l'IA Ollama (host + clé + modèles). (Spoonacular/USDA optionnels.)
4. **Admin → DB & Import** : clique « Traduire recettes → Anglais » pour remplir l'i18n EN
   et, si besoin, importe des recettes + calcule la nutrition.
5. **Admin → DB & Import** : bouton « Pionnier » pour attribuer le badge aux 1ers inscrits déjà présents.

---

## 3. Activer les paiements Stripe — pas à pas

### a) Clés API
1. https://dashboard.stripe.com/apikeys → copie la **Secret key** (`sk_live_…` ou `sk_test_…` pour tester).
2. Railway → Variables : `STRIPE_SECRET_KEY = sk_…`

### b) Crée les produits / prix
Dans Stripe → **Products**, crée un prix (Price) pour chacun et **copie son ID** (`price_…`) :

| Offre | Type | Exemple |
|---|---|---|
| Premium mensuel | Abonnement récurrent / mois | `price_…` |
| Premium annuel | Abonnement récurrent / an | `price_…` |
| VIP mensuel | Abonnement récurrent / mois | `price_…` |
| VIP annuel | Abonnement récurrent / an | `price_…` |
| Pack 50 requêtes | Paiement unique | `price_…` |
| Pack 200 requêtes | Paiement unique | `price_…` |
| Pack 500 requêtes | Paiement unique | `price_…` |

### c) Renseigne les Price IDs dans l'app
**Admin → Billing** : colle chaque `price_…` dans le champ correspondant
(et, si tu veux, les libellés de prix affichés type « 3,99€/mois »).

> C'est ce qui transforme automatiquement les boutons « bientôt disponible »
> du profil en vrais boutons de paiement.

### d) Configure le webhook (crédite le plan après paiement)
1. Stripe → **Developers → Webhooks → Add endpoint**
   - URL : `https://TON-DOMAINE/api/billing/webhook`
   - Événements : `checkout.session.completed` **et** `customer.subscription.deleted`
2. Copie le **Signing secret** (`whsec_…`).
3. Mets-le soit en variable Railway `STRIPE_WEBHOOK_SECRET`, soit dans **Admin → Billing**
   (champ `stripe_webhook_secret`).

> ✅ Le webhook vérifie la signature (HMAC) : tant qu'un secret est configuré,
> les appels non signés sont rejetés. Le plan/quota est crédité automatiquement
> via les `metadata` envoyées par le checkout.

### e) Teste
- Mode test : utilise les clés `sk_test_…` + carte `4242 4242 4242 4242`.
- Achète un plan → après paiement, ton compte doit passer Premium/VIP (vérifie dans Admin → Billing).

---

## 3 bis. Offre « Coupe du Monde 2026 » — 10 % par équipe

La bannière en haut de la landing propose **-10 %** quelle que soit l'équipe choisie (48 nations).
Le code de l'équipe est **pré-appliqué automatiquement** au paiement (le client ne saisit rien).

**Config Stripe — automatique (recommandé) :**
Un script crée le coupon **et** les 48 codes d'un coup. Lance, en **test** d'abord :
```
# PowerShell
$env:STRIPE_SECRET_KEY="sk_test_xxx"; node scripts/setup-worldcup-promos.mjs
# bash
STRIPE_SECRET_KEY=sk_test_xxx node scripts/setup-worldcup-promos.mjs
```
Options : `EXPIRES_AT=2026-07-20` (expiration), `MAX_REDEMPTIONS=500`, `COUPON_DURATION=forever`.
Le script est **idempotent** (relançable). Vérifie en mode test, puis relance avec `sk_live_…`.

**Ou à la main :**
1. Crée **un seul Coupon** « 10 % off » (réduction en pourcentage).
2. Crée **48 Promotion codes** rattachés à ce coupon, un par équipe, avec le code exact
   `CM26-<code FIFA>` (`CM26-FRA`, `CM26-BRA`, `CM26-MAR`, `CM26-ENG`, …).
   La liste complète des 48 codes = constante `WC_TEAMS` dans `src/app/page.tsx`.

> 💡 Tu peux limiter chaque Promotion code par **date d'expiration** (fin de la compétition)
> et/ou **nombre d'utilisations**.
> Pré-application : à la sélection d'une équipe, le code est mémorisé puis passé à la
> Checkout Session Stripe (`discounts[0][promotion_code]`). Si le code n'existe pas encore
> dans Stripe, le client peut quand même saisir un code manuellement.

---

## 4. Notifications push

- Les clés VAPID sont **générées automatiquement** au 1er usage (stockées en base).
- Le **scheduler interne** envoie déjà : alertes péremption (9h), rappel repas + décongélation (17h30), Europe/Paris.
- Pas de config requise. (Un cron externe sur `/api/notifications/run?secret=$CRON_SECRET` reste possible.)

---

## 5. Récap de ce qui ne nécessite AUCUNE config
- **i18n / traductions UI** : endpoint Google gratuit, sans clé.
- **Estimations** coût recettes, durées de conservation, péremption : tables internes.
- **Scan code-barres** (Open Food Facts) et **OCR ticket** (Tesseract local) : gratuits, sans clé.
