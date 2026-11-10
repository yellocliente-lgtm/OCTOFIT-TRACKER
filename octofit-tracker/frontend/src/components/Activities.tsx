import { FormEvent, useEffect, useState } from 'react';
import { getErrorMessage, getJson, postJson } from '../api/client.js';
import { activityLabel, numberLabel } from '../ptBr.js';

type Activity = {
  _id?: string;
  user?: string;
  team?: string;
  type: string;
  minutes: number;
  points: number;
  occurredAt?: string;
};

type Team = {
  _id?: string;
  name: string;
  members: string[];
};

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState('');
  const [userId, setUserId] = useState('');
  const [type, setType] = useState('');
  const [minutes, setMinutes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    async function loadActivities() {
      setLoading(true);
      setError('');
      try {
        const [activityData, teamData] = await Promise.all([
          getJson<{ activities: Activity[] }>('/api/activities'),
          getJson<{ teams: Team[] }>('/api/teams'),
        ]);
        if (active) {
          setActivities(Array.isArray(activityData.activities) ? activityData.activities : []);
          setTeams(Array.isArray(teamData.teams) ? teamData.teams : []);
        }
      } catch (requestError) {
        if (active) {
          const message = getErrorMessage(requestError);
          setError(`Não foi possível carregar as atividades: ${message}`);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadActivities();
    return () => { active = false; };
  }, []);

  const selectedTeam = teams.find((team) => team._id === teamId);
  const totalPoints = activities.reduce((total, activity) => total + activity.points, 0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const parsedMinutes = Number(minutes);
    if (!selectedTeam || !selectedTeam.members.includes(userId) || !type.trim() || !Number.isFinite(parsedMinutes) || parsedMinutes <= 0) {
      setError('Selecione um integrante da equipe, informe o tipo de atividade e uma duração positiva em minutos.');
      return;
    }

    setSaving(true);
    try {
      const result = await postJson<{ activity: Activity }>('/api/activities', {
        userId,
        teamId,
        type: type.trim(),
        minutes: parsedMinutes,
      });
      setActivities((current) => [result.activity, ...current]);
      setType('');
      setMinutes('');
      setUserId('');
      setSuccess('Atividade registrada com sucesso.');
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      setError(`Não foi possível registrar a atividade: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="feature-page activities-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Registro de movimento</p>
          <h1 className="page-title">Atividades</h1>
          <p className="page-description">Cada treino contribui para a pontuação da equipe.</p>
        </div>
        <div className="activity-summary" aria-label="Resumo das atividades">
          <div><strong>{numberLabel(activities.length)}</strong><span>Atividades</span></div>
          <div><strong>{numberLabel(totalPoints)}</strong><span>Pontos no total</span></div>
        </div>
      </div>

      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {success && <p className="notice notice-success" role="status">{success}</p>}
      {loading && <p className="notice notice-loading" role="status">Carregando atividades...</p>}

      <section className="surface-panel activity-form-panel" aria-labelledby="activity-form-heading">
        <div className="section-heading">
          <span className="section-index" aria-hidden="true">01</span>
          <div>
            <h2 id="activity-form-heading" className="section-title">Registrar atividade</h2>
            <p className="section-description">Adicione um treino concluído à pontuação da equipe.</p>
          </div>
        </div>
        <form className="row g-3" onSubmit={handleSubmit}>
          <div className="col-md-6">
            <label className="form-label" htmlFor="activity-team">Equipe</label>
            <select
              className="form-select"
              id="activity-team"
              value={teamId}
              onChange={(event) => { setTeamId(event.target.value); setUserId(''); }}
              required
              disabled={loading || saving}
            >
              <option value="">Selecione uma equipe</option>
              {teams.map((team) => <option key={team._id ?? team.name} value={team._id ?? ''}>{team.name}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="activity-user">Integrante da equipe</label>
            <select
              className="form-select"
              id="activity-user"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              required
              disabled={loading || saving || !selectedTeam?.members.length}
            >
              <option value="">Selecione um integrante</option>
              {selectedTeam?.members.map((memberId) => <option key={memberId} value={memberId}>{memberId}</option>)}
            </select>
            {!loading && selectedTeam && selectedTeam.members.length === 0 && <small className="form-text">Esta equipe ainda não tem integrantes.</small>}
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="activity-type">Tipo de atividade</label>
            <input
              className="form-control"
              id="activity-type"
              type="text"
              value={type}
              onChange={(event) => setType(event.target.value)}
              required
              maxLength={80}
              disabled={saving}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="activity-minutes">Duração em minutos</label>
            <input
              className="form-control"
              id="activity-minutes"
              type="number"
              min="0.1"
              step="any"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              required
              disabled={saving}
            />
          </div>
          <div className="col-12">
            <button className="action-button" type="submit" disabled={loading || saving || !teams.length}>
              {saving ? 'Registrando...' : 'Registrar atividade'}
            </button>
          </div>
        </form>
      </section>

      <section className="surface-panel activity-list-panel" aria-labelledby="activity-list-heading">
        <div className="section-heading">
          <span className="section-index section-index-green" aria-hidden="true">02</span>
          <div>
            <h2 id="activity-list-heading" className="section-title">Histórico de atividades</h2>
            <p className="section-description">Treinos recentes e pontos conquistados.</p>
          </div>
        </div>
        {!loading && !error && activities.length === 0 && <p className="empty-state">Nenhuma atividade registrada até o momento.</p>}
        {!loading && activities.length > 0 && (
          <div className="table-responsive">
            <table className="table data-table align-middle">
              <thead>
                <tr><th scope="col">Atividade</th><th scope="col">Integrante</th><th scope="col">Equipe</th><th scope="col">Minutos</th><th scope="col">Pontos</th><th scope="col">Registrada em</th></tr>
              </thead>
              <tbody>
                {activities.map((activity, index) => (
                  <tr key={activity._id ?? `${activity.type}-${activity.occurredAt ?? index}`}>
                    <td>{activityLabel(activity.type)}</td>
                    <td>{activity.user ?? '-'}</td>
                    <td>{activity.team ?? '-'}</td>
                    <td>{numberLabel(activity.minutes)}</td>
                    <td>{numberLabel(activity.points)}</td>
                    <td>{activity.occurredAt ? new Date(activity.occurredAt).toLocaleString('pt-BR') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
