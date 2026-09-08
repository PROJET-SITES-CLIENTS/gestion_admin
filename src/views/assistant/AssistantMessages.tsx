import React, { useState } from 'react';
import { useApp } from '../../store';
import { AssistantContact } from '../../types';
import { Inbox, Star, Phone, Mail, Building, Plus, Edit2, Trash2, ShieldAlert } from 'lucide-react';

export default function AssistantMessages() {
  const { tasks, updateTaskStatus, assistantContacts, crudCreateItem, crudUpdateItem, crudDeleteItem } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'INBOX' | 'VIP'>('INBOX');
  
  const myTasks = tasks.filter(t => t.receiverRole === 'ASSISTANTE' && t.status !== 'DONE');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<AssistantContact>>({
    name: '', organization: '', role: '', phone: '', email: '', category: 'PARTENAIRE', notes: '', isVip: true
  });

  const handleSaveContact = async () => {
    if (!formData.name?.trim()) return;
    if (editingId) {
      await crudUpdateItem('assistantContacts', editingId, formData, 'Modification contact');
    } else {
      const ok = await crudCreateItem('assistantContacts', formData, 'Création contact VIP');
      if (!ok) return; // M13 : on ne ferme le formulaire que si la création a réussi
    }
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', organization: '', role: '', phone: '', email: '', category: 'PARTENAIRE', notes: '', isVip: true });
  };

  return (
    <div className="space-y-6 flex flex-col h-full min-h-0">
      <div className="flex justify-between items-center bg-white p-4 rounded-sm border border-slate-200 shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Communications & Relations</h2>
          <p className="text-sm text-slate-500">Filtrage des requêtes internes et gestion du carnet VIP</p>
        </div>
        <div className="flex border border-slate-200 rounded-sm overflow-hidden bg-slate-50 p-1 gap-1">
          <button 
            onClick={() => setActiveSubTab('INBOX')}
            className={`px-4 py-1.5 text-sm font-semibold rounded-sm transition-colors ${activeSubTab === 'INBOX' ? 'bg-white shadow-sm text-purple-700' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Boîte de Réception ({myTasks.length})
          </button>
          <button 
            onClick={() => setActiveSubTab('VIP')}
            className={`px-4 py-1.5 text-sm font-semibold rounded-sm transition-colors ${activeSubTab === 'VIP' ? 'bg-white shadow-sm text-purple-700' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Contacts VIP
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeSubTab === 'INBOX' && (
          <div className="bg-white border border-slate-200 rounded-sm p-6">
            <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2 mb-4">
              <Inbox className="text-purple-500" size={20} /> Requêtes Internes ({myTasks.length} en cours)
            </h3>
            {myTasks.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                Aucune requête en attente.
              </div>
            ) : (
              <div className="space-y-3">
                {myTasks.map(t => (
                  <div key={t.id} className="flex gap-4 p-4 border border-slate-100 rounded-sm bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900">{t.title}</h4>
                        {t.priority === 'HIGH' && <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">URGENT</span>}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{t.content}</p>
                      <p className="text-[11px] text-slate-400 mt-2 font-medium">De : {t.senderName} · {new Date(t.createdAt).toLocaleString('fr-FR')}</p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {t.status === 'TODO' && (
                        <button onClick={() => updateTaskStatus(t.id, 'IN_PROGRESS')} className="px-3 py-1.5 bg-amber-500 text-white rounded text-xs font-semibold hover:bg-amber-600 transition-colors">
                          En cours
                        </button>
                      )}
                      <button onClick={() => updateTaskStatus(t.id, 'DONE')} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition-colors">
                        Terminer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'VIP' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Star className="text-amber-500 fill-amber-500" size={20} /> Carnet d'Adresses Stratégique
              </h3>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  placeholder="Rechercher un contact..." 
                  onChange={e => {
                    const val = e.target.value.toLowerCase();
                    const cards = document.querySelectorAll('.vip-card');
                    cards.forEach(card => {
                      if (card.textContent?.toLowerCase().includes(val)) {
                        (card as HTMLElement).style.display = 'block';
                      } else {
                        (card as HTMLElement).style.display = 'none';
                      }
                    });
                  }}
                  className="border border-slate-200 p-2 rounded-sm text-sm w-64"
                />
                <button onClick={() => { setFormData({ name: '', organization: '', role: '', phone: '', email: '', category: 'PARTENAIRE', notes: '', isVip: true }); setEditingId(null); setShowForm(!showForm); }} className="bg-purple-600 text-white px-3 py-1.5 rounded-sm text-sm font-semibold hover:bg-purple-700 flex items-center gap-2">
                  <Plus size={16} /> Nouveau Contact
                </button>
              </div>
            </div>

            {showForm && (
              <div className="bg-white p-4 rounded-sm border border-slate-200 space-y-4 shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Nom Complet" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="border p-2 rounded-sm text-sm" />
                  <input type="text" placeholder="Organisation / Société" value={formData.organization} onChange={e => setFormData({...formData, organization: e.target.value})} className="border p-2 rounded-sm text-sm" />
                  <input type="text" placeholder="Rôle / Titre" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="border p-2 rounded-sm text-sm" />
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="border p-2 rounded-sm text-sm">
                    <option value="PARTENAIRE">Partenaire Stratégique</option>
                    <option value="INVESTISSEUR">Investisseur</option>
                    <option value="INSTITUTION">Institution / État</option>
                    <option value="PRESTATAIRE">Prestataire Clé</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                  <input type="text" placeholder="Téléphone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="border p-2 rounded-sm text-sm" />
                  <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="border p-2 rounded-sm text-sm" />
                  <textarea placeholder="Notes (Protocoles, particularités, préférences...)" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="border p-2 rounded-sm text-sm col-span-2 h-20" />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
                  <button onClick={handleSaveContact} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-sm font-semibold">Enregistrer</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {assistantContacts.map((c: AssistantContact) => (
                <div key={c.id} className="vip-card bg-white border border-slate-200 rounded-sm p-4 relative group hover:border-purple-300 transition-colors">
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setFormData(c); setEditingId(c.id); setShowForm(true); }} className="p-1.5 bg-slate-100 text-slate-600 hover:text-purple-600 rounded"><Edit2 size={14}/></button>
                    <button onClick={() => crudDeleteItem('assistantContacts', c.id, 'Suppression contact')} className="p-1.5 bg-slate-100 text-slate-600 hover:text-rose-600 rounded"><Trash2 size={14}/></button>
                  </div>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">{c.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">{c.role} @ {c.organization}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {c.phone || '-'}</div>
                    <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /> {c.email || '-'}</div>
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded">{c.category}</span>
                    {c.isVip && <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1"><Star size={12} className="fill-amber-600" /> VIP</span>}
                  </div>
                </div>
              ))}
              {assistantContacts.length === 0 && <div className="col-span-full py-8 text-center text-slate-400">Aucun contact VIP dans le carnet.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
