import { getAuthToken } from '../apiClient';

/**
 * Fichiers servis sous authentification (/uploads/** exige un Bearer JWT).
 * Les balises <img src> / <a href> ne peuvent PAS envoyer ce header :
 * tout affichage ou téléchargement passe donc par un fetch authentifié
 * suivi d'un object-URL local.
 */

/** Télécharge un blob protégé (retourne null si inaccessible). */
export const fetchSecureBlob = async (url: string): Promise<Blob | null> => {
  if (!url) return null;
  // Data-URLs et URLs externes : pas d'auth nécessaire.
  if (url.startsWith('data:')) {
    const res = await fetch(url);
    return res.ok ? res.blob() : null;
  }
  if (url.startsWith('http')) {
    const res = await fetch(url);
    return res.ok ? res.blob() : null;
  }
  // Chemin interne (/uploads/...) : header Authorization requis.
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  return res.ok ? res.blob() : null;
};

/** Ouvre le fichier protégé dans un nouvel onglet (ou le télécharge). */
export const openSecureFile = async (url: string): Promise<boolean> => {
  try {
    const blob = await fetchSecureBlob(url);
    if (!blob) return false;
    const objectUrl = URL.createObjectURL(blob);
    const win = window.open(objectUrl, '_blank');
    // Fallback navigateurs qui bloquent window.open : téléchargement direct.
    if (!win) {
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = url.split('/').pop() || 'fichier';
      a.click();
    }
    // Libération différée (le navigateur doit charger le blob d'abord).
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return true;
  } catch {
    return false;
  }
};

/** Convertit un fichier protégé en Data-URL (pour pdfmake, jszip…). */
export const secureUrlToDataUrl = async (url: string): Promise<string | null> => {
  try {
    const blob = await fetchSecureBlob(url);
    if (!blob) return null;
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};
