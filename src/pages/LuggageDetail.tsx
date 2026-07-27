import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../context/HouseholdContext';
import type { Item, Luggage, LuggageKind, Person } from '../types';
import { CATEGORY_LABELS, formatWeight, itemTotalWeightG, LUGGAGE_KIND_LABELS } from '../lib/weightEstimate';
import type { LuggagePayload } from './TripDetail';

interface LuggageFormState {
  name: string;
  kind: LuggageKind;
  owner: string;
  maxWeight: string;
}

export default function LuggageDetail() {
  const { tripId, luggageId } = useParams<{ tripId: string; luggageId: string }>();
  const { household } = useHousehold();
  const navigate = useNavigate();

  const [luggage, setLuggage] = useState<Luggage | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<LuggageFormState>({ name: '', kind: 'valise', owner: '', maxWeight: '' });

  async function loadAll() {
    if (!household || !tripId || !luggageId) return;
    setLoading(true);
    const [luggageRes, peopleRes, itemsRes] = await Promise.all([
      supabase.from('luggages').select('*').eq('id', luggageId).single(),
      supabase.from('people').select('*').eq('household_id', household.id).order('created_at'),
      supabase.from('items').select('*').eq('trip_id', tripId).eq('luggage_id', luggageId).order('created_at'),
    ]);
    if (luggageRes.error) setError(luggageRes.error.message);
    else setLuggage(luggageRes.data as Luggage);
    if (peopleRes.error) setError(peopleRes.error.message);
    else setPeople((peopleRes.data as Person[]) ?? []);
    if (itemsRes.error) setError(itemsRes.error.message);
    else setItems((itemsRes.data as Item[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id, tripId, luggageId]);

  const personById = useMemo(() => {
    const map = new Map<string, Person>();
    people.forEach((p) => map.set(p.id, p));
    return map;
  }, [people]);

  const weightOf = (item: Item): number => {
    const person = personById.get(item.person_id);
    return itemTotalWeightG(item, person ?? { height_cm: null, birthdate: null });
  };

  const totalG = items.reduce((sum, i) => sum + weightOf(i), 0);
  const maxG = luggage?.max_weight_kg ? luggage.max_weight_kg * 1000 : null;
  const ratio = maxG ? Math.min(1, totalG / maxG) : 0;
  const over = maxG !== null && totalG > maxG;

  const itemsByPerson = useMemo(() => {
    const groups = new Map<string, Item[]>();
    items.forEach((item) => {
      const list = groups.get(item.person_id) ?? [];
      list.push(item);
      groups.set(item.person_id, list);
    });
    return people
      .map((person) => ({ person, personItems: groups.get(person.id) ?? [] }))
      .filter((g) => g.personItems.length > 0);
  }, [items, people]);

  function startEdit() {
    if (!luggage) return;
    setForm({
      name: luggage.name,
      kind: luggage.kind,
      owner: luggage.owner_person_id ?? '',
      maxWeight: luggage.max_weight_kg ? String(luggage.max_weight_kg) : '',
    });
    setEditing(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!luggageId || !form.name.trim()) return;
    const payload: LuggagePayload = {
      name: form.name.trim(),
      kind: form.kind,
      owner_person_id: form.owner || null,
      max_weight_kg: form.maxWeight ? Number(form.maxWeight) : null,
    };
    const { error: updateError } = await supabase
      .from('luggages')
      .update({
        name: payload.name,
        kind: payload.kind,
        owner_person_id: payload.owner_person_id,
        max_weight_kg: payload.max_weight_kg,
      })
      .eq('id', luggageId);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setEditing(false);
    loadAll();
  }

  async function handleDelete() {
    if (!luggageId) return;
    if (!confirm('Supprimer cette valise ? Les articles qui lui étaient assignés redeviendront non assignés.')) return;
    const { error: deleteError } = await supabase.from('luggages').delete().eq('id', luggageId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    navigate(`/trip/${tripId}`);
  }

  async function unassignItem(item: Item) {
    const { error: updateError } = await supabase.from('items').update({ luggage_id: null }).eq('id', item.id);
    if (updateError) setError(updateError.message);
    else setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  async function toggleItemPacked(item: Item) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, packed: !i.packed } : i)));
    const { error: updateError } = await supabase
      .from('items')
      .update({ packed: !item.packed })
      .eq('id', item.id);
    if (updateError) {
      setError(updateError.message);
      loadAll();
    }
  }

  if (loading) return <div className="page"><p className="hint">Chargement…</p></div>;
  if (!luggage) return <div className="page"><p className="hint">Valise introuvable.</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to={`/trip/${tripId}`} className="back-link">← {luggage.name ? 'Retour au voyage' : 'Retour'}</Link>
          <h2>{luggage.name}</h2>
          <p className="hint">
            {LUGGAGE_KIND_LABELS[luggage.kind]}
            {luggage.owner_person_id && personById.get(luggage.owner_person_id)
              ? ` · ${personById.get(luggage.owner_person_id)!.name}`
              : ' · Partagée'}
          </p>
        </div>
      </div>

      {error && <div className="error-banner" onClick={() => setError(null)}>{error}</div>}

      <div className="card">
        {maxG ? (
          <div className="progress-bar">
            <div className={over ? 'progress-fill over' : 'progress-fill'} style={{ width: `${ratio * 100}%` }} />
          </div>
        ) : null}
        <span className={over ? 'weight-label over' : 'weight-label'}>
          {formatWeight(totalG)}
          {maxG ? ` / ${luggage.max_weight_kg} kg` : ''}
          {over ? ' — trop lourde !' : ''}
        </span>
        <div className="form-row" style={{ marginTop: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={startEdit}>
            ✏️ Modifier
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleDelete}>
            ✕ Supprimer la valise
          </button>
        </div>
      </div>

      {editing && (
        <form className="form card" onSubmit={handleSubmit}>
          <label>
            Nom
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <div className="form-row">
            <label>
              Type
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as LuggageKind })}>
                {(Object.keys(LUGGAGE_KIND_LABELS) as LuggageKind[]).map((k) => (
                  <option key={k} value={k}>
                    {LUGGAGE_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Poids max (kg)
              <input
                type="number"
                min={0}
                step={0.5}
                value={form.maxWeight}
                onChange={(e) => setForm({ ...form, maxWeight: e.target.value })}
              />
            </label>
          </div>
          <label>
            Attribuée à
            <select value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}>
              <option value="">Partagée / non attribuée</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-row">
            <button className="btn btn-primary" type="submit">
              Enregistrer
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setEditing(false)}>
              Annuler
            </button>
          </div>
        </form>
      )}

      <h2 style={{ marginTop: 20 }}>Contenu</h2>
      {itemsByPerson.length === 0 ? (
        <p className="hint">Aucun article assigné à cette valise pour l'instant.</p>
      ) : (
        itemsByPerson.map(({ person, personItems }) => (
          <div key={person.id} style={{ marginBottom: 16 }}>
            <div className="summary-row" style={{ marginBottom: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="avatar avatar-sm" style={{ background: person.color }}>
                  {person.name.charAt(0).toUpperCase()}
                </span>
                <strong>{person.name}</strong>
              </span>
              <span className="hint">{formatWeight(personItems.reduce((s, i) => s + weightOf(i), 0))}</span>
            </div>
            <ul className="list">
              {personItems.map((item) => (
                <li key={item.id} className="list-item item-row">
                  <input type="checkbox" checked={item.packed} onChange={() => toggleItemPacked(item)} />
                  <div className="list-item-body">
                    <span className={item.packed ? 'item-name packed' : 'item-name'}>
                      {item.quantity > 1 ? `${item.quantity}× ` : ''}
                      {item.name}
                    </span>
                    <span className="hint">
                      {CATEGORY_LABELS[item.category]} · {formatWeight(weightOf(item))}
                    </span>
                  </div>
                  <button className="btn btn-link btn-sm" onClick={() => unassignItem(item)}>
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
