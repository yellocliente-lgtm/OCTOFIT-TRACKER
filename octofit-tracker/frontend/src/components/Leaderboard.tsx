import { useEffect, useState } from 'react';
import { getErrorMessage, getJson } from '../api/client.js';

type LeaderboardEntry = {
  rank: number;
  teamName: string;
  totalPoints: number;
};

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadLeaderboard() {
      setLoading(true);
      setError('');
      try {
        const result = await getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard');
        if (active) setEntries(Array.isArray(result.leaderboard) ? result.leaderboard : []);
      } catch (requestError) {
        if (active) {
          const message = getErrorMessage(requestError);
          setError(`Não foi possível carregar a classificação: ${message}`);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadLeaderboard();
    return () => { active = false; };
  }, []);

  return (
    <div className="feature-page leaderboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Pontuação da temporada</p>
          <h1 id="leaderboard-heading" className="page-title">Classificação</h1>
          <p className="page-description">Cada atividade soma pontos para a equipe.</p>
        </div>
        <span className="ranking-note">Pontuação atualizada</span>
      </div>

      {loading && <p className="notice notice-loading" role="status">Carregando classificação...</p>}
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {!loading && !error && entries.length === 0 && <p className="empty-state">Ainda não há equipes na classificação.</p>}
      {!loading && !error && entries.length > 0 && (
        <>
          <section aria-labelledby="top-teams-heading">
            <div className="section-heading">
              <span className="section-index section-index-green" aria-hidden="true">01</span>
              <div>
                <h2 id="top-teams-heading" className="section-title">Melhores equipes</h2>
                <p className="section-description">As três equipes com mais pontos.</p>
              </div>
            </div>
            <ol className="podium-grid">
              {entries.slice(0, 3).map((entry) => (
                <li className={`podium-card podium-rank-${entry.rank}`} key={`${entry.rank}-${entry.teamName}`}>
                  <span className="podium-position">{String(entry.rank).padStart(2, '0')} <span>LUGAR</span></span>
                  <h3>{entry.teamName}</h3>
                  <p><strong>{new Intl.NumberFormat('pt-BR').format(entry.totalPoints)}</strong><span>pontos</span></p>
                </li>
              ))}
            </ol>
          </section>

          {entries.length > 3 && (
            <section className="surface-panel remaining-rankings" aria-labelledby="remaining-rankings-heading">
              <div className="section-heading">
                <span className="section-index" aria-hidden="true">04+</span>
                <div>
                  <h2 id="remaining-rankings-heading" className="section-title">Demais colocações</h2>
                  <p className="section-description">Todas as outras equipes nesta classificação.</p>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table data-table align-middle">
                  <thead><tr><th scope="col">Posição</th><th scope="col">Equipe</th><th scope="col">Pontos no total</th></tr></thead>
                  <tbody>
                    {entries.slice(3).map((entry) => (
                      <tr key={`${entry.rank}-${entry.teamName}`}><td>{entry.rank}</td><td>{entry.teamName}</td><td>{new Intl.NumberFormat('pt-BR').format(entry.totalPoints)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
