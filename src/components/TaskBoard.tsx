import React, { useState } from 'react';
import { useApp } from '../store';
import { CheckCircle2, Clock, Inbox, Send, AlertCircle, ArrowRight, Plus, X } from 'lucide-react';
import { Role } from '../types';

export default function TaskBoard() {
  const { tasks, currentUser, currentRole, updateTaskStatus, addTask } = useApp();
  const [activeTab, setActiveTab] = useState<'RECEIVED' | 'SENT'>('RECEIVED');
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    content: '',
    receiverRole: 'ALL' as Role | 'ALL',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH'
  });

  if (!currentUser) return null;

  // M5 : la boîte suit le rôle AFFICHÉ (currentRole) — en Mode Souverain,
  // le gérant qui « exécute · Commercial » voit la boîte du commercial
  // (avant : elle restait figée sur GERANT).
  const effectiveRole = currentRole || currentUser.role;
  const myReceivedTasks = tasks.filter(t => t.receiverRole === effectiveRole || t.receiverRole === 'ALL');
  const mySentTasks = tasks.filter(t => t.senderRole === effectiveRole || t.senderRole === currentUser.role);

  const displayedTasks = activeTab === 'RECEIVED' ? myReceivedTasks : mySentTasks;

  const handleUpdateStatus = (taskId: string, currentStatus: string) => {
    let nextStatus: 'TODO' | 'IN_PROGRESS' | 'DONE' = 'IN_PROGRESS';
    if (currentStatus === 'TODO') nextStatus = 'IN_PROGRESS';
    if (currentStatus === 'IN_PROGRESS') nextStatus = 'DONE';
    if (currentStatus === 'DONE') return; // Cannot update if done
    updateTaskStatus(taskId, nextStatus);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.content) return;
    await addTask(newTask.receiverRole, newTask.title, newTask.content, newTask.priority);
    setShowNewTask(false);
    setNewTask({ title: '', content: '', receiverRole: 'ALL', priority: 'MEDIUM' });
    setActiveTab('SENT');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            <span className="font-serif italic font-normal text-indigo-600 mr-1.5">Le flux</span>
            des requêtes
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">Demandes entrantes et sortantes inter-services.</p>
        </div>
        <button 
          onClick={() => setShowNewTask(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-sm font-semibold flex items-center gap-2 transition-colors"
        >
          <Plus size={18} /> Nouvelle Requête
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden flex flex-col h-[calc(100vh-180px)]">
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          <button 
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'RECEIVED' ? 'text-purple-700 bg-white border-b-2 border-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('RECEIVED')}
          >
            <Inbox size={18} /> Boîte de réception ({myReceivedTasks.filter(t => t.status !== 'DONE').length})
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'SENT' ? 'text-purple-700 bg-white border-b-2 border-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('SENT')}
          >
            <Send size={18} /> Requêtes envoyées
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-3">
            {displayedTasks.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                Aucune tâche trouvée dans cette vue.
              </div>
            ) : (
              displayedTasks.map(task => (
                <div key={task.id} className="p-4 border border-slate-100 rounded-sm bg-slate-50/50 hover:bg-white transition-colors group flex gap-4">
                  <div className="shrink-0 mt-1">
                    {task.status === 'TODO' ? <AlertCircle size={18} className="text-amber-500" /> :
                     task.status === 'IN_PROGRESS' ? <Clock size={18} className="text-blue-500" /> :
                     <CheckCircle2 size={18} className="text-emerald-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <h4 className="font-semibold text-slate-900 truncate">{task.title}</h4>
                      <span className="text-xs text-slate-400 whitespace-nowrap">{new Date(task.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">{task.content}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {activeTab === 'RECEIVED' ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-200 text-slate-700 rounded-sm">
                            De : {task.senderRole} ({task.senderName})
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-200 text-slate-700 rounded-sm">
                            Pour : {task.receiverRole}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${task.priority === 'HIGH' ? 'bg-rose-100 text-rose-700' : task.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          Priorité {task.priority}
                        </span>
                      </div>
                      
                      {activeTab === 'RECEIVED' && task.status !== 'DONE' && (
                        <button 
                          onClick={() => handleUpdateStatus(task.id, task.status)}
                          className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {task.status === 'TODO' ? 'Commencer' : 'Marquer comme terminé'} <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showNewTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <h2 className="text-lg font-semibold text-slate-800">Créer une nouvelle requête</h2>
              <button onClick={() => setShowNewTask(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="p-4 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Destinataire</label>
                <select 
                  className="w-full border border-slate-200 rounded-sm px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                  value={newTask.receiverRole}
                  onChange={(e) => setNewTask({...newTask, receiverRole: e.target.value as any})}
                >
                  <option value="ALL">Tous (Diffusion générale)</option>
                  <option value="GERANT">Gérant</option>
                  <option value="COMMERCIAL">Commercial</option>
                  <option value="COMPTABLE">Comptable</option>
                  <option value="RH">Ressources Humaines</option>
                  <option value="ASSISTANTE">Assistant(e) de Direction</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Priorité</label>
                <select 
                  className="w-full border border-slate-200 rounded-sm px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                  value={newTask.priority}
                  onChange={(e) => setNewTask({...newTask, priority: e.target.value as any})}
                >
                  <option value="LOW">Basse</option>
                  <option value="MEDIUM">Moyenne</option>
                  <option value="HIGH">Haute</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Titre de la requête</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-200 rounded-sm px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                  placeholder="Ex: Demande de validation facture"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description détaillée</label>
                <textarea 
                  className="w-full border border-slate-200 rounded-sm px-3 py-2 text-sm h-32 resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                  placeholder="Décrivez votre besoin..."
                  value={newTask.content}
                  onChange={(e) => setNewTask({...newTask, content: e.target.value})}
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowNewTask(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-sm transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-sm transition-colors flex items-center gap-2"
                >
                  <Send size={16} /> Envoyer la requête
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
