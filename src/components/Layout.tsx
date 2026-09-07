import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp, Toast } from '../store';
import {
  LayoutDashboard, Users, FileText, CheckSquare, Briefcase, ChevronLeft, ChevronRight,
  LogOut, Menu, X, MessageCircle, Inbox, Bell, Crown, Truck, ShieldAlert, HardHat,
  Factory, Network, Search, CheckCircle2, AlertTriangle, Info, XCircle, CornerDownLeft,
} from 'lucide-react';
import { Role } from '../types';
import { Avatar } from './ui';

/* ============================================================
   TOASTS — retours visuels animés
   ============================================================ */
const ToastsContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();
  const ICONS: Record<Toast['type'], React.ReactNode> = {
    SUCCESS: <CheckCircle2 size={16} className="text-emerald-500" />,
    WARNING: <AlertTriangle size={16} className="text-amber-500" />,
    ERROR: <XCircle size={16} className="text-rose-500" />,
    INFO: <Info size={16} className="text-blue-500" />,
  };
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-[min(92vw,380px)] print:hidden">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="glass rounded-xl border border-slate-200/80 shadow-lift p-3.5 flex items-start gap-3"
          >
            <div className="mt-0.5 shrink-0">{ICONS[t.type]}</div>
            <p className="flex-1 text-[13px] leading-snug text-slate-700">{t.message}</p>
            <button onClick={() => dismissToast(t.id)} className="text-slate-300 hover:text-slate-600 transition-colors shrink-0 p-0.5">
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

/* ============================================================
   PALETTE DE COMMANDES (Ctrl/⌘ + K)
   ============================================================ */
interface PaletteItem {
  id: string;
  label: string;
  group: string;
  icon: React.ReactNode;
  run: () => void;
}

