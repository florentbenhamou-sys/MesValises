import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import BottomNav from './BottomNav';

export default function Layout() {
  const { household } = useHousehold();
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!household) return;
    try {
      await navigator.clipboard.writeText(household.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable, ignore
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">🧳 MesValises</span>
        {household && (
          <button className="code-badge" onClick={copyCode} title="Copier le code du foyer">
            {household.name} · {copied ? 'copié !' : household.code}
          </button>
        )}
      </header>
      <main className="app-content">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
