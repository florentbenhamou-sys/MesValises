import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../context/HouseholdContext';
import type { Person } from '../types';

const COLORS = ['#4f7cff', '#ff6b6b', '#2fbf71', '#ffb020', '#a855f7', '#14b8a6'];

function ageLabel(birthdate: string | null): string {
  if (!birthdate) return '';
  const birth = new Date(birthdate);
  if (Number.isNaN(birth.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return `${Math.max(age, 0)} an${age > 1 ? 's' : ''}`;
}

export default function People() {
  const { household, currentPersonId, setCurrentPersonId } = useHousehold();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [height, setHeight] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function loadPeople() {
    if (!household) return;
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('people')
      .select('*')
      .eq('household_id', household.id)
      .order('created_at', { ascending: true });
    if (fetchError) setError(fetchError.message);
    else setPeople((data as Person[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadPeople();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!household || !name.trim()) return;
    setError(null);
    const color = COLORS[people.length % COLORS.length];
    const { error: insertError } = await supabase.from('people').insert({
      household_id: household.id,
      name: name.trim(),
      birthdate: birthdate || null,
      height_cm: height ? Number(height) : null,
      color,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setName('');
    setBirthdate('');
    setHeight('');
    setShowForm(false);
    loadPeople();
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette personne et tous ses articles associés ?')) return;
    const { error: deleteError } = await supabase.from('people').delete().eq('id', id);
    if (deleteError) setError(deleteError.message);
    if (currentPersonId === id) setCurrentPersonId(null);
    loadPeople();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Membres du foyer</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annuler' : '+ Ajouter'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <form className="form card" onSubmit={handleAdd}>
          <label>
            Prénom
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Date de naissance
            <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
          </label>
          <label>
            Taille (cm)
            <input
              type="number"
              min={30}
              max={230}
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="170"
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Ajouter
          </button>
        </form>
      )}

      {loading ? (
        <p className="hint">Chargement…</p>
      ) : people.length === 0 ? (
        <p className="hint">Aucun membre pour l'instant. Ajoutez les personnes de votre foyer.</p>
      ) : (
        <ul className="list">
          {people.map((person) => (
            <li key={person.id} className="list-item person-item">
              <span className="avatar" style={{ background: person.color }}>
                {person.name.charAt(0).toUpperCase()}
              </span>
              <div className="list-item-body">
                <strong>{person.name}</strong>
                <span className="hint">
                  {[ageLabel(person.birthdate), person.height_cm ? `${person.height_cm} cm` : null]
                    .filter(Boolean)
                    .join(' · ') || 'Âge/taille non renseignés'}
                </span>
              </div>
              {currentPersonId === person.id ? (
                <span className="badge">C'est moi</span>
              ) : (
                <button className="btn btn-link btn-sm" onClick={() => setCurrentPersonId(person.id)}>
                  C'est moi
                </button>
              )}
              <button className="icon-btn" onClick={() => handleDelete(person.id)} aria-label="Supprimer">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
