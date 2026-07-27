import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../context/HouseholdContext';
import type { Item, ItemCategory, Luggage, LuggageKind, Person, Trip } from '../types';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  formatWeight,
  ITEM_CATALOG,
  itemTotalWeightG,
} from '../lib/weightEstimate';

type Tab = 'personnes' | 'valises';

const LUGGAGE_KIND_LABELS: Record<LuggageKind, string> = {
  valise: 'Valise',
  cabine: 'Bagage cabine',
  sac: 'Sac',
  autre: 'Autre',
};

export default function TripDetail() {
  const { tripId } = useParams<{ tripId: string }>();
  const { household } = useHousehold();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [luggages, setLuggages] = useState<Luggage[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('personnes');
  const [activePersonId, setActivePersonId] = useState<string | null>(null);

  async function loadAll() {
    if (!household || !tripId) return;
    setLoading(true);
    const [tripRes, peopleRes, luggagesRes, itemsRes] = await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).single(),
      supabase.from('people').select('*').eq('household_id', household.id).order('created_at'),
      supabase.from('luggages').select('*').eq('trip_id', tripId).order('created_at'),
      supabase.from('items').select('*').eq('trip_id', tripId).order('created_at'),
    ]);
    if (tripRes.error) setError(tripRes.error.message);
    else setTrip(tripRes.data as Trip);
    if (peopleRes.error) setError(peopleRes.error.message);
    else {
      const loadedPeople = (peopleRes.data as Person[]) ?? [];
      setPeople(loadedPeople);
      setActivePersonId((prev) => prev ?? loadedPeople[0]?.id ?? null);
    }
    if (luggagesRes.error) setError(luggagesRes.error.message);
    else setLuggages((luggagesRes.data as Luggage[]) ?? []);
    if (itemsRes.error) setError(itemsRes.error.message);
    else setItems((itemsRes.data as Item[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id, tripId]);

  const personById = useMemo(() => {
    const map = new Map<string, Person>();
    people.forEach((p) => map.set(p.id, p));
    return map;
  }, [people]);

  const weightOf = (item: Item): number => {
    const person = personById.get(item.person_id);
    return itemTotalWeightG(item, person ?? { height_cm: null, birthdate: null });
  };

  const totalForPerson = (personId: string) =>
    items.filter((i) => i.person_id === personId).reduce((sum, i) => sum + weightOf(i), 0);

  const totalForLuggage = (luggageId: string) =>
    items.filter((i) => i.luggage_id === luggageId).reduce((sum, i) => sum + weightOf(i), 0);

  async function addItem(personId: string, payload: { name: string; category: ItemCategory; quantity: number; unit_weight_g: number | null }) {
    if (!tripId) return;
    const { error: insertError } = await supabase.from('items').insert({
      trip_id: tripId,
      person_id: personId,
      name: payload.name,
      category: payload.category,
      quantity: payload.quantity,
      unit_weight_g: payload.unit_weight_g,
    });
    if (insertError) setError(insertError.message);
    else loadAll();
  }

  async function togglePacked(item: Item) {
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

  async function assignLuggage(item: Item, luggageId: string | null) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, luggage_id: luggageId } : i)));
    const { error: updateError } = await supabase
      .from('items')
      .update({ luggage_id: luggageId })
      .eq('id', item.id);
    if (updateError) {
      setError(updateError.message);
      loadAll();
    }
  }

  async function deleteItem(id: string) {
    const { error: deleteError } = await supabase.from('items').delete().eq('id', id);
    if (deleteError) setError(deleteError.message);
    else setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function addLuggage(payload: { name: string; kind: LuggageKind; owner_person_id: string | null; max_weight_kg: number | null }) {
    if (!tripId) return;
    const { error: insertError } = await supabase.from('luggages').insert({
      trip_id: tripId,
      name: payload.name,
      kind: payload.kind,
      owner_person_id: payload.owner_person_id,
      max_weight_kg: payload.max_weight_kg,
    });
    if (insertError) setError(insertError.message);
    else loadAll();
  }

  async function deleteLuggage(id: string) {
    if (!confirm('Supprimer cette valise ? Les articles qui lui étaient assignés redeviendront non assignés.')) return;
    const { error: deleteError } = await supabase.from('luggages').delete().eq('id', id);
    if (deleteError) setError(deleteError.message);
    else loadAll();
  }

  if (loading) return <div className="page"><p className="hint">Chargement…</p></div>;
  if (!trip) return <div className="page"><p className="hint">Voyage introuvable.</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/" className="back-link">← Voyages</Link>
          <h2>{trip.name}</h2>
          {trip.destination && <p className="hint">{trip.destination}</p>}
        </div>
      </div>

      {error && <div className="error-banner" onClick={() => setError(null)}>{error}</div>}

      <div className="tabs">
        <button className={tab === 'personnes' ? 'tab active' : 'tab'} onClick={() => setTab('personnes')}>
          Par personne
        </button>
        <button className={tab === 'valises' ? 'tab active' : 'tab'} onClick={() => setTab('valises')}>
          Valises
        </button>
      </div>

      {tab === 'personnes' && (
        <PersonneTab
          people={people}
          items={items}
          luggages={luggages}
          activePersonId={activePersonId}
          setActivePersonId={setActivePersonId}
          totalForPerson={totalForPerson}
          weightOf={weightOf}
          onAddItem={addItem}
          onTogglePacked={togglePacked}
          onAssignLuggage={assignLuggage}
          onDeleteItem={deleteItem}
        />
      )}

      {tab === 'valises' && (
        <ValisesTab
          luggages={luggages}
          people={people}
          items={items}
          totalForLuggage={totalForLuggage}
          onAddLuggage={addLuggage}
          onDeleteLuggage={deleteLuggage}
        />
      )}
    </div>
  );
}

