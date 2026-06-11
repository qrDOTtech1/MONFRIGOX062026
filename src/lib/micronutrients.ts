/**
 * Estimation des micronutriments par ingrédient (pour 100g)
 * Utilisé quand l'ingrédient n'a pas de données EAN scannées.
 * Valeurs moyennes tirées de la table CIQUAL / USDA.
 */

interface MicroEstimate {
  iron?: number;       // mg
  magnesium?: number;  // mg
  calcium?: number;    // mg
  potassium?: number;  // mg
  zinc?: number;       // mg
  vitaminC?: number;   // mg
  vitaminD?: number;   // µg
  vitaminB12?: number; // µg
  vitaminB9?: number;  // µg (folate)
  omega3?: number;     // g
  phosphorus?: number; // mg
  selenium?: number;   // µg
  iodine?: number;     // µg
}

type MicroEntry = { keys: string[]; micros: MicroEstimate };

const MICRO_TABLE: MicroEntry[] = [
  // Viandes
  { keys: ['boeuf', 'bœuf', 'steak', 'viande hachée'], micros: { iron: 2.6, zinc: 4.5, vitaminB12: 2.5, phosphorus: 200, selenium: 18 } },
  { keys: ['poulet', 'blanc de poulet', 'escalope'], micros: { iron: 0.7, zinc: 1.0, vitaminB12: 0.3, phosphorus: 190, selenium: 22 } },
  { keys: ['foie', 'foie de volaille', 'foie de veau'], micros: { iron: 18, zinc: 4, vitaminB12: 65, vitaminB9: 250, vitaminC: 25 } },
  { keys: ['agneau'], micros: { iron: 1.6, zinc: 3.5, vitaminB12: 2.6 } },
  { keys: ['porc', 'côte de porc'], micros: { iron: 0.8, zinc: 2.0, vitaminB12: 0.7, phosphorus: 220 } },
  { keys: ['dinde'], micros: { iron: 0.6, zinc: 1.5, vitaminB12: 0.4 } },
  { keys: ['boudin noir'], micros: { iron: 22, vitaminB12: 1.2 } },

  // Poissons
  { keys: ['saumon'], micros: { omega3: 2.0, vitaminD: 11, vitaminB12: 3.2, selenium: 36, phosphorus: 240 } },
  { keys: ['sardine'], micros: { omega3: 1.5, vitaminD: 4.8, calcium: 382, vitaminB12: 8.9, iron: 2.9 } },
  { keys: ['thon'], micros: { omega3: 0.7, vitaminD: 4.5, vitaminB12: 2.1, selenium: 80 } },
  { keys: ['maquereau'], micros: { omega3: 2.7, vitaminD: 8, vitaminB12: 8.7 } },
  { keys: ['cabillaud', 'colin'], micros: { omega3: 0.2, vitaminB12: 1.0, selenium: 33, iodine: 110 } },
  { keys: ['crevette'], micros: { selenium: 40, zinc: 1.5, iodine: 90, vitaminB12: 1.9 } },

  // Oeufs / Laitiers
  { keys: ['oeuf', 'œuf'], micros: { iron: 1.8, vitaminD: 1.8, vitaminB12: 1.1, selenium: 30, zinc: 1.3, vitaminB9: 47, phosphorus: 198 } },
  { keys: ['lait'], micros: { calcium: 120, vitaminD: 0.1, vitaminB12: 0.4, phosphorus: 93, potassium: 150, iodine: 15 } },
  { keys: ['fromage', 'emmental', 'gruyère', 'comté'], micros: { calcium: 800, phosphorus: 500, zinc: 4, vitaminB12: 1.5 } },
  { keys: ['yaourt', 'yogourt'], micros: { calcium: 120, vitaminB12: 0.3, potassium: 155, phosphorus: 95 } },
  { keys: ['parmesan', 'parmigiano'], micros: { calcium: 1180, phosphorus: 694, zinc: 2.8 } },

  // Légumineuses
  { keys: ['lentille'], micros: { iron: 3.3, magnesium: 36, zinc: 1.3, vitaminB9: 180, potassium: 369, phosphorus: 180 } },
  { keys: ['pois chiche'], micros: { iron: 2.9, magnesium: 48, zinc: 1.5, vitaminB9: 172, potassium: 291 } },
  { keys: ['haricot rouge', 'haricot blanc', 'haricot sec'], micros: { iron: 2.5, magnesium: 45, zinc: 1.0, vitaminB9: 130, potassium: 400 } },
  { keys: ['tofu'], micros: { iron: 5.4, calcium: 350, magnesium: 30, zinc: 0.8 } },

  // Légumes verts
  { keys: ['épinard', 'épinards'], micros: { iron: 2.7, magnesium: 79, calcium: 99, vitaminC: 28, vitaminB9: 194, potassium: 558 } },
  { keys: ['brocoli'], micros: { iron: 0.7, vitaminC: 89, calcium: 47, vitaminB9: 63, potassium: 316 } },
  { keys: ['chou kale', 'kale'], micros: { iron: 1.5, vitaminC: 120, calcium: 150, vitaminB9: 62 } },
  { keys: ['haricot vert'], micros: { iron: 1.0, vitaminC: 12, vitaminB9: 33, potassium: 211 } },
  { keys: ['courgette'], micros: { vitaminC: 17, potassium: 261, magnesium: 18 } },
  { keys: ['poivron'], micros: { vitaminC: 128, potassium: 211, vitaminB9: 46 } },

  // Fruits
  { keys: ['orange'], micros: { vitaminC: 53, calcium: 40, potassium: 181, vitaminB9: 30 } },
  { keys: ['kiwi'], micros: { vitaminC: 93, potassium: 312, vitaminB9: 25 } },
  { keys: ['banane'], micros: { potassium: 358, magnesium: 27, vitaminC: 9 } },
  { keys: ['fraise'], micros: { vitaminC: 59, vitaminB9: 24, potassium: 153 } },
  { keys: ['citron'], micros: { vitaminC: 53, potassium: 138 } },
  { keys: ['avocat'], micros: { potassium: 485, magnesium: 29, vitaminB9: 81, vitaminC: 10 } },

  // Céréales / Féculents
  { keys: ['riz complet', 'riz brun'], micros: { magnesium: 44, iron: 0.8, zinc: 1.1, phosphorus: 103 } },
  { keys: ['avoine', 'flocon d\'avoine'], micros: { iron: 4.7, magnesium: 177, zinc: 4.0, phosphorus: 523 } },
  { keys: ['quinoa'], micros: { iron: 1.5, magnesium: 64, zinc: 1.1, phosphorus: 152, vitaminB9: 42 } },
  { keys: ['patate douce'], micros: { vitaminC: 2.4, potassium: 337, calcium: 30, magnesium: 25 } },
  { keys: ['pomme de terre'], micros: { vitaminC: 20, potassium: 421, magnesium: 23, iron: 0.8 } },

  // Noix / Graines
  { keys: ['amande'], micros: { magnesium: 270, calcium: 269, iron: 3.7, zinc: 3.1, vitaminB9: 44, phosphorus: 481 } },
  { keys: ['noix'], micros: { magnesium: 158, omega3: 2.5, zinc: 3.1, phosphorus: 346 } },
  { keys: ['noix de cajou'], micros: { magnesium: 292, iron: 6.7, zinc: 5.8, phosphorus: 593 } },
  { keys: ['graine de lin'], micros: { omega3: 22.8, magnesium: 392, iron: 5.7 } },
  { keys: ['graine de chia'], micros: { omega3: 17.8, calcium: 631, magnesium: 335, iron: 7.7 } },
  { keys: ['sésame', 'tahini'], micros: { calcium: 975, iron: 14.6, magnesium: 351, zinc: 7.8 } },

  // Divers
  { keys: ['chocolat noir', 'cacao'], micros: { iron: 11.9, magnesium: 228, zinc: 3.3, phosphorus: 308 } },
  { keys: ['levure nutritionnelle'], micros: { vitaminB12: 5, vitaminB9: 3000, iron: 5, zinc: 8 } },
  { keys: ['spiruline'], micros: { iron: 28.5, vitaminB12: 0, magnesium: 195 } },
];

