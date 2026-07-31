import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://monfrigo.app';

interface SeoPage {
  title: string;
  h1: string;
  description: string;
  longDesc: string;
  keywords: string[];
  emoji: string;
  features: string[];
  faq: { q: string; a: string }[];
}

const SEO_PAGES: Record<string, SeoPage> = {
  'recette-avec-ce-que-j-ai': {
    title: "Recette avec ce que j'ai dans le frigo",
    h1: "Trouve une recette avec ce que tu as dans ton frigo",
    description: "Plus besoin de chercher pendant des heures. Scanne ton frigo, Mon Frigo te propose des recettes avec exactement ce que tu as. Gratuit.",
    longDesc: "Tu ouvres ton frigo, tu vois 3 tomates, du fromage et des oeufs, et tu ne sais pas quoi cuisiner ? Mon Frigo analyse le contenu de ton réfrigérateur grâce à l'IA et te propose instantanément des recettes réalisables avec ce que tu as déjà. Plus besoin de courir au supermarché pour un ingrédient manquant. L'application trie les recettes par pourcentage de correspondance : tu vois d'abord celles que tu peux faire à 100%, puis celles où il ne te manque qu'un ou deux ingrédients. C'est la fin du \"je sais pas quoi faire à manger\".",
    keywords: ['recette avec ce que j\'ai', 'que faire avec mon frigo', 'recette frigo', 'cuisiner avec ce qu\'on a', 'recette avec mes ingrédients'],
    emoji: '🍳',
    features: [
      "Scan IA du frigo en 3 secondes — une photo suffit",
      "Matching intelligent : recettes triées par % d'ingrédients disponibles",
      "Suggestions de substitution pour les ingrédients manquants",
      "Filtrage par régime alimentaire, allergènes, temps de préparation",
      "Recettes personnalisées selon tes goûts et ton historique",
    ],
    faq: [
      { q: "Comment trouver une recette avec ce que j'ai ?", a: "Ouvre Mon Frigo, prends une photo de ton frigo ou ajoute tes ingrédients manuellement. L'app te montre instantanément toutes les recettes faisables, triées par correspondance." },
      { q: "Est-ce que c'est vraiment gratuit ?", a: "Oui ! Le plan gratuit donne accès à 50% des recettes et 3 requêtes IA. Les plans Premium (3,99€/mois) et VIP (6,99€/mois) débloquent tout." },
      { q: "L'IA peut-elle proposer des substitutions ?", a: "Absolument. Si une recette demande de la crème fraîche et que tu n'en as pas, l'IA te propose du yaourt grec ou du fromage blanc comme alternative." },
    ],
  },
  'courses-moins-cheres': {
    title: "Courses moins chères — Économise sur ton budget alimentaire",
    h1: "Fais tes courses moins cher grâce à une cuisine intelligente",
    description: "Réduis ta facture de courses en cuisinant avec ce que tu as déjà. Mon Frigo estime le coût de chaque recette et optimise ta liste de courses. Gratuit.",
    longDesc: "Le budget courses explose ? Mon Frigo t'aide à dépenser moins en cuisinant mieux. L'application estime le coût de chaque recette, te propose des alternatives économiques, et génère des listes de courses optimisées pour éviter les achats inutiles. En utilisant d'abord ce qui est dans ton frigo (surtout ce qui va périmer), tu réduis le gaspillage ET la facture. Les utilisateurs économisent en moyenne 30% sur leur budget alimentaire en cuisinant avec ce qu'ils ont plutôt qu'en achetant pour chaque recette.",
    keywords: ['courses moins chères', 'économiser courses', 'budget courses', 'réduire budget alimentaire', 'courses pas cher', 'manger pour pas cher', 'recette économique', 'repas pas cher'],
    emoji: '💰',
    features: [
      "Estimation du coût par recette et par portion",
      "Filtre budget : recettes à moins de 5€, 10€ ou 15€",
      "Liste de courses optimisée — achète uniquement ce qui manque",
      "Priorisation des aliments qui vont périmer pour éviter le gaspillage",
      "Planning repas hebdomadaire pour anticiper et grouper les achats",
    ],
    faq: [
      { q: "Comment Mon Frigo m'aide à faire des courses moins chères ?", a: "L'app te propose des recettes avec ce que tu as déjà, estime le coût de chaque plat, et génère une liste de courses qui ne contient que ce qui te manque vraiment. Fini les achats en double." },
      { q: "Peut-on filtrer les recettes par budget ?", a: "Oui ! Tu peux filtrer par coût total : moins de 5€, 10€, 15€, ou un montant personnalisé. L'app affiche le prix estimé sur chaque recette." },
      { q: "Combien peut-on économiser ?", a: "En cuisinant avec les ingrédients déjà disponibles et en planifiant ses repas, on réduit facilement de 25 à 40% sa facture courses." },
    ],
  },
  'anti-gaspillage-alimentaire': {
    title: "Anti-gaspillage alimentaire — Cuisine zéro déchet",
    h1: "Stop au gaspillage alimentaire : cuisine tout ce qui est dans ton frigo",
    description: "10 millions de tonnes de nourriture gaspillées par an en France. Mon Frigo te prévient avant que tes aliments périment et te propose des recettes pour les utiliser.",
    longDesc: "Chaque année, un foyer français jette en moyenne 30 kg de nourriture dont 7 kg encore emballés. Mon Frigo combat ce gaspillage en suivant les dates de péremption de chaque aliment dans ton frigo. Quand un produit approche de sa date limite, l'app te le signale et te propose des recettes qui l'utilisent en priorité. Le badge sur l'icône de l'app te rappelle combien d'aliments vont bientôt périmer. Les recettes anti-gaspi apparaissent en premier dans l'explorateur, avec un badge vert \"Anti-gaspi\". Tu ne jettes plus, tu cuisines.",
    keywords: ['anti gaspillage alimentaire', 'anti gaspi', 'zéro déchet cuisine', 'réduire gaspillage', 'date péremption', 'aliments qui périment', 'cuisine anti gaspi', 'too good to go alternative'],
    emoji: '♻️',
    features: [
      "Alerte péremption — notification quand un aliment va bientôt expirer",
      "Badge PWA sur l'icône : nombre d'aliments à utiliser en urgence",
      "Recettes anti-gaspi en priorité dans l'explorateur",
      "Score anti-gaspi sur chaque recette (nombre d'ingrédients sauvés)",
      "Historique de cuisine pour mesurer ton impact",
    ],
    faq: [
      { q: "Comment Mon Frigo aide à réduire le gaspillage ?", a: "L'app suit les dates de péremption de ton frigo et te propose en priorité des recettes qui utilisent les aliments qui vont bientôt expirer. Un badge sur l'icône te prévient." },
      { q: "Est-ce que ça marche avec tous les aliments ?", a: "Oui. Tu peux ajouter n'importe quel aliment (scanné, photographié ou manuel) et définir sa date de péremption. L'app gère tout." },
      { q: "Quel impact concret sur le gaspillage ?", a: "Nos utilisateurs rapportent une réduction de 50 à 70% de leur gaspillage alimentaire après un mois d'utilisation." },
    ],
  },
  'planning-repas-semaine': {
    title: "Planning repas semaine — Organise tes repas automatiquement",
    h1: "Planning repas de la semaine généré automatiquement par l'IA",
    description: "Fini le casse-tête du \"qu'est-ce qu'on mange ?\". Mon Frigo génère un planning repas équilibré pour toute la semaine en un clic.",
    longDesc: "Planifier ses repas pour la semaine, c'est la clé pour manger mieux, dépenser moins et ne plus stresser à 18h devant le frigo vide. Mon Frigo génère automatiquement un planning de 21 repas (petit-déjeuner, déjeuner, dîner) adapté à ton régime, tes allergènes, tes goûts culinaires et ce que tu as déjà dans le frigo. La liste de courses correspondante est générée automatiquement. Tu peux ajuster, échanger des repas, et relancer la génération autant que tu veux.",
    keywords: ['planning repas semaine', 'meal planning', 'planifier repas', 'menu semaine', 'organiser repas', 'meal prep', 'qu\'est-ce qu\'on mange'],
    emoji: '📅',
    features: [
      "Génération automatique de 21 repas pour la semaine",
      "Prise en compte de ton régime, allergènes et préférences",
      "Utilise en priorité les aliments déjà dans ton frigo",
      "Liste de courses générée automatiquement",
      "Équilibre nutritionnel vérifié par l'IA",
    ],
    faq: [
      { q: "Comment fonctionne le planning automatique ?", a: "L'IA analyse ton frigo, ton profil alimentaire et tes préférences pour générer 21 repas équilibrés. Tu peux ajuster ou échanger les repas." },
      { q: "Le planning prend-il en compte mon régime ?", a: "Oui : végétarien, vegan, halal, sans gluten, keto... Tous les régimes sont supportés, ainsi que les allergènes." },
      { q: "Est-ce disponible gratuitement ?", a: "Le planning automatique est une fonctionnalité VIP (6,99€/mois). Le plan gratuit et Premium permettent de planifier manuellement." },
    ],
  },
  'recette-pas-cher': {
    title: "Recettes pas chères — Manger bien pour moins de 5€",
    h1: "Recettes pas chères : mange bien sans te ruiner",
    description: "Des centaines de recettes à moins de 5€ par personne. Filtre par budget, découvre des plats économiques et savoureux avec Mon Frigo.",
    longDesc: "Manger bien ne devrait pas coûter cher. Mon Frigo estime le coût de chaque recette grâce à une base de prix mise à jour et te permet de filtrer par budget. Tu veux manger pour moins de 2€ par portion ? C'est possible. Les recettes économiques sont souvent les meilleures : des plats mijotés, des one-pot, des gratins qui utilisent les légumes de saison. Et en cuisinant avec ce que tu as déjà dans le frigo, le coût réel est encore plus bas puisque tu n'achètes que ce qui manque.",
    keywords: ['recette pas cher', 'recette économique', 'manger pas cher', 'repas pas cher', 'cuisine petit budget', 'recette étudiant', 'recette moins de 5 euros'],
    emoji: '🍲',
    features: [
      "Prix estimé sur chaque recette (coût total et par portion)",
      "Filtre budget personnalisable (< 5€, < 10€, < 15€, personnalisé)",
      "Recettes avec ingrédients de base et de saison",
      "One-pot, gratins, mijotés : les classiques économiques",
      "Score de confiance sur l'estimation de prix",
    ],
    faq: [
      { q: "Comment sont calculés les prix des recettes ?", a: "Mon Frigo utilise une base de prix actualisée des ingrédients courants. Le prix affiché est une estimation incluant un score de confiance (élevé, moyen, faible)." },
      { q: "Quelles sont les recettes les moins chères ?", a: "Les plats à base de légumineuses, pâtes, riz et légumes de saison sont généralement sous les 2€ par portion. L'app les met en avant quand tu filtres par budget." },
      { q: "Peut-on trier par prix ?", a: "Oui ! L'explorateur permet de filtrer par budget maximum. Les recettes les plus économiques remontent en premier." },
    ],
  },
  'que-manger-ce-soir': {
    title: "Que manger ce soir ? — Idées repas instantanées",
    h1: "Que manger ce soir ? L'IA te répond en 3 secondes",
    description: "18h, pas d'idée pour le dîner. Scanne ton frigo, Mon Frigo te propose des recettes faisables maintenant avec ce que tu as. Bouton Surprise inclus !",
    longDesc: "C'est LA question universelle : \"Qu'est-ce qu'on mange ce soir ?\" Mon Frigo la résout définitivement. Ouvre l'app, regarde ce que tu as dans le frigo (ou scanne-le), et découvre instantanément les recettes que tu peux préparer maintenant. Pas le courage de choisir ? Le bouton \"Surprise\" te propose une recette aléatoire parmi celles que tu peux faire. Filtre par temps de préparation si tu es pressé : les recettes \"< 15 min\" sont parfaites pour les soirs de flemme.",
    keywords: ['que manger ce soir', 'idée repas ce soir', 'qu\'est-ce qu\'on mange', 'idée dîner', 'repas du soir rapide', 'je sais pas quoi manger'],
    emoji: '🌙',
    features: [
      "Suggestions instantanées basées sur ton frigo actuel",
      "Bouton \"Surprise\" — recette aléatoire parmi les faisables",
      "Filtre temps : recettes < 15 min pour les soirs pressés",
      "Prise en compte de l'historique : pas de répétition",
      "Recettes triées par pertinence et disponibilité des ingrédients",
    ],
    faq: [
      { q: "Comment trouver quoi manger ce soir ?", a: "Ouvre Mon Frigo, tes ingrédients sont déjà là. L'app te montre les recettes faisables triées par correspondance. Appuie sur Surprise pour un choix aléatoire." },
      { q: "Peut-on filtrer par temps de préparation ?", a: "Oui ! Les filtres incluent < 15 min, < 30 min, < 45 min. Parfait pour les soirs où tu veux cuisiner vite." },
      { q: "L'app propose-t-elle toujours la même chose ?", a: "Non, l'algorithme prend en compte ton historique de cuisine pour varier les suggestions et te faire découvrir de nouvelles recettes." },
    ],
  },
  'scanner-frigo-ia': {
    title: "Scanner son frigo avec l'IA — Reconnaissance automatique",
    h1: "Scanne ton frigo avec l'IA : tous tes aliments identifiés en une photo",
    description: "Prends une photo de ton frigo, l'IA identifie chaque aliment automatiquement. Plus besoin de tout saisir à la main. Scan code-barres inclus.",
    longDesc: "La fonctionnalité phare de Mon Frigo : prends une simple photo de l'intérieur de ton réfrigérateur, et l'intelligence artificielle identifie automatiquement chaque aliment visible. Tomates, fromage, yaourts, légumes, viande... tout est reconnu et ajouté à ton inventaire en quelques secondes. Tu peux aussi scanner les codes-barres EAN des produits emballés pour obtenir les informations nutritionnelles exactes (données OpenFoodFacts). Fini la saisie manuelle fastidieuse.",
    keywords: ['scanner frigo', 'scan frigo IA', 'reconnaissance aliments', 'scanner code barre aliment', 'inventaire frigo', 'application scan frigo'],
    emoji: '📸',
    features: [
      "Reconnaissance visuelle IA en moins de 3 secondes",
      "Scan de codes-barres EAN pour les produits emballés",
      "Données nutritionnelles automatiques via OpenFoodFacts",
      "Ajout groupé d'aliments en une seule photo",
      "Historique et suivi des dates de péremption",
    ],
    faq: [
      { q: "Comment fonctionne le scan IA du frigo ?", a: "Tu prends une photo de ton frigo ouvert. L'IA analyse l'image et identifie chaque aliment visible. Tu confirmes et ils sont ajoutés à ton inventaire." },
      { q: "Le scan code-barres est-il précis ?", a: "Oui, il utilise la base OpenFoodFacts avec les données nutritionnelles complètes (calories, macros, NutriScore)." },
      { q: "Combien de scans puis-je faire ?", a: "Plan gratuit : 20 scans EAN/semaine. Premium : 5 scans frigo IA + 100 EAN/semaine. VIP : 14 scans frigo + EAN illimités." },
    ],
  },
  'liste-courses-intelligente': {
    title: "Liste de courses intelligente — Achète uniquement ce qui manque",
    h1: "Liste de courses intelligente : n'achète que ce dont tu as vraiment besoin",
    description: "Génère automatiquement ta liste de courses à partir de tes recettes planifiées. Partage-la par QR code. Ne gaspille plus jamais un centime.",
    longDesc: "Une liste de courses intelligente, c'est une liste qui sait déjà ce que tu as dans ton frigo. Mon Frigo compare les ingrédients de tes recettes planifiées avec ton inventaire et ne met sur la liste que ce qui te manque réellement. Plus d'achats en double, plus de légumes oubliés au fond du frigo. Tu peux partager ta liste par lien ou QR code pour que quelqu'un d'autre fasse les courses à ta place. La liste est interactive : coche les articles au fur et à mesure de tes achats.",
    keywords: ['liste de courses intelligente', 'liste courses automatique', 'liste courses application', 'organiser courses', 'liste courses partagée'],
    emoji: '🛒',
    features: [
      "Génération automatique depuis les recettes planifiées",
      "Soustraction intelligente des aliments déjà en stock",
      "Partage par lien ou QR code",
      "Cases à cocher interactives",
      "Regroupement par catégorie d'aliments",
    ],
    faq: [
      { q: "Comment la liste de courses est-elle générée ?", a: "À partir de tes recettes planifiées, l'app calcule les ingrédients nécessaires, soustrait ce que tu as déjà dans le frigo, et crée la liste de ce qui manque." },
      { q: "Peut-on partager sa liste ?", a: "Oui ! Un bouton génère un lien partageable et un QR code. La personne qui reçoit le lien voit la liste en temps réel." },
      { q: "Peut-on ajouter des articles manuellement ?", a: "Bien sûr. Tu peux ajouter n'importe quel article à la liste, même s'il ne vient pas d'une recette." },
    ],
  },
  'recette-rapide-facile': {
    title: "Recettes rapides et faciles — Moins de 15 minutes",
    h1: "Recettes rapides et faciles : prêtes en moins de 15 minutes",
    description: "Pas le temps de cuisiner ? Découvre des recettes en 15 minutes max, adaptées à ce que tu as dans le frigo. Facile, rapide, délicieux.",
    longDesc: "Les soirs de semaine, le temps est compté. Mon Frigo te propose des recettes faciles et rapides, réalisables en 15 minutes ou moins, avec les ingrédients que tu as sous la main. Salades composées, wraps, pâtes express, omelettes garnies, poêlées minute... Les recettes sont classées par difficulté (Facile, Moyen, Difficile) et par temps de préparation. Tu peux combiner ces filtres avec tes préférences alimentaires pour un résultat 100% personnalisé.",
    keywords: ['recette rapide', 'recette facile', 'recette 15 minutes', 'recette express', 'plat rapide', 'cuisine rapide', 'recette simple'],
    emoji: '⚡',
    features: [
      "Filtre temps de préparation (< 15, < 30, < 45 min)",
      "Filtre difficulté (Facile, Moyen, Difficile)",
      "Tri par ingrédients disponibles",
      "Recettes express adaptées à ton régime",
      "Instructions étape par étape claires et concises",
    ],
    faq: [
      { q: "Comment trouver des recettes rapides ?", a: "Dans l'explorateur, utilise le filtre temps '< 15 min'. Les recettes affichées sont toutes réalisables en 15 minutes maximum." },
      { q: "Les recettes rapides sont-elles bonnes ?", a: "Absolument ! Rapidité ne veut pas dire compromis. On trouve des pâtes al dente, des poêlées colorées, des wraps garnis — tout aussi savoureux qu'un plat mijoté." },
      { q: "Peut-on combiner rapide + pas cher ?", a: "Oui ! Combine les filtres temps et budget pour trouver des recettes rapides ET économiques." },
    ],
  },
  'cuisiner-les-restes': {
    title: "Cuisiner les restes — Recettes avec les restes du frigo",
    h1: "Transforme tes restes en plats délicieux",
    description: "Du riz d'hier, un bout de poulet, des légumes un peu flétris ? Mon Frigo te propose des recettes pour tout cuisiner sans rien jeter.",
    longDesc: "Les restes ne sont pas des déchets, ce sont des ingrédients qui attendent leur deuxième vie. Mon Frigo excelle dans l'art de transformer les restes en plats savoureux. L'app identifie les aliments qui approchent de leur date de péremption et les place en priorité dans les suggestions de recettes. Un reste de riz devient un riz cantonais, un bout de poulet se transforme en wrap croustillant, des légumes flétris finissent en soupe veloutée. L'IA de substitution te propose même des alternatives quand il te manque un ingrédient.",
    keywords: ['cuisiner les restes', 'recette avec restes', 'recette restes frigo', 'transformer les restes', 'cuisine zéro déchet', 'restes de repas'],
    emoji: '🔄',
    features: [
      "Priorité aux aliments qui approchent de la péremption",
      "Suggestions de recettes \"seconde vie\" pour chaque reste",
      "IA de substitution pour les ingrédients manquants",
      "Badge anti-gaspi sur les recettes qui sauvent des aliments",
      "Suivi de ton impact anti-gaspillage",
    ],
    faq: [
      { q: "Comment utiliser mes restes pour cuisiner ?", a: "Ajoute tes restes dans Mon Frigo (ou scanne ton frigo). L'app propose automatiquement des recettes qui les utilisent, triées par correspondance." },
      { q: "L'app gère-t-elle les dates de péremption ?", a: "Oui ! Les aliments proches de la péremption sont mis en avant. L'app te prévient et propose des recettes pour les utiliser avant qu'ils ne soient perdus." },
      { q: "Que faire avec un reste de riz ?", a: "Riz cantonais, boulettes de riz, gratin de riz, riz au lait... Mon Frigo te propose des dizaines de recettes pour chaque reste." },
    ],
  },
  'batch-cooking-meal-prep': {
    title: "Batch Cooking & Meal Prep — Prépare ta semaine en 2h",
    h1: "Batch cooking et meal prep : prépare toute ta semaine en une session",
    description: "Planifie, cuisine et stocke tes repas pour la semaine. Mon Frigo génère le planning, la liste de courses et les instructions. Gain de temps garanti.",
    longDesc: "Le batch cooking, c'est l'art de préparer tous ses repas de la semaine en une seule session de cuisine (généralement le dimanche). Mon Frigo facilite cette pratique en générant un planning hebdomadaire équilibré, en calculant les quantités exactes, et en produisant une liste de courses optimisée. Le planning prend en compte les recettes qui se conservent bien, les aliments de saison, et tes préférences personnelles. Le résultat : des repas variés, équilibrés, prêts en quelques minutes chaque soir.",
    keywords: ['batch cooking', 'meal prep', 'préparer repas semaine', 'cuisine en batch', 'préparer ses repas à l\'avance', 'meal prep français'],
    emoji: '🥡',
    features: [
      "Planning automatique optimisé pour le batch cooking",
      "Liste de courses groupée pour la session de préparation",
      "Recettes qui se conservent bien (frigo et congélateur)",
      "Quantités calculées pour toute la semaine",
      "Instructions de conservation et de réchauffage",
    ],
    faq: [
      { q: "Comment faire du batch cooking avec Mon Frigo ?", a: "Active le planning automatique (VIP), l'IA génère 21 repas optimisés pour la préparation en batch. La liste de courses est groupée pour un seul passage au supermarché." },
      { q: "Combien de temps faut-il pour préparer la semaine ?", a: "En moyenne 2 à 3 heures le dimanche pour préparer 14 repas (déjeuners et dîners). Les petits-déjeuners sont généralement rapides et préparés au jour le jour." },
      { q: "Les recettes se conservent-elles bien ?", a: "Le planning privilégie des recettes qui se conservent 3 à 5 jours au réfrigérateur ou se congèlent facilement." },
    ],
  },
  'recette-vegetarienne': {
    title: "Recettes végétariennes — Cuisine végé facile et gourmande",
    h1: "Recettes végétariennes faciles avec ce que tu as",
    description: "Explore des centaines de recettes végétariennes adaptées à ton frigo. Filtre automatique, suggestions personnalisées, nutrition vérifiée.",
    longDesc: "Mon Frigo s'adapte parfaitement au régime végétarien. Configure ton profil en mode \"Végétarien\" et toutes les recettes contenant de la viande, du poisson ou des produits carnés sont automatiquement exclues. Tu ne vois que des recettes végétariennes, triées par correspondance avec ton frigo. L'IA de cuisine connaît toutes les alternatives végétales et te propose des substitutions quand une recette originale contient un ingrédient non-végé. Découvre des plats du monde entier : curry de légumes indien, pasta italiana, tajine marocain aux légumes, bibimbap coréen...",
    keywords: ['recette végétarienne', 'cuisine végétarienne', 'repas végétarien', 'recette végé facile', 'menu végétarien semaine'],
    emoji: '🥗',
    features: [
      "Filtre végétarien automatique sur tout le catalogue",
      "Détection intelligente des ingrédients non-végé",
      "Suggestions de substitution végétariennes par l'IA",
      "Planning repas végétarien automatique (VIP)",
      "Recettes du monde entier adaptées",
    ],
    faq: [
      { q: "Comment activer le mode végétarien ?", a: "Dans ton profil, choisis le régime 'Végétarien'. Toutes les recettes contenant viande ou poisson sont automatiquement masquées." },
      { q: "L'app détecte-t-elle bien tous les produits carnés ?", a: "Oui, la détection couvre viande, volaille, poisson, fruits de mer, et dérivés (lardons, bouillon de viande, gélatine, etc.)." },
      { q: "Peut-on cuisiner végé pour des invités non-végé ?", a: "Le mode invité permet d'appliquer des filtres alimentaires temporaires sans changer tes préférences permanentes." },
    ],
  },
  'recette-vegan': {
    title: "Recettes vegan — Cuisine 100% végétale au quotidien",
    h1: "Recettes vegan : cuisine végétale avec ce que tu as",
    description: "Des recettes 100% végétales basées sur ton frigo. Filtrage automatique, alternatives IA, nutrition complète. Cuisine vegan facile et variée.",
    longDesc: "La cuisine vegan n'a jamais été aussi accessible. Mon Frigo filtre automatiquement toutes les recettes pour exclure les produits d'origine animale : viande, poisson, œufs, produits laitiers, miel. L'IA te propose des substitutions végétales pour chaque recette : lait d'avoine au lieu du lait de vache, tofu soyeux au lieu des œufs, levure nutritionnelle au lieu du parmesan. Le suivi nutritionnel vérifie que tes apports en protéines, fer, B12 et calcium sont suffisants.",
    keywords: ['recette vegan', 'cuisine vegan', 'repas vegan', 'recette végétalienne', 'recette sans produit animal', 'cuisine 100% végétale'],
    emoji: '🌱',
    features: [
      "Filtre vegan complet (viande, laitier, œufs, miel exclus)",
      "Substitutions végétales intelligentes par l'IA",
      "Suivi nutritionnel adapté au véganisme",
      "Recettes du monde entier en version végétale",
      "Scan EAN avec alerte sur les ingrédients animaux cachés",
    ],
    faq: [
      { q: "L'app détecte-t-elle les ingrédients animaux cachés ?", a: "Oui, le filtre couvre les ingrédients évidents mais aussi les dérivés (gélatine, présure, carmin, lactose dans les médicaments, etc.)." },
      { q: "L'IA propose-t-elle des alternatives vegan ?", a: "Absolument. Elle connaît toutes les substitutions classiques : aquafaba pour les blancs d'œufs, noix de cajou pour la crème, etc." },
      { q: "Le suivi nutritionnel est-il adapté ?", a: "Oui, il met en avant les nutriments critiques pour les vegans (B12, fer, calcium, oméga-3) et propose des aliments pour combler les manques." },
    ],
  },
  'recette-sans-gluten': {
    title: "Recettes sans gluten — Cuisine adaptée à l'intolérance",
    h1: "Recettes sans gluten pour tous les jours",
    description: "Intolérant ou sensible au gluten ? Mon Frigo filtre automatiquement les recettes et détecte le gluten dans chaque ingrédient. Sécurité et gourmandise.",
    longDesc: "Cuisiner sans gluten au quotidien peut être un défi. Mon Frigo le simplifie radicalement. En déclarant l'allergène \"Gluten\" dans ton profil, l'app filtre automatiquement les recettes contenant du blé, seigle, orge, épeautre, semoule, et tous les dérivés. Les recettes compatibles sont clairement identifiées. Le scan de codes-barres vérifie les ingrédients des produits emballés pour détecter la présence de gluten. L'IA te propose des substitutions sans gluten : farine de riz, fécule de maïs, pâtes de lentilles...",
    keywords: ['recette sans gluten', 'cuisine sans gluten', 'intolérance gluten', 'coeliaque recette', 'repas sans gluten', 'manger sans gluten'],
    emoji: '🌾',
    features: [
      "Détection automatique du gluten dans les ingrédients",
      "Scan EAN avec alerte gluten sur les produits emballés",
      "Substitutions sans gluten proposées par l'IA",
      "Badge allergène visible sur les recettes à risque",
      "Compatible avec d'autres allergènes simultanés",
    ],
    faq: [
      { q: "Comment activer le filtre sans gluten ?", a: "Dans ton profil, ajoute 'Gluten' dans tes allergènes. L'app marque automatiquement les recettes contenant du gluten." },
      { q: "Le scan EAN détecte-t-il le gluten ?", a: "Oui, grâce aux données OpenFoodFacts, le scan identifie la présence de gluten dans les produits emballés." },
      { q: "Quelles substitutions sont proposées ?", a: "Farine de riz, fécule de maïs, farine de sarrasin, pâtes de lentilles, pain sans gluten... L'IA adapte chaque recette." },
    ],
  },
  'recette-halal': {
    title: "Recettes halal — Cuisine halal variée et familiale",
    h1: "Recettes halal avec ce que tu as dans le frigo",
    description: "Cuisine halal au quotidien : Mon Frigo filtre automatiquement le porc et l'alcool, propose des recettes du monde entier adaptées. Gratuit.",
    longDesc: "Mon Frigo respecte parfaitement les exigences halal. En activant le mode \"Halal\" dans ton profil, toutes les recettes contenant du porc (jambon, lardons, bacon, saucisse, chorizo, pancetta) et de l'alcool (vin, bière, liqueur) sont automatiquement exclues ou signalées. Tu découvres des centaines de recettes halal du monde entier : cuisine marocaine, libanaise, turque, indienne, mais aussi des classiques français revisités sans ingrédients interdits. L'IA propose des substitutions adaptées : dinde au lieu du porc, vinaigre au lieu du vin.",
    keywords: ['recette halal', 'cuisine halal', 'repas halal', 'recette sans porc', 'menu halal', 'cuisine halal française'],
    emoji: '☪️',
    features: [
      "Filtre automatique porc et alcool",
      "Détection des ingrédients dérivés (lardons, gélatine de porc, vin de cuisine)",
      "Recettes du monde entier adaptées halal",
      "Substitutions halal proposées par l'IA",
      "Mode invité halal pour les repas en famille",
    ],
    faq: [
      { q: "Comment activer le mode halal ?", a: "Dans ton profil, choisis le régime 'Halal'. Toutes les recettes contenant porc ou alcool sont automatiquement filtrées." },
      { q: "L'app détecte-t-elle la gélatine de porc ?", a: "Le filtre couvre le porc et ses dérivés courants. Pour les produits emballés, le scan EAN indique la composition exacte." },
      { q: "Peut-on cuisiner halal pour des invités ?", a: "Oui, le mode invité permet d'appliquer le filtre halal temporairement sans modifier ton profil." },
    ],
  },
  'economiser-alimentation': {
    title: "Économiser sur l'alimentation — Astuces et outils concrets",
    h1: "Économise sur ton alimentation avec des outils concrets",
    description: "Budget alimentaire serré ? Mon Frigo te donne les outils pour dépenser moins : estimation des coûts, anti-gaspi, planning optimisé, liste de courses intelligente.",
    longDesc: "L'alimentation représente le deuxième poste de dépenses des ménages français. Mon Frigo t'aide à réduire cette facture sans sacrifier la qualité. Comment ? En combinant quatre leviers : (1) cuisiner avec ce que tu as déjà pour éviter les achats inutiles, (2) ne pas gaspiller les aliments qui approchent de la péremption, (3) planifier tes repas pour grouper tes achats et éviter les courses impulsives, (4) comparer le coût des recettes pour choisir les plus économiques. Résultat : une réduction de 25 à 40% du budget alimentaire moyen.",
    keywords: ['économiser alimentation', 'réduire budget courses', 'astuce économie courses', 'dépenser moins nourriture', 'budget alimentaire'],
    emoji: '📉',
    features: [
      "Estimation du coût par recette et par portion",
      "Filtre budget pour voir uniquement les recettes abordables",
      "Anti-gaspi : utilise les aliments avant péremption",
      "Planning repas pour grouper les achats",
      "Liste de courses optimisée (achète uniquement le nécessaire)",
    ],
    faq: [
      { q: "Combien peut-on économiser avec Mon Frigo ?", a: "En moyenne 25 à 40% sur le budget courses, principalement en réduisant le gaspillage et en cuisinant avec ce qu'on a déjà." },
      { q: "L'app est-elle gratuite ?", a: "Oui, le plan gratuit donne accès aux fonctionnalités de base. Les plans payants (dès 3,99€/mois) débloquent l'IA illimitée et le planning automatique." },
      { q: "Quels sont les plus gros postes d'économie ?", a: "Réduction du gaspillage (-30% de nourriture jetée), courses ciblées (pas d'achats en double), et choix de recettes économiques." },
    ],
  },
  'nutriscore-recette': {
    title: "NutriScore par recette — Score nutritionnel vérifié",
    h1: "NutriScore et données nutritionnelles vérifiées pour chaque recette",
    description: "Mon Frigo calcule le score nutritionnel de chaque recette à partir des vraies données EAN des ingrédients scannés. Pas d'estimation, des faits.",
    longDesc: "La plupart des apps de recettes estiment les valeurs nutritionnelles avec des bases de données génériques. Mon Frigo fait mieux : quand tu scannes les codes-barres de tes ingrédients, l'app utilise les données nutritionnelles exactes du produit (via OpenFoodFacts) pour calculer les calories, macronutriments et NutriScore de chaque recette. Tu vois les AJR (Apports Journaliers Recommandés) pour chaque nutriment, les équivalents calorifiques concrets (\"= 2 croissants\"), et un NutriScore A à E fiable.",
    keywords: ['nutriscore recette', 'score nutritionnel', 'valeur nutritionnelle recette', 'calories recette', 'recette équilibrée', 'nutrition recette'],
    emoji: '🔬',
    features: [
      "NutriScore A-E calculé sur données réelles EAN",
      "Calories, protéines, glucides, lipides, fibres par portion",
      "Barres AJR visuelles pour chaque nutriment",
      "Équivalents calorifiques concrets",
      "Panneau nutritionnel détaillé et expandable",
    ],
    faq: [
      { q: "Comment le NutriScore est-il calculé ?", a: "À partir des données nutritionnelles réelles des produits scannés (base OpenFoodFacts), pas d'une estimation générique. Le score est d'autant plus précis que tu as scanné les vrais produits." },
      { q: "Peut-on voir les macros de chaque recette ?", a: "Oui : calories, protéines, glucides, lipides, fibres, sel — le tout avec les barres de progression AJR et par portion." },
      { q: "Le NutriScore est-il fiable ?", a: "Il est aussi fiable que les données EAN des produits utilisés. Plus tu scannes tes vrais produits, plus le score est précis." },
    ],
  },
  'application-cuisine-gratuite': {
    title: "Application de cuisine gratuite — Mon Frigo, l'app qui change tout",
    h1: "La meilleure application de cuisine gratuite en 2026",
    description: "Mon Frigo : app gratuite de cuisine avec scan IA du frigo, recettes personnalisées, planning repas, liste de courses et anti-gaspillage. Télécharge maintenant.",
    longDesc: "Tu cherches une application de cuisine vraiment utile et gratuite ? Mon Frigo n'est pas une énième collection de recettes. C'est un assistant culinaire complet qui scanne ton frigo, te dit quoi cuisiner, planifie ta semaine, génère ta liste de courses et t'aide à ne rien gaspiller. Le plan gratuit inclut l'accès à 50% des recettes, 20 scans code-barres par semaine, et 3 requêtes IA pour tester. Pas de publicité intrusive, pas de données revendues, juste une app qui fait le boulot.",
    keywords: ['application cuisine gratuite', 'app recette gratuite', 'meilleure app cuisine', 'application recette', 'app cuisine 2026', 'application culinaire'],
    emoji: '📱',
    features: [
      "100% gratuit pour commencer — aucune carte requise",
      "Scan IA du frigo et codes-barres EAN",
      "Recettes triées par ingrédients disponibles",
      "Planning repas et liste de courses",
      "Anti-gaspillage avec alertes péremption",
      "Mode végétarien, vegan, halal, sans gluten...",
    ],
    faq: [
      { q: "Mon Frigo est-il vraiment gratuit ?", a: "Oui ! Le plan gratuit donne accès à 50% des recettes, 20 scans EAN/semaine et 3 requêtes IA. Aucune carte de crédit requise." },
      { q: "Quelles sont les limites du plan gratuit ?", a: "Le plan gratuit n'inclut pas le scan IA du frigo, le planning automatique, ni l'IA illimitée. Ces fonctionnalités sont disponibles dès 3,99€/mois." },
      { q: "Comment installer Mon Frigo ?", a: "Mon Frigo est une PWA (Progressive Web App). Visite monfrigo.app depuis ton navigateur et ajoute-le à ton écran d'accueil. Pas besoin du Play Store ou App Store." },
    ],
  },
};

