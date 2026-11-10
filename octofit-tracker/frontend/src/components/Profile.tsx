import { FormEvent, useEffect, useState } from 'react';
import { getErrorMessage, getJson, putJson } from '../api/client.js';
import { activeUserEmail, IndividualProfile } from '../individual.js';
import { focusLabel, numberLabel } from '../ptBr.js';

type ProfileForm = {
  name: string;
  age: string;
  weightKg: string;
  heightCm: string;
  fitnessGoal: string;
  weeklyGoalMinutes: string;
};

const emptyForm: ProfileForm = {
  name: '',
  age: '',
  weightKg: '',
  heightCm: '',
  fitnessGoal: 'endurance',
  weeklyGoalMinutes: '150',
};

function profileForm(profile: IndividualProfile): ProfileForm {
  return {
    name: profile.name,
    age: profile.age?.toString() ?? '',
    weightKg: profile.weightKg?.toString() ?? '',
    heightCm: profile.heightCm?.toString() ?? '',
    fitnessGoal: profile.fitnessGoal,
    weeklyGoalMinutes: (profile.weeklyGoalMinutes ?? 150).toString(),
  };
}

export default function Profile() {
  const [profile, setProfile] = useState<IndividualProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const result = await getJson<{ profile: IndividualProfile }>(`/api/profile/${encodeURIComponent(activeUserEmail)}`);
        if (active) {
          setProfile(result.profile);
          setForm(profileForm(result.profile));
        }
      } catch (requestError) {
        if (active) setError(`Não foi possível carregar o perfil: ${getErrorMessage(requestError)}`);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();
    return () => { active = false; };
  }, []);

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const age = Number(form.age);
    const weightKg = Number(form.weightKg);
    const heightCm = Number(form.heightCm);
    const weeklyGoalMinutes = Number(form.weeklyGoalMinutes);
    if (!form.name.trim() || age < 1 || age > 120 || weightKg < 20 || weightKg > 400 || heightCm < 100 || heightCm > 250 || weeklyGoalMinutes < 1 || weeklyGoalMinutes > 1680) {
      setError('Confira os campos: idade de 1 a 120 anos, peso de 20 a 400 kg, altura de 100 a 250 cm e meta semanal de 1 a 1.680 minutos.');
      return;
    }

    setSaving(true);
    try {
      const result = await putJson<{ profile: IndividualProfile }>(`/api/profile/${encodeURIComponent(activeUserEmail)}`, {
        name: form.name.trim(),
        age,
        weightKg,
        heightCm,
        fitnessGoal: form.fitnessGoal,
        weeklyGoalMinutes,
      });
      setProfile(result.profile);
      setForm(profileForm(result.profile));
      setSuccess('Perfil atualizado com sucesso.');
    } catch (requestError) {
      setError(`Não foi possível salvar o perfil: ${getErrorMessage(requestError)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="feature-page profile-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Acompanhamento individual</p>
          <h1 className="page-title">Meu perfil</h1>
          <p className="page-description">Seus dados ajudam a personalizar metas e estimativas.</p>
        </div>
        {profile && <span className="suggestion-count">{focusLabel(profile.fitnessGoal)}</span>}
      </div>

      {loading && <p className="notice notice-loading" role="status">Carregando perfil...</p>}
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {success && <p className="notice notice-success" role="status">{success}</p>}

      {!loading && profile && (
        <section className="surface-panel profile-panel" aria-labelledby="profile-form-heading">
          <div className="section-heading">
            <span className="section-index section-index-green" aria-hidden="true">PF</span>
            <div>
              <h2 id="profile-form-heading" className="section-title">Dados pessoais e objetivos</h2>
              <p className="section-description">Meta atual: {numberLabel(Number(form.weeklyGoalMinutes) || 150)} minutos por semana.</p>
            </div>
          </div>

          <form className="row g-3" onSubmit={handleSubmit}>
            <div className="col-md-6">
              <label className="form-label" htmlFor="profile-name">Nome</label>
              <input className="form-control" id="profile-name" value={form.name} onChange={(event) => updateField('name', event.target.value)} required maxLength={100} disabled={saving} />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="profile-age">Idade</label>
              <input className="form-control" id="profile-age" type="number" min="1" max="120" step="1" value={form.age} onChange={(event) => updateField('age', event.target.value)} required disabled={saving} />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="profile-weight">Peso (kg)</label>
              <input className="form-control" id="profile-weight" type="number" min="20" max="400" step="0.1" value={form.weightKg} onChange={(event) => updateField('weightKg', event.target.value)} required disabled={saving} />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="profile-height">Altura (cm)</label>
              <input className="form-control" id="profile-height" type="number" min="100" max="250" step="0.1" value={form.heightCm} onChange={(event) => updateField('heightCm', event.target.value)} required disabled={saving} />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="profile-goal">Objetivo físico</label>
              <select className="form-select" id="profile-goal" value={form.fitnessGoal} onChange={(event) => updateField('fitnessGoal', event.target.value)} disabled={saving}>
                <option value="endurance">Resistência</option>
                <option value="strength">Força</option>
                <option value="mobility">Mobilidade</option>
                <option value="weight-loss">Emagrecimento</option>
                <option value="general-fitness">Condicionamento geral</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="profile-weekly-goal">Meta semanal (minutos)</label>
              <input className="form-control" id="profile-weekly-goal" type="number" min="1" max="1680" step="1" value={form.weeklyGoalMinutes} onChange={(event) => updateField('weeklyGoalMinutes', event.target.value)} required disabled={saving} />
            </div>
            <div className="col-12">
              <button className="action-button" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar perfil'}</button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}