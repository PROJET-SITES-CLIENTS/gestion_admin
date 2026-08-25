import React from 'react';

/* ============================================================
   EINSOF UI — Kit premium
   Petit ensemble de composants cohérents avec le design
   system « Obsidienne & Champagne » (index.css).
   ============================================================ */

/* ---------- En-tête de page ---------- */
export const PageHeader: React.FC<{
  title: string;
  accent?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ title, accent, subtitle, actions }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 pb-1">
    <div>
      <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
        {accent && <span className="font-serif italic font-normal text-indigo-600 mr-1.5">{accent}</span>}
        {title}
      </h1>
      {subtitle && <p className="text-[13px] text-slate-500 mt-1 max-w-2xl leading-relaxed">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

/* ---------- Carte ---------- */
export const Card: React.FC<{
  className?: string;
  hover?: boolean;
  children: React.ReactNode;
}> = ({ className = '', hover = false, children }) => (
  <div className={`card ${hover ? 'card-hover' : ''} ${className}`}>{children}</div>
);

/* ---------- Titre de section ---------- */
export const SectionTitle: React.FC<{ icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }> = ({ icon, children, action }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-[0.08em] flex items-center gap-2">
      {icon && <span className="text-indigo-500">{icon}</span>}
      {children}
    </h3>
    {action}
  </div>
);

/* ---------- KPI / Statistique ---------- */
const statAccents: Record<string, { icon: string; ring: string }> = {
  gold: { icon: 'text-indigo-600 bg-indigo-50 border-indigo-100', ring: 'from-indigo-400/70' },
  emerald: { icon: 'text-emerald-600 bg-emerald-50 border-emerald-100', ring: 'from-emerald-400/70' },
  rose: { icon: 'text-rose-600 bg-rose-50 border-rose-100', ring: 'from-rose-400/70' },
  blue: { icon: 'text-blue-600 bg-blue-50 border-blue-100', ring: 'from-blue-400/70' },
  amber: { icon: 'text-amber-600 bg-amber-50 border-amber-100', ring: 'from-amber-400/70' },
};

export const Stat: React.FC<{
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  accent?: keyof typeof statAccents;
  invert?: boolean;
}> = ({ label, value, hint, icon, accent = 'gold', invert = false }) => {
  const a = statAccents[accent] ?? statAccents.gold;
  return (
    <div className="card card-hover relative overflow-hidden p-5">
      <div className={`pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${a.ring} to-transparent opacity-[0.07] blur-xl`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p>
          <p className={`mt-2 text-[22px] leading-tight font-bold font-mono tracking-tight ${invert ? 'text-white' : 'text-slate-900'}`}>{value}</p>
          {hint && <p className="mt-1.5 text-[11px] text-slate-400 leading-snug">{hint}</p>}
        </div>
        {icon && (
          <div className={`shrink-0 h-10 w-10 rounded-lg border flex items-center justify-center ${invert ? 'bg-white/15 border-white/25 text-white' : a.icon}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- Badge de statut ---------- */
const TONES: Record<string, string> = {
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  gold: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
};

/** Mappe un statut applicatif vers une tonalité visuelle cohérente. */
export const statusTone = (status?: string): keyof typeof TONES => {
  const s = (status ?? '').toLowerCase();
  if (/(pay[ée]|paid|gagn|approved|valid|conforme|termine|cl[ôo]tur|done|livr|factur|disponible|en_stock|accept|actif|active|reception_d|d[ée]finitive)/.test(s)) return 'emerald';
  if (/(annul|rejet|perdu|refus|non_conforme|suspendu|hors_service|rejected|impay|critique|bloqu|d[ée]truit|expir)/.test(s)) return 'rose';
  if (/(attente|pending|partiel|partial|planifi|brouillon|nouveau|enregistr|chaud|in_progress|investigation|retir|suspend)/.test(s)) return 'amber';
  if (/(cours|progress|dev|production|conditionn|pr[ée]par|contact|negociation|chiffrage|validation|d[ée]pos|affect|maintenance|qualit)/.test(s)) return 'blue';
  return 'neutral';
};

export const Badge: React.FC<{ tone?: keyof typeof TONES; children: React.ReactNode; dot?: boolean }> = ({ tone = 'neutral', children, dot = true }) => (
  <span className={`badge ${TONES[tone] ?? TONES.neutral}`}>
    {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
    {children}
  </span>
);

/* ---------- État vide ---------- */
export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; hint?: string }> = ({ icon, title, hint }) => (
  <div className="flex flex-col items-center justify-center py-14 text-center">
    {icon && (
      <div className="mb-4 h-12 w-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300">
        {icon}
      </div>
    )}
    <p className="text-sm font-semibold text-slate-500">{title}</p>
    {hint && <p className="mt-1 text-xs text-slate-400 max-w-xs leading-relaxed">{hint}</p>}
  </div>
);

/* ---------- Modale ---------- */
export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  wide?: boolean;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, wide = false, children }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-[3px] animate-[scale-in_.2s_ease-out]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} bg-white rounded-2xl shadow-pop animate-[fade-up_.3s_cubic-bezier(.22,1,.36,1)] overflow-hidden`}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors p-1 -m-1" aria-label="Fermer">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

/* ---------- Avatar (initiales, teinte déterministe) ---------- */
const AVATAR_TONES = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
];
export const Avatar: React.FC<{ name: string; size?: number }> = ({ name, size = 32 }) => {
  const initials = (name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold ${AVATAR_TONES[hash % AVATAR_TONES.length]}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
};

/* ---------- Montant GNF ---------- */
export const Money: React.FC<{ value: number; suffix?: string; className?: string }> = ({ value, suffix = 'GNF', className = '' }) => (
  <span className={`font-mono tracking-tight ${className}`}>
    {value.toLocaleString('fr-FR')}
    {suffix && <span className="ml-1 text-[0.7em] font-sans text-slate-400">{suffix}</span>}
  </span>
);

/* ---------- Barre de progression ---------- */
export const Progress: React.FC<{ value: number; tone?: string }> = ({ value, tone = 'bg-indigo-500' }) => (
  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
    <div
      className={`h-full rounded-full ${tone} transition-[width] duration-700 ease-out`}
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

/* ---------- Squelette ---------- */
export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <div className={`shimmer ${className}`} />
);
