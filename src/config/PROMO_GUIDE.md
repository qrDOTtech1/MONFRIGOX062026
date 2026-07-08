# Guide des promotions — monfrigo.app

> Ce fichier explique comment gérer la bannière promo de la page d'accueil.
> **Un seul fichier à modifier : `src/config/promo.ts`.**

## Résumé pour Claude Code

Tout se pilote depuis la **dernière ligne** de `src/config/promo.ts` :

```ts
export const PROMO: PromoConfig = PROMO_PRESETS.worldcup;
```

Il suffit de changer le nom du preset après `PROMO_PRESETS.`.

## Demandes courantes → action à faire

| L'utilisateur demande… | Ce que Claude fait |
|---|---|
| « désactive toutes les promotions » | `PROMO = PROMO_PRESETS.aucune` |
| « remets la Coupe du Monde » | `PROMO = PROMO_PRESETS.worldcup` |
| « mets la promo Halloween » | `PROMO = PROMO_PRESETS.halloween` |
| « mets la promo Noël » | `PROMO = PROMO_PRESETS.noel` |
| « mets la promo Black Friday » | `PROMO = PROMO_PRESETS.blackfriday` |
| « supprime la promo actuelle » | `PROMO = PROMO_PRESETS.aucune` |

## Créer une NOUVELLE promo (ex : Saint-Valentin)

1. Dans `src/config/promo.ts`, ajouter un preset dans `PROMO_PRESETS` en copiant un preset `'simple'` existant :

```ts
saintvalentin: {
  enabled: true,
  variant: 'simple',
  title: 'Saint-Valentin 💝',
  subtitle: 'Premium à partager en amoureux',
  code: 'AMOUR',
  ctaLabel: 'J\'en profite',
  ctaHref: '/register',
  gradient: 'linear-gradient(135deg, #4a0e1f 0%, #be123c 50%, #f472b6 100%)',
  emoji: '💝',
},
```

2. Pointer la promo active dessus : `PROMO = PROMO_PRESETS.saintvalentin`.

## Deux types de bannière (`variant`)

- **`'worldcup'`** : grande bannière spéciale avec fond image de stade + recherche + drapeaux des 48 équipes + code Stripe par équipe. Ne pas modifier son contenu, elle est autonome.
- **`'simple'`** : petite bannière texte réutilisable (titre, sous-titre, code promo, bouton) avec ambiance couleur (`gradient`) et un `emoji` décoratif. C'est ce type qu'on utilise pour Halloween / Noël / Black Friday / etc.

## Après modification

Rebuild + push via le script `push-promo.ps1` (à la racine de la zone de travail).
Aucune autre partie du code n'est à toucher.
