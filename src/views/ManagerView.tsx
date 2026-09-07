import React, { useState, useEffect } from 'react';
import { useApp } from '../store';
import { BarChart3, Users, Coins, CheckCircle2, Clock, Eye, Trash2, X, Download, UserPlus, Shield, Target, Flame, Calendar, PhoneCall, Settings } from 'lucide-react';
import { ProjectDetails } from '../components/ProjectDetails';
import { Project } from '../types';
import { useProjectFilter } from '../hooks/useProjectFilter';
import { ProjectFilterBar } from '../components/ProjectFilterBar';
import { BtpPermissionsMatrix } from '../components/BtpPermissionsMatrix';

export default function ManagerView() {
  const { projects, deleteProject, createUser, systemUsers, fetchSystemUsers, deleteUser, prospects, deleteProspect, activeMenu, companyConfig, updateCompanyConfig, expenses, tasks, notifications, leaveRequests, employees, treasuryAccounts } = useApp();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  useEffect(() => {
    if (selectedProject) {
      const updated = projects.find(p => p.id === selectedProject.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedProject)) {
        setSelectedProject(updated);
      }
    }
  }, [projects]);

  const [activeTab, setActiveTab] = useState<string>('ALL');
  
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'COMMERCIAL', firstName: '', lastName: '' });
  const [userMsg, setUserMsg] = useState({ type: '', text: '' });

  const totalProjects = projects.length;
  const closedProjects = projects.filter(p => p.status !== 'NOUVEAU').length;
  const paidProjects = projects.filter(p => p.paymentStatus === 'PAID').length;
  
  // CA attendu = budget des projets non annulés
  const expectedRevenue = projects.filter(p => p.status !== 'ANNULE').reduce((acc, p) => acc + (p.budget || 0), 0);
  // CA réellement encaissé = somme des échéances PAYÉES (pas le budget complet
  // dès le premier acompte — l'ancien code comptait 100% dès accountantPaymentConfirm)
  const securedRevenue = projects.reduce((acc, p) => {
    if (p.paymentStatus !== 'PAID' && !p.accountantPaymentConfirm) return acc;
    const paid = (p.paymentPlan?.installments || [])
      .filter(i => i.status === 'PAID')
      .reduce((s, i) => s + (i.amount || 0), 0);
    // Si pas de plan : fallback sur budget si complètement payé
    return acc + (paid > 0 ? paid : (p.paymentStatus === 'PAID' ? (p.budget || 0) : 0));
  }, 0);

  const { filters, setFilters, filteredProjects: hookFilteredProjects } = useProjectFilter(projects);

  const activeProspects = prospects.filter(p => p.action !== 'CONVERTI' && p.action !== 'ABANDON');
  const hotProspects = activeProspects.filter(p => p.qualification === 'CHAUD').length;
  const upcomingRDV = activeProspects.filter(p => p.action === 'RDV_FIXE').length;
  const toCall = activeProspects.filter(p => p.action === 'A_APPELER' || p.action === 'RAPPEL').length;

  const filteredProjects = hookFilteredProjects.filter(p => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'NOUVEAU') return p.status === 'NOUVEAU';
    if (activeTab === 'EN_COURS') return p.status === 'EN_COURS';
    if (activeTab === 'TERMINE') return p.status === 'TERMINE';
    return true;
  });

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ce projet ?`)) return;
    await deleteProject(id);
    if (selectedProject?.id === id) setSelectedProject(null);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserMsg({ type: '', text: '' });
    if (!newUser.username || !newUser.password || !newUser.firstName || !newUser.lastName) {
      setUserMsg({ type: 'error', text: 'Veuillez remplir tous les champs.' });
      return;
    }
    const res = await createUser(newUser.username, newUser.password, newUser.role, newUser.firstName, newUser.lastName);
    if (res.success) {
      setUserMsg({ type: 'success', text: `Le compte ${newUser.username} a été créé.` });
      setNewUser({ username: '', password: '', role: 'COMMERCIAL', firstName: '', lastName: '' });
      fetchSystemUsers();
    } else {
      setUserMsg({ type: 'error', text: res.error || 'Erreur lors de la création du compte.' });
    }
  };

  const handleDeleteUser = async (id: string, username: string) => {
    if (!window.confirm(`Supprimer le compte "${username}" ?`)) return;
    await deleteUser(id);
  };

  useEffect(() => {
    fetchSystemUsers();
  }, []);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            <span className="font-serif italic font-normal text-indigo-600 mr-1.5">La vue</span>
            globale direction
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">Supervision de l'activité : finances, pipeline, équipe et alertes.</p>
        </div>
      </div>

      {activeMenu === 'DASHBOARD' ? (
        <div className="space-y-6">
          {/* Top KPI row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card card-hover p-5 relative overflow-hidden">
              <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-indigo-400/70 to-transparent opacity-[0.07] blur-xl" />
              <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400">Trésorerie Globale</p>
              <p className="mt-2 text-[22px] leading-tight font-bold font-mono tracking-tight text-slate-900">
                {treasuryAccounts.reduce((acc, t) => acc + t.balance, 0).toLocaleString('fr-FR')}
                <span className="ml-1.5 text-[11px] font-sans font-medium text-slate-400">GNF</span>
              </p>
              <p className="mt-1.5 text-[11px] text-slate-400">{treasuryAccounts.length} compte{treasuryAccounts.length > 1 ? 's' : ''} actif{treasuryAccounts.length > 1 ? 's' : ''}</p>
            </div>
            <div className="card card-hover p-5 relative overflow-hidden">
              <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-emerald-400/70 to-transparent opacity-[0.07] blur-xl" />
              <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400">CA Encaissé</p>
              <p className="mt-2 text-[22px] leading-tight font-bold font-mono tracking-tight text-slate-900">
                {securedRevenue.toLocaleString('fr-FR')}
                <span className="ml-1.5 text-[11px] font-sans font-medium text-slate-400">GNF</span>
              </p>
              <p className="mt-1.5 text-[11px] text-slate-400">sur {expectedRevenue.toLocaleString('fr-FR')} GNF attendus</p>
            </div>
            <div className="card card-hover p-5 relative overflow-hidden">
              <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-rose-400/70 to-transparent opacity-[0.07] blur-xl" />
              <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400">Dépenses en attente</p>
              <p className={`mt-2 text-[22px] leading-tight font-bold font-mono tracking-tight ${expenses.filter(e => e.status === 'PENDING').length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {expenses.filter(e => e.status === 'PENDING').length}
              </p>
              <p className="mt-1.5 text-[11px] text-slate-400">validation comptable requise</p>
            </div>
            <div className="card card-hover p-5 relative overflow-hidden">
              <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-blue-400/70 to-transparent opacity-[0.07] blur-xl" />
              <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400">Collaborateurs</p>
              <p className="mt-2 text-[22px] leading-tight font-bold font-mono tracking-tight text-slate-900">{employees.length}</p>
              <p className="mt-1.5 text-[11px] text-slate-400">{systemUsers.length} compte{systemUsers.length > 1 ? 's' : ''} utilisateur</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne Principale - Fil d'activité */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 rounded-sm p-5">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Flame size={16} className="text-orange-500" /> Fil d'Activité de l'Entreprise
                </h2>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {[...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 15).map((n, idx) => (
                    <div key={idx} className="flex gap-4 items-start p-3 hover:bg-slate-50 rounded-sm transition-colors border border-transparent hover:border-slate-100">
                      <div className={`mt-1 shrink-0 w-2 h-2 rounded-full ${n.type === 'ERROR' ? 'bg-rose-500' : n.type === 'WARNING' ? 'bg-amber-500' : n.type === 'SUCCESS' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                      <div>
                        <p className="text-sm text-slate-800 font-medium">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-1">Cible : {n.targetRole} • {new Date(n.createdAt).toLocaleString('fr-FR')}</p>
                      </div>
                    </div>
                  ))}
                  {notifications.length === 0 && <p className="text-sm text-slate-500">Aucune activité récente.</p>}
                </div>
              </div>
            </div>

            {/* Colonne Latérale - Alertes Opérationnelles */}
            <div className="space-y-6">
              <div className="bg-white border border-rose-200 rounded-sm p-5 shadow-sm">
                <h2 className="text-sm font-bold text-rose-800 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Clock size={16} /> Tâches Escaladées
                </h2>
                <div className="space-y-3">
                  {tasks.filter(t => t.escalated && t.status !== 'DONE').map((t, i) => (
                    <div key={i} className="bg-rose-50 border border-rose-100 p-3 rounded-sm">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-rose-700">{t.receiverRole}</span>
                        <span className="text-[10px] font-semibold bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded-sm">URGENT</span>
                      </div>
                      <p className="text-sm text-rose-900 font-medium">{t.title}</p>
                      <p className="text-xs text-rose-700 mt-1 line-clamp-2">{t.content}</p>
                    </div>
                  ))}
                  {tasks.filter(t => t.escalated && t.status !== 'DONE').length === 0 && (
                    <p className="text-sm text-slate-500">Aucune tâche en retard.</p>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-sm p-5">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Calendar size={16} className="text-indigo-500" /> RH : Congés en cours
                </h2>
                <div className="space-y-3">
                  {leaveRequests.filter(l => l.status === 'APPROVED' && new Date(l.endDate) >= new Date()).map((l, i) => {
                    const emp = employees.find(e => e.id === l.employeeId);
                    return (
                      <div key={i} className="border-l-2 border-indigo-500 pl-3">
                        <p className="text-sm font-semibold text-slate-800">{emp?.firstName} {emp?.lastName}</p>
                        <p className="text-xs text-slate-500">Jusqu'au {new Date(l.endDate).toLocaleDateString()}</p>
                      </div>
                    )
                  })}
                  {leaveRequests.filter(l => l.status === 'APPROVED' && new Date(l.endDate) >= new Date()).length === 0 && (
                    <p className="text-sm text-slate-500">Aucun collaborateur en congé.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeMenu === 'PIPELINE' ? (
        <div className="space-y-6">
          <ProjectFilterBar filters={filters} setFilters={setFilters} totalResults={filteredProjects.length} />
          
          <div className="bg-white shadow-none border border-slate-200 rounded-sm overflow-hidden mt-4">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="text-slate-400" size={20} />
                <h2 className="text-lg font-semibold text-slate-800">Pipeline des Projets</h2>
              </div>
              <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-sm text-xs font-semibold text-slate-600">
                <button onClick={() => setActiveTab('ALL')} className={`px-3 py-1.5 rounded-sm transition-all ${activeTab === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'hover:bg-slate-200'}`}>Tous</button>
                <button onClick={() => setActiveTab('NOUVEAU')} className={`px-3 py-1.5 rounded-sm transition-all ${activeTab === 'NOUVEAU' ? 'bg-white text-slate-900 shadow-xs' : 'hover:bg-slate-200'}`}>Nouveaux</button>
                <button onClick={() => setActiveTab('EN_COURS')} className={`px-3 py-1.5 rounded-sm transition-all ${activeTab === 'EN_COURS' ? 'bg-white text-slate-900 shadow-xs' : 'hover:bg-slate-200'}`}>En Cours</button>
                <button onClick={() => setActiveTab('TERMINE')} className={`px-3 py-1.5 rounded-sm transition-all ${activeTab === 'TERMINE' ? 'bg-white text-slate-900 shadow-xs' : 'hover:bg-slate-200'}`}>Terminés</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/30 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                    <th className="px-4 py-3 font-semibold">Projet</th>
                    <th className="px-4 py-3 font-semibold">Statut</th>
                    <th className="px-4 py-3 font-semibold">Budget</th>
                    <th className="px-4 py-3 font-semibold">Paiement</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Aucun projet trouvé.</td></tr>
                  ) : (
                    filteredProjects.map(p => (
                      <tr key={p.id} onClick={() => setSelectedProject(p)} className="hover:bg-slate-50/70 transition-colors cursor-pointer">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{p.name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-sm uppercase tracking-wide bg-slate-100 text-slate-700 border border-slate-200">
                            {p.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {p.budget ? `${p.budget.toLocaleString('fr-FR')} GNF` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {p.paymentStatus === 'PAID' ? <span className="text-emerald-600 font-semibold text-xs uppercase">Payé</span> : <span className="text-rose-600 font-semibold text-xs uppercase">Non Payé</span>}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setSelectedProject(p)} className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-sm">
                              <Eye size={16} />
                            </button>
                            <button onClick={(e) => handleDelete(e, p.id, p.name)} className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-sm">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeMenu === 'PROSPECTION' ? (
          <div className="bg-white shadow-none border border-slate-200 rounded-sm overflow-hidden mt-8 p-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Prospection & Clients</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-y border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Entreprise</th>
                    <th className="px-4 py-3 font-semibold">Contact</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Statut</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prospects.map(p => (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                      <td className="px-4 py-3">{p.phone}</td>
                      <td className="px-4 py-3">{p.email || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-sm ${
                          p.stage === 'GAGNE' ? 'bg-emerald-100 text-emerald-700' :
                          p.stage === 'PERDU' ? 'bg-rose-100 text-rose-700' :
                          p.qualification === 'CHAUD' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {p.stage === 'GAGNE' ? 'CLIENT' : p.qualification || p.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { if (window.confirm(`Supprimer le prospect "${p.name}" ?`)) deleteProspect(p.id); }} className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-sm">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {prospects.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Aucun prospect ou client trouvé.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
      ) : activeMenu === 'EQUIPE' ? (
        <div className="bg-white shadow-none border border-slate-200 rounded-sm overflow-hidden mt-8 p-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
            <div className="w-10 h-10 text-indigo-500 border border-slate-100 bg-transparent rounded-sm flex items-center justify-center">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Gestion de l'Équipe</h2>
              <p className="text-xs text-slate-500">Créez des accès sécurisés pour vos collaborateurs.</p>
            </div>
          </div>
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Prénom</label>
              <input type="text" value={newUser.firstName} onChange={(e) => setNewUser({...newUser, firstName: e.target.value})} className="w-full border-slate-200 border rounded-sm p-2.5 text-sm" placeholder="Prénom" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nom</label>
              <input type="text" value={newUser.lastName} onChange={(e) => setNewUser({...newUser, lastName: e.target.value})} className="w-full border-slate-200 border rounded-sm p-2.5 text-sm" placeholder="Nom" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Identifiant</label>
              <input type="text" value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value.toLowerCase().replace(/\s+/g, '_')})} className="w-full border-slate-200 border rounded-sm p-2.5 text-sm" placeholder="Ex: abessi" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Mot de passe</label>
              <input type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full border-slate-200 border rounded-sm p-2.5 text-sm" placeholder="Mot de passe" />
            </div>
            <div className="flex flex-col">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Rôle</label>
              <select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})} className="w-full border-slate-200 border rounded-sm p-2.5 text-sm bg-white">
                <option value="COMMERCIAL">Commercial</option>
                <option value="COMPTABLE">Comptable</option>
                <option value="RH">Ressources Humaines</option>
                <option value="GERANT">Gérant</option>
              </select>
            </div>
            <div className="md:col-span-5 flex items-center justify-between mt-2">
              <div>
                {userMsg.text && (
                  <span className={`text-sm font-medium ${userMsg.type === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>{userMsg.text}</span>
                )}
              </div>
              <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-sm text-sm font-semibold transition-colors">
                Créer le compte
              </button>
            </div>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield size={16} className="text-slate-400" /> Comptes Existants
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider border-y border-slate-100">
                    <th className="px-4 py-3 font-semibold">Identifiant</th>
                    <th className="px-4 py-3 font-semibold">Nom Complet</th>
                    <th className="px-4 py-3 font-semibold">Rôle</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {systemUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{user.username}</td>
                      <td className="px-4 py-3 text-slate-600">{user.firstName} {user.lastName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-[10px] font-semibold rounded uppercase tracking-wider text-slate-600 border border-slate-200`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {user.username !== 'admin' && (
                          <button onClick={() => handleDeleteUser(user.id, user.username)} className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-sm">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Configuration Délégations d'Absence */}
          <div className="mt-8 pt-8 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield size={16} className="text-slate-400" /> Gestion des Délégations & Absences
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Configurez qui reçoit les requêtes si le destinataire principal est absent.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['GERANT', 'COMPTABLE', 'ASSISTANTE', 'COMMERCIAL', 'RH'].map((role) => (
                <div key={role} className="border border-slate-200 rounded-sm p-3">
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Si {role} est absent :</label>
                  <select 
                    value={companyConfig.delegations?.[role] || ''} 
                    onChange={e => {
                      const newDelegations = { ...(companyConfig.delegations || {}), [role]: e.target.value };
                      updateCompanyConfig({ delegations: newDelegations });
                    }}
                    className="w-full border-slate-200 border rounded-sm p-2 text-sm" 
                  >
                    <option value="">Aucun délégué (bloquer)</option>
                    {['GERANT', 'COMPTABLE', 'ASSISTANTE', 'COMMERCIAL', 'RH'].filter(r => r !== role).map(r => (
                      <option key={r} value={r}>Déléguer à {r}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Configuration RH (Guinée) */}
          <div className="mt-8 pt-8 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Settings size={16} className="text-slate-400" /> Paramètres Paie & RH (Guinée)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">SMIG (GNF)</label>
                <input 
                  type="number" 
                  defaultValue={companyConfig.rhSmig || 440000} key={`smig-${companyConfig.rhSmig}`}
                  onBlur={e => { const v = Number(e.target.value); if (v !== (companyConfig.rhSmig || 440000)) updateCompanyConfig({ rhSmig: v }); }}
                  className="w-full border-slate-200 border rounded-sm p-2.5 text-sm" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Taux CNSS Employé (%)</label>
                <input
                  type="number" step="0.1"
                  defaultValue={companyConfig.rhCnssEmployeeRate || 5} key={`cnssE-${companyConfig.rhCnssEmployeeRate}`}
                  onBlur={e => { const v = Number(e.target.value); if (v !== (companyConfig.rhCnssEmployeeRate || 5)) updateCompanyConfig({ rhCnssEmployeeRate: v }); }}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Taux CNSS Patronal (%)</label>
                <input
                  type="number" step="0.1"
                  defaultValue={companyConfig.rhCnssEmployerRate || 13} key={`cnssP-${companyConfig.rhCnssEmployerRate}`}
                  onBlur={e => { const v = Number(e.target.value); if (v !== (companyConfig.rhCnssEmployerRate || 13)) updateCompanyConfig({ rhCnssEmployerRate: v }); }}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Abattement RTS (%)</label>
                <input
                  type="number" step="0.1"
                  defaultValue={companyConfig.rhRtsAbattement || 20} key={`rts-${companyConfig.rhRtsAbattement}`}
                  onBlur={e => { const v = Number(e.target.value); if (v !== (companyConfig.rhRtsAbattement || 20)) updateCompanyConfig({ rhRtsAbattement: v }); }}
                  className="input"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Ces paramètres sont appliqués automatiquement lors de la génération des bulletins de paie par le module Ressources Humaines.
              Les modifications sont sauvegardées instantanément.
            </p>
          </div>

          {/* Matrice de permissions BTP (CDC §3.3) */}
          {companyConfig.activeModules?.includes('BTP') && (
            <div className="mt-8 pt-8 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Shield size={16} className="text-slate-400" /> Matrice de permissions BTP
              </h3>
              <BtpPermissionsMatrix />
            </div>
          )}
        </div>
      ) : null}

      {/* Slide-over Detailed Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl h-full shadow-none overflow-y-auto flex flex-col animate-in slide-in-from-right duration-500">
            <div className="px-8 py-5 border-b border-slate-200 sticky top-0 bg-white z-15 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  {selectedProject.name}
                  {selectedProject.paymentStatus === 'PAID' && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded uppercase font-semibold tracking-wider">Validé & Payé</span>}
                </h2>
              </div>
              <button onClick={() => setSelectedProject(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-800">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-8 flex-1">
              <ProjectDetails project={selectedProject} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
