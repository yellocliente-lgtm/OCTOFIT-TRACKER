import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import Activities from './components/Activities.js';
import Teams from './components/Teams.js';
import Leaderboard from './components/Leaderboard.js';
import Workouts from './components/Workouts.js';

const navigation = [
  { to: '/activities', number: '01', label: 'Atividades' },
  { to: '/teams', number: '02', label: 'Equipes' },
  { to: '/leaderboard', number: '03', label: 'Classificação' },
  { to: '/workouts', number: '04', label: 'Sugestões de treino' },
];

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <NavLink className="brand" to="/activities" aria-label="Página inicial do OctoFit Tracker">
            <span className="brand-mark" aria-hidden="true">OF</span>
            <span className="brand-copy">
              <strong>OctoFit Tracker</strong>
              <small>Programa escolar de atividade física</small>
            </span>
          </NavLink>
          <nav aria-label="Seções do OctoFit" className="primary-nav">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}
              >
                <span className="nav-number" aria-hidden="true">{item.number}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="page-content">
        <Routes>
          <Route path="/" element={<Navigate to="/activities" replace />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/workouts" element={<Workouts />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <span>OctoFit Tracker</span>
        <span>Movimente-se em equipe. Evolua junto.</span>
      </footer>
    </div>
  );
}
