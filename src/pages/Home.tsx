import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../context/HouseholdContext';
import type { Trip } from '../types';

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return '';
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  return fmt(start ?? end ?? '');
}

export default function Home() {
  const { household } = useHousehold();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function loadTrips() {
    if (!household) return;
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('trips')
      .select('*')
      .eq('household_id', household.id)
      .order('start_date', { ascending: true, nullsFirst: false });
    if (fetchError) setError(fetchError.message);
    else setTrips((data as Trip[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!household || !name.trim()) return;
    setError(null);
    const { error: insertError } = await supabase.from('trips').insert({
      household_id: household.id,
      name: name.trim(),
      destination: destination.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setName('');
    setDestination('');
    setStartDate('');
    setEndDate('');
    setShowForm(false);
    loadTrips();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Voyages</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annuler' : '+ Nouveau'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <form className="form card" onSubmit={handleCreate}>
          <label>
            Nom du voyage
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vacances d'été" required />
          </label>
          <label>
            Destination
            <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Portugal" />
          </label>
          <div className="form-row">
            <label>
              Départ
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label>
              Retour
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          </div>
          <button className="btn btn-primary" type="submit">
            Créer le voyage
          </button>
        </form>
      )}

      {loading ? (
        <p className="hint">Chargement…</p>
      ) : trips.length === 0 ? (
        <p className="hint">Aucun voyage pour l'instant. Créez-en un pour commencer à préparer vos valises.</p>
      ) : (
        <ul className="list">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Link to={`/trip/${trip.id}`} className="list-item trip-item">
                <div className="list-item-body">
                  <strong>{trip.name}</strong>
                  <span className="hint">
                    {[trip.destination, formatDateRange(trip.start_date, trip.end_date)]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                <span className="chevron">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
