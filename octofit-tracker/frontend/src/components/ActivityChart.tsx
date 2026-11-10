import { useState } from 'react';
import { IndividualActivity } from '../individual.js';
import { numberLabel } from '../ptBr.js';

type Period = 'day' | 'week' | 'month';
type Bucket = { key: string; label: string; minutes: number };

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function monday(date: Date) {
  const start = new Date(date);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  start.setHours(0, 0, 0, 0);
  return start;
}

function weekKey(date: Date) {
  return dayKey(monday(date));
}

function buildBuckets(activities: IndividualActivity[], period: Period, now = new Date()): Bucket[] {
  const dates: Date[] = [];
  const count = period === 'day' ? 7 : period === 'week' ? 8 : 6;

  if (period === 'day') {
    for (let offset = count - 1; offset >= 0; offset -= 1) {
      const date = new Date(now);
      date.setDate(date.getDate() - offset);
      date.setHours(0, 0, 0, 0);
      dates.push(date);
    }
  } else if (period === 'week') {
    const currentMonday = monday(now);
    for (let offset = count - 1; offset >= 0; offset -= 1) {
      const date = new Date(currentMonday);
      date.setDate(date.getDate() - offset * 7);
      dates.push(date);
    }
  } else {
    const firstMonth = new Date(now.getFullYear(), now.getMonth() - count + 1, 1);
    for (let offset = 0; offset < count; offset += 1) {
      dates.push(new Date(firstMonth.getFullYear(), firstMonth.getMonth() + offset, 1));
    }
  }

  const labelFormat = period === 'day'
    ? new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
    : period === 'week'
      ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
      : new Intl.DateTimeFormat('pt-BR', { month: 'short' });

  return dates.map((date) => {
    const key = period === 'day'
      ? dayKey(date)
      : period === 'week'
        ? dayKey(date)
        : `${date.getFullYear()}-${date.getMonth()}`;
    const minutes = activities.reduce((total, activity) => {
      if (!activity.occurredAt) return total;
      const activityDate = new Date(activity.occurredAt);
      const activityKey = period === 'day'
        ? dayKey(activityDate)
        : period === 'week'
          ? weekKey(activityDate)
          : `${activityDate.getFullYear()}-${activityDate.getMonth()}`;
      return activityKey === key ? total + activity.minutes : total;
    }, 0);
    return { key, label: labelFormat.format(date), minutes };
  });
}

const periods: { value: Period; label: string }[] = [
  { value: 'day', label: 'Diário' },
  { value: 'week', label: 'Semanal' },
  { value: 'month', label: 'Mensal' },
];

export default function ActivityChart({ activities }: { activities: IndividualActivity[] }) {
  const [period, setPeriod] = useState<Period>('day');
  const buckets = buildBuckets(activities, period);
  const maxMinutes = Math.max(1, ...buckets.map((bucket) => bucket.minutes));

  return (
    <section className="surface-panel chart-panel" aria-labelledby="activity-chart-heading">
      <div className="chart-heading">
        <div className="section-heading">
          <span className="section-index section-index-green" aria-hidden="true">↗</span>
          <div>
            <h2 id="activity-chart-heading" className="section-title">Evolução das atividades</h2>
            <p className="section-description">Minutos de exercício registrados por período.</p>
          </div>
        </div>
        <div className="chart-periods" role="group" aria-label="Período do gráfico">
          {periods.map((option) => (
            <button key={option.value} type="button" className={period === option.value ? 'is-selected' : ''} aria-pressed={period === option.value} onClick={() => setPeriod(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-bars" aria-label={`Gráfico ${period === 'day' ? 'diário' : period === 'week' ? 'semanal' : 'mensal'} de duração das atividades`}>
        {buckets.map((bucket) => {
          const height = bucket.minutes === 0 ? 2 : Math.max(8, (bucket.minutes / maxMinutes) * 100);
          return (
            <div className="chart-column" key={bucket.key} role="img" aria-label={`${bucket.label}: ${numberLabel(bucket.minutes)} minutos`}>
              <span className="chart-value">{bucket.minutes > 0 ? numberLabel(bucket.minutes) : ''}</span>
              <div className="chart-bar-track"><span className="chart-bar" style={{ height: `${height}%` }} /></div>
              <span className="chart-label">{bucket.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}