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

interface FormState {
  name: string;
  birthdate: string;
  height: string;
}

const EMPTY_FORM: FormState = { name: '', birthdate: '', height: '' };

export default function People() {
  const { household, currentPersonId, setCurrentPersonId } = useHousehold();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
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

  function startAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowAddForm((v) => !v);
  }

  function startEdit(person: Person) {
    setShowAddForm(false);
    setEditingId(person.id);
    setForm({
      name: person.name,
      birthdate: person.birthdate ?? '',
      height: person.height_cm ? String(person.height_cm) : '',
    });
  }

  function cancelForm() {
    setShowAddForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!household || !form.name.trim()) return;
    setError(null);

    if (editingId) {
      const { error: updateError } = await supabase
        .from('people')
        .update({
          name: form.name.trim(),
          birthdate: form.birthdate || null,
          height_cm: form.height ? Number(form.height) : null,
        })
        .eq('id', editingId);
      if (updateError) {
        setError(updateError.message);
        return;
      }
    } else {
      const color = COLORS[people.length % COLORS.length];
      const { error: insertError } = await supabase.from('people').insert({
        household_id: household.id,
        name: form.name.trim(),
        birthdate: form.birthdate || null,
        height_cm: form.height ? Number(form.height) : null,
        color,
      });
      if (insertError) {
        setError(insertError.message);
        return;
      }
    }

    cancelForm();
    loadPeople();
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette personne et tous ses articles associés ?')) return;
    const { error: deleteError } = await supabase.from('people').delete().eq('id', id);
    if (deleteError) setError(deleteError.message);
    if (currentPersonId === id) setCurrentPersonId(null);
    if (editingId === id) cancelForm();
    loadPeople();
  }

  const formOpen = showAddForm || editingId !== null;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Membres du foyer</h2>
        <button className="btn btn-primary btn-sm" onClick={startAdd}>
          {showAddForm ? 'Annuler' : '+ Ajouter'}
        </button>
      </div>

      {error && <div className="error-banner" onClick={() => setError(null)}>{error}</div>}

      {formOpen && (
        <form className="form card" onSubmit={handleSubmit}>
          <label>
            Prénom
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Date de naissance
            <input
              type="date"
              value={form.birthdate}
              onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
            />
          </label>
          <label>
            Taille (cm)
            <input
              type="number"
              min={30}
              max={230}
              value={form.height}
              onChange={(e) => setForm({ ...form, height: e.target.value })}
              placeholder="170"
            />
          </label>
          <div className="form-row">
            <button className="btn btn-primary" type="submit">
              {editingId ? 'Enregistrer' : 'Ajouter'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={cancelForm}>
              Annuler
            </button>
          </div>
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
              <button className="icon-btn" onClick={() => startEdit(person)} aria-label="Modifier">
                ✏️
              </button>
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
