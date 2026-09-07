import React, { useState } from 'react';
import { useApp } from '../store';
import { Calendar as CalendarIcon, Clock, Check, X, FileText, Plus, Save } from 'lucide-react';

export const RhTimeAttendance: React.FC = () => {
  const { leaveRequests, employees, updateLeaveRequestStatus, addLeaveRequest, currentRole } = useApp();
  const [activeTab, setActiveTab] = useState<'LEAVES' | 'ATTENDANCE'>('LEAVES');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleCreateLeave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sd = new Date(fd.get('startDate') as string);
    const ed = new Date(fd.get('endDate') as string);
    const days = Math.ceil((ed.getTime() - sd.getTime()) / (1000 * 3600 * 24)) + 1;
    
    const lr = {
      employeeId: fd.get('employeeId') as string,
      startDate: fd.get('startDate') as string,
      endDate: fd.get('endDate') as string,
      reason: fd.get('reason') as string,
      leaveType: fd.get('leaveType') as any,
      daysCount: days > 0 ? days : 1
    };
    addLeaveRequest(lr);
    setShowAddForm(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-sm min-h-[500px]">
      <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Temps & Absences</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('LEAVES')}
            className={`px-4 py-1.5 text-sm font-medium rounded-sm ${activeTab === 'LEAVES' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Demandes de Congés
          </button>
          <button 
            onClick={() => setActiveTab('ATTENDANCE')}
            className={`px-4 py-1.5 text-sm font-medium rounded-sm ${activeTab === 'ATTENDANCE' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Pointage & Présences
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'LEAVES' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button 
                onClick={() => setShowAddForm(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-sm text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
              >
                <Plus size={16} /> Nouvelle demande
              </button>
            </div>

            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employé</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Période</th>
                  <th className="py-3 px-4">Jours</th>
                  <th className="py-3 px-4">Motif</th>
                  <th className="py-3 px-4">Statut</th>
                  {(currentRole === 'GERANT' || currentRole === 'RH') && (
                    <th className="py-3 px-4 text-right">Validation</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map(lr => {
                  const emp = employees.find(e => e.id === lr.employeeId);
                  return (
                    <tr key={lr.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-800">{emp?.firstName} {emp?.lastName}</td>
                      <td className="py-3 px-4 text-slate-600">{lr.leaveType || 'ANNUAL'}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(lr.startDate).toLocaleDateString('fr-FR')} - {new Date(lr.endDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">{lr.daysCount}</td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={lr.reason}>{lr.reason}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-sm text-xs font-semibold ${
                          lr.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                          lr.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {lr.status === 'APPROVED' ? 'Approuvé' : lr.status === 'REJECTED' ? 'Refusé' : 'En attente'}
                        </span>
                      </td>
                      {(currentRole === 'GERANT' || currentRole === 'RH') && (
                        <td className="py-3 px-4 text-right space-x-2">
                          {lr.status === 'PENDING' && (
                            <>
                              <button onClick={() => updateLeaveRequestStatus(lr.id, 'APPROVED')} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-sm" title="Approuver"><Check size={16}/></button>
                              <button onClick={() => {
                                const motif = window.prompt('Motif du refus (obligatoire) :');
                                if (motif && motif.trim()) updateLeaveRequestStatus(lr.id, 'REJECTED', motif.trim());
                              }} className="p-1 text-rose-600 hover:bg-rose-50 rounded-sm" title="Refuser (motif requis)"><X size={16}/></button>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
                {leaveRequests.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-500">Aucune demande de congé.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'ATTENDANCE' && (
          <div className="text-center py-16 space-y-4">
            <Clock size={48} className="mx-auto text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-800">Module de Pointage et Temps de Travail</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Ce module permet de suivre les heures d'arrivée et de départ, le télétravail et de calculer les heures supplémentaires pour l'export paie.
            </p>
            <div className="pt-4 flex justify-center gap-4">
              <button className="bg-indigo-600 text-white px-6 py-2 rounded-sm font-medium hover:bg-indigo-700 shadow-sm">
                Pointer l'arrivée (08:00)
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div className="relative bg-white rounded-sm shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">Demande de Congé</h2>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-700"><X size={20}/></button>
            </div>
            <form onSubmit={handleCreateLeave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Employé *</label>
                <select name="employeeId" required className="w-full border p-2 rounded-sm">
                  {employees.filter(e => e.isActive).map(e => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Type de Congé *</label>
                <select name="leaveType" required className="w-full border p-2 rounded-sm">
                  <option value="ANNUAL">Congé Annuel</option>
                  <option value="SICK">Maladie</option>
                  <option value="MATERNITY">Maternité</option>
                  <option value="PATERNITY">Paternité</option>
                  <option value="RTT">RTT</option>
                  <option value="UNPAID">Sans Solde</option>
                  <option value="EXCEPTIONAL">Exceptionnel</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date de début *</label>
                  <input name="startDate" type="date" required className="w-full border p-2 rounded-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date de fin *</label>
                  <input name="endDate" type="date" required className="w-full border p-2 rounded-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Motif</label>
                <textarea name="reason" rows={3} className="w-full border p-2 rounded-sm" placeholder="Facultatif..."></textarea>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-sm">Annuler</button>
                <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-sm font-semibold flex items-center gap-2 hover:bg-indigo-700">
                  <Save size={16}/> Soumettre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
