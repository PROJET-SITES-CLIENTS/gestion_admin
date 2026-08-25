import React, { useState } from 'react';
import { useApp } from '../store';
import { Lock, User, KeyRound } from 'lucide-react';

export default function AuthView() {
  const { login } = useApp();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Champs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError("Veuillez remplir tous les champs obligatoires.");
      setLoading(false);
      return;
    }

    const res = await login(username, password);
    if (!res.success) setError(res.error || "Erreur inconnue");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-sm shadow-none w-full max-w-md overflow-hidden border border-slate-200">
        <div className="p-5 border-b border-slate-100 text-center">
          <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-sm flex items-center justify-center mx-auto mb-4">
            <Lock className="text-slate-800 h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">EINSOF GESTION</h1>
          <p className="text-slate-500 text-sm mt-1">Espace de travail sécurisé</p>
        </div>

        <div className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Identifiant personnel</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  className="w-full border-slate-200 border rounded-sm p-3 pl-10 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Saisissez votre identifiant"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Mot de passe</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-slate-200 border rounded-sm p-3 pl-10 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 text-rose-600 rounded-sm text-xs font-medium border border-rose-100 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-sm transition-colors disabled:opacity-50 mt-4"
            >
              {loading ? 'Connexion en cours...' : 'Accéder à mon espace'}
            </button>
          </form>
          
          <p className="text-center text-[10px] text-slate-400 mt-6">
            Pour obtenir vos accès, veuillez contacter la direction.
          </p>
        </div>
      </div>
    </div>
  );
}

