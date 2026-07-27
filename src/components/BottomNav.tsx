import { NavLink } from 'react-router-dom';

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
        <span className="nav-icon">🧳</span>
        Voyages
      </NavLink>
      <NavLink to="/people" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
        <span className="nav-icon">👪</span>
        Famille
      </NavLink>
    </nav>
  );
}
