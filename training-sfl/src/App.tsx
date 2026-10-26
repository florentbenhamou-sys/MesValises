import { useEffect, useState } from 'react';
import SeanceForm from './SeanceForm';
import { formatDate, loadSeances, newId, saveSeances, sortByDateDesc, type Seance, type SeanceInput } from './seances';

type Editing = { mode: 'new' } | { mode: 'edit'; seance: Seance } | null;

export default function App() {
  const [seances, setSeances] = useState<Seance[]>(loadSeances);
  const [editing, setEditing] = useState<Editing>(null);

  useEffect(() => saveSeances(seances), [seances]);

  function handleSave(input: SeanceInput) {
    if (editing?.mode === 'edit') {
      const id = editing.seance.id;
      setSeances((list) => list.map((s) => (s.id === id ? { ...input, id } : s)));
    } else {
      setSeances((list) => [...list, { ...input, id: newId() }]);
    }
    setEditing(null);
  }

  function handleDelete(seance: Seance) {
    if (!window.confirm(`Supprimer la séance « ${seance.titre} » ?`)) return;
    setSeances((list) => list.filter((s) => s.id !== seance.id));
    setEditing(null);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Training SFL</h1>
        <button className="add-btn" onClick={() => setEditing({ mode: 'new' })} aria-label="Nouvelle séance">
          +
        </button>
      </header>

      <main className="app-main">
        {seances.length === 0 ? (
          <p className="empty">Aucune séance. Touchez « + » pour en ajouter une.</p>
        ) : (
          <ul className="seance-list">
            {sortByDateDesc(seances).map((s) => (
              <li key={s.id} className="seance-card">
                <button className="seance-body" onClick={() => setEditing({ mode: 'edit', seance: s })}>
                  <span className="seance-date">{formatDate(s.date)}</span>
                  <span className="seance-titre">{s.titre}</span>
                  {s.duree != null && <span className="seance-meta">{s.duree} min</span>}
                  {s.notes && <span className="seance-notes">{s.notes}</span>}
                </button>
                <div className="seance-actions">
                  <button onClick={() => setEditing({ mode: 'edit', seance: s })}>Modifier</button>
                  <button className="danger" onClick={() => handleDelete(s)}>
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {editing && (
        <SeanceForm
          key={editing.mode === 'edit' ? editing.seance.id : 'new'}
          seance={editing.mode === 'edit' ? editing.seance : null}
          onSave={handleSave}
          onDelete={editing.mode === 'edit' ? () => handleDelete(editing.seance) : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
