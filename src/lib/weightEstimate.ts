import type { Item, ItemCategory, Person } from '../types';

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  vetement: 'Vêtements',
  chaussures: 'Chaussures',
  hygiene: 'Hygiène',
  electronique: 'Électronique',
  documents: 'Documents',
  sante: 'Santé',
  accessoire: 'Accessoires',
  autre: 'Autre',
};

export const CATEGORY_ORDER: ItemCategory[] = [
  'vetement',
  'chaussures',
  'hygiene',
  'sante',
  'electronique',
  'documents',
  'accessoire',
  'autre',
];

/** Catégories dont le poids dépend de la taille de la personne qui les porte. */
const SIZE_DEPENDENT_CATEGORIES: ReadonlySet<ItemCategory> = new Set(['vetement', 'chaussures']);

export interface CatalogEntry {
  name: string;
  category: ItemCategory;
  /** Poids de référence (grammes) pour un adulte de ~170cm. */
  adultWeightG: number;
}

/** Bibliothèque d'articles courants pour remplir une liste rapidement. */
export const ITEM_CATALOG: CatalogEntry[] = [
  { name: 'T-shirt', category: 'vetement', adultWeightG: 180 },
  { name: 'Chemise', category: 'vetement', adultWeightG: 220 },
  { name: 'Pull', category: 'vetement', adultWeightG: 400 },
  { name: 'Sweat à capuche', category: 'vetement', adultWeightG: 500 },
  { name: 'Pantalon', category: 'vetement', adultWeightG: 500 },
  { name: 'Jean', category: 'vetement', adultWeightG: 650 },
  { name: 'Short', category: 'vetement', adultWeightG: 200 },
  { name: 'Sous-vêtement', category: 'vetement', adultWeightG: 60 },
  { name: 'Paire de chaussettes', category: 'vetement', adultWeightG: 40 },
  { name: 'Pyjama', category: 'vetement', adultWeightG: 250 },
  { name: 'Maillot de bain', category: 'vetement', adultWeightG: 100 },
  { name: 'Veste', category: 'vetement', adultWeightG: 700 },
  { name: 'Manteau', category: 'vetement', adultWeightG: 1100 },
  { name: 'Robe', category: 'vetement', adultWeightG: 300 },
  { name: 'Casquette / bonnet', category: 'vetement', adultWeightG: 80 },
  { name: 'Baskets', category: 'chaussures', adultWeightG: 700 },
  { name: 'Sandales', category: 'chaussures', adultWeightG: 300 },
  { name: 'Chaussures de marche', category: 'chaussures', adultWeightG: 900 },
  { name: 'Tongs', category: 'chaussures', adultWeightG: 150 },
  { name: 'Trousse de toilette', category: 'hygiene', adultWeightG: 500 },
  { name: 'Brosse à dents', category: 'hygiene', adultWeightG: 20 },
  { name: 'Shampoing', category: 'hygiene', adultWeightG: 200 },
  { name: 'Crème solaire', category: 'hygiene', adultWeightG: 150 },
  { name: 'Serviette de plage', category: 'hygiene', adultWeightG: 400 },
  { name: 'Serviette de toilette', category: 'hygiene', adultWeightG: 350 },
  { name: 'Chargeur téléphone', category: 'electronique', adultWeightG: 100 },
  { name: 'Batterie externe', category: 'electronique', adultWeightG: 200 },
  { name: 'Appareil photo', category: 'electronique', adultWeightG: 400 },
  { name: 'Ordinateur portable', category: 'electronique', adultWeightG: 1500 },
  { name: 'Liseuse / tablette', category: 'electronique', adultWeightG: 350 },
  { name: 'Passeport / carte d\'identité', category: 'documents', adultWeightG: 30 },
  { name: 'Billets / réservations', category: 'documents', adultWeightG: 20 },
  { name: 'Médicaments', category: 'sante', adultWeightG: 150 },
  { name: 'Trousse de premiers secours', category: 'sante', adultWeightG: 200 },
  { name: 'Doudou / peluche', category: 'accessoire', adultWeightG: 200 },
  { name: 'Livre', category: 'accessoire', adultWeightG: 300 },
  { name: 'Jouet / jeu de voyage', category: 'accessoire', adultWeightG: 250 },
  { name: 'Lunettes de soleil', category: 'accessoire', adultWeightG: 30 },
  { name: 'Sac à dos', category: 'accessoire', adultWeightG: 600 },
];

const DEFAULT_WEIGHT_BY_CATEGORY: Record<ItemCategory, number> = {
  vetement: 250,
  chaussures: 500,
  hygiene: 150,
  electronique: 200,
  documents: 20,
  sante: 100,
  accessoire: 200,
  autre: 200,
};

const REFERENCE_ADULT_HEIGHT_CM = 170;
const MIN_SIZE_FACTOR = 0.35;
const MAX_SIZE_FACTOR = 1.05;

function ageInYears(birthdate: string | null): number | null {
  if (!birthdate) return null;
  const birth = new Date(birthdate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return Math.max(age, 0);
}

/** Facteur de taille (0.35 à 1.05) appliqué aux vêtements/chaussures d'une personne. */
export function sizeFactor(person: Pick<Person, 'height_cm' | 'birthdate'>): number {
  if (person.height_cm && person.height_cm > 0) {
    const factor = person.height_cm / REFERENCE_ADULT_HEIGHT_CM;
    return Math.min(MAX_SIZE_FACTOR, Math.max(MIN_SIZE_FACTOR, factor));
  }

  const age = ageInYears(person.birthdate);
  if (age === null) return 1;
  if (age < 2) return 0.4;
  if (age < 5) return 0.5;
  if (age < 8) return 0.6;
  if (age < 12) return 0.75;
  if (age < 16) return 0.9;
  return 1;
}

export function catalogDefault(name: string, category: ItemCategory): number {
  const match = ITEM_CATALOG.find(
    (entry) => entry.name.toLowerCase() === name.trim().toLowerCase() && entry.category === category,
  );
  return match?.adultWeightG ?? DEFAULT_WEIGHT_BY_CATEGORY[category];
}

/** Poids unitaire estimé (grammes) pour un article donné, ajusté à la personne qui le porte. */
export function estimateUnitWeightG(
  item: Pick<Item, 'name' | 'category' | 'unit_weight_g'>,
  person: Pick<Person, 'height_cm' | 'birthdate'>,
): number {
  if (item.unit_weight_g && item.unit_weight_g > 0) {
    return item.unit_weight_g;
  }
  const base = catalogDefault(item.name, item.category);
  const factor = SIZE_DEPENDENT_CATEGORIES.has(item.category) ? sizeFactor(person) : 1;
  return Math.round(base * factor);
}

export function itemTotalWeightG(
  item: Pick<Item, 'name' | 'category' | 'unit_weight_g' | 'quantity'>,
  person: Pick<Person, 'height_cm' | 'birthdate'>,
): number {
  return estimateUnitWeightG(item, person) * Math.max(1, item.quantity);
}

export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 1)} kg`;
  }
  return `${Math.round(grams)} g`;
}
