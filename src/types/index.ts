export interface Household {
  id: string;
  code: string;
  name: string;
  created_at: string;
}

export interface HouseholdMember {
  household_id: string;
  user_id: string;
  display_name: string;
  joined_at: string;
}

export interface Person {
  id: string;
  household_id: string;
  name: string;
  birthdate: string | null;
  height_cm: number | null;
  color: string;
  created_at: string;
}

export interface Trip {
  id: string;
  household_id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export type LuggageKind = 'valise' | 'cabine' | 'sac' | 'autre';

export interface Luggage {
  id: string;
  trip_id: string;
  name: string;
  kind: LuggageKind;
  owner_person_id: string | null;
  max_weight_kg: number | null;
  created_at: string;
}

export type ItemCategory =
  | 'vetement'
  | 'chaussures'
  | 'hygiene'
  | 'electronique'
  | 'documents'
  | 'sante'
  | 'accessoire'
  | 'autre';

export interface Item {
  id: string;
  trip_id: string;
  person_id: string;
  luggage_id: string | null;
  name: string;
  category: ItemCategory;
  quantity: number;
  unit_weight_g: number | null;
  packed: boolean;
  notes: string | null;
  created_at: string;
}
