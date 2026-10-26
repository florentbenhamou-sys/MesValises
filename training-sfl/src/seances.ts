export interface Seance {
  id: string;
  date: string; // AAAA-MM-JJ
  titre: string;
  duree: number | null; // minutes
  notes: string;
}

export type SeanceInput = Omit<Seance, 'id'>;

const STORAGE_KEY = 'training-sfl.seances';

export function loadSeances(): Seance[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Seance[]) : [];
  } catch {
    return [];
  }
}

export function saveSeances(seances: Seance[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seances));
  } catch {
    // Stockage indisponible (navigation privée) : les données restent en mémoire.
  }
}

export function newId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function sortByDateDesc(seances: Seance[]): Seance[] {
  return [...seances].sort((a, b) => b.date.localeCompare(a.date));
}

export function formatDate(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
