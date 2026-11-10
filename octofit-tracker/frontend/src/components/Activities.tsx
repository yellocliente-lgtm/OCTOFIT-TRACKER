import { FormEvent, useEffect, useState } from 'react';
import { getErrorMessage, getJson, postJson } from '../api/client.js';
import ActivityChart from './ActivityChart.js';
import { activeUserEmail, IndividualActivity, IndividualProfile } from '../individual.js';
import { activityLabel, focusLabel, numberLabel } from '../ptBr.js';

type Team = {
  _id?: string;
  name: string;
  members: string[];
};

function weekStart(date: Date) {
  const start = new Date(date);
  const weekday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - weekday);
  start.setHours(0, 0, 0, 0);
  return start;
}

export default function Activities() {
  const [profile, setProfile] = useState<IndividualProfile | null>(null);
  const [activities, setActivities] = useState<IndividualActivity[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState('');
  const [type, setType] = useState('run');
  const [otherType, setOtherType] = useState('');
  const [minutes, setMinutes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    async function loadIndividualData() {
      setLoading(true);
      setError('');
      try {
        const [profileData, teamData] = await Promise.all([
          getJson<{ profile: IndividualProfile }>(`/api/profile/${encodeURIComponent(activeUserEmail)}`),
          getJson<{ teams: Team[] }>('/api/teams'),
        ]);
        const currentProfile = profileData.profile;
        const userActivities = await getJson<{ activities: IndividualActivity[] }>(`/api/activities/user/${currentProfile._id}`);
        if (active) {
          setProfile(currentProfile);
          setTeamId(currentProfile.team ?? '');
          setTeams(Array.isArray(teamData.teams) ? teamData.teams : []);
          setActivities(Array.isArray(userActivities.activities) ? userActivities.activities : []);
        }
      } catch (requestError) {
        if (active) setError(`Não foi possível carregar seu painel: ${getErrorMessage(requestError)}`);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadIndividualData();
    return () => { active = false; };
  }, []);

  const selectedTeam = teams.find((team) => team._id === teamId);
  const totalPoints = activities.reduce((total, activity) => total + activity.points, 0);
  const totalMinutes = activities.reduce((total, activity) => total + activity.minutes, 0);
  const totalCalories = activities.reduce((total, activity) => total + (activity.calories ?? 0), 0);
  const currentWeekStart = weekStart(new Date());
  const weeklyMinutes = activities
    .filter((activity) => activity.occurredAt && new Date(activity.occurredAt) >= currentWeekStart)
    .reduce((total, activity) => total + activity.minutes, 0);
  const weeklyGoal = profile?.weeklyGoalMinutes ?? 150;
  const goalProgress = Math.min(100, Math.round((weeklyMinutes / weeklyGoal) * 100));
  const motivation = goalProgress >= 100
    ? 'Meta semanal alcançada. Excelente consistência!'
    : weeklyMinutes === 0
      ? 'Toda evolução começa com o primeiro movimento. Que tal uma caminhada hoje?'
      : goalProgress >= 60
        ? 'Você está perto da meta. Mais uma sessão pode completar a semana.'
        : 'Cada sessão conta. Continue no seu ritmo, um treino de cada vez.';

  async function shareFriendlyChallenge() {
    const invitation = `Topa um desafio amistoso? Vamos fazer ${numberLabel(weeklyGoal)} minutos de atividade física nesta semana. Já somei ${numberLabel(weeklyMinutes)} minutos!`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Desafio amistoso OctoFit', text: invitation });
        setSuccess('Convite compartilhado. Boa sorte no desafio!');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(invitation);
        setSuccess('Convite copiado. Envie para um amigo!');
      } else {
        setSuccess(invitation);
      }
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === 'AbortError') return;
      setError('Não foi possível compartilhar agora. Tente novamente.');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const parsedMinutes = Number(minutes);
    const exerciseType = type === 'other' ? otherType.trim() : type;
    if (!profile || !selectedTeam || !exerciseType || !Number.isFinite(parsedMinutes) || parsedMinutes <= 0) {
      setError('Selecione uma equipe, informe o exercício e uma duração positiva em minutos.');
      return;
    }

    setSaving(true);
    try {
      const result = await postJson<{ activity: IndividualActivity }>('/api/activities', {
        userId: profile._id,
        teamId,
        type: exerciseType,
        minutes: parsedMinutes,
      });
      setActivities((current) => [result.activity, ...current]);
      setType('run');
      setOtherType('');
      setMinutes('');
      setSuccess('Atividade registrada com sucesso.');
    } catch (requestError) {
      setError(`Não foi possível registrar a atividade: ${getErrorMessage(requestError)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="feature-page activities-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Acompanhamento individual</p>
          <h1 className="page-title">Olá, {profile?.name ?? 'atleta'}</h1>
          <p className="page-description">Seus treinos, metas e evolução em um só lugar.</p>
        </div>
        <div className="activity-summary" aria-label="Resumo das atividades">
          <div><strong>{numberLabel(activities.length)}</strong><span>Treinos</span></div>
          <div><strong>{numberLabel(totalMinutes)}</strong><span>Minutos</span></div>
          <div><strong>{numberLabel(totalPoints)}</strong><span>Pontos</span></div>
        </div>
      </div>

      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {success && <p className="notice notice-success" role="status">{success}</p>}
      {loading && <p className="notice notice-loading" role="status">Carregando seu painel...</p>}

      {!loading && profile && (
        <section className="surface-panel goal-panel" aria-labelledby="weekly-goal-heading">
          <div className="goal-heading">
            <div>
              <p className="eyebrow">Meta individual</p>
              <h2 id="weekly-goal-heading" className="section-title">Meta semanal de exercícios</h2>
              <p className="section-description">{numberLabel(weeklyMinutes)} de {numberLabel(weeklyGoal)} minutos nesta semana</p>
            </div>
            <strong className="goal-percent">{goalProgress}%</strong>
          </div>
          <div className="goal-track" role="progressbar" aria-label="Progresso da meta semanal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={goalProgress}>
            <span style={{ width: `${goalProgress}%` }} />
          </div>
          <div className="goal-footer"><span>Objetivo: {focusLabel(profile.fitnessGoal)}</span><span>{numberLabel(Math.max(0, weeklyGoal - weeklyMinutes))} min restantes</span></div>
        </section>
      )}

      <section className="summary-grid" aria-label="Resumo de desempenho">
        <article className="summary-card summary-card-blue"><span>Tempo total</span><strong>{numberLabel(totalMinutes)} <small>min</small></strong><p>em atividades registradas</p></article>
        <article className="summary-card summary-card-green"><span>Calorias estimadas</span><strong>{numberLabel(totalCalories)} <small>kcal</small></strong><p>{profile?.weightKg ? 'estimativa baseada no seu peso' : 'informe seu peso no perfil para estimar'}</p></article>
        <article className="summary-card summary-card-white"><span>Meta desta semana</span><strong>{numberLabel(weeklyMinutes)} <small>/ {numberLabel(weeklyGoal)} min</small></strong><p>{goalProgress >= 100 ? 'Meta semanal alcançada' : 'continue no seu ritmo'}</p></article>
      </section>

      {!loading && profile && <p className="motivation-note" role="status">{motivation}</p>}

      <ActivityChart activities={activities} />

      {!loading && profile && (
        <section className="challenge-panel" aria-labelledby="friendly-challenge-heading">
          <div>
            <p className="challenge-kicker">Convite amistoso</p>
            <h2 id="friendly-challenge-heading">Movimente-se com alguém</h2>
            <p>Convide um amigo para alcançar {numberLabel(weeklyGoal)} minutos nesta semana. Seu progresso atual: {numberLabel(weeklyMinutes)} minutos.</p>
          </div>
          <button className="challenge-button" type="button" onClick={shareFriendlyChallenge}>Convidar amigo</button>
        </section>
      )}

      <section className="surface-panel activity-form-panel" aria-labelledby="activity-form-heading">
        <div className="section-heading">
          <span className="section-index" aria-hidden="true">+</span>
          <div>
            <h2 id="activity-form-heading" className="section-title">Registrar exercício</h2>
            <p className="section-description">A duração e seu peso são usados na estimativa de calorias.</p>
          </div>
        </div>
        <form className="row g-3" onSubmit={handleSubmit}>
          <div className="col-md-4">
            <label className="form-label" htmlFor="activity-type">Exercício</label>
            <select className="form-select" id="activity-type" value={type} onChange={(event) => setType(event.target.value)} required disabled={loading || saving}>
              <option value="walk">Caminhada</option>
              <option value="run">Corrida</option>
              <option value="bike">Bicicleta</option>
              <option value="strength">Musculação</option>
              <option value="other">Outro exercício</option>
            </select>
          </div>
          {type === 'other' && (
            <div className="col-md-4">
              <label className="form-label" htmlFor="activity-other">Qual exercício?</label>
              <input className="form-control" id="activity-other" value={otherType} onChange={(event) => setOtherType(event.target.value)} required maxLength={80} disabled={saving} />
            </div>
          )}
          <div className="col-md-4">
            <label className="form-label" htmlFor="activity-minutes">Duração (minutos)</label>
            <input className="form-control" id="activity-minutes" type="number" min="1" step="1" value={minutes} onChange={(event) => setMinutes(event.target.value)} required disabled={saving} />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="activity-team">Equipe</label>
            <select className="form-select" id="activity-team" value={teamId} onChange={(event) => setTeamId(event.target.value)} required disabled={loading || saving}>
              <option value="">Selecione uma equipe</option>
              {teams.map((team) => <option key={team._id ?? team.name} value={team._id ?? ''}>{team.name}</option>)}
            </select>
          </div>
          <div className="col-12">
            <button className="action-button" type="submit" disabled={loading || saving || !profile || !teams.length}>{saving ? 'Registrando...' : 'Registrar exercício'}</button>
          </div>
        </form>
      </section>

      <section className="surface-panel activity-list-panel" aria-labelledby="activity-list-heading">
        <div className="section-heading">
          <span className="section-index section-index-green" aria-hidden="true">{numberLabel(activities.length)}</span>
          <div>
            <h2 id="activity-list-heading" className="section-title">Histórico de atividades</h2>
            <p className="section-description">Data, exercício, duração e gasto energético estimado.</p>
          </div>
        </div>
        {!loading && activities.length === 0 && <p className="empty-state">Nenhuma atividade registrada até o momento.</p>}
        {!loading && activities.length > 0 && (
          <div className="table-responsive">
            <table className="table data-table align-middle">
              <thead><tr><th scope="col">Data</th><th scope="col">Exercício</th><th scope="col">Duração</th><th scope="col">Calorias</th><th scope="col">Equipe</th><th scope="col">Pontos</th></tr></thead>
              <tbody>
                {activities.map((activity, index) => (
                  <tr key={activity._id ?? `${activity.type}-${activity.occurredAt ?? index}`}>
                    <td>{activity.occurredAt ? new Date(activity.occurredAt).toLocaleDateString('pt-BR') : '-'}</td>
                    <td>{activityLabel(activity.type)}</td>
                    <td>{numberLabel(activity.minutes)} min</td>
                    <td>{activity.calories != null ? `${numberLabel(activity.calories)} kcal` : '-'}</td>
                    <td>{teams.find((team) => team._id === activity.team)?.name ?? '-'}</td>
                    <td>{numberLabel(activity.points)}</td>
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