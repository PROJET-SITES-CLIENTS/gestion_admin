import React, { useState } from 'react';
import { useApp } from '../../store';
import { AssistantMeeting, AssistantTravel } from '../../types';
import { Calendar as CalendarIcon, Clock, MapPin, Users, Plane, Plus, Trash2, Edit2, Play, Check } from 'lucide-react';

export default function AssistantAgenda() {
  const { assistantMeetings, assistantTravels, crudCreateItem, crudUpdateItem, crudDeleteItem } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'MEETINGS' | 'TRAVELS'>('MEETINGS');

  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingForm, setMeetingForm] = useState<Partial<AssistantMeeting>>({
    title: '', date: '', time: '', location: '', participants: '', agenda: '', status: 'PLANNED'
  });
  
  const [showTravelForm, setShowTravelForm] = useState(false);
  const [travelForm, setTravelForm] = useState<Partial<AssistantTravel>>({
    destination: '', startDate: '', endDate: '', purpose: '', budget: 0, status: 'PLANNED'
  });

  const handleSaveMeeting = async () => {
    if (!meetingForm.title) return;
    await crudCreateItem('assistantMeetings', meetingForm, 'Création réunion');
    setShowMeetingForm(false);
    setMeetingForm({ title: '', date: '', time: '', location: '', participants: '', agenda: '', status: 'PLANNED' });
  };

  const handleSaveTravel = async () => {
    if (!travelForm.destination) return;
    await crudCreateItem('assistantTravels', travelForm, 'Création déplacement');
    setShowTravelForm(false);
    setTravelForm({ destination: '', startDate: '', endDate: '', purpose: '', budget: 0, status: 'PLANNED' });
  };

  return (
    <div className="space-y-6 flex flex-col h-full min-h-0">
      <div className="flex justify-between items-center bg-white p-4 rounded-sm border border-slate-200 shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Organisation du Temps</h2>
          <p className="text-sm text-slate-500">Réunions stratégiques et déplacements officiels</p>
        </div>
        <div className="flex border border-slate-200 rounded-sm overflow-hidden bg-slate-50 p-1 gap-1">
          <button onClick={() => setActiveSubTab('MEETINGS')} className={`px-4 py-1.5 text-sm font-semibold rounded-sm transition-colors flex items-center gap-2 ${activeSubTab === 'MEETINGS' ? 'bg-white shadow-sm text-purple-700' : 'text-slate-500 hover:text-slate-800'}`}>
            <CalendarIcon size={16} /> Réunions & Comités
          </button>
          <button onClick={() => setActiveSubTab('TRAVELS')} className={`px-4 py-1.5 text-sm font-semibold rounded-sm transition-colors flex items-center gap-2 ${activeSubTab === 'TRAVELS' ? 'bg-white shadow-sm text-purple-700' : 'text-slate-500 hover:text-slate-800'}`}>
            <Plane size={16} /> Déplacements
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeSubTab === 'MEETINGS' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Users className="text-purple-500" size={20} /> Comités et Réunions de Direction
              </h3>
              <button onClick={() => setShowMeetingForm(!showMeetingForm)} className="bg-purple-600 text-white px-3 py-1.5 rounded-sm text-sm font-semibold hover:bg-purple-700 flex items-center gap-2">
                <Plus size={16} /> Nouvelle Réunion
              </button>
            </div>

            {showMeetingForm && (
              <div className="bg-white p-4 rounded-sm border border-slate-200 space-y-4 shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Titre / Objet" value={meetingForm.title} onChange={e => setMeetingForm({...meetingForm, title: e.target.value})} className="border p-2 rounded-sm text-sm" />
                  <input type="text" placeholder="Lieu / Lien visio" value={meetingForm.location} onChange={e => setMeetingForm({...meetingForm, location: e.target.value})} className="border p-2 rounded-sm text-sm" />
                  <input type="date" value={meetingForm.date || ''} onChange={e => setMeetingForm({...meetingForm, date: e.target.value})} className="border p-2 rounded-sm text-sm" />
                  <input type="time" value={meetingForm.time || ''} onChange={e => setMeetingForm({...meetingForm, time: e.target.value})} className="border p-2 rounded-sm text-sm" />
                  <input type="text" placeholder="Participants (ex: DG, DAF...)" value={meetingForm.participants} onChange={e => setMeetingForm({...meetingForm, participants: e.target.value})} className="col-span-2 border p-2 rounded-sm text-sm" />
                  <textarea placeholder="Ordre du jour" value={meetingForm.agenda} onChange={e => setMeetingForm({...meetingForm, agenda: e.target.value})} className="col-span-2 border p-2 rounded-sm text-sm h-20" />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowMeetingForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
                  <button onClick={handleSaveMeeting} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-sm font-semibold">Enregistrer</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assistantMeetings.map((m: AssistantMeeting) => (
                <div key={m.id} className="bg-white border border-slate-200 rounded-sm p-5 relative group">
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => crudUpdateItem('assistantMeetings', m.id, { status: m.status === 'PLANNED' ? 'HELD' : 'PLANNED' }, 'Statut')} className="p-1.5 bg-slate-100 text-slate-600 hover:text-emerald-600 rounded" title="Marquer comme tenue"><Check size={14}/></button>
                    <button onClick={() => crudDeleteItem('assistantMeetings', m.id, 'Suppression')} className="p-1.5 bg-slate-100 text-slate-600 hover:text-rose-600 rounded"><Trash2 size={14}/></button>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-14 shrink-0 text-center flex flex-col items-center justify-center bg-purple-50 text-purple-700 rounded py-2">
                      <span className="text-[10px] font-bold uppercase">{m.date ? new Date(m.date).toLocaleString('fr-FR', { month: 'short' }) : '-'}</span>
                      <span className="text-xl font-bold leading-none">{m.date ? new Date(m.date).getDate() : '-'}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">{m.title}</h4>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 font-medium">
                        <span className="flex items-center gap-1"><Clock size={12}/> {m.time}</span>
                        <span className="flex items-center gap-1"><MapPin size={12}/> {m.location}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-2"><strong>Avec :</strong> {m.participants}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${m.status === 'HELD' ? 'bg-emerald-100 text-emerald-700' : m.status === 'CANCELED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                      {m.status === 'HELD' ? 'Tenue' : m.status === 'CANCELED' ? 'Annulée' : 'Planifiée'}
                    </span>
                    {m.status === 'HELD' && (
                      <button 
                        onClick={() => {
                          const cr = prompt('Compte Rendu de la réunion :', m.report || '');
                          if (cr !== null) {
                            crudUpdateItem('assistantMeetings', m.id, { report: cr }, 'Mise à jour CR');
                          }
                        }}
                        className={`text-xs font-semibold hover:underline ${m.report ? 'text-emerald-600' : 'text-purple-600'}`}
                      >
                        {m.report ? 'Voir / Modifier C.R.' : 'Rédiger C.R.'}
                      </button>
                    )}
                  </div>
                  {m.report && m.status === 'HELD' && (
                    <div className="mt-3 bg-slate-50 p-3 rounded text-sm text-slate-700 border border-slate-100 whitespace-pre-wrap">
                      <strong className="block text-xs uppercase text-slate-500 mb-1">Compte Rendu :</strong>
                      {m.report}
                    </div>
                  )}
                </div>
              ))}
              {assistantMeetings.length === 0 && <div className="col-span-full py-8 text-center text-slate-400">Aucune réunion planifiée.</div>}
            </div>
          </div>
        )}

        {activeSubTab === 'TRAVELS' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Plane className="text-purple-500" size={20} /> Feuilles de Route et Déplacements
              </h3>
              <button onClick={() => setShowTravelForm(!showTravelForm)} className="bg-purple-600 text-white px-3 py-1.5 rounded-sm text-sm font-semibold hover:bg-purple-700 flex items-center gap-2">
                <Plus size={16} /> Nouveau Déplacement
              </button>
            </div>

            {showTravelForm && (
              <div className="bg-white p-4 rounded-sm border border-slate-200 space-y-4 shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Destination (Ville, Pays)" value={travelForm.destination} onChange={e => setTravelForm({...travelForm, destination: e.target.value})} className="border p-2 rounded-sm text-sm" />
                  <input type="text" placeholder="Motif du déplacement" value={travelForm.purpose} onChange={e => setTravelForm({...travelForm, purpose: e.target.value})} className="border p-2 rounded-sm text-sm" />
                  <input type="date" title="Date de départ" value={travelForm.startDate || ''} onChange={e => setTravelForm({...travelForm, startDate: e.target.value})} className="border p-2 rounded-sm text-sm" />
                  <input type="date" title="Date de retour" value={travelForm.endDate || ''} onChange={e => setTravelForm({...travelForm, endDate: e.target.value})} className="border p-2 rounded-sm text-sm" />
                  <input type="number" placeholder="Budget prévisionnel (€/GNF)" value={travelForm.budget || ''} onChange={e => setTravelForm({...travelForm, budget: parseFloat(e.target.value)})} className="border p-2 rounded-sm text-sm col-span-2" />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowTravelForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
                  <button onClick={handleSaveTravel} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-sm font-semibold">Enregistrer</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assistantTravels.map((t: AssistantTravel) => (
                <div key={t.id} className="bg-white border border-slate-200 rounded-sm p-4 relative group">
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => crudDeleteItem('assistantTravels', t.id, 'Suppression')} className="p-1.5 bg-slate-100 text-slate-600 hover:text-rose-600 rounded"><Trash2 size={14}/></button>
                  </div>
                  <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <Plane size={18} className="text-slate-400" /> {t.destination}
                  </h4>
                  <p className="text-sm text-slate-600 mt-1">{t.purpose}</p>
                  
                  <div className="bg-slate-50 p-3 rounded text-sm text-slate-700 font-medium mt-3 flex justify-between items-center border border-slate-100">
                    <div>Du {new Date(t.startDate).toLocaleDateString('fr-FR')} au {new Date(t.endDate).toLocaleDateString('fr-FR')}</div>
                    <div className="text-purple-700">{t.budget.toLocaleString()} GNF</div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${t.status === 'COMPLETED' ? 'bg-slate-100 text-slate-700' : t.status === 'ONGOING' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {t.status === 'ONGOING' ? 'En cours' : t.status === 'COMPLETED' ? 'Terminé' : 'Planifié'}
                    </span>
                    <button className="text-xs text-purple-600 font-semibold hover:underline">Voir itinéraire</button>
                  </div>
                </div>
              ))}
              {assistantTravels.length === 0 && <div className="col-span-full py-8 text-center text-slate-400">Aucun déplacement planifié.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
