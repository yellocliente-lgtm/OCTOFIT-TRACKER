const activityLabels: Record<string, string> = {
  run: 'Corrida',
  running: 'Corrida',
  cycle: 'Ciclismo',
  cycling: 'Ciclismo',
  bike: 'Bicicleta',
  walk: 'Caminhada',
  walking: 'Caminhada',
  strength: 'Força',
  'strength training': 'Musculação',
  weights: 'Musculação',
  swim: 'Natação',
  swimming: 'Natação',
  yoga: 'Ioga',
  stretch: 'Alongamento',
  stretching: 'Alongamento',
};

const focusLabels: Record<string, string> = {
  endurance: 'resistência',
  strength: 'força',
  mobility: 'mobilidade',
  cardio: 'condicionamento cardiovascular',
  'weight-loss': 'emagrecimento',
  'general-fitness': 'condicionamento geral',
};

const difficultyLabels: Record<string, string> = {
  easy: 'Leve',
  moderate: 'Moderada',
  hard: 'Intensa',
  beginner: 'Iniciante',
  intermediate: 'Intermediária',
  advanced: 'Avançada',
};

const workoutTitles: Record<string, string> = {
  intervals: 'Treino intervalado',
  'strength circuit': 'Circuito de força',
};

const workoutReasons: Record<string, string> = {
  'build endurance': 'Desenvolver resistência',
};

export function activityLabel(value: string) {
  return activityLabels[value.trim().toLowerCase()] ?? value;
}

export function focusLabel(value?: string) {
  if (!value) return 'Treino geral';
  return focusLabels[value.trim().toLowerCase()] ?? value;
}

export function difficultyLabel(value?: string) {
  if (!value) return 'Todos os níveis';
  return difficultyLabels[value.trim().toLowerCase()] ?? value;
}

export function workoutTitle(value: string) {
  return workoutTitles[value.trim().toLowerCase()] ?? value;
}

export function workoutReason(value?: string) {
  if (!value) return 'Uma boa opção para o seu próximo treino.';
  const knownReason = workoutReasons[value.trim().toLowerCase()];
  if (knownReason) return knownReason;
  if (/^recommended to support a balanced routine\.?$/i.test(value.trim())) {
    return 'Recomendado para contribuir com uma rotina equilibrada.';
  }

  const match = value.trim().match(/^(Matches your|Offers variety for your) (.+?) goal(?: and reflects recent (.+?) activity)?\.?$/i);
  if (!match) return value;

  const relation = match[1].toLowerCase() === 'matches your'
    ? 'Combina com sua meta de'
    : 'Oferece variedade para sua meta de';
  const recentActivity = match[3] ? ` e considera sua atividade recente de ${activityLabel(match[3]).toLowerCase()}` : '';
  return `${relation} ${focusLabel(match[2])}${recentActivity}.`;
}

export function numberLabel(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value);
}