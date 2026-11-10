import { useEffect, useState } from 'react';
import { getErrorMessage, getJson } from '../api/client.js';
import { activeUserEmail } from '../individual.js';
import { difficultyLabel, focusLabel, workoutReason, workoutTitle } from '../ptBr.js';

type WorkoutSuggestion = {
  _id?: string;
  title: string;
  focus?: string;
  minutes?: number;
  difficulty?: string;
  reason?: string;
};

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
          `/api/workouts/suggestions/${encodeURIComponent(activeUserEmail)}`,
        );
        if (active) setSuggestions(Array.isArray(result.suggestions) ? result.suggestions : []);
      } catch (requestError) {
        if (active) {
          const message = getErrorMessage(requestError);
          setError(`Não foi possível carregar as sugestões de treino: ${message}`);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSuggestions();
    return () => { active = false; };
  }, []);

  return (
    <div className="feature-page workouts-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Seu próximo treino</p>
          <h1 id="workouts-heading" className="page-title">Sugestões de treino</h1>
          <p className="page-description">Atividades recomendadas para sua meta e seu histórico recente.</p>
        </div>
        <span className="suggestion-count">{suggestions.length} sugestões</span>
      </div>

      {loading && <p className="notice notice-loading" role="status">Carregando sugestões de treino...</p>}
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {!loading && !error && suggestions.length === 0 && <p className="empty-state">Nenhuma sugestão de treino disponível.</p>}
      {!loading && !error && suggestions.length > 0 && (
        <div className="workout-grid">
          {suggestions.map((suggestion, index) => (
            <article className="workout-card" key={suggestion._id ?? `${suggestion.title}-${index}`}>
              <div className="workout-card-top">
                <span className="focus-label">{focusLabel(suggestion.focus)}</span>
                <span className="workout-sequence">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <h2 className="workout-title">{workoutTitle(suggestion.title)}</h2>
              <p className="workout-reason">{workoutReason(suggestion.reason)}</p>
              <div className="workout-meta">
                <span>{suggestion.minutes != null ? `${suggestion.minutes} min` : 'Duração não informada'}</span>
                <span>{difficultyLabel(suggestion.difficulty)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
