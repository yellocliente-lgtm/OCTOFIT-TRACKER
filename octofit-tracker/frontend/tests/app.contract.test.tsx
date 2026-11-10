import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.js';

function renderRoute(route: string) {
  return render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>);
}

const profileFixture = {
  _id: 'user-mona',
  name: 'Mona',
  email: 'mona@example.com',
  team: 'team-octocats',
  fitnessGoal: 'endurance',
  age: 32,
  weightKg: 68,
  heightCm: 170,
  weeklyGoalMinutes: 150,
};

const capabilities = [
  { route: '/activities', empty: { activities: [] }, emptyText: /nenhuma atividade/i },
  { route: '/teams', empty: { teams: [] }, emptyText: /nenhuma equipe/i },
  { route: '/leaderboard', empty: { leaderboard: [] }, emptyText: /não há equipes/i },
  { route: '/workouts', empty: { suggestions: [] }, emptyText: /nenhuma sugestão de treino/i },
];

describe('OctoFit presentation contract', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/profile/')) return new Response(JSON.stringify({ profile: profileFixture }), { status: 200 });
      if (url.includes('/api/activities')) return new Response(JSON.stringify({ activities: [{ type: 'run', minutes: 30, points: 30 }] }), { status: 200 });
      if (url.includes('/api/teams')) return new Response(JSON.stringify({ teams: [{ _id: 'team-octocats', name: 'Octocats', members: ['Mona'] }] }), { status: 200 });
      if (url.includes('/api/leaderboard')) return new Response(JSON.stringify({ leaderboard: [{ teamName: 'Octocats', totalPoints: 90, rank: 1 }] }), { status: 200 });
      if (/\/api\/workouts\/suggestions\/mona(%40|@)example\.com$/.test(url)) return new Response(JSON.stringify({ suggestions: [{ title: 'Intervals', reason: 'Build endurance' }] }), { status: 200 });
      return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 });
    }));
  });

  it('renders activity data from the API', async () => {
    renderRoute('/activities');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Olá, Mona' })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('cell', { name: 'Corrida' })).toBeInTheDocument());
  });

  it('loads the individual profile for editing', async () => {
    renderRoute('/profile');
    expect(screen.getByRole('heading', { name: 'Meu perfil' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Peso (kg)')).toHaveValue(68));
    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/profile\/mona(%40|@)example\.com$/));
  });

  it('switches activity evolution between daily, weekly, and monthly views', async () => {
    renderRoute('/activities');
    const weekly = screen.getByRole('button', { name: 'Semanal' });
    fireEvent.click(weekly);
    expect(weekly).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Diário' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Mensal' }));
    expect(screen.getByRole('button', { name: 'Mensal' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders teams, leaderboard, and workout suggestions with accessible content', async () => {
    const teams = renderRoute('/teams');
    await waitFor(() => expect(screen.getByText(/Octocats/)).toBeInTheDocument());
    teams.unmount();
    const leaderboard = renderRoute('/leaderboard');
    await waitFor(() => expect(screen.getByText(/90/)).toBeInTheDocument());
    leaderboard.unmount();
    renderRoute('/workouts');
    await waitFor(() => expect(screen.getByText(/treino intervalado/i)).toBeInTheDocument());
  });

  it('requests workout suggestions for a specific user', async () => {
    renderRoute('/workouts');
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/workouts\/suggestions\/mona(%40|@)example\.com$/)));
  });

  for (const capability of capabilities) {
    describe(capability.route, () => {
      it('announces a loading state while the API request is pending', () => {
        vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
        renderRoute(capability.route);
        expect(screen.getByRole('status')).toHaveTextContent(/carregando/i);
      });

      it('shows a meaningful empty state', async () => {
        vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
          const url = String(input);
          if (url.includes('/api/profile/')) return new Response(JSON.stringify({ profile: profileFixture }), { status: 200 });
          if (url.includes('/api/teams')) return new Response(JSON.stringify({ teams: [] }), { status: 200 });
          if (url.includes('/api/activities')) return new Response(JSON.stringify({ activities: [] }), { status: 200 });
          return new Response(JSON.stringify(capability.empty), { status: 200 });
        }));
        renderRoute(capability.route);
        await waitFor(() => expect(screen.getByText(capability.emptyText)).toBeInTheDocument());
      });

      it('announces API failures as an accessible alert', async () => {
        vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
          const url = String(input);
          if (url.includes('/api/profile/')) return new Response(JSON.stringify({ profile: profileFixture }), { status: 200 });
          if (url.includes('/api/teams') && capability.route === '/activities') return new Response(JSON.stringify({ teams: [{ _id: 'team-octocats', name: 'Octocats', members: ['Mona'] }] }), { status: 200 });
          if (url.includes('/api/activities') && capability.route === '/activities') return new Response(JSON.stringify({ message: 'Unavailable' }), { status: 503 });
          return new Response(JSON.stringify({ message: 'Unavailable' }), { status: 503 });
        }));
        renderRoute(capability.route);
        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível|indisponível|erro/i));
      });
    });
  }
});