function matchEntry(name: string): MicroEntry | null {
  const lower = name.toLowerCase();
  for (const entry of MICRO_TABLE) {
    if (entry.keys.some(k => lower.includes(k))) return entry;
  }
  return null;
}

export interface MicronutrientResult {
  iron: number;
  magnesium: number;
  calcium: number;
  potassium: number;
  zinc: number;
  vitaminC: number;
  vitaminD: number;
  vitaminB12: number;
  vitaminB9: number;
  omega3: number;
  phosphorus: number;
  selenium: number;
  iodine: number;
  coverage: number; // 0-100
}

export const MICRO_AJR: Record<string, { ajr: number; unit: string; label: string; emoji: string }> = {
  iron:       { ajr: 14,   unit: 'mg', label: 'Fer',          emoji: '🩸' },
  magnesium:  { ajr: 375,  unit: 'mg', label: 'Magnésium',    emoji: '⚡' },
  calcium:    { ajr: 800,  unit: 'mg', label: 'Calcium',      emoji: '🦴' },
  potassium:  { ajr: 2000, unit: 'mg', label: 'Potassium',    emoji: '💪' },
  zinc:       { ajr: 10,   unit: 'mg', label: 'Zinc',         emoji: '🛡️' },
  vitaminC:   { ajr: 80,   unit: 'mg', label: 'Vitamine C',   emoji: '🍊' },
  vitaminD:   { ajr: 5,    unit: 'µg', label: 'Vitamine D',   emoji: '☀️' },
  vitaminB12: { ajr: 2.5,  unit: 'µg', label: 'Vitamine B12', emoji: '🧬' },
  vitaminB9:  { ajr: 200,  unit: 'µg', label: 'Folate (B9)',  emoji: '🧫' },
  omega3:     { ajr: 2,    unit: 'g',  label: 'Oméga-3',      emoji: '🐟' },
  phosphorus: { ajr: 700,  unit: 'mg', label: 'Phosphore',    emoji: '🔬' },
  selenium:   { ajr: 55,   unit: 'µg', label: 'Sélénium',     emoji: '🌰' },
  iodine:     { ajr: 150,  unit: 'µg', label: 'Iode',         emoji: '🌊' },
};

const MICRO_KEYS = Object.keys(MICRO_AJR) as (keyof MicronutrientResult)[];

/**
 * Estimate micronutrients for a list of ingredients (per serving).
 * Uses real EAN data when available, falls back to estimation table.
 */
export function estimateMicronutrients(
  ingredients: Array<{
    name: string;
    quantityGrams: number;
    eanData?: Record<string, number | null>;
  }>,
  servings: number,
): MicronutrientResult {
  const totals: Record<string, number> = {};
  for (const k of MICRO_KEYS) totals[k] = 0;
  let covered = 0;

  for (const ing of ingredients) {
    const factor = ing.quantityGrams / 100;
    let hasMicro = false;

    // Try EAN data first
    if (ing.eanData) {
      for (const k of MICRO_KEYS) {
        const val = ing.eanData[k];
        if (typeof val === 'number' && val > 0) {
          totals[k] += val * factor;
          hasMicro = true;
        }
      }
    }

    // Fallback to estimation table
    if (!hasMicro) {
      const entry = matchEntry(ing.name);
      if (entry) {
        for (const k of MICRO_KEYS) {
          const val = entry.micros[k as keyof MicroEstimate];
          if (typeof val === 'number') {
            totals[k] += val * factor;
          }
        }
        hasMicro = true;
      }
    }

    if (hasMicro) covered++;
  }

  const s = Math.max(servings, 1);
  const result: any = {};
  for (const k of MICRO_KEYS) {
    result[k] = +(totals[k] / s).toFixed(2);
  }
  result.coverage = ingredients.length > 0 ? Math.round((covered / ingredients.length) * 100) : 0;
  return result as MicronutrientResult;
}
