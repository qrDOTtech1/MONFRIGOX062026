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

## 3 bis. Offre « Coupe du Monde 2026 » — % par équipe

La bannière en haut de la landing propose un **% par équipe** via des **codes promo Stripe**
(le client saisit le code au paiement — `allow_promotion_codes` est déjà activé).

**48 équipes**, chacune avec son code `CM26-<code FIFA>`. Pour limiter le travail dans Stripe,
crée **un coupon par tier de %** (6 coupons), puis **un Promotion code par équipe** pointant
vers le coupon du bon tier.

**Tiers de réduction :**

| Tier | Équipes |
|---|---|
| **35 %** | Maroc (`CM26-MAR`) |
| **30 %** | France `CM26-FRA`, Brésil `CM26-BRA`, Argentine `CM26-ARG` |
| **28 %** | Angleterre `CM26-ENG`, Espagne `CM26-ESP`, Allemagne `CM26-GER`, Portugal `CM26-POR`, Sénégal `CM26-SEN`, Algérie `CM26-ALG` |
| **26 %** | Pays-Bas `CM26-NED`, Italie `CM26-ITA`, Belgique `CM26-BEL`, Nigeria `CM26-NGA`, Égypte `CM26-EGY`, Côte d'Ivoire `CM26-CIV`, Tunisie `CM26-TUN` |
| **25 %** | Croatie `CM26-CRO`, Uruguay `CM26-URU`, Colombie `CM26-COL`, Japon `CM26-JPN`, Corée `CM26-KOR`, USA `CM26-USA`, Mexique `CM26-MEX`, Canada `CM26-CAN`, Cameroun `CM26-CMR`, Ghana `CM26-GHA` |
| **24 %** | Suisse `CM26-SUI`, Danemark `CM26-DEN`, Serbie `CM26-SRB`, Pologne `CM26-POL`, Autriche `CM26-AUT`, Turquie `CM26-TUR`, Ukraine `CM26-UKR`, Écosse `CM26-SCO`, Norvège `CM26-NOR`, Suède `CM26-SWE`, Équateur `CM26-ECU`, Pérou `CM26-PER`, Chili `CM26-CHI`, Paraguay `CM26-PAR`, Iran `CM26-IRN`, Australie `CM26-AUS`, Arabie saoudite `CM26-KSA`, Qatar `CM26-QAT`, Costa Rica `CM26-CRC`, Panama `CM26-PAN`, Nouvelle-Zélande `CM26-NZL` |

> 💡 Dans Stripe : 1 **Coupon** par pourcentage (35/30/28/26/25/24 %), puis pour chaque équipe
> un **Promotion code** avec le code exact (rattaché au coupon du bon tier).
> Limite la **date d'expiration** (fin de la compétition) et/ou le **nombre d'utilisations**.
> La source de vérité (codes + %) est la constante `WC_TEAMS` dans `src/app/page.tsx`.

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
