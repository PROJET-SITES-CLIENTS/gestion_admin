import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../store';
import { Lock, User, KeyRound, Clock, ArrowRight } from 'lucide-react';

export default function AuthView() {
  const { login } = useApp();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const sessionExpired = typeof window !== 'undefined' && window.location.search.includes('expired=1');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('Veuillez remplir tous les champs obligatoires.');
      setLoading(false);
      return;
    }

    const res = await login(username, password);
    if (!res.success) setError(res.error || 'Erreur inconnue');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* ============ PANNEAU DE MARQUE ============ */}
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden flex-col justify-between p-12 bg-gradient-to-br from-slate-950 via-[#1C1917] to-[#141210]">
        {/* Halo doré */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-indigo-400/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[380px] w-[380px] rounded-full bg-indigo-500/[0.05] blur-3xl translate-x-1/3 translate-y-1/3" />
        {/* Trame fine */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        <div className="relative flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#2A2521] to-[#1D1A17] border border-indigo-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(204,172,96,0.18)]">
            <span className="font-serif italic text-indigo-300 text-xl leading-none">E</span>
          </div>
          <div>
            <p className="text-[15px] font-bold text-stone-100 tracking-tight">Einsof</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Suite de gestion</p>
          </div>
        </div>

        <div className="relative">
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif italic text-[42px] xl:text-[52px] leading-[1.08] text-stone-100 max-w-md"
          >
            La pilotage de votre entreprise, <span className="gold-text">réinventé.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 text-[14px] leading-relaxed text-stone-400 max-w-sm"
          >
            Commercial, comptabilité, ressources humaines, BTP et agro-industrie —
            réunis dans une expérience unique, pensée pour la Guinée.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-10 flex flex-wrap gap-2.5"
          >
            {['Trésorerie', 'Paie & CNSS', 'CRM', 'Chantiers', 'Traçabilité'].map((tag, i) => (
              <motion.span
                key={tag}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.07 }}
                className="text-[11.5px] font-medium text-stone-300 bg-white/[0.05] border border-white/10 rounded-full px-3.5 py-1.5"
              >
                {tag}
              </motion.span>
            ))}
          </motion.div>
        </div>

        <p className="relative text-[11px] text-stone-600 tracking-wide">
          © {new Date().getFullYear()} Einsof Digit · Conakry, République de Guinée
        </p>
      </div>

      {/* ============ FORMULAIRE ============ */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[400px]"
        >
          {/* Marque mobile */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-slate-950 border border-indigo-400/30 flex items-center justify-center">
              <span className="font-serif italic text-indigo-300 text-lg leading-none">E</span>
            </div>
            <span className="font-serif italic text-2xl text-slate-800">Einsof</span>
          </div>

          <div className="card p-8">
            <div className="text-center mb-7">
              <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200/70 flex items-center justify-center">
                <Lock size={18} className="text-indigo-600" />
              </div>
              <h2 className="text-[19px] font-bold text-slate-900 tracking-tight">Espace de travail sécurisé</h2>
              <p className="text-[12.5px] text-slate-500 mt-1">Identifiez-vous pour accéder à votre espace.</p>
            </div>

            {sessionExpired && (
              <div className="mb-5 p-3 bg-amber-50 text-amber-700 border border-amber-200/70 rounded-lg text-[12.5px] font-medium flex items-center gap-2">
                <Clock size={14} className="shrink-0" />
                Votre session a expiré. Veuillez vous reconnecter.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="login-username">Identifiant personnel</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="login-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    className="input pl-10"
                    placeholder="ex. admin"
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="login-password">Mot de passe</label>
                <div className="relative">
                  <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-10"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-rose-50 text-rose-600 border border-rose-200/70 rounded-lg text-[12.5px] font-medium text-center"
                >
                  {error}
                </motion.p>
              )}

              <button type="submit" disabled={loading} className="btn btn-primary w-full !py-3 !text-sm mt-2 group">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Connexion en cours…
                  </span>
                ) : (
                  <>
                    Accéder à mon espace
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-6">
            Pour obtenir vos accès, veuillez contacter la direction.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
