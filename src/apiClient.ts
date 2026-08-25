export const getAuthToken = () => {
  const user = localStorage.getItem('coord_user');
  if (user) {
    try {
      const parsed = JSON.parse(user);
      return parsed.token || null;
    } catch (e) {
      return null;
    }
  }
  return null;
};

/** Déconnecte proprement l'utilisateur (session expirée / invalide). */
const forceLogout = () => {
  localStorage.removeItem('coord_user');
  // Recharge pour revenir à l'écran de connexion.
  if (!window.location.href.includes('expired=1')) {
    window.location.href = window.location.pathname + '?expired=1';
  }
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const isGet = !options.method || options.method.toUpperCase() === 'GET';
  const url = isGet
    ? `/api${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${new Date().getTime()}`
    : `/api${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store'
  });

  // Session expirée : on ne déconnecte pas sur les endpoints d'authentification
  // (le login doit pouvoir renvoyer 401 sans rebooter la page).
  if (response.status === 401 && !endpoint.startsWith('/auth/')) {
    forceLogout();
  }

  return response;
};

/** Helper : lit le message d'erreur d'une réponse API. */
export const readApiError = async (res: Response, fallback = 'Erreur inconnue'): Promise<string> => {
  try {
    const data = await res.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
};
