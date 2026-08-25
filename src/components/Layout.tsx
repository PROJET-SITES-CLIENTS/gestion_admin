import React, { useState } from 'react';
import { useApp } from '../store';
import { LayoutDashboard, Users, FileText, CheckSquare, Briefcase, ChevronLeft, ChevronRight, LogOut, Menu, X, UserCircle, MessageCircle, Inbox, Bell, Crown, Building, Truck, ShieldAlert, FileSearch, HardHat, Factory, Network, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';
import { Role } from '../types';

/** Conteneur global de toasts (erreurs/succès d'appels API, avant invisibles). */
const ToastsContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm print:hidden">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-3 rounded shadow-lg border text-sm bg-white animate-in slide-in-from-bottom-2 ${
            t.type === 'SUCCESS' ? 'border-emerald-200 text-emerald-800' :
            t.type === 'WARNING' ? 'border-amber-200 text-amber-800' :
            t.type === 'ERROR' ? 'border-rose-200 text-rose-800' :
            'border-slate-200 text-slate-800'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {t.type === 'SUCCESS' ? <CheckCircle2 size={16} className="text-emerald-500" /> :
             t.type === 'WARNING' ? <AlertTriangle size={16} className="text-amber-500" /> :
             t.type === 'ERROR' ? <XCircle size={16} className="text-rose-500" /> :
             <Info size={16} className="text-blue-500" />}
          </div>
          <p className="flex-1 leading-snug">{t.message}</p>
          <button onClick={() => dismissToast(t.id)} className="text-slate-400 hover:text-slate-700 shrink-0" title="Fermer">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentRole, currentUser, logout, activeMenu, setActiveMenu, internalMessages, notifications, markNotificationAsRead, setRole, companyConfig } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [showNotifications, setShowNotifications] = useState(false);

  const myNotifications = notifications?.filter(n => n.targetRole === currentRole || n.targetRole === 'ALL') || [];
  const unreadNotifications = myNotifications.filter(n => !n.isRead);

  const roleLabel = () => {
    switch(currentRole) {
      case 'GERANT': return 'Gérant';
      case 'COMMERCIAL': return 'Commercial';
      case 'COMPTABLE': return 'Comptable';
      case 'RH': return 'Ressources Humaines';
      case 'ASSISTANTE': return 'Assistante de Direction';
      default: return 'Utilisateur';
    }
  };

  const roleIcon = () => {
    switch(currentRole) {
      case 'GERANT': return <LayoutDashboard size={18} />;
      case 'COMMERCIAL': return <Users size={18} />;
      case 'COMPTABLE': return <FileText size={18} />;
      case 'RH': return <Users size={18} />;
      case 'ASSISTANTE': return <Briefcase size={18} />;
      default: return <UserCircle size={18} />;
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col md:flex-row bg-slate-50 print:bg-white print:block">
      {/* Sidebar */}
      <aside className={`bg-white text-slate-600 md:min-h-screen shrink-0 border-r border-slate-200 z-20 flex flex-col transition-all duration-300 relative print:hidden ${isCollapsed ? 'h-16 md:h-auto md:w-20 overflow-hidden md:overflow-visible' : 'h-auto md:w-56'} w-full`}>
        <div className="p-4 text-slate-900 text-xl font-semibold tracking-tight border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-sm flex items-center justify-center shrink-0">
              <Briefcase size={20} className="text-white" />
            </div>
            <span className={`whitespace-nowrap ${isCollapsed ? 'block md:hidden' : 'block'}`}>Synesis ERP</span>
          </div>
          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="md:hidden text-slate-500 hover:text-slate-800 p-1 bg-slate-100 rounded-sm"
          >
            {isCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>
        
        {/* Desktop Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="absolute -right-3 top-7 bg-white text-slate-400 p-1 rounded-full border border-slate-200 hover:text-slate-800 hidden md:block z-30 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        
        <div className={`p-4 flex-1 ${isCollapsed ? 'hidden md:block' : 'block'}`}>
          {!isCollapsed && <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2 whitespace-nowrap">Tableau de Bord</div>}
          <div className={`w-full flex items-center gap-3 px-4 py-2 rounded-sm border border-slate-200 bg-slate-50 text-slate-800 mb-4`}>
            <div className="shrink-0 text-slate-600">{roleIcon()}</div>
            {!isCollapsed && <span className="font-semibold whitespace-nowrap">Espace {roleLabel()}</span>}
          </div>

          <div className="space-y-1 mt-2 mb-6">
            <button 
              onClick={() => setActiveMenu('DASHBOARD')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-sm transition-colors ${activeMenu !== 'MESSAGERIE' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'} ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
            >
              <LayoutDashboard size={18} className="shrink-0" />
              {!isCollapsed && <span className="text-sm">Mon Espace de Travail</span>}
            </button>
            <button 
              onClick={() => setActiveMenu('MESSAGERIE')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-sm transition-colors relative ${activeMenu === 'MESSAGERIE' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'} ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
            >
              <MessageCircle size={18} className="shrink-0" />
              {!isCollapsed && <span className="text-sm">Messagerie Interne</span>}
              {(() => {
                const unread = (internalMessages || []).filter(m => !m.isRead && m.senderId !== currentUser?.id && (m.receiverRole === 'ALL' || m.receiverRole === currentUser?.role)).length;
                if (unread > 0) {
                  return (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unread}
                    </span>
                  );
                }
                return null;
              })()}
            </button>
            <button 
              onClick={() => setActiveMenu('TASKS')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-sm transition-colors relative ${activeMenu === 'TASKS' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'} ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
            >
              <Inbox size={18} className="shrink-0" />
              {!isCollapsed && <span className="text-sm">Tâches & Requêtes</span>}
            </button>
          </div>

          {currentRole === 'GERANT' && activeMenu !== 'MESSAGERIE' && (
            <div className="space-y-1 mt-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2 whitespace-nowrap">Gestion Direction</div>
              <button 
                onClick={() => setActiveMenu('PIPELINE')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-sm transition-colors ${activeMenu === 'PIPELINE' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'} ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
              >
                <Briefcase size={18} className="shrink-0" />
                {!isCollapsed && <span className="text-sm">Pipeline Projets</span>}
              </button>

              <button 
                onClick={() => setActiveMenu('PROSPECTION')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-sm transition-colors ${activeMenu === 'PROSPECTION' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'} ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
              >
                <Users size={18} className="shrink-0" />
                {!isCollapsed && <span className="text-sm">Prospection & CRM</span>}
              </button>

              <button 
                onClick={() => setActiveMenu('EQUIPE')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-sm transition-colors ${activeMenu === 'EQUIPE' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'} ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
              >
                <CheckSquare size={18} className="shrink-0" />
                {!isCollapsed && <span className="text-sm">Équipe & Config</span>}
              </button>
            </div>
          )}

          {/* Module BTP */}
          {companyConfig.activeModules?.includes('BTP') && activeMenu !== 'MESSAGERIE' && (
            <div className="space-y-1 mt-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2 whitespace-nowrap">Opérations BTP</div>
              
              <button 
                onClick={() => setActiveMenu('BTP_OFFRES')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-sm transition-colors ${activeMenu === 'BTP_OFFRES' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'} ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
              >
                <Briefcase size={18} className="shrink-0" />
                {!isCollapsed && <span className="text-sm">Appels d'Offres</span>}
              </button>

              <button 
                onClick={() => setActiveMenu('BTP_CHANTIERS')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-sm transition-colors ${activeMenu === 'BTP_CHANTIERS' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'} ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
              >
                <HardHat size={18} className="shrink-0" />
                {!isCollapsed && <span className="text-sm">Pilotage Chantiers</span>}
              </button>

              <button 
                onClick={() => setActiveMenu('BTP_ENGINS')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-sm transition-colors ${activeMenu === 'BTP_ENGINS' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'} ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
              >
                <Truck size={18} className="shrink-0" />
                {!isCollapsed && <span className="text-sm">Parc Engins</span>}
              </button>

              <button 
                onClick={() => setActiveMenu('BTP_QHSE')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-sm transition-colors ${activeMenu === 'BTP_QHSE' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'} ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
              >
                <ShieldAlert size={18} className="shrink-0" />
                {!isCollapsed && <span className="text-sm">QHSE & Sécurité</span>}
              </button>
            </div>
          )}

          {/* Module AGRO */}
          {companyConfig.activeModules?.includes('AGRO') && activeMenu !== 'MESSAGERIE' && (
            <div className="space-y-1 mt-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2 whitespace-nowrap">Filière Agro</div>
              
              <button 
                onClick={() => setActiveMenu('AGRO_APPRO')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-sm transition-colors ${activeMenu === 'AGRO_APPRO' ? 'bg-orange-50 text-orange-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'} ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
              >
                <Truck size={18} className="shrink-0" />
                {!isCollapsed && <span className="text-sm">Appro. & Stocks</span>}
              </button>

              <button 
                onClick={() => setActiveMenu('AGRO_PROD')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-sm transition-colors ${activeMenu === 'AGRO_PROD' ? 'bg-orange-50 text-orange-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'} ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
              >
                <Factory size={18} className="shrink-0" />
                {!isCollapsed && <span className="text-sm">Prod. & Qualité</span>}
              </button>

              <button 
                onClick={() => setActiveMenu('AGRO_TRACABILITE')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-sm transition-colors ${activeMenu === 'AGRO_TRACABILITE' ? 'bg-orange-50 text-orange-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'} ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
              >
                <Network size={18} className="shrink-0" />
                {!isCollapsed && <span className="text-sm">Traçabilité & Ventes</span>}
              </button>
            </div>
          )}

          {/* Mode Souveraineté - Remplacement pour exécution */}
          {currentUser?.role === 'GERANT' && (
            <div className={`mt-6 pt-4 border-t border-slate-200 ${isCollapsed ? 'hidden md:flex justify-center' : 'block'}`}>
              {!isCollapsed && (
                <div className="flex items-center gap-2 mb-2 px-2 text-xs font-bold text-indigo-800 uppercase tracking-wider">
                  <Crown size={14} className="text-amber-500" /> Mode Souverain
                </div>
              )}
              {isCollapsed ? (
                <Crown size={18} className="text-amber-500" title="Mode Souverain" />
              ) : (
                <select 
                  value={currentRole || 'GERANT'}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full bg-slate-100 border border-slate-200 text-slate-700 text-xs rounded-sm p-2 outline-none hover:bg-slate-200 cursor-pointer font-semibold"
                >
                  <option value="GERANT">👁️ Supervision (Gérant)</option>
                  <option value="COMMERCIAL">⚡ Exécuter : Commercial</option>
                  <option value="COMPTABLE">⚡ Exécuter : Comptable</option>
                  <option value="RH">⚡ Exécuter : RH</option>
                  <option value="ASSISTANTE">⚡ Exécuter : Assistante</option>
                  
                  {companyConfig.activeModules?.includes('BTP') && (
                    <optgroup label="Module BTP">
                      <option value="ETUDES">⚡ Exécuter : Bureau Études</option>
                      <option value="COND_TRAVAUX">⚡ Exécuter : Cond. Travaux</option>
                      <option value="CHEF_CHANTIER">⚡ Exécuter : Chef Chantier</option>
                      <option value="QHSE_BTP">⚡ Exécuter : QHSE</option>
                      <option value="RESP_MATERIEL">⚡ Exécuter : Resp. Matériel</option>
                      <option value="MAGASINIER_BTP">⚡ Exécuter : Magasinier</option>
                    </optgroup>
                  )}
                  {companyConfig.activeModules?.includes('AGRO') && (
                    <optgroup label="Filière Agro">
                      <option value="RESP_PRODUCTION">⚡ Exécuter : Resp. Prod</option>
                      <option value="RESP_QUALITE">⚡ Exécuter : Resp. Qualité</option>
                      <option value="RESP_AGRO">⚡ Exécuter : Resp. Agro</option>
                      <option value="RESP_STOCKAGE">⚡ Exécuter : Resp. Stockage</option>
                      <option value="RESP_TRACABILITE">⚡ Exécuter : Resp. Traçabilité</option>
                    </optgroup>
                  )}
                </select>
              )}
              {!isCollapsed && (
                <p className="text-[10px] text-slate-400 mt-1 px-1">Passez en mode exécution pour prendre le relais.</p>
              )}
            </div>
          )}
        </div>
        
        <div className={`p-4 border-t border-slate-100 space-y-2 ${isCollapsed ? 'hidden md:block' : 'block'}`}>
          <div className={`flex items-center gap-3 py-2 rounded-sm ${isCollapsed ? 'justify-center px-0' : 'px-4 bg-slate-50'}`}>
            <UserCircle size={24} className="text-slate-400 shrink-0" />
            {!isCollapsed && (
              <div className="text-sm overflow-hidden">
                <div className="text-slate-800 font-semibold truncate">{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Connecté(e)'}</div>
                <div className="text-slate-500 text-xs truncate">@{currentUser?.username || 'user'}</div>
              </div>
            )}
          </div>
          
          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 py-2 rounded-sm text-slate-500 hover:text-rose-600 hover:bg-slate-50 transition-colors ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
            title="Se déconnecter"
          >
            <LogOut size={20} className="shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 h-full overflow-y-auto overflow-x-hidden print:max-h-none print:overflow-visible print:p-0 bg-slate-50 print:bg-white relative">
        {/* Global Header (Notifications) */}
        <div className="sticky top-0 z-10 flex justify-end p-4 pointer-events-none print:hidden">
          <div className="pointer-events-auto relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-slate-800 p-2.5 rounded-full relative transition-colors focus:outline-none"
            >
              <Bell size={20} />
              {unreadNotifications.length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {unreadNotifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-sm shadow-lg overflow-hidden z-50 animate-in slide-in-from-top-2">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h4 className="font-semibold text-slate-800 text-sm">Notifications</h4>
                  {unreadNotifications.length > 0 && (
                    <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full">{unreadNotifications.length} non lues</span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {myNotifications.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-sm">Aucune notification</div>
                  ) : (
                    myNotifications.slice(0, 10).map(notif => (
                      <div 
                        key={notif.id} 
                        className={`p-3 border-b border-slate-50 text-sm flex gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${!notif.isRead ? 'bg-slate-50/50' : 'opacity-70'}`}
                        onClick={() => {
                          if (!notif.isRead) markNotificationAsRead(notif.id);
                        }}
                      >
                        <div className="mt-0.5 shrink-0">
                          {notif.type === 'SUCCESS' ? <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1" /> :
                           notif.type === 'WARNING' ? <div className="w-2 h-2 rounded-full bg-amber-500 mt-1" /> :
                           notif.type === 'ERROR' ? <div className="w-2 h-2 rounded-full bg-rose-500 mt-1" /> :
                           <div className="w-2 h-2 rounded-full bg-blue-500 mt-1" />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-slate-800 ${!notif.isRead ? 'font-medium' : ''}`}>{notif.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{new Date(notif.createdAt).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 md:p-6 max-w-full md:max-w-7xl mx-auto print:p-0 print:max-w-none print:m-0 -mt-16 md:mt-0">
          {children}
        </div>

        <ToastsContainer />
      </main>
    </div>
  );
};
