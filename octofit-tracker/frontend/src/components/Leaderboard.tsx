import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

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
          const message = requestError instanceof Error ? requestError.message : 'Unknown error';
          setError(`Unable to load leaderboard: ${message}`);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadLeaderboard();
    return () => { active = false; };
  }, []);

  return (
    <section aria-labelledby="leaderboard-heading">
      <h2 id="leaderboard-heading" className="h4 mb-3">Leaderboard</h2>
      {loading && <p role="status">Loading leaderboard...</p>}
      {error && <p className="alert alert-danger" role="alert">{error}</p>}
      {!loading && !error && entries.length === 0 && <p>No rankings available yet.</p>}
      {!loading && !error && entries.length > 0 && (
        <div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                <th scope="col">Position</th>
                <th scope="col">Team</th>
                <th scope="col">Total points</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={`${entry.rank}-${entry.teamName}`}>
                  <td>{entry.rank}</td>
                  <td>{entry.teamName}</td>
                  <td>{entry.totalPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
