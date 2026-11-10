import { FormEvent, useEffect, useState } from 'react';
import { getErrorMessage, getJson, postJson } from '../api/client.js';

type Team = {
  _id?: string;
  name: string;
  mascot: string;
  members?: string[];
};

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState('');
  const [mascot, setMascot] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    async function loadTeams() {
      setLoading(true);
      setError('');
      try {
        const result = await getJson<{ teams: Team[] }>('/api/teams');
        if (active) setTeams(Array.isArray(result.teams) ? result.teams : []);
      } catch (requestError) {
        if (active) {
          const message = getErrorMessage(requestError);
          setError(`Não foi possível carregar as equipes: ${message}`);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadTeams();
    return () => { active = false; };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const teamName = name.trim();
    const teamMascot = mascot.trim();
    if (!teamName || !teamMascot) {
      setError('O nome da equipe e o mascote são obrigatórios.');
      return;
    }

    setSaving(true);
    try {
      const result = await postJson<{ team: Team }>('/api/teams', {
        name: teamName,
        mascot: teamMascot,
        members: [],
      });
      setTeams((current) => [result.team, ...current]);
      setName('');
      setMascot('');
      setSuccess(`Equipe ${teamName} criada com sucesso.`);
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      setError(`Não foi possível criar a equipe: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="feature-page teams-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Nossa comunidade</p>
          <h1 className="page-title">Equipes</h1>
          <p className="page-description">Grupos unidos por objetivos e hábitos mais saudáveis.</p>
        </div>
        <div className="page-count"><strong>{teams.length}</strong><span>Equipes</span></div>
      </div>

      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {success && <p className="notice notice-success" role="status">{success}</p>}
      {loading && <p className="notice notice-loading" role="status">Carregando equipes...</p>}

      <section className="surface-panel team-form-panel" aria-labelledby="team-form-heading">
        <div className="section-heading">
          <span className="section-index" aria-hidden="true">01</span>
          <div>
            <h2 id="team-form-heading" className="section-title">Criar equipe</h2>
            <p className="section-description">Escolha um nome e um mascote para o grupo.</p>
          </div>
        </div>
        <form className="row g-3" onSubmit={handleSubmit}>
          <div className="col-md-5">
            <label className="form-label" htmlFor="team-name">Nome da equipe</label>
            <input
              className="form-control"
              id="team-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={80}
              disabled={saving}
            />
          </div>
          <div className="col-md-5">
            <label className="form-label" htmlFor="team-mascot">Mascote</label>
            <input
              className="form-control"
              id="team-mascot"
              type="text"
              value={mascot}
              onChange={(event) => setMascot(event.target.value)}
              required
              maxLength={80}
              disabled={saving}
            />
          </div>
          <div className="col-md-2 d-flex align-items-end">
            <button className="action-button w-100" type="submit" disabled={loading || saving}>
              {saving ? 'Criando...' : 'Criar equipe'}
            </button>
          </div>
        </form>
      </section>

      <section className="team-list-section" aria-labelledby="team-list-heading">
        <div className="section-heading">
          <span className="section-index section-index-green" aria-hidden="true">02</span>
          <div>
            <h2 id="team-list-heading" className="section-title">Equipes cadastradas</h2>
            <p className="section-description">Conheça os grupos que estão evoluindo juntos.</p>
          </div>
        </div>
        {!loading && !error && teams.length === 0 && <p className="empty-state">Nenhuma equipe cadastrada até o momento.</p>}
        {!loading && teams.length > 0 && (
          <ul className="team-grid">
            {teams.map((team, index) => {
              const members = Array.isArray(team.members) ? team.members : [];
              return (
                <li className="team-card" key={team._id ?? `${team.name}-${index}`}>
                  <div className="team-card-heading">
                    <span className="team-mark" aria-hidden="true">{team.name.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <h3 className="team-name">{team.name}</h3>
                      <p className="team-mascot">Mascote <strong>{team.mascot}</strong></p>
                    </div>
                  </div>
                  <div className="team-members">
                    <div className="member-heading"><span>Integrantes</span><span className="member-count">{members.length}</span></div>
                    {members.length === 0
                      ? <p className="member-empty">Nenhum integrante vinculado.</p>
                      : <ul className="member-list">{members.map((member) => <li className="member-chip" key={member}>{member}</li>)}</ul>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
