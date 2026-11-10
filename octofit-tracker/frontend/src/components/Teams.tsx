import { FormEvent, useEffect, useState } from 'react';
import { getJson, postJson } from '../api/client.js';

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
          const message = requestError instanceof Error ? requestError.message : 'Unknown error';
          setError(`Unable to load teams: ${message}`);
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
      setError('Team name and mascot are required.');
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
      setSuccess(`${teamName} was created successfully.`);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unknown error';
      setError(`Unable to create team: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="h4 mb-3">Teams</h2>

      {error && <p className="alert alert-danger" role="alert">{error}</p>}
      {success && <p className="alert alert-success" role="status">{success}</p>}
      {loading && <p role="status">Loading teams...</p>}

      <section className="mb-4" aria-labelledby="team-form-heading">
        <h3 id="team-form-heading" className="h5">Create a team</h3>
        <form className="row g-3" onSubmit={handleSubmit}>
          <div className="col-md-5">
            <label className="form-label" htmlFor="team-name">Team name</label>
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
            <label className="form-label" htmlFor="team-mascot">Mascot</label>
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
            <button className="btn btn-primary w-100" type="submit" disabled={loading || saving}>
              {saving ? 'Creating...' : 'Create team'}
            </button>
          </div>
        </form>
      </section>

      <section aria-labelledby="team-list-heading">
        <h3 id="team-list-heading" className="h5">Registered teams</h3>
        {!loading && !error && teams.length === 0 && <p>No teams registered yet.</p>}
        {!loading && teams.length > 0 && (
          <ul className="list-group">
            {teams.map((team, index) => {
              const members = Array.isArray(team.members) ? team.members : [];
              return (
                <li className="list-group-item" key={team._id ?? `${team.name}-${index}`}>
                  <h4 className="h6 mb-1">{team.name}</h4>
                  <p className="mb-2">Mascot: {team.mascot}</p>
                  <div>
                    <span className="fw-semibold">Members</span>
                    {members.length === 0
                      ? <p className="mb-0">No members assigned.</p>
                      : <ul className="mb-0">{members.map((member) => <li key={member}>{member}</li>)}</ul>}
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
