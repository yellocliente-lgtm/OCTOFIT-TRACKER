import { FormEvent, useEffect, useState } from 'react';
import { getJson, postJson } from '../api/client.js';

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
          const message = requestError instanceof Error ? requestError.message : 'Unknown error';
          setError(`Unable to load activities: ${message}`);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadActivities();
    return () => { active = false; };
  }, []);

  const selectedTeam = teams.find((team) => team._id === teamId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const parsedMinutes = Number(minutes);
    if (!selectedTeam || !selectedTeam.members.includes(userId) || !type.trim() || !Number.isFinite(parsedMinutes) || parsedMinutes <= 0) {
      setError('Choose a team member, enter an activity type, and provide positive minutes.');
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
      setSuccess('Activity recorded successfully.');
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unknown error';
      setError(`Unable to record activity: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="h4 mb-3">Activities</h2>

      {error && <p className="alert alert-danger" role="alert">{error}</p>}
      {success && <p className="alert alert-success" role="status">{success}</p>}
      {loading && <p role="status">Loading activities...</p>}

      <section className="mb-4" aria-labelledby="activity-form-heading">
        <h3 id="activity-form-heading" className="h5">Record an activity</h3>
        <form className="row g-3" onSubmit={handleSubmit}>
          <div className="col-md-6">
            <label className="form-label" htmlFor="activity-team">Team</label>
            <select
              className="form-select"
              id="activity-team"
              value={teamId}
              onChange={(event) => { setTeamId(event.target.value); setUserId(''); }}
              required
              disabled={loading || saving}
            >
              <option value="">Choose a team</option>
              {teams.map((team) => <option key={team._id ?? team.name} value={team._id ?? ''}>{team.name}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="activity-user">Team member</label>
            <select
              className="form-select"
              id="activity-user"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              required
              disabled={loading || saving || !selectedTeam?.members.length}
            >
              <option value="">Choose a member</option>
              {selectedTeam?.members.map((memberId) => <option key={memberId} value={memberId}>{memberId}</option>)}
            </select>
            {!loading && selectedTeam && selectedTeam.members.length === 0 && <small className="form-text">No members available for this team.</small>}
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="activity-type">Activity type</label>
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
            <label className="form-label" htmlFor="activity-minutes">Minutes</label>
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
            <button className="btn btn-primary" type="submit" disabled={loading || saving || !teams.length}>
              {saving ? 'Recording...' : 'Record activity'}
            </button>
          </div>
        </form>
      </section>

      <section aria-labelledby="activity-list-heading">
        <h3 id="activity-list-heading" className="h5">Activity log</h3>
        {!loading && !error && activities.length === 0 && <p>No activities recorded yet.</p>}
        {!loading && activities.length > 0 && (
          <div className="table-responsive">
            <table className="table table-striped align-middle">
              <thead>
                <tr><th scope="col">Activity</th><th scope="col">Member</th><th scope="col">Team</th><th scope="col">Minutes</th><th scope="col">Points</th><th scope="col">Recorded</th></tr>
              </thead>
              <tbody>
                {activities.map((activity, index) => (
                  <tr key={activity._id ?? `${activity.type}-${activity.occurredAt ?? index}`}>
                    <td>{activity.type}</td>
                    <td>{activity.user ?? '-'}</td>
                    <td>{activity.team ?? '-'}</td>
                    <td>{activity.minutes}</td>
                    <td>{activity.points}</td>
                    <td>{activity.occurredAt ? new Date(activity.occurredAt).toLocaleString() : '-'}</td>
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
