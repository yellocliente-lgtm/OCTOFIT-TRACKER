// Relative /api paths go through the Vite dev proxy, so port 8000 never needs to be public.
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

const translatedApiErrors: Record<string, string> = {
  'Activity details are required': 'Informe os dados da atividade.',
  'A valid userId is required': 'Selecione um integrante válido.',
  'A valid teamId is required': 'Selecione uma equipe válida.',
  'A non-empty activity type is required': 'Informe o tipo de atividade.',
  'Minutes must be a positive finite number': 'Informe uma duração positiva em minutos.',
  'User or team not found': 'Usuário ou equipe não encontrado.',
  'Team details are required': 'Informe os dados da equipe.',
  'A non-empty team name is required': 'Informe o nome da equipe.',
  'A non-empty team mascot is required': 'Informe o mascote da equipe.',
  'Team members must be an array of user IDs': 'A lista de integrantes da equipe é inválida.',
  'Every team member must have a valid user ID': 'Cada integrante precisa ter um identificador válido.',
  'One or more team members were not found': 'Um ou mais integrantes não foram encontrados.',
  'A valid user email is required': 'O e-mail informado é inválido.',
  'User not found': 'Usuário não encontrado.',
};

async function requestError(response: Response) {
  const details = await response.json().catch(() => null) as { error?: unknown; message?: unknown } | null;
  const serverMessage = typeof details?.error === 'string'
    ? details.error
    : typeof details?.message === 'string'
      ? details.message
      : '';
  const knownMessage = translatedApiErrors[serverMessage];
  if (knownMessage) return new Error(knownMessage);

  if (response.status === 400) return new Error('Os dados enviados são inválidos.');
  if (response.status === 404) return new Error('O registro solicitado não foi encontrado.');
  if (response.status >= 500) return new Error('Ocorreu um erro interno no servidor.');
  return new Error(`Não foi possível concluir a solicitação (HTTP ${response.status}).`);
}

export function getErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'Ocorreu um erro inesperado.';
  if (/failed to fetch|networkerror|load failed/i.test(error.message)) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
  }
  if (/request failed with/i.test(error.message)) {
    return 'Não foi possível concluir a solicitação.';
  }
  return error.message;
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);
  if (!response.ok) throw await requestError(response);
  return response.json() as Promise<T>;
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await requestError(response);
  return response.json() as Promise<T>;
}
