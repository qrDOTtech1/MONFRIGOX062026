/**
 * Traduction des unités culinaires françaises vers les autres langues.
 * Les unités sont stockées en français dans la DB.
 * On les traduit côté client à l'affichage.
 */

type LangMap = Record<string, string>;

const UNIT_MAP: Record<string, LangMap> = {
  // Masse
  'g':   { en: 'g',   es: 'g',   de: 'g',   it: 'g',   pt: 'g',   nl: 'g',  ru: 'г',   ar: 'غ',   zh: '克',  ja: 'g',  ko: 'g',  tr: 'g',  pl: 'g',  sv: 'g',  hi: 'ग्राम' },
  'kg':  { en: 'kg',  es: 'kg',  de: 'kg',  it: 'kg',  pt: 'kg',  nl: 'kg', ru: 'кг',  ar: 'كغ',  zh: '千克', ja: 'kg', ko: 'kg', tr: 'kg', pl: 'kg', sv: 'kg', hi: 'किग्रा' },
  'mg':  { en: 'mg',  es: 'mg',  de: 'mg',  it: 'mg',  pt: 'mg',  nl: 'mg', ru: 'мг',  ar: 'مغ',  zh: '毫克', ja: 'mg', ko: 'mg', tr: 'mg', pl: 'mg', sv: 'mg', hi: 'मिग्रा' },

  // Volume
  'ml':  { en: 'ml',  es: 'ml',  de: 'ml',  it: 'ml',  pt: 'ml',  nl: 'ml', ru: 'мл',  ar: 'مل',  zh: '毫升', ja: 'ml', ko: 'ml', tr: 'ml', pl: 'ml', sv: 'ml', hi: 'मिली' },
  'mL':  { en: 'ml',  es: 'ml',  de: 'ml',  it: 'ml',  pt: 'ml',  nl: 'ml', ru: 'мл',  ar: 'مل',  zh: '毫升', ja: 'ml', ko: 'ml', tr: 'ml', pl: 'ml', sv: 'ml', hi: 'मिली' },
  'cl':  { en: 'cl',  es: 'cl',  de: 'cl',  it: 'cl',  pt: 'cl',  nl: 'cl', ru: 'кл',  ar: 'سل',  zh: '厘升', ja: 'cl', ko: 'cl', tr: 'cl', pl: 'cl', sv: 'cl', hi: 'सेमिली' },
  'l':   { en: 'l',   es: 'l',   de: 'l',   it: 'l',   pt: 'l',   nl: 'l',  ru: 'л',   ar: 'ل',   zh: '升',  ja: 'l',  ko: 'l',  tr: 'l',  pl: 'l',  sv: 'l',  hi: 'लीटर' },
  'litre': { en: 'litre', es: 'litro', de: 'Liter', it: 'litro', pt: 'litro', nl: 'liter', ru: 'литр', ar: 'لتر', zh: '升', ja: 'リットル', ko: '리터', tr: 'litre', pl: 'litr', sv: 'liter', hi: 'लीटर' },

  // Cuillères
  'cuillère à soupe': { en: 'tbsp', es: 'cda', de: 'EL', it: 'cucchiaio', pt: 'colher sopa', nl: 'el', ru: 'ст.л.', ar: 'ملعقة كبيرة', zh: '汤匙', ja: '大さじ', ko: '큰술', tr: 'yemek kaşığı', pl: 'łyżka', sv: 'msk', hi: 'बड़ा चम्मच' },
  'cuillère à café': { en: 'tsp', es: 'cdta', de: 'TL', it: 'cucchiaino', pt: 'colher chá', nl: 'tl', ru: 'ч.л.', ar: 'ملعقة صغيرة', zh: '茶匙', ja: '小さじ', ko: '작은술', tr: 'çay kaşığı', pl: 'łyżeczka', sv: 'tsk', hi: 'छोटा चम्मच' },
  'cs': { en: 'tbsp', es: 'cda', de: 'EL', it: 'cucchiaio', pt: 'colher sopa', nl: 'el', ru: 'ст.л.', ar: 'ملعقة كبيرة', zh: '汤匙', ja: '大さじ', ko: '큰술', tr: 'yemek kaşığı', pl: 'łyżka', sv: 'msk', hi: 'बड़ा चम्मच' },
  'cc': { en: 'tsp', es: 'cdta', de: 'TL', it: 'cucchiaino', pt: 'colher chá', nl: 'tl', ru: 'ч.л.', ar: 'ملعقة صغيرة', zh: '茶匙', ja: '小さじ', ko: '작은술', tr: 'çay kaşığı', pl: 'łyżeczka', sv: 'tsk', hi: 'छोटा चम्मच' },

  // Contenants
  'tasse': { en: 'cup', es: 'taza', de: 'Tasse', it: 'tazza', pt: 'chávena', nl: 'kop', ru: 'стакан', ar: 'كوب', zh: '杯', ja: 'カップ', ko: '컵', tr: 'bardak', pl: 'szklanka', sv: 'kopp', hi: 'कप' },
  'verre': { en: 'glass', es: 'vaso', de: 'Glas', it: 'bicchiere', pt: 'copo', nl: 'glas', ru: 'стакан', ar: 'كوب', zh: '玻璃杯', ja: 'グラス', ko: '유리잔', tr: 'bardak', pl: 'szklanka', sv: 'glas', hi: 'गिलास' },
  'bol': { en: 'bowl', es: 'bol', de: 'Schüssel', it: 'ciotola', pt: 'tigela', nl: 'kom', ru: 'миска', ar: 'وعاء', zh: '碗', ja: 'ボウル', ko: '그릇', tr: 'kase', pl: 'miska', sv: 'skål', hi: 'कटोरा' },
  'pot': { en: 'jar', es: 'tarro', de: 'Glas', it: 'vasetto', pt: 'pote', nl: 'pot', ru: 'банка', ar: 'جرة', zh: '罐', ja: '瓶', ko: '병', tr: 'kavanoz', pl: 'słoik', sv: 'burk', hi: 'जार' },
  'boîte': { en: 'can', es: 'lata', de: 'Dose', it: 'scatola', pt: 'lata', nl: 'blik', ru: 'банка', ar: 'علبة', zh: '罐头', ja: '缶', ko: '캔', tr: 'kutu', pl: 'puszka', sv: 'burk', hi: 'डिब्बा' },
  'boite': { en: 'can', es: 'lata', de: 'Dose', it: 'scatola', pt: 'lata', nl: 'blik', ru: 'банка', ar: 'علبة', zh: '罐头', ja: '缶', ko: '캔', tr: 'kutu', pl: 'puszka', sv: 'burk', hi: 'डिब्बा' },
  'sachet': { en: 'packet', es: 'sobre', de: 'Päckchen', it: 'bustina', pt: 'saqueta', nl: 'zakje', ru: 'пакетик', ar: 'كيس', zh: '袋', ja: '袋', ko: '봉지', tr: 'paket', pl: 'torebka', sv: 'påse', hi: 'पैकेट' },

  // Portions
  'unité': { en: 'unit', es: 'unidad', de: 'Stück', it: 'pezzo', pt: 'unidade', nl: 'stuk', ru: 'шт.', ar: 'قطعة', zh: '个', ja: '個', ko: '개', tr: 'adet', pl: 'szt.', sv: 'st', hi: 'नग' },
  'pièce': { en: 'piece', es: 'pieza', de: 'Stück', it: 'pezzo', pt: 'peça', nl: 'stuk', ru: 'шт.', ar: 'قطعة', zh: '片', ja: '個', ko: '조각', tr: 'parça', pl: 'szt.', sv: 'bit', hi: 'टुकड़ा' },
  'tranche': { en: 'slice', es: 'rebanada', de: 'Scheibe', it: 'fetta', pt: 'fatia', nl: 'plak', ru: 'ломтик', ar: 'شريحة', zh: '片', ja: 'スライス', ko: '조각', tr: 'dilim', pl: 'plaster', sv: 'skiva', hi: 'टुकड़ा' },
  'portion': { en: 'portion', es: 'porción', de: 'Portion', it: 'porzione', pt: 'porção', nl: 'portie', ru: 'порция', ar: 'حصة', zh: '份', ja: '人前', ko: '인분', tr: 'porsiyon', pl: 'porcja', sv: 'portion', hi: 'भाग' },

  // Petites quantités
  'pincée': { en: 'pinch', es: 'pizca', de: 'Prise', it: 'pizzico', pt: 'pitada', nl: 'snuf', ru: 'щепотка', ar: 'رشة', zh: '少许', ja: 'ひとつまみ', ko: '한 꼬집', tr: 'tutam', pl: 'szczypta', sv: 'nypa', hi: 'चुटकी' },
  'pincee': { en: 'pinch', es: 'pizca', de: 'Prise', it: 'pizzico', pt: 'pitada', nl: 'snuf', ru: 'щепотка', ar: 'رشة', zh: '少许', ja: 'ひとつまみ', ko: '한 꼬집', tr: 'tutam', pl: 'szczypta', sv: 'nypa', hi: 'चुटकी' },
  'filet': { en: 'drizzle', es: 'chorrito', de: 'Schuss', it: 'filo', pt: 'fio', nl: 'scheutje', ru: 'капля', ar: 'رذاذ', zh: '少量', ja: '少量', ko: '약간', tr: 'az', pl: 'odrobina', sv: 'skvätt', hi: 'थोड़ा' },
  'noix': { en: 'knob', es: 'nuez', de: 'Nuss', it: 'noce', pt: 'noz', nl: 'klontje', ru: 'кусочек', ar: 'قطعة', zh: '一块', ja: 'ひとかけ', ko: '한 조각', tr: 'parça', pl: 'gałka', sv: 'klick', hi: 'टुकड़ा' },
  'gousse': { en: 'clove', es: 'diente', de: 'Zehe', it: 'spicchio', pt: 'dente', nl: 'teen', ru: 'зубчик', ar: 'فص', zh: '瓣', ja: 'かけ', ko: '쪽', tr: 'diş', pl: 'ząbek', sv: 'klyfta', hi: 'कली' },
  'brin': { en: 'sprig', es: 'ramita', de: 'Zweig', it: 'rametto', pt: 'ramo', nl: 'takje', ru: 'веточка', ar: 'غصين', zh: '枝', ja: '枝', ko: '가지', tr: 'dal', pl: 'gałązka', sv: 'kvist', hi: 'डाली' },
  'feuille': { en: 'leaf', es: 'hoja', de: 'Blatt', it: 'foglia', pt: 'folha', nl: 'blad', ru: 'лист', ar: 'ورقة', zh: '片', ja: '枚', ko: '잎', tr: 'yaprak', pl: 'liść', sv: 'blad', hi: 'पत्ती' },
  'branche': { en: 'branch', es: 'rama', de: 'Zweig', it: 'ramo', pt: 'ramo', nl: 'tak', ru: 'веточка', ar: 'فرع', zh: '支', ja: '枝', ko: '가지', tr: 'dal', pl: 'gałązka', sv: 'kvist', hi: 'शाखा' },

  // Températures et autres
  'cm': { en: 'cm', es: 'cm', de: 'cm', it: 'cm', pt: 'cm', nl: 'cm', ru: 'см', ar: 'سم', zh: '厘米', ja: 'cm', ko: 'cm', tr: 'cm', pl: 'cm', sv: 'cm', hi: 'सेमी' },
};

/** Traduit une unité de mesure française vers la langue cible. Si pas de traduction → retourne l'original. */
export function translateUnit(unit: string, lang: string): string {
  if (!unit || lang === 'fr') return unit;
  const clean = unit.trim();
  const entry = UNIT_MAP[clean] ?? UNIT_MAP[clean.toLowerCase()];
  return entry?.[lang] ?? clean;
}

/** Traduit les noms de langues vers le code BCP-47 pour le STT/TTS navigateur. */
export const LANG_TO_BCP47: Record<string, string> = {
  fr: 'fr-FR', en: 'en-US', es: 'es-ES', de: 'de-DE', it: 'it-IT',
  pt: 'pt-PT', nl: 'nl-NL', ru: 'ru-RU', ar: 'ar-SA', zh: 'zh-CN',
  ja: 'ja-JP', ko: 'ko-KR', tr: 'tr-TR', pl: 'pl-PL', sv: 'sv-SE',
  hi: 'hi-IN',
};

/** Nom complet de la langue pour les instructions IA. */
export const LANG_NAMES: Record<string, string> = {
  fr: 'français', en: 'English', es: 'español', de: 'Deutsch', it: 'italiano',
  pt: 'português', nl: 'Nederlands', ru: 'русский', ar: 'العربية', zh: '中文',
  ja: '日本語', ko: '한국어', tr: 'Türkçe', pl: 'polski', sv: 'svenska', hi: 'हिन्दी',
};