export async function generateStaticParams() {
  return Object.keys(SEO_PAGES).map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = SEO_PAGES[slug];
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords,
    openGraph: {
      // Pas d'"images" : hérite de src/app/opengraph-image.tsx (racine).
      title: page.title,
      description: page.description,
      url: `${BASE}/s/${slug}`,
      type: 'article',
      locale: 'fr_FR',
      siteName: 'Mon Frigo',
    },
    twitter: { card: 'summary_large_image', title: page.title, description: page.description },
    alternates: { canonical: `${BASE}/s/${slug}` },
  };
}

export default async function SeoLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = SEO_PAGES[slug];
  if (!page) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.description,
    url: `${BASE}/s/${slug}`,
    isPartOf: { '@type': 'WebSite', name: 'Mon Frigo', url: BASE },
    mainEntity: {
      '@type': 'FAQPage',
      mainEntity: page.faq.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        {/* Header */}
        <header style={{ borderBottom: '1px solid var(--border)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontSize: '1.5rem', marginRight: 6 }}>🧊</span> Mon Frigo
          </Link>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/login" className="btn-secondary" style={{ padding: '6px 16px', borderRadius: 8, fontSize: 14, textDecoration: 'none' }}>
              Connexion
            </Link>
            <Link href="/register" className="btn-primary" style={{ padding: '6px 16px', borderRadius: 8, fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>
              S&apos;inscrire gratuitement
            </Link>
          </div>
        </header>

        <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
          {/* Breadcrumb */}
          <nav style={{ fontSize: 12, marginBottom: 24, color: 'var(--text-muted)' }}>
            <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Accueil</Link>
            {' > '}
            <span>{page.h1.slice(0, 50)}{page.h1.length > 50 ? '...' : ''}</span>
          </nav>

          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: 16 }}>{page.emoji}</span>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>{page.h1}</h1>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto 24px' }}>
              {page.description}
            </p>
            <Link href="/register" className="btn-primary"
              style={{ display: 'inline-block', padding: '12px 32px', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
              Essayer gratuitement
            </Link>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Gratuit · Sans carte · Inscription en 30s</p>
          </div>

          {/* Long description */}
          <article style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text-secondary)', marginBottom: 40 }}>
            <p>{page.longDesc}</p>
          </article>

          {/* Features */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>Ce que Mon Frigo fait pour toi</h2>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {page.features.map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 10, backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 14 }}>{f}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Pricing mini */}
          <section style={{ marginBottom: 40, padding: 24, borderRadius: 16, background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(168,85,247,0.06))', border: '1px solid rgba(168,85,247,0.15)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>Tarifs transparents</h2>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { name: 'Gratuit', price: '0€', desc: 'Pour découvrir', color: 'var(--text-muted)' },
                { name: 'Premium', price: '3,99€/mois', desc: 'Tout débloquer', color: '#f59e0b' },
                { name: 'VIP', price: '6,99€/mois', desc: 'IA illimitée', color: '#a855f7' },
              ].map(p => (
                <div key={p.name} style={{ textAlign: 'center', padding: '12px 20px', borderRadius: 12, backgroundColor: 'var(--bg-raised)', border: `1.5px solid ${p.color}30`, minWidth: 120 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: p.color }}>{p.name}</p>
                  <p style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>{p.price}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.desc}</p>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', marginTop: 16 }}>
              <Link href="/register" style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', textDecoration: 'underline' }}>
                Commencer gratuitement →
              </Link>
            </p>
          </section>

          {/* FAQ — great for SEO */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>Questions fréquentes</h2>
            {page.faq.map((f, i) => (
              <details key={i} style={{ marginBottom: 8, padding: '12px 16px', borderRadius: 10, backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border-subtle)' }}>
                <summary style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{f.q}</summary>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)', marginTop: 8 }}>{f.a}</p>
              </details>
            ))}
          </section>

          {/* Final CTA */}
          <section style={{ textAlign: 'center', padding: '2.5rem 1.5rem', borderRadius: 16, backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
            <p style={{ fontSize: '2rem', marginBottom: 8 }}>🍽️</p>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Prêt à cuisiner mieux ?</h2>
            <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 20 }}>
              Inscription gratuite en 30 secondes. Aucune carte requise.
            </p>
            <Link href="/register"
              style={{ display: 'inline-block', padding: '12px 32px', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none', color: 'var(--accent)', backgroundColor: 'var(--bg-raised)' }}>
              Créer mon compte — c&apos;est gratuit
            </Link>
          </section>
        </main>

        {/* Footer */}
        <footer style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', padding: '2rem 1rem' }}>
          <p>Mon Frigo © 2026 — <a href="https://matable.pro" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'var(--text-muted)' }}>matable.pro</a></p>
          <nav style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            {Object.entries(SEO_PAGES).slice(0, 8).map(([s, p]) => (
              <Link key={s} href={`/s/${s}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 10 }}>
                {p.emoji} {p.h1.slice(0, 35)}
              </Link>
            ))}
          </nav>
        </footer>
      </div>
    </>
  );
}
