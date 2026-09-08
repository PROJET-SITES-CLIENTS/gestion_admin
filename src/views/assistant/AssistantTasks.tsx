import React, { useState } from 'react';
import { useApp } from '../../store';
import { AssistantTask } from '../../types';
import { Plus, CheckCircle2, Clock, AlertCircle, Circle, Trash2, Edit2, Play, Check } from 'lucide-react';

export default function AssistantTasks() {
  const { assistantTasks, crudCreateItem, crudUpdateItem, crudDeleteItem, addTask } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<AssistantTask>>({
    title: '', description: '', importance: 'HAUTE', urgence: 'HAUTE', status: 'TODO', delegatedTo: ''
  });

  const handleSave = async () => {
    if (!formData.title?.trim()) return;
    if (editingId) {
      await crudUpdateItem('assistantTasks', editingId, formData, 'Modification tâche');
    } else {
      const created = await crudCreateItem('assistantTasks', formData, 'Création tâche');
      if (!created) return; // M13
      // Push to global inbox if delegated
      if (formData.delegatedTo && ['GERANT', 'COMMERCIAL', 'COMPTABLE', 'RH'].includes(formData.delegatedTo)) {
        await addTask(formData.delegatedTo as any, `Délégation: ${formData.title}`, formData.description || 'Délégué par la Direction Administrative', formData.urgence === 'HAUTE' ? 'HIGH' : 'MEDIUM');
      }
    }
    setShowForm(false);
    setEditingId(null);
    setFormData({ title: '', description: '', importance: 'HAUTE', urgence: 'HAUTE', status: 'TODO', delegatedTo: '' });
  };

  const handleEdit = (t: AssistantTask) => {
    setFormData(t);
    setEditingId(t.id);
    setShowForm(true);
  };

  const renderTaskList = (tasks: AssistantTask[], title: string, bgClass: string, textClass: string) => (
    <div className={`p-4 rounded-sm border border-slate-200 ${bgClass}`}>
      <h3 className={`font-semibold mb-4 text-sm uppercase tracking-wider ${textClass}`}>{title}</h3>
      <div className="space-y-3">
        {tasks.map(t => (
          <div key={t.id} className="bg-white p-3 rounded-sm shadow-sm border border-slate-200 group">
            <div className="flex justify-between items-start mb-2">
              <h4 className={`font-semibold text-sm ${t.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                {t.title}
              </h4>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {t.status !== 'DONE' && (
                  <button onClick={() => crudUpdateItem('assistantTasks', t.id, { status: t.status === 'TODO' ? 'IN_PROGRESS' : 'DONE' }, 'Statut tâche')} className="p-1 text-slate-400 hover:text-emerald-600">
                    {t.status === 'TODO' ? <Play size={14} /> : <Check size={14} />}
                  </button>
                )}
                <button onClick={() => handleEdit(t)} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 size={14}/></button>
                <button onClick={() => crudDeleteItem('assistantTasks', t.id, 'Suppression tâche')} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 size={14}/></button>
              </div>
            </div>
            {t.description && <p className="text-xs text-slate-500 mb-2">{t.description}</p>}
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold uppercase">
              <span>{t.status === 'TODO' ? 'À faire' : t.status === 'IN_PROGRESS' ? 'En cours' : t.status === 'DONE' ? 'Terminée' : t.status}</span>
              {t.delegatedTo && <span>Dél. : {t.delegatedTo}</span>}
            </div>
          </div>
        ))}
        {tasks.length === 0 && <div className="text-xs text-slate-400 text-center py-4">Aucune tâche</div>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-sm border border-slate-200">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Matrice d'Eisenhower (Priorités)</h2>
          <p className="text-sm text-slate-500">Gestion dynamique des tâches de direction</p>
        </div>
        <button onClick={() => { setFormData({ title: '', description: '', importance: 'HAUTE', urgence: 'HAUTE', status: 'TODO', delegatedTo: '' }); setEditingId(null); setShowForm(!showForm); }} className="bg-purple-600 text-white px-4 py-2 rounded-sm text-sm font-semibold hover:bg-purple-700 flex items-center gap-2">
          <Plus size={16} /> Nouvelle tâche
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-4 rounded-sm border border-slate-200 space-y-4">
          <input type="text" placeholder="Titre de la tâche" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border p-2 rounded-sm text-sm" />
          <textarea placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border p-2 rounded-sm text-sm h-20" />
          <div className="grid grid-cols-2 gap-4">
            <select value={formData.importance} onChange={e => setFormData({...formData, importance: e.target.value as any})} className="w-full border p-2 rounded-sm text-sm">
              <option value="HAUTE">Importance: Haute</option>
              <option value="BASSE">Importance: Basse</option>
            </select>
            <select value={formData.urgence} onChange={e => setFormData({...formData, urgence: e.target.value as any})} className="w-full border p-2 rounded-sm text-sm">
              <option value="HAUTE">Urgence: Haute</option>
              <option value="BASSE">Urgence: Basse</option>
            </select>
            <input type="date" value={formData.dueDate || ''} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full border p-2 rounded-sm text-sm" />
            <select value={formData.delegatedTo || ''} onChange={e => setFormData({...formData, delegatedTo: e.target.value})} className="w-full border p-2 rounded-sm text-sm">
              <option value="">-- Délégué à --</option>
              <option value="GERANT">Gérant</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="COMPTABLE">Comptable</option>
              <option value="RH">Ressources Humaines</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
            <button onClick={handleSave} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-sm font-semibold">Enregistrer</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Do First (Urgent & Important) */}
        {renderTaskList(
          assistantTasks.filter(t => t.importance === 'HAUTE' && t.urgence === 'HAUTE'),
          '1. À Faire Immédiatement (Urgent & Important)',
          'bg-rose-50', 'text-rose-700'
        )}
        
        {/* Schedule (Important, Not Urgent) */}
        {renderTaskList(
          assistantTasks.filter(t => t.importance === 'HAUTE' && t.urgence === 'BASSE'),
          '2. À Planifier (Important, Non Urgent)',
          'bg-blue-50', 'text-blue-700'
        )}
        
        {/* Delegate (Urgent, Not Important) */}
        {renderTaskList(
          assistantTasks.filter(t => t.importance === 'BASSE' && t.urgence === 'HAUTE'),
          '3. À Déléguer (Urgent, Non Important)',
          'bg-amber-50', 'text-amber-700'
        )}
        
        {/* Eliminate (Not Urgent, Not Important) */}
        {renderTaskList(
          assistantTasks.filter(t => t.importance === 'BASSE' && t.urgence === 'BASSE'),
          '4. À Éliminer / Reporter (Ni Urgent, Ni Important)',
          'bg-slate-100', 'text-slate-600'
        )}
      </div>
    </div>
  );
}