const CommandPalette: React.FC<{
  open: boolean;
  onClose: () => void;
  items: PaletteItem[];
}> = ({ open, onClose, items }) => {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => (i.label + ' ' + i.group).toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => { setIndex(0); }, [query]);
  useEffect(() => { if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);

  if (!open) return null;

  const exec = (i: PaletteItem) => { i.run(); onClose(); };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[14vh] px-4 bg-slate-950/40 backdrop-blur-[3px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 480, damping: 34 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-pop overflow-hidden border border-slate-200/70"
      >
        <div className="flex items-center gap-3 px-4 border-b border-slate-100">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, filtered.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
              if (e.key === 'Enter' && filtered[index]) { e.preventDefault(); exec(filtered[index]); }
              if (e.key === 'Escape') onClose();
            }}
            placeholder="Aller à… (module, action)"
            className="w-full py-3.5 text-sm bg-transparent outline-none placeholder:text-slate-400"
          />
          <kbd className="kbd">esc</kbd>
        </div>
        <div className="max-h-[46vh] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-slate-400">Aucun résultat pour « {query} »</p>
          )}
          {filtered.map((item, i) => (
            <button
              key={item.id}
              onMouseEnter={() => setIndex(i)}
              onClick={() => exec(item)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === index ? 'bg-indigo-50' : ''}`}
            >
              <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${i === index ? 'bg-white text-indigo-600 border border-indigo-200 shadow-soft' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                {item.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-slate-800 truncate">{item.label}</span>
                <span className="block text-[10.5px] text-slate-400 uppercase tracking-wider">{item.group}</span>
              </span>
              {i === index && <CornerDownLeft size={13} className="text-indigo-400 shrink-0" />}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

/* ============================================================
   LAYOUT — coquille applicative
   ============================================================ */
export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    currentRole, currentUser, logout, activeMenu, setActiveMenu,
    internalMessages, notifications, markNotificationAsRead, setRole, companyConfig,
  } = useApp();

  const [collapsed, setCollapsed] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const myNotifications = notifications?.filter((n: any) => n.targetRole === currentRole || n.targetRole === 'ALL') || [];
  const unreadNotifs = myNotifications.filter((n: any) => !n.isRead);
  const unreadMsgs = (internalMessages || []).filter(
    (m: any) => !m.isRead && m.senderId !== currentUser?.id && (m.receiverRole === 'ALL' || m.receiverRole === currentUser?.role)
  ).length;

  /* Raccourci clavier global ⌘K / Ctrl+K */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* Fermeture du centre de notifications au clic extérieur */
  const notifRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showNotifs) return;
    const onDown = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showNotifs]);

  const go = (menu: string) => { setActiveMenu(menu); setMobileOpen(false); setShowNotifs(false); };

  /* ---- Navigation (clés identiques à App.tsx) ---- */
  const paletteItems: PaletteItem[] = useMemo(() => {
    const items: PaletteItem[] = [
      { id: 'DASHBOARD', label: 'Mon Espace de Travail', group: 'Général', icon: <LayoutDashboard size={15} />, run: () => go('DASHBOARD') },
      { id: 'MESSAGERIE', label: 'Messagerie Interne', group: 'Général', icon: <MessageCircle size={15} />, run: () => go('MESSAGERIE') },
      { id: 'TASKS', label: 'Tâches & Requêtes', group: 'Général', icon: <Inbox size={15} />, run: () => go('TASKS') },
    ];
    if (currentRole === 'GERANT') {
      items.push(
        { id: 'PIPELINE', label: 'Pipeline Projets', group: 'Direction', icon: <Briefcase size={15} />, run: () => go('PIPELINE') },
        { id: 'PROSPECTION', label: 'Prospection & CRM', group: 'Direction', icon: <Users size={15} />, run: () => go('PROSPECTION') },
        { id: 'EQUIPE', label: 'Équipe & Configuration', group: 'Direction', icon: <CheckSquare size={15} />, run: () => go('EQUIPE') },
      );
    }
    if (companyConfig.activeModules?.includes('BTP')) {
      items.push(
        { id: 'BTP_DASHBOARD', label: 'Tableau de Bord BTP', group: 'Opérations BTP', icon: <LayoutDashboard size={15} />, run: () => go('BTP_DASHBOARD') },
        { id: 'BTP_MARCHES', label: 'Marchés & Contrats', group: 'Opérations BTP', icon: <FileText size={15} />, run: () => go('BTP_MARCHES') },
        { id: 'BTP_OFFRES', label: "Appels d'Offres BTP", group: 'Opérations BTP', icon: <Briefcase size={15} />, run: () => go('BTP_OFFRES') },
        { id: 'BTP_CHANTIERS', label: 'Pilotage Chantiers', group: 'Opérations BTP', icon: <HardHat size={15} />, run: () => go('BTP_CHANTIERS') },
        { id: 'BTP_MAGASIN', label: 'Magasin & Approvisionnements', group: 'Opérations BTP', icon: <Truck size={15} />, run: () => go('BTP_MAGASIN') },
        { id: 'BTP_ENGINS', label: 'Parc Engins', group: 'Opérations BTP', icon: <Truck size={15} />, run: () => go('BTP_ENGINS') },
        { id: 'BTP_QHSE', label: 'QHSE & Sécurité', group: 'Opérations BTP', icon: <ShieldAlert size={15} />, run: () => go('BTP_QHSE') },
      );
    }
    if (companyConfig.activeModules?.includes('AGRO')) {
      items.push(
        { id: 'AGRO_APPRO', label: 'Approvisionnement & Stocks', group: 'Filière Agro', icon: <Truck size={15} />, run: () => go('AGRO_APPRO') },
        { id: 'AGRO_PROD', label: 'Production & Qualité', group: 'Filière Agro', icon: <Factory size={15} />, run: () => go('AGRO_PROD') },
        { id: 'AGRO_TRACABILITE', label: 'Traçabilité & Ventes', group: 'Filière Agro', icon: <Network size={15} />, run: () => go('AGRO_TRACABILITE') },
      );
    }
    items.push({ id: 'LOGOUT', label: 'Déconnexion', group: 'Session', icon: <LogOut size={15} />, run: logout });
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRole, companyConfig.activeModules, logout, setActiveMenu]);

  /* ---- Item de navigation ---- */
  const NavItem: React.FC<{
    menu: string;
    icon: React.ReactNode;
    label: string;
    badge?: number;
  }> = ({ menu, icon, label, badge }) => {
    const active = activeMenu === menu;
    return (
      <button
        onClick={() => go(menu)}
        title={collapsed ? label : undefined}
        className={`group relative w-full flex items-center gap-3 rounded-lg transition-all duration-200 ${
          collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
        } ${active
          ? 'bg-white/[0.07] text-white'
          : 'text-stone-400 hover:text-stone-100 hover:bg-white/[0.04]'
        }`}
      >
        {active && (
          <motion.span
            layoutId="nav-indicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-gradient-to-b from-indigo-300 to-indigo-500"
          />
        )}
        <span className={`shrink-0 transition-colors ${active ? 'text-indigo-300' : 'text-stone-500 group-hover:text-stone-300'}`}>{icon}</span>
        {!collapsed && <span className="text-[13px] font-medium tracking-tight flex-1 text-left">{label}</span>}
        {!collapsed && !!badge && badge > 0 && (
          <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-500/90 text-white text-[10.5px] font-bold flex items-center justify-center">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
        {collapsed && !!badge && badge > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-400 border border-slate-950" />
        )}
      </button>
    );
  };

  const NavSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mt-5 first:mt-0">
      {!collapsed ? (
        <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-600">{title}</p>
      ) : (
        <div className="hairline-gold opacity-30 my-3" />
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );

  const displayName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Connecté';
  const roleLabels: Record<string, string> = {
    GERANT: 'Gérant', COMMERCIAL: 'Commercial', COMPTABLE: 'Comptable', RH: 'Ressources Humaines',
    ASSISTANTE: 'Assistante de Direction', ETUDES: 'Bureau Études', COND_TRAVAUX: 'Conduite Travaux',
    CHEF_CHANTIER: 'Chef de Chantier', QHSE_BTP: 'QHSE', RESP_MATERIEL: 'Resp. Matériel',
    MAGASINIER_BTP: 'Magasinier', RESP_PRODUCTION: 'Resp. Production', RESP_QUALITE: 'Resp. Qualité',
    RESP_AGRO: 'Resp. Agro', RESP_STOCKAGE: 'Resp. Stockage', RESP_TRACABILITE: 'Resp. Traçabilité',
    DEVELOPPEUR: 'Développeur',
  };

  return (
    <div className="h-screen w-full overflow-hidden flex bg-slate-50 print:bg-white print:block">
      {/* ============ SIDEBAR ============ */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-[2px] md:hidden print:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed md:relative inset-y-0 left-0 z-40 h-full shrink-0 flex flex-col print:hidden
          bg-gradient-to-b from-slate-950 via-[#1B1815] to-slate-950 border-r border-white/[0.06]
          transition-[width,transform] duration-300 ease-[cubic-bezier(.22,1,.36,1)] ${collapsed ? 'w-[72px]' : 'w-[264px]'
          } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Marque */}
        <div className={`h-16 flex items-center border-b border-white/[0.06] ${collapsed ? 'justify-center px-2' : 'px-4'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 shrink-0 rounded-[10px] bg-gradient-to-br from-[#2A2521] to-[#1D1A17] border border-indigo-400/30 flex items-center justify-center shadow-[0_0_24px_rgba(204,172,96,0.15)]">
              <span className="font-serif italic text-indigo-300 text-lg leading-none">E</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-stone-100 tracking-tight leading-tight">Einsof</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Suite de gestion</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden ml-auto text-stone-500 hover:text-stone-200 p-1"
            aria-label="Fermer le menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto py-4 ${collapsed ? 'px-2.5' : 'px-3'}`}>
          <NavSection title="Tableau de bord">
            <NavItem menu="DASHBOARD" icon={<LayoutDashboard size={17} />} label="Mon Espace" />
            <NavItem menu="MESSAGERIE" icon={<MessageCircle size={17} />} label="Messagerie" badge={unreadMsgs} />
            <NavItem menu="TASKS" icon={<Inbox size={17} />} label="Tâches & Requêtes" />
          </NavSection>

          {currentRole === 'GERANT' && (
            <NavSection title="Direction">
              <NavItem menu="PIPELINE" icon={<Briefcase size={17} />} label="Pipeline Projets" />
              <NavItem menu="PROSPECTION" icon={<Users size={17} />} label="Prospection & CRM" />
              <NavItem menu="EQUIPE" icon={<CheckSquare size={17} />} label="Équipe & Config" />
            </NavSection>
          )}

          {companyConfig.activeModules?.includes('BTP') && (
            <NavSection title="Opérations BTP">
              <NavItem menu="BTP_DASHBOARD" icon={<LayoutDashboard size={17} />} label="Tableau de Bord" />
              <NavItem menu="BTP_MARCHES" icon={<FileText size={17} />} label="Marchés" />
              <NavItem menu="BTP_OFFRES" icon={<Briefcase size={17} />} label="Appels d'Offres" />
              <NavItem menu="BTP_CHANTIERS" icon={<HardHat size={17} />} label="Chantiers" />
              <NavItem menu="BTP_MAGASIN" icon={<Truck size={17} />} label="Magasin & Achats" />
              <NavItem menu="BTP_ENGINS" icon={<Truck size={17} />} label="Parc Engins" />
              <NavItem menu="BTP_QHSE" icon={<ShieldAlert size={17} />} label="QHSE & Sécurité" />
            </NavSection>
          )}

          {companyConfig.activeModules?.includes('AGRO') && (
            <NavSection title="Filière Agro">
              <NavItem menu="AGRO_APPRO" icon={<Truck size={17} />} label="Appro & Stocks" />
              <NavItem menu="AGRO_PROD" icon={<Factory size={17} />} label="Prod & Qualité" />
              <NavItem menu="AGRO_TRACABILITE" icon={<Network size={17} />} label="Traçabilité" />
            </NavSection>
          )}

          {/* Mode Souverain */}
          {currentUser?.role === 'GERANT' && !collapsed && (
            <div className="mt-6 mx-1 rounded-xl border border-indigo-400/20 bg-gradient-to-b from-white/[0.04] to-transparent p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-300/90 mb-2">
                <Crown size={11} /> Mode Souverain
              </p>
              <select
                value={currentRole || 'GERANT'}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-lg text-stone-200 text-xs p-2 outline-none hover:border-white/20 cursor-pointer font-semibold focus:border-indigo-400/50"
              >
                <option value="GERANT">Supervision (Gérant)</option>
                <option value="COMMERCIAL">Exécuter · Commercial</option>
                <option value="COMPTABLE">Exécuter · Comptable</option>
                <option value="RH">Exécuter · RH</option>
                <option value="ASSISTANTE">Exécuter · Assistante</option>
                {companyConfig.activeModules?.includes('BTP') && (
                  <>
                    <option value="ETUDES">Exécuter · Bureau Études</option>
                    <option value="COND_TRAVAUX">Exécuter · Cond. Travaux</option>
                    <option value="CHEF_CHANTIER">Exécuter · Chef Chantier</option>
                    <option value="QHSE_BTP">Exécuter · QHSE</option>
                    <option value="RESP_MATERIEL">Exécuter · Resp. Matériel</option>
                    <option value="MAGASINIER_BTP">Exécuter · Magasinier</option>
                  </>
                )}
                {companyConfig.activeModules?.includes('AGRO') && (
                  <>
                    <option value="RESP_PRODUCTION">Exécuter · Resp. Production</option>
                    <option value="RESP_QUALITE">Exécuter · Resp. Qualité</option>
                    <option value="RESP_AGRO">Exécuter · Resp. Agro</option>
                    <option value="RESP_STOCKAGE">Exécuter · Resp. Stockage</option>
                    <option value="RESP_TRACABILITE">Exécuter · Resp. Traçabilité</option>
                  </>
                )}
              </select>
            </div>
          )}
        </nav>

        {/* Pied : utilisateur */}
        <div className={`border-t border-white/[0.06] p-3 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
          <div className={`flex items-center gap-3 rounded-lg p-2 ${collapsed ? '' : 'bg-white/[0.03]'}`}>
            <Avatar name={displayName} size={collapsed ? 32 : 34} />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-stone-100 truncate leading-tight">{displayName}</p>
                <p className="text-[10.5px] text-stone-500 truncate">@{currentUser?.username}</p>
              </div>
            )}
            {!collapsed && (
              <button onClick={logout} title="Déconnexion" className="text-stone-500 hover:text-rose-400 transition-colors p-1.5 rounded-md hover:bg-white/5">
                <LogOut size={15} />
              </button>
            )}
          </div>
          {collapsed && (
            <button onClick={logout} title="Déconnexion" className="text-stone-500 hover:text-rose-400 transition-colors p-1.5">
              <LogOut size={15} />
            </button>
          )}
        </div>

        {/* Bouton repli (desktop) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex absolute -right-3 top-[26px] z-10 h-6 w-6 items-center justify-center rounded-full bg-slate-900 border border-white/10 text-stone-400 hover:text-indigo-300 hover:border-indigo-400/40 transition-colors shadow-soft"
          aria-label={collapsed ? 'Déplier' : 'Replier'}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </aside>

      {/* ============ ZONE PRINCIPALE ============ */}
      <div className="flex-1 min-w-0 h-full flex flex-col">
        {/* Barre supérieure */}
        <header className="h-16 shrink-0 flex items-center gap-3 px-4 md:px-6 border-b border-slate-200/70 glass print:hidden z-20">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden h-9 w-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500"
            aria-label="Ouvrir le menu"
          >
            <Menu size={17} />
          </button>

          {/* Déclencheur palette */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="group flex items-center gap-2.5 h-9 px-3.5 rounded-lg border border-slate-200 bg-white/80 text-slate-400 hover:border-slate-300 hover:text-slate-600 transition-all w-[210px] md:w-[280px]"
          >
            <Search size={14} />
            <span className="text-[12.5px] flex-1 text-left">Rechercher…</span>
            <kbd className="kbd hidden md:inline-flex">⌘K</kbd>
          </button>

          <div className="flex-1" />

          {/* Espace actif */}
          <span className="hidden lg:inline-flex items-center gap-2 text-[11px] font-semibold text-slate-400 bg-white/70 border border-slate-200 rounded-full px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            {roleLabels[currentRole || ''] ?? 'Utilisateur'}
          </span>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative h-9 w-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
              aria-label="Notifications"
            >
              <Bell size={16} />
              {unreadNotifs.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[9.5px] font-bold flex items-center justify-center border-2 border-white">
                  {unreadNotifs.length > 9 ? '9+' : unreadNotifs.length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifs && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 mt-2 w-[min(88vw,340px)] bg-white border border-slate-200/80 rounded-xl shadow-pop overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
                    <h4 className="font-bold text-[13px] text-slate-800">Notifications</h4>
                    {unreadNotifs.length > 0 && (
                      <span className="text-[10.5px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                        {unreadNotifs.length} non lue{unreadNotifs.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {myNotifications.length === 0 ? (
                      <div className="py-10 text-center">
                        <Bell size={20} className="mx-auto text-slate-200 mb-2" />
                        <p className="text-xs text-slate-400">Aucune notification</p>
                      </div>
                    ) : (
                      myNotifications.slice(0, 12).map((n: any) => (
                        <button
                          key={n.id}
                          onClick={() => { if (!n.isRead) markNotificationAsRead(n.id); }}
                          className={`w-full text-left p-3.5 border-b border-slate-50 flex gap-3 transition-colors hover:bg-slate-50 ${!n.isRead ? 'bg-indigo-50/30' : 'opacity-75'}`}
                        >
                          <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                            n.type === 'SUCCESS' ? 'bg-emerald-400' :
                            n.type === 'WARNING' ? 'bg-amber-400' :
                            n.type === 'ERROR' ? 'bg-rose-400' : 'bg-blue-400'
                          }`} />
                          <span className="flex-1 min-w-0">
                            <p className={`text-[12.5px] leading-snug ${!n.isRead ? 'font-medium text-slate-800' : 'text-slate-600'}`}>{n.message}</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {n.createdAt ? new Date(n.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                            </p>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Contenu */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden print:max-h-none print:overflow-visible bg-transparent">
          <div className="p-4 md:p-7 max-w-full md:max-w-[1400px] mx-auto print:p-0">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={paletteItems} />
      <ToastsContainer />
    </div>
  );
};
