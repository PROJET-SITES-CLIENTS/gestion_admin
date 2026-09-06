import React from 'react';
import { useApp } from '../../store';
import { Briefcase, Calendar as CalendarIcon, Inbox, FileText, CheckCircle2, Clock, AlertTriangle, Users, Star } from 'lucide-react';

export default function AssistantDashboard({ setTab }: { setTab: (tab: string) => void }) {
  const { assistantTasks, assistantMeetings, assistantDocuments, assistantContacts, tasks } = useApp();

  // Metrics
  const myTasks = tasks.filter(t => t.receiverRole === 'ASSISTANTE' && t.status !== 'DONE');
  const eisenhowerTasks = assistantTasks.filter(t => t.status !== 'DONE');
  const urgentTasks = eisenhowerTasks.filter(t => t.urgence === 'HAUTE').length;
  
  const upcomingMeetings = assistantMeetings.filter(m => m.status === 'PLANNED').length;
  
  const expiringDocs = assistantDocuments.filter(d => {
    if (d.status === 'VALID' && d.expirationDate) {
      const diff = new Date(d.expirationDate).getTime() - new Date().getTime();
      return Math.ceil(diff / (1000 * 3600 * 24)) <= 30; // Moins de 30 jours
    }
    return d.status === 'EXPIRING' || d.status === 'EXPIRED';
  }).length;

  const vipContactsCount = assistantContacts.filter(c => c.isVip).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Inbox Metric */}
        <div onClick={() => setTab('MESSAGES')} className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm flex flex-col items-center text-center gap-4 cursor-pointer hover:border-purple-300 transition-colors group">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-sm flex items-center justify-center group-hover:scale-110 transition-transform relative">
            <Inbox size={28} />
            {myTasks.length > 0 && <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">{myTasks.length}</span>}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Boîte de Réception</h3>
            <p className="text-xs text-slate-500 mt-1">Requêtes internes à traiter</p>
          </div>
        </div>

        {/* Tasks Metric */}
        <div onClick={() => setTab('TASKS')} className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm flex flex-col items-center text-center gap-4 cursor-pointer hover:border-purple-300 transition-colors group">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-sm flex items-center justify-center group-hover:scale-110 transition-transform relative">
            <CheckCircle2 size={28} />
            {urgentTasks > 0 && <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">{urgentTasks}</span>}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Tâches Prioritaires</h3>
            <p className="text-xs text-slate-500 mt-1">{eisenhowerTasks.length} tâche(s) dans la matrice</p>
          </div>
        </div>

        {/* Meetings Metric */}
        <div onClick={() => setTab('AGENDA')} className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm flex flex-col items-center text-center gap-4 cursor-pointer hover:border-purple-300 transition-colors group">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-sm flex items-center justify-center group-hover:scale-110 transition-transform">
            <CalendarIcon size={28} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Agenda & Réunions</h3>
            <p className="text-xs text-slate-500 mt-1">{upcomingMeetings} réunion(s) à venir</p>
          </div>
        </div>

        {/* Documents Metric */}
        <div onClick={() => setTab('DOCUMENTS')} className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm flex flex-col items-center text-center gap-4 cursor-pointer hover:border-purple-300 transition-colors group">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-sm flex items-center justify-center group-hover:scale-110 transition-transform relative">
            <FileText size={28} />
            {expiringDocs > 0 && <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">{expiringDocs}</span>}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">GED & Échéances</h3>
            <p className="text-xs text-slate-500 mt-1">{assistantDocuments.length} document(s) géré(s)</p>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Alertes d'échéances */}
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" /> Veille & Échéances Proches
          </h3>
          <div className="space-y-3">
            {expiringDocs > 0 ? (
              assistantDocuments
                .filter(d => {
                  if (d.status === 'VALID' && d.expirationDate) {
                    const diff = new Date(d.expirationDate).getTime() - new Date().getTime();
                    return Math.ceil(diff / (1000 * 3600 * 24)) <= 30;
                  }
                  return d.status === 'EXPIRING' || d.status === 'EXPIRED';
                })
                .map(d => (
                  <div key={d.id} className="flex justify-between items-center bg-rose-50 p-3 rounded-sm border border-rose-100">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-rose-500" />
                      <span className="text-sm font-semibold text-rose-900">{d.title}</span>
                    </div>
                    <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded">Échéance critique</span>
                  </div>
                ))
            ) : (
              <div className="text-center text-sm text-slate-400 py-4">Aucune alerte d'expiration en cours.</div>
            )}
          </div>
        </div>

        {/* Panel 2: VIP & Relations */}
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <Star size={16} className="text-amber-500 fill-amber-500" /> Réseau Stratégique
          </h3>
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-sm border border-slate-100 mb-4">
            <div>
              <div className="text-2xl font-bold text-slate-800">{vipContactsCount}</div>
              <div className="text-xs text-slate-500 font-medium">Contacts VIP Actifs</div>
            </div>
            <Users size={32} className="text-slate-300" />
          </div>
          <button onClick={() => setTab('MESSAGES')} className="w-full py-2 bg-slate-900 text-white rounded-sm text-sm font-semibold hover:bg-slate-800 transition-colors">
            Ouvrir le Carnet d'Adresses
          </button>
        </div>
      </div>
    </div>
  );
}
