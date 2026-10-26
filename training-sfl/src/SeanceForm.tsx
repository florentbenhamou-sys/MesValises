import { useState, type FormEvent } from 'react';
import { today, type Seance, type SeanceInput } from './seances';

interface Props {
  seance: Seance | null; // null = nouvelle séance
  onSave: (input: SeanceInput) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export default function SeanceForm({ seance, onSave, onDelete, onClose }: Props) {
  const [titre, setTitre] = useState(seance?.titre ?? '');
  const [date, setDate] = useState(seance?.date ?? today());
  const [duree, setDuree] = useState(seance?.duree != null ? String(seance.duree) : '');
  const [notes, setNotes] = useState(seance?.notes ?? '');

  function submit(e: FormEvent) {
    e.preventDefault();
    const minutes = Number.parseInt(duree, 10);
    onSave({
      titre: titre.trim(),
      date,
      duree: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
      notes: notes.trim(),
    });
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <button type="button" className="link" onClick={onClose}>
            Annuler
          </button>
          <h2>{seance ? 'Modifier la séance' : 'Nouvelle séance'}</h2>
          <button type="submit" className="link strong" disabled={!titre.trim() || !date}>
            Enregistrer
          </button>
        </div>

        <label className="field">
          <span>Titre</span>
          <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. : Pivot – appuis" autoFocus={!seance} required />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label className="field">
            <span>Durée (min)</span>
            <input type="number" inputMode="numeric" min={1} value={duree} onChange={(e) => setDuree(e.target.value)} placeholder="60" />
          </label>
        </div>
        <label className="field">
          <span>Notes</span>
          <textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Exercices, ressentis…" />
        </label>

        {onDelete && (
          <button type="button" className="danger-btn" onClick={onDelete}>
            Supprimer la séance
          </button>
        )}
      </form>
    </div>
  );
}
