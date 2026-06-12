import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * POST /api/scan/receipt  { text }
 * Reçoit le texte OCR d'un ticket de caisse (Tesseract côté client — zéro coût IA)
 * et matche les lignes contre notre base d'ingrédients.
 * Gratuit pour tous les plans (pas de consommation IA).
 */

// Normalise pour le matching : minuscules, sans accents, sans ponctuation
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Lignes de ticket à ignorer (totaux, paiement, magasin, non-alimentaire…)
const SKIP_PATTERNS = [
  /total/i, /tva/i, /carte\s?(bleue|bancaire)?/i, /\bcb\b/i, /esp[eè]ces/i,
  /rendu/i, /monnaie/i, /remise/i, /cagnotte/i, /fid[eé]lit[eé]/i,
  /merci/i, /bienvenue/i, /caisse/i, /ticket/i, /facture/i, /h[oô]te(sse)?/i,
  /tel[:.\s]/i, /siret/i, /www\./i, /http/i,
  /^\s*[\d\s.,€x*-]+\s*$/, // lignes uniquement chiffres/prix
  /\bsacs?\b/i, /poubelle/i, /essuie/i, /lessive/i, /shampo/i, /dentifrice/i,
  /papier\s?toilette/i, /mouchoir/i, /d[eé]odorant/i, /gel\s?douche/i, /savon/i,
];

// Alias fréquents sur les tickets FR → nom d'ingrédient générique
const RECEIPT_ALIASES: Array<{ match: RegExp; name: string }> = [
  { match: /\blait\b|1\/2\s?ecrem|demi[\s-]?ecrem/, name: 'lait' },
  { match: /\boeufs?\b|bte\s?\d+\s?oeufs/, name: 'oeuf' },
  { match: /\bbeurre\b|doux\s?82|demi[\s-]?sel/, name: 'beurre' },
  { match: /creme\s?fraiche|creme\s?(entiere|legere|liquide|epaisse)/, name: 'crème fraîche' },
  { match: /\byaourts?\b|\byop\b/, name: 'yaourt' },
  { match: /emmental|gruyere|\brape\b/, name: 'fromage râpé' },
  { match: /camembert|\bbrie\b/, name: 'camembert' },
  { match: /mozzar/, name: 'mozzarella' },
  { match: /\bpoulet\b|filets?\s?de\s?poulet|escalope.*poulet|cuisse.*poulet/, name: 'poulet' },
  { match: /boeuf|steak|hach[eé]|entrecote|bavette/, name: 'boeuf' },
  { match: /\bporc\b|cote.*porc|roti.*porc/, name: 'porc' },
  { match: /lardons?/, name: 'lardons' },
  { match: /jambon/, name: 'jambon' },
  { match: /saucisses?\b|chipolata|merguez/, name: 'saucisse' },
  { match: /saumon/, name: 'saumon' },
  { match: /cabillaud|\bcolin\b|poisson\s?blanc/, name: 'cabillaud' },
  { match: /\bthon\b/, name: 'thon' },
  { match: /crevettes?/, name: 'crevette' },
  { match: /tomates?/, name: 'tomate' },
  { match: /pommes?\s?de\s?terre|\bpdt\b|patates?\b/, name: 'pomme de terre' },
  { match: /pommes?\b(?!\s?de\s?terre)/, name: 'pomme' },
  { match: /bananes?/, name: 'banane' },
  { match: /citrons?/, name: 'citron' },
  { match: /oranges?\b/, name: 'orange' },
  { match: /carottes?/, name: 'carotte' },
  { match: /oignons?/, name: 'oignon' },
  { match: /\bails?\b|gousse/, name: 'ail' },
  { match: /courgettes?/, name: 'courgette' },
  { match: /aubergines?/, name: 'aubergine' },
  { match: /poivrons?/, name: 'poivron' },
  { match: /salade|laitue|batavia|iceberg/, name: 'salade' },
  { match: /epinards?/, name: 'épinard' },
  { match: /brocolis?/, name: 'brocoli' },
  { match: /champignons?/, name: 'champignon' },
  { match: /concombres?/, name: 'concombre' },
  { match: /avocats?/, name: 'avocat' },
  { match: /fraises?/, name: 'fraise' },
  { match: /\bp[aâ]tes?\b|spaghetti|penne|fusilli|coquillettes/, name: 'pâtes' },
  { match: /\briz\b/, name: 'riz' },
  { match: /\bpain\b|baguette/, name: 'pain' },
  { match: /farine/, name: 'farine' },
  { match: /sucre\b/, name: 'sucre' },
  { match: /huile\s?(olive|tournesol)?/, name: 'huile d\'olive' },
  { match: /chocolat/, name: 'chocolat' },
  { match: /\bjus\s?(orange|pomme|multi)/, name: 'jus d\'orange' },
  { match: /lentilles?/, name: 'lentilles' },
  { match: /pois\s?chiches?/, name: 'pois chiche' },
  { match: /haricots?\s?verts?/, name: 'haricot vert' },
  { match: /ma[iï]s\b/, name: 'maïs' },
  { match: /\bthe\b/, name: 'thé' },
  { match: /caf[eé]\b|\bcafe\b/, name: 'café' },
  { match: /\bmiel\b/, name: 'miel' },
];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { text } = await req.json();
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Texte OCR requis' }, { status: 400 });
  }

  // Base d'ingrédients pour le matching direct
  const allIngredients = await prisma.ingredient.findMany({
    select: { id: true, name: true },
  });
  const ingredientsNorm = allIngredients.map(i => ({ ...i, n: norm(i.name) }));

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length >= 3);
  const found = new Map<string, { name: string; confidence: number; ingredientId?: string }>();

  for (const rawLine of lines) {
    if (SKIP_PATTERNS.some(p => p.test(rawLine))) continue;
    const line = norm(rawLine);
    if (line.length < 3) continue;

    // 1. Alias tickets (plus spécifiques, confiance haute)
    let matched = false;
    for (const alias of RECEIPT_ALIASES) {
      if (alias.match.test(line)) {
        const k = norm(alias.name);
        if (!found.has(k)) {
          const ing = ingredientsNorm.find(i => i.n === k)
            || ingredientsNorm.find(i => i.n.includes(k) || k.includes(i.n));
          found.set(k, { name: alias.name, confidence: 0.85, ingredientId: ing?.id });
        }
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // 2. Matching direct sur la base d'ingrédients (nom contenu dans la ligne)
    for (const ing of ingredientsNorm) {
      if (ing.n.length >= 4 && line.includes(ing.n)) {
        if (!found.has(ing.n)) {
          found.set(ing.n, { name: ing.name, confidence: 0.7, ingredientId: ing.id });
        }
        break;
      }
    }
  }

  const items = Array.from(found.values());
  return NextResponse.json({
    items,
    linesAnalyzed: lines.length,
    message: items.length === 0
      ? 'Aucun produit alimentaire reconnu. Vérifie que le ticket est net et bien éclairé.'
      : undefined,
  });
}
