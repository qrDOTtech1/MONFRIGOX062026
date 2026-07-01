import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

interface RappelConsoRecord {
  numero_fiche: string;
  categorie_de_produit: string;
  nom_de_la_marque_du_produit: string;
  noms_des_modeles_ou_references: string;
  identification_des_produits: string;
  motif_du_rappel: string;
  risques_encourus_par_le_consommateur: string;
  conduites_a_tenir_par_le_consommateur: string;
  date_de_publication: string;
  lien_vers_la_fiche_rappel: string;
  distributeurs: string;
  zone_geographique_de_vente: string;
  date_debut_fin_de_commercialisation: string;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const membership = await prisma.householdMember.findUnique({
    where: { userId: user.id },
    include: { household: { include: { members: { select: { userId: true } } } } },
  });

  const userIds = membership
    ? membership.household.members.map(m => m.userId)
    : [user.id];

  const fridgeItems = await prisma.fridgeItem.findMany({
    where: { userId: { in: userIds } },
    include: { ingredient: true },
  });

  if (fridgeItems.length === 0) return NextResponse.json([]);

  const ingredientNames = [...new Set(fridgeItems.map(item => item.ingredient.name.toLowerCase()))];

  try {
    const res = await fetch(
      'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/rappelconso0/records?limit=100&order_by=date_de_publication%20DESC&where=categorie_de_produit%3D%22Alimentation%22',
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) return NextResponse.json([]);

    const data = await res.json();
    const records: RappelConsoRecord[] = data.results || [];

    const alerts = records.filter(record => {
      const productText = [
        record.noms_des_modeles_ou_references,
        record.nom_de_la_marque_du_produit,
        record.identification_des_produits,
      ].join(' ').toLowerCase();

      return ingredientNames.some(name => {
        const words = name.split(/\s+/);
        return words.some(word => word.length >= 3 && productText.includes(word));
      });
    }).map(record => {
      const productText = [
        record.noms_des_modeles_ou_references,
        record.nom_de_la_marque_du_produit,
        record.identification_des_produits,
      ].join(' ').toLowerCase();

      const matchedIngredients = ingredientNames.filter(name => {
        const words = name.split(/\s+/);
        return words.some(word => word.length >= 3 && productText.includes(word));
      });

      return {
        id: record.numero_fiche,
        brand: record.nom_de_la_marque_du_produit || 'Marque inconnue',
        product: record.noms_des_modeles_ou_references || 'Produit non précisé',
        reason: record.motif_du_rappel || 'Motif non précisé',
        risks: record.risques_encourus_par_le_consommateur || '',
        action: record.conduites_a_tenir_par_le_consommateur || '',
        date: record.date_de_publication,
        link: record.lien_vers_la_fiche_rappel || '',
        distributors: record.distributeurs || '',
        lotInfo: record.identification_des_produits || '',
        matchedIngredients,
      };
    });

    return NextResponse.json(alerts);
  } catch {
    return NextResponse.json([]);
  }
}
