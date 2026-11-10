import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type WorkoutSuggestion = {
  _id?: string;
  title: string;
  focus?: string;
  minutes?: number;
  difficulty?: string;
  reason?: string;
};

const demoUserEmail = 'mona@example.com';

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadSuggestions() {
      setLoading(true);
      setError('');
      try {
        const result = await getJson<{ suggestions: WorkoutSuggestion[] }>(
          `/api/workouts/suggestions/${encodeURIComponent(demoUserEmail)}`,
        );
        if (active) setSuggestions(Array.isArray(result.suggestions) ? result.suggestions : []);
      } catch (requestError) {
        if (active) {
          const message = requestError instanceof Error ? requestError.message : 'Unknown error';
          setError(`Unable to load workout suggestions: ${message}`);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSuggestions();
    return () => { active = false; };
  }, []);

  return (
    <section aria-labelledby="workouts-heading">
      <h2 id="workouts-heading" className="h4 mb-3">Workout suggestions</h2>
      {loading && <p role="status">Loading workout suggestions...</p>}
      {error && <p className="alert alert-danger" role="alert">{error}</p>}
      {!loading && !error && suggestions.length === 0 && <p>No workout suggestions available.</p>}
      {!loading && !error && suggestions.length > 0 && (
        <div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                <th scope="col">Workout</th>
                <th scope="col">Focus</th>
                <th scope="col">Duration</th>
                <th scope="col">Difficulty</th>
                <th scope="col">Reason</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((suggestion, index) => (
                <tr key={suggestion._id ?? `${suggestion.title}-${index}`}>
                  <th scope="row">{suggestion.title}</th>
                  <td>{suggestion.focus ?? '-'}</td>
                  <td>{suggestion.minutes != null ? `${suggestion.minutes} min` : '-'}</td>
                  <td>{suggestion.difficulty ?? '-'}</td>
                  <td>{suggestion.reason ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
