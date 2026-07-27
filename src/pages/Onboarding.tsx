import { useState } from 'react';
import type { FormEvent } from 'react';
import { useHousehold } from '../context/HouseholdContext';

type Mode = 'choose' | 'create' | 'join';

export default function Onboarding() {
  const { createHousehold, joinHousehold, error, clearError, configured } = useHousehold();
  const [mode, setMode] = useState<Mode>('choose');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);

  if (!configured) {
    return (
      <div className="onboarding">
        <h1>MesValises</h1>
        <p className="hint">
          L'application n'est pas encore connectée à Supabase. Configurez les variables
          <code> VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code> (voir le README)
          puis relancez l'application.
        </p>
      </div>
    );
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !displayName.trim()) return;
    setBusy(true);
    try {
      await createHousehold(name.trim(), displayName.trim());
    } catch {
      // error already stored in context
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || !displayName.trim()) return;
    setBusy(true);
    try {
      await joinHousehold(code.trim(), displayName.trim());
    } catch {
      // error already stored in context
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="onboarding">
      <h1>🧳 MesValises</h1>
      <p className="subtitle">Préparez vos valises en famille</p>

      {error && (
        <div className="error-banner" onClick={clearError}>
          {error}
        </div>
      )}

      {mode === 'choose' && (
        <div className="onboarding-choices">
          <button className="btn btn-primary" onClick={() => setMode('create')}>
            Créer un foyer
          </button>
          <button className="btn btn-secondary" onClick={() => setMode('join')}>
            Rejoindre un foyer existant
          </button>
        </div>
      )}

      {mode === 'create' && (
        <form className="form" onSubmit={handleCreate}>
          <label>
            Nom du foyer
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Famille Benhamou"
              required
            />
          </label>
          <label>
            Votre prénom
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Florent"
              required
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Création…' : 'Créer le foyer'}
          </button>
          <button className="btn btn-link" type="button" onClick={() => setMode('choose')}>
            Retour
          </button>
        </form>
      )}

      {mode === 'join' && (
        <form className="form" onSubmit={handleJoin}>
          <label>
            Code famille
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              required
            />
          </label>
          <label>
            Votre prénom
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Léa"
              required
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Connexion…' : 'Rejoindre'}
          </button>
          <button className="btn btn-link" type="button" onClick={() => setMode('choose')}>
            Retour
          </button>
        </form>
      )}
    </div>
  );
}