interface PersonneTabProps {
  people: Person[];
  items: Item[];
  luggages: Luggage[];
  activePersonId: string | null;
  setActivePersonId: (id: string) => void;
  totalForPerson: (id: string) => number;
  weightOf: (item: Item) => number;
  onAddItem: (personId: string, payload: { name: string; category: ItemCategory; quantity: number; unit_weight_g: number | null }) => void;
  onTogglePacked: (item: Item) => void;
  onAssignLuggage: (item: Item, luggageId: string | null) => void;
  onDeleteItem: (id: string) => void;
}

function PersonneTab({
  people,
  items,
  luggages,
  activePersonId,
  setActivePersonId,
  totalForPerson,
  weightOf,
  onAddItem,
  onTogglePacked,
  onAssignLuggage,
  onDeleteItem,
}: PersonneTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('vetement');
  const [quantity, setQuantity] = useState(1);
  const [customWeight, setCustomWeight] = useState('');

  if (people.length === 0) {
    return (
      <p className="hint">
        Ajoutez d'abord des membres du foyer dans l'onglet <Link to="/people">Famille</Link>.
      </p>
    );
  }

  const activePerson = people.find((p) => p.id === activePersonId) ?? people[0];
  const personItems = items.filter((i) => i.person_id === activePerson.id);

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!itemName.trim()) return;
    onAddItem(activePerson.id, {
      name: itemName.trim(),
      category,
      quantity: Math.max(1, quantity),
      unit_weight_g: customWeight ? Number(customWeight) : null,
    });
    setItemName('');
    setQuantity(1);
    setCustomWeight('');
    setShowForm(false);
  }

  return (
    <div>
      <div className="person-chips">
        {people.map((p) => (
          <button
            key={p.id}
            className={p.id === activePerson.id ? 'chip active' : 'chip'}
            style={{ borderColor: p.color }}
            onClick={() => setActivePersonId(p.id)}
          >
            <span className="avatar avatar-sm" style={{ background: p.color }}>
              {p.name.charAt(0).toUpperCase()}
            </span>
            {p.name}
          </button>
        ))}
      </div>

      <div className="summary-row">
        <span>
          {personItems.filter((i) => i.packed).length}/{personItems.length} préparés
        </span>
        <strong>{formatWeight(totalForPerson(activePerson.id))} estimés</strong>
      </div>

      <button className="btn btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>
        {showForm ? 'Annuler' : '+ Ajouter un article'}
      </button>

      {showForm && (
        <form className="form card" onSubmit={handleAdd}>
          <label>
            Article
            <input
              list="item-catalog"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="T-shirt"
              required
            />
            <datalist id="item-catalog">
              {ITEM_CATALOG.map((entry) => (
                <option key={entry.name} value={entry.name} />
              ))}
            </datalist>
          </label>
          <div className="form-row">
            <label>
              Catégorie
              <select value={category} onChange={(e) => setCategory(e.target.value as ItemCategory)}>
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quantité
              <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            </label>
          </div>
          <label>
            Poids unitaire (g) — laisser vide pour une estimation automatique
            <input
              type="number"
              min={0}
              value={customWeight}
              onChange={(e) => setCustomWeight(e.target.value)}
              placeholder="estimation auto"
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Ajouter
          </button>
        </form>
      )}

      {personItems.length === 0 ? (
        <p className="hint">Aucun article pour {activePerson.name} pour l'instant.</p>
      ) : (
        <ul className="list">
          {personItems.map((item) => (
            <li key={item.id} className="list-item item-row">
              <input type="checkbox" checked={item.packed} onChange={() => onTogglePacked(item)} />
              <div className="list-item-body">
                <span className={item.packed ? 'item-name packed' : 'item-name'}>
                  {item.quantity > 1 ? `${item.quantity}× ` : ''}
                  {item.name}
                </span>
                <span className="hint">
                  {CATEGORY_LABELS[item.category]} · {formatWeight(weightOf(item))}
                </span>
              </div>
              <select
                value={item.luggage_id ?? ''}
                onChange={(e) => onAssignLuggage(item, e.target.value || null)}
                className="luggage-select"
              >
                <option value="">Non assignée</option>
                {luggages.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <button className="icon-btn" onClick={() => onDeleteItem(item.id)} aria-label="Supprimer">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface ValisesTabProps {
  luggages: Luggage[];
  people: Person[];
  items: Item[];
  totalForLuggage: (id: string) => number;
  onAddLuggage: (payload: { name: string; kind: LuggageKind; owner_person_id: string | null; max_weight_kg: number | null }) => void;
  onDeleteLuggage: (id: string) => void;
}

function ValisesTab({ luggages, people, items, totalForLuggage, onAddLuggage, onDeleteLuggage }: ValisesTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<LuggageKind>('valise');
  const [owner, setOwner] = useState('');
  const [maxWeight, setMaxWeight] = useState('23');

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAddLuggage({
      name: name.trim(),
      kind,
      owner_person_id: owner || null,
      max_weight_kg: maxWeight ? Number(maxWeight) : null,
    });
    setName('');
    setOwner('');
    setMaxWeight('23');
    setShowForm(false);
  }

  const unassignedWeight = items
    .filter((i) => !i.luggage_id)
    .length;

  return (
    <div>
      <button className="btn btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>
        {showForm ? 'Annuler' : '+ Ajouter une valise'}
      </button>

      {showForm && (
        <form className="form card" onSubmit={handleAdd}>
          <label>
            Nom
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Grande valise rouge" required />
          </label>
          <div className="form-row">
            <label>
              Type
              <select value={kind} onChange={(e) => setKind(e.target.value as LuggageKind)}>
                {(Object.keys(LUGGAGE_KIND_LABELS) as LuggageKind[]).map((k) => (
                  <option key={k} value={k}>
                    {LUGGAGE_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Poids max (kg)
              <input type="number" min={0} step={0.5} value={maxWeight} onChange={(e) => setMaxWeight(e.target.value)} />
            </label>
          </div>
          <label>
            Attribuée à
            <select value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="">Partagée / non attribuée</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" type="submit">
            Ajouter
          </button>
        </form>
      )}

      {luggages.length === 0 ? (
        <p className="hint">Aucune valise pour l'instant.</p>
      ) : (
        <ul className="list">
          {luggages.map((luggage) => {
            const owner = people.find((p) => p.id === luggage.owner_person_id);
            const totalG = totalForLuggage(luggage.id);
            const maxG = luggage.max_weight_kg ? luggage.max_weight_kg * 1000 : null;
            const ratio = maxG ? Math.min(1, totalG / maxG) : 0;
            const over = maxG !== null && totalG > maxG;
            const itemCount = items.filter((i) => i.luggage_id === luggage.id).length;
            return (
              <li key={luggage.id} className="list-item luggage-card">
                <div className="list-item-body">
                  <strong>{luggage.name}</strong>
                  <span className="hint">
                    {LUGGAGE_KIND_LABELS[luggage.kind]}
                    {owner ? ` · ${owner.name}` : ''} · {itemCount} article{itemCount > 1 ? 's' : ''}
                  </span>
                  {maxG ? (
                    <div className="progress-bar">
                      <div
                        className={over ? 'progress-fill over' : 'progress-fill'}
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </div>
                  ) : null}
                  <span className={over ? 'weight-label over' : 'weight-label'}>
                    {formatWeight(totalG)}
                    {maxG ? ` / ${luggage.max_weight_kg} kg` : ''}
                    {over ? ' — trop lourde !' : ''}
                  </span>
                </div>
                <button className="icon-btn" onClick={() => onDeleteLuggage(luggage.id)} aria-label="Supprimer">
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {unassignedWeight > 0 && (
        <p className="hint">
          {unassignedWeight} article{unassignedWeight > 1 ? 's' : ''} pas encore assigné{unassignedWeight > 1 ? 's' : ''}
          à une valise (voir l'onglet « Par personne »).
        </p>
      )}
    </div>
  );
}
