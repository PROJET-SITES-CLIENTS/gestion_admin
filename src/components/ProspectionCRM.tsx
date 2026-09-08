import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../store';
import { Prospect, ProspectStage, ProspectQualification, ProspectMeeting } from '../types';
import { Plus, X, Phone, Mail, Calendar, Upload, AlertCircle, Save, Clock, Search, LayoutGrid, List, ArrowRight, DollarSign, Target, Briefcase, Video, Mic } from 'lucide-react';

const STAGE_COLUMNS: { id: ProspectStage; label: string; color: string }[] = [
  { id: 'NOUVEAU', label: 'Nouveau', color: 'border-blue-200 bg-blue-50' },
  { id: 'CONTACTE', label: 'Contacté', color: 'border-indigo-200 bg-indigo-50' },
  { id: 'RDV_FIXE', label: 'RDV Fixé', color: 'border-purple-200 bg-purple-50' },
  { id: 'PROPOSITION', label: 'Devis Envoyé', color: 'border-amber-200 bg-amber-50' },
  { id: 'NEGOCIATION', label: 'Négociation', color: 'border-orange-200 bg-orange-50' },
  { id: 'GAGNE', label: 'Gagné', color: 'border-emerald-200 bg-emerald-50' },
  { id: 'PERDU', label: 'Perdu', color: 'border-rose-200 bg-rose-50' },
];

export const ProspectionCRM: React.FC = () => {
  const { prospects, addProspect, updateProspect, convertProspectToProject, deleteProspect, currentUser, systemUsers, currentRole } = useApp();
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [newInteractionNote, setNewInteractionNote] = useState('');
  
  // Meeting states
  const [newMeetingDate, setNewMeetingDate] = useState('');
  const [newMeetingTime, setNewMeetingTime] = useState('');
  const [newMeetingLocation, setNewMeetingLocation] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOwnerId, setFilterOwnerId] = useState<string>('ALL');
  const [filterTag, setFilterTag] = useState<string>('');
  const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST'>('KANBAN');
  const [activeTab, setActiveTab] = useState<'INFOS' | 'CALLS' | 'MEETINGS' | 'AUDIT'>('INFOS');
  const [isRecording, setIsRecording] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOverdue = (date?: string) => {
    if (!date) return false;
    return new Date(date).getTime() < new Date().setHours(0, 0, 0, 0);
  };

  const handleManualAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    if (!name || !phone) return;

    addProspect({
      name,
      phone,
      email: formData.get('email') as string,
      source: 'Ajout Manuel',
      qualification: 'NON_QUALIFIE',
      stage: 'NOUVEAU',
      interactions: [],
      meetings: [],
      history: [{
        id: Date.now().toString(),
        date: new Date().toISOString(),
        action: 'Création du prospect',
        user: currentUser?.firstName + ' ' + currentUser?.lastName
      }],
    });
    e.currentTarget.reset();
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim() !== '');
      if (lines.length < 2) {
        alert("Fichier CSV invalide ou vide.");
        return;
      }
      let importedCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        if (cols.length >= 2 && cols[0]) {
          await addProspect({
            name: cols[0],
            phone: cols[1],
            email: cols[2] || '',
            source: cols[3] || 'Import CSV',
            qualification: 'NON_QUALIFIE',
            stage: 'NOUVEAU',
            interactions: [],
            meetings: [],
            history: [{
              id: Date.now().toString() + Math.random(),
              date: new Date().toISOString(),
              action: 'Import CSV',
              user: currentUser?.firstName + ' ' + currentUser?.lastName
            }]
          });
          importedCount++;
        }
      }
      alert(`${importedCount} prospects importés avec succès !`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const saveInteraction = () => {
    if (!selectedProspect || !newInteractionNote.trim()) return;

    const newInteraction = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      notes: newInteractionNote
    };

    const newHistory = {
      id: Date.now().toString() + Math.random(),
      date: new Date().toISOString(),
      action: 'Nouvelle interaction ajoutée',
      user: currentUser?.firstName + ' ' + currentUser?.lastName
    };
    
    updateProspect(selectedProspect.id, { 
      interactions: [...(selectedProspect.interactions || []), newInteraction],
      history: [...(selectedProspect.history || []), newHistory]
    });
    
    setSelectedProspect({
      ...selectedProspect,
      interactions: [...(selectedProspect.interactions || []), newInteraction],
      history: [...(selectedProspect.history || []), newHistory]
    });
    
    setNewInteractionNote('');
  };

  const saveMeeting = () => {
    if (!selectedProspect || !newMeetingDate || !newMeetingTime) return;

    const newMeeting = {
      id: Date.now().toString(),
      date: newMeetingDate,
      time: newMeetingTime,
      location: newMeetingLocation || 'À définir',
      status: 'SCHEDULED' as const
    };

    const newHistory = {
      id: Date.now().toString() + Math.random(),
      date: new Date().toISOString(),
      action: `Nouveau RDV programmé le ${newMeetingDate} à ${newMeetingTime}`,
      user: currentUser?.firstName + ' ' + currentUser?.lastName
    };
    
    // C10 (mineur P9) : le RDV ne RÉTROGRADE plus un prospect avancé —
    // seuls les stages précoces passent automatiquement à RDV_FIXE
    // (avant : un prospect GAGNE/NEGOCIATION retombait à RDV_FIXE).
    const NON_REGRESSIFS = ['NEGOCIATION', 'PROPOSITION', 'GAGNE', 'PERDU'];
    const newStage = NON_REGRESSIFS.includes(selectedProspect.stage) ? selectedProspect.stage : 'RDV_FIXE';

    updateProspect(selectedProspect.id, {
      meetings: [...(selectedProspect.meetings || []), newMeeting],
      history: [...(selectedProspect.history || []), newHistory],
      stage: newStage
    });

    setSelectedProspect({
      ...selectedProspect,
      meetings: [...(selectedProspect.meetings || []), newMeeting],
      history: [...(selectedProspect.history || []), newHistory],
      stage: newStage
    });
    
    setNewMeetingDate('');
    setNewMeetingTime('');
    setNewMeetingLocation('');
  };

  const updateProspectField = (field: keyof Prospect, value: any, actionDesc?: string) => {
    if (!selectedProspect) return;
    const updated = { ...selectedProspect, [field]: value };
    
    if (actionDesc) {
      updated.history = [...(updated.history || []), {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        action: actionDesc,
        user: currentUser?.firstName + ' ' + currentUser?.lastName
      }];
    }
    
    updateProspect(selectedProspect.id, updated);
    setSelectedProspect(updated);
  };

  const activeProspects = useMemo(() => {
    return prospects.filter(p => {
      // Pour les commerciaux, forcer le filtre sur eux-mêmes
      if (currentRole === 'COMMERCIAL' && p.ownerId && p.ownerId !== currentUser?.id) {
        return false; // Ils ne voient que les leurs ou les non-attribués
      }
      
      if (filterOwnerId !== 'ALL') {
        if (filterOwnerId === 'UNASSIGNED' && p.ownerId) return false;
        if (filterOwnerId !== 'UNASSIGNED' && p.ownerId !== filterOwnerId) return false;
      }
      
      if (filterTag && (!p.tags || !p.tags.includes(filterTag))) {
        return false;
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return p.name?.toLowerCase().includes(term) || p.phone?.includes(term) || (p.email && p.email.toLowerCase().includes(term)) || (p.company && p.company.toLowerCase().includes(term));
      }
      return true;
    });
  }, [prospects, searchTerm, filterOwnerId, filterTag, currentRole, currentUser]);

  // Tous les tags existants pour le dropdown
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    prospects.forEach(p => {
      p.tags?.forEach(t => tags.add(t));
    });
    return Array.from(tags);
  }, [prospects]);

  // KPIs
  const totalPipelineValue = useMemo(() => {
    return prospects
      .filter(p => p.stage !== 'PERDU' && p.stage !== 'GAGNE')
      .reduce((acc, p) => {
        const val = parseInt((p.estimatedBudget || '0').replace(/[^0-9]/g, ''), 10);
        const prob = p.probability !== undefined && p.probability !== null ? p.probability : 50; // Probabilité par défaut
        return acc + (isNaN(val) ? 0 : (val * prob) / 100);
      }, 0);
  }, [prospects]);

  const activeLeads = prospects.filter(p => p.stage !== 'PERDU' && p.stage !== 'GAGNE').length;
  const wonLeads = prospects.filter(p => p.stage === 'GAGNE').length;
  const conversionRate = prospects.length > 0 ? Math.round((wonLeads / prospects.length) * 100) : 0;
  
  const today = new Date().toISOString().split('T')[0];
  const meetingsToday = prospects.flatMap(p => p.meetings || []).filter(m => m.date === today && m.status === 'SCHEDULED').length;

  // Drag & Drop Handlers
  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('prospectId', id);
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const onDrop = (e: React.DragEvent, newStage: ProspectStage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('prospectId');
    const p = prospects.find(x => x.id === id);
    if (!p || p.stage === newStage) return;

    // ══════════════════════════════════════════════════════════
    // C10 : le glisser-déposer suit désormais une LOGIQUE métier —
    // • GAGNE : réservé au bouton « Gagner l'Affaire » (création du
    //   projet + gardes). Le drag vers GAGNE est refusé.
    // • PERDU : un motif OBLIGATOIRE est demandé et historisé.
    // • Sortie de GAGNE/PERDU : confirmation explicite.
    // ══════════════════════════════════════════════════════════
    if (newStage === 'GAGNE') {
      alert('Pour gagner cette affaire, utilisez le bouton « Gagner l\'Affaire (Créer Projet) » — il crée le projet et vérifie les doublons.');
      return;
    }
    let extraUpdates: Partial<Prospect> = {};
    if (newStage === 'PERDU') {
      const motif = window.prompt('Motif de la perte (obligatoire) :');
      if (!motif || !motif.trim()) return;
      extraUpdates = { lossReason: motif.trim() } as any;
    }
    if (['GAGNE', 'PERDU'].includes(p.stage)) {
      const ok = window.confirm(`Ce prospect est « ${p.stage} ». Le replacer dans le pipeline ?`);
      if (!ok) return;
    }

    const historyEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      action: `Déplacé de ${p.stage} vers ${newStage}${newStage === 'PERDU' ? ' (perte)' : ''}`,
      user: currentUser?.firstName + ' ' + currentUser?.lastName
    };
    updateProspect(id, {
      stage: newStage,
      history: [...(p.history || []), historyEntry],
      ...extraUpdates,
    });
    if (selectedProspect && selectedProspect.id === id) {
      setSelectedProspect({ ...selectedProspect, stage: newStage, history: [...(selectedProspect.history || []), historyEntry], ...extraUpdates } as Prospect);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPIs Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full"><Target size={20}/></div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Leads Actifs</p>
            <p className="text-xl font-bold text-slate-900">{activeLeads}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full"><DollarSign size={20}/></div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Valeur Pipeline</p>
            <p className="text-xl font-bold text-slate-900">{totalPipelineValue.toLocaleString('fr-FR')} GNF</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-full"><Video size={20}/></div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">RDV du Jour</p>
            <p className="text-xl font-bold text-slate-900">{meetingsToday}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-full"><Briefcase size={20}/></div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Taux de Conversion</p>
            <p className="text-xl font-bold text-slate-900">{conversionRate}%</p>
          </div>
        </div>
      </div>

      {/* Top Actions & Filters */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-white p-4 rounded-sm border border-slate-200 shadow-sm">
        <form onSubmit={handleManualAdd} className="flex gap-2 w-full xl:w-auto">
          <input name="name" type="text" placeholder="Nom complet" className="border border-slate-200 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-slate-400" required />
          <input name="phone" type="text" placeholder="Téléphone" className="border border-slate-200 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-slate-400" required />
          <button type="submit" className="bg-slate-900 text-white px-4 py-2 text-sm rounded-sm hover:bg-slate-800 flex items-center gap-2 whitespace-nowrap">
            <Plus size={16} /> Ajouter Rapide
          </button>
        </form>

        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto items-center">
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
            <div className="relative flex-shrink-0 w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Rechercher prospect, entreprise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-slate-200 pl-9 pr-3 py-2 text-sm rounded-sm focus:outline-none focus:border-slate-400" 
              />
            </div>
            
            {currentRole === 'GERANT' && (
              <select 
                value={filterOwnerId}
                onChange={(e) => setFilterOwnerId(e.target.value)}
                className="border border-slate-200 py-2 px-3 text-sm rounded-sm focus:outline-none focus:border-slate-400 bg-white"
              >
                <option value="ALL">Tous les commerciaux</option>
                <option value="UNASSIGNED">Non attribués</option>
                {systemUsers.filter(u => u.role === 'COMMERCIAL').map(u => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            )}

            <select 
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="border border-slate-200 py-2 px-3 text-sm rounded-sm focus:outline-none focus:border-slate-400 bg-white"
            >
              <option value="">Tous les tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button 
              onClick={() => setIsRecording(!isRecording)} 
              className={`border px-3 py-2 text-sm rounded-sm flex items-center gap-2 whitespace-nowrap transition-colors ${isRecording ? 'border-red-200 bg-red-50 text-red-600 animate-pulse' : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
            >
              <Mic size={16} /> {isRecording ? 'Écoute en cours...' : 'Agent IA Vocal'}
            </button>
            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleCsvImport} />
            <button onClick={() => fileInputRef.current?.click()} className="border border-slate-200 text-slate-700 px-3 py-2 text-sm rounded-sm hover:bg-slate-50 flex items-center gap-2 whitespace-nowrap">
              <Upload size={16} /> Import CSV
            </button>
            <div className="flex bg-slate-100 rounded-sm p-1 ml-2">
              <button onClick={() => setViewMode('KANBAN')} className={`p-1.5 rounded-sm ${viewMode === 'KANBAN' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`} title="Vue Kanban">
                <LayoutGrid size={16}/>
              </button>
              <button onClick={() => setViewMode('LIST')} className={`p-1.5 rounded-sm ${viewMode === 'LIST' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`} title="Vue Liste">
                <List size={16}/>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main View */}
      {viewMode === 'KANBAN' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[500px]">
          {STAGE_COLUMNS.map(col => {
            const colProspects = activeProspects.filter(p => p.stage === col.id);
            return (
              <div 
                key={col.id} 
                className={`rounded-sm border ${col.color} min-w-[280px] w-[280px] flex flex-col shrink-0`}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, col.id)}
              >
                <div className={`p-3 border-b border-slate-200/50 flex justify-between items-center`}>
                  <h3 className="font-semibold text-slate-800 text-sm">{col.label}</h3>
                  <span className="bg-white/50 text-slate-700 text-xs py-0.5 px-2 rounded-full font-medium">{colProspects.length}</span>
                </div>
                <div className="p-3 flex-1 flex flex-col gap-3 min-h-[200px]">
                  {colProspects.map(p => (
                    <div 
                      key={p.id} 
                      draggable
                      onDragStart={(e) => onDragStart(e, p.id)}
                      onClick={() => { setSelectedProspect(p); setActiveTab('INFOS'); }}
                      className="bg-white p-3 rounded-sm border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group relative"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-slate-800 text-sm line-clamp-1 pr-4">{p.name}</h4>
                        <span className={`absolute top-3 right-3 w-2 h-2 rounded-full ${
                          p.qualification === 'CHAUD' ? 'bg-red-500' : p.qualification === 'TIEDE' ? 'bg-orange-400' : p.qualification === 'FROID' ? 'bg-blue-400' : 'bg-slate-300'
                        }`} title={`Qualification: ${p.qualification}`} />
                      </div>
                      <div className="text-xs text-slate-500 flex flex-col gap-1.5">
                        <span className="flex items-center gap-1.5"><Phone size={12}/> {p.phone}</span>
                        {p.nextActionDate && (
                          <span className={`flex items-center gap-1.5 ${isOverdue(p.nextActionDate) ? 'text-red-600 font-medium' : ''}`}>
                            <AlertCircle size={12}/> Relance: {new Date(p.nextActionDate).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                        {p.estimatedBudget && <span className="font-semibold text-slate-700 mt-1">{p.estimatedBudget}</span>}
                      </div>
                    </div>
                  ))}
                  {colProspects.length === 0 && (
                    <div className="border-2 border-dashed border-slate-300/50 rounded-sm h-full min-h-[80px] flex items-center justify-center text-xs text-slate-400">
                      Déposer ici
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-sm border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Prospect</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Qualification</th>
                  <th className="px-4 py-3">Étape (Stage)</th>
                  <th className="px-4 py-3">Prochain Rappel</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeProspects.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Aucun prospect trouvé.</td></tr>
                ) : (
                  activeProspects.map(p => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer" onClick={() => { setSelectedProspect(p); setActiveTab('INFOS'); }}>
                    <td className="px-4 py-3 font-medium text-slate-900">{p.name}
                        <span className="block text-[10px] text-slate-400 font-normal">{p.source}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex items-center gap-1"><Phone size={12}/> {p.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-sm text-[10px] font-bold ${
                          p.qualification === 'CHAUD' ? 'bg-red-100 text-red-700' :
                          p.qualification === 'TIEDE' ? 'bg-orange-100 text-orange-700' :
                          p.qualification === 'FROID' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {p.qualification}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-sm border border-slate-200">
                          {p.stage.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.nextActionDate && (
                          <div className={`flex items-center gap-1.5 ${isOverdue(p.nextActionDate) ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                            {isOverdue(p.nextActionDate) ? <AlertCircle size={14}/> : <Calendar size={14}/>}
                            {new Date(p.nextActionDate).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-blue-600 hover:text-blue-800 font-medium" onClick={(e) => { e.stopPropagation(); setSelectedProspect(p); setActiveTab('INFOS'); }}>
                          Ouvrir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-over Drawer for Prospect Details */}
      {selectedProspect && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedProspect(null)} />
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-5 border-b border-slate-200 flex justify-between items-start bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedProspect.name}</h2>
                <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                  <span className="flex items-center gap-1"><Phone size={14}/> {selectedProspect.phone}</span>
                  {selectedProspect.email && <span className="flex items-center gap-1"><Mail size={14}/> {selectedProspect.email}</span>}
                </div>
              </div>
              <button onClick={() => setSelectedProspect(null)} className="p-2 hover:bg-slate-200 text-slate-500 rounded-full">
                <X size={18}/>
              </button>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-5">
              <button onClick={() => setActiveTab('INFOS')} className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'INFOS' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Informations</button>
              <button onClick={() => setActiveTab('CALLS')} className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'CALLS' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Appels & Notes</button>
              <button onClick={() => setActiveTab('MEETINGS')} className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'MEETINGS' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Rendez-vous</button>
              <button onClick={() => setActiveTab('AUDIT')} className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'AUDIT' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Historique</button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 bg-white space-y-6">
              
              {activeTab === 'INFOS' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Company & Job */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Entreprise</label>
                      <input 
                        type="text" 
                        value={selectedProspect.company || ''}
                        onChange={(e) => setSelectedProspect({...selectedProspect, company: e.target.value})}
                        onBlur={() => updateProspectField('company', selectedProspect.company)}
                        className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2"
                        placeholder="Nom de l'entreprise"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Poste occupé</label>
                      <input 
                        type="text" 
                        value={selectedProspect.jobTitle || ''}
                        onChange={(e) => setSelectedProspect({...selectedProspect, jobTitle: e.target.value})}
                        onBlur={() => updateProspectField('jobTitle', selectedProspect.jobTitle)}
                        className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2"
                        placeholder="Ex: Directeur Général"
                      />
                    </div>
                  </div>

                  {/* Status Controls */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Étape du Pipeline</label>
                        <select 
                          value={selectedProspect.stage}
                          onChange={(e) => updateProspectField('stage', e.target.value as ProspectStage, `Étape passée à ${e.target.value}`)}
                          className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2 bg-slate-50 font-medium"
                        >
                          {STAGE_COLUMNS.map(col => <option key={col.id} value={col.id}>{col.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Qualification</label>
                        <select 
                          value={selectedProspect.qualification}
                          onChange={(e) => updateProspectField('qualification', e.target.value as ProspectQualification, `Qualification modifiée à ${e.target.value}`)}
                          className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2"
                        >
                          <option value="NON_QUALIFIE">Non Qualifié</option>
                          <option value="FROID">Froid</option>
                          <option value="TIEDE">Tiède</option>
                          <option value="CHAUD">Chaud 🔥</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Probabilité de closing : {selectedProspect.probability !== undefined && selectedProspect.probability !== null ? selectedProspect.probability : 50}%</label>
                        <input 
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={selectedProspect.probability !== undefined && selectedProspect.probability !== null ? selectedProspect.probability : 50}
                          onChange={(e) => setSelectedProspect({...selectedProspect, probability: Number(e.target.value)})}
                          onBlur={() => updateProspectField('probability', selectedProspect.probability, `Probabilité mise à jour: ${selectedProspect.probability}%`)}
                          className="w-full mt-2"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tags (séparés par virgule)</label>
                        <input 
                          type="text" 
                          value={selectedProspect.tags?.join(', ') || ''}
                          onChange={(e) => setSelectedProspect({...selectedProspect, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})}
                          onBlur={() => updateProspectField('tags', selectedProspect.tags)}
                          className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2"
                          placeholder="Ex: VIP, Urgent, BTP"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Prochaine relance</label>
                      <input 
                        type="date" 
                        value={selectedProspect.nextActionDate ? selectedProspect.nextActionDate.split('T')[0] : ''}
                        onChange={(e) => {
                          const d = e.target.value ? new Date(e.target.value).toISOString() : undefined;
                          updateProspectField('nextActionDate', d, `Relance programmée au ${e.target.value}`);
                        }}
                        className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2"
                      />
                    </div>
                    {currentRole === 'GERANT' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Attribué à (Commercial)</label>
                        <select
                          value={selectedProspect.ownerId || ''}
                          onChange={(e) => updateProspectField('ownerId', e.target.value, 'Attribution modifiée')}
                          className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2 bg-slate-50 font-medium"
                        >
                          <option value="">-- Non attribué --</option>
                          {systemUsers.filter(u => u.role === 'COMMERCIAL').map(u => (
                            <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <hr className="border-slate-100" />

                  {/* Formulaire de Besoins */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800 text-sm">Besoins du Prospect</h3>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Type de Projet</label>
                      <input 
                        type="text" 
                        value={selectedProspect.projectType || ''}
                        onChange={(e) => setSelectedProspect({...selectedProspect, projectType: e.target.value})}
                        onBlur={() => updateProspectField('projectType', selectedProspect.projectType)}
                        className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Budget Estimé (GNF)</label>
                      <input 
                        type="text" 
                        value={selectedProspect.estimatedBudget || ''}
                        onChange={(e) => setSelectedProspect({...selectedProspect, estimatedBudget: e.target.value})}
                        onBlur={() => updateProspectField('estimatedBudget', selectedProspect.estimatedBudget)}
                        className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Objectifs Principaux</label>
                      <textarea 
                        value={selectedProspect.objectives || ''}
                        onChange={(e) => setSelectedProspect({...selectedProspect, objectives: e.target.value})}
                        onBlur={() => updateProspectField('objectives', selectedProspect.objectives)}
                        className="w-full border border-slate-300 rounded-sm text-sm p-3 min-h-[100px]"
                      />
                    </div>
                  </div>

                  {selectedProspect.qualification === 'CHAUD' && selectedProspect.stage !== 'GAGNE' && (
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-sm mt-6">
                      <p className="text-xs text-emerald-800 mb-3 font-medium">Ce prospect est qualifié "Chaud". Vous pouvez maintenant le convertir en projet officiel.</p>
                      <button
                        onClick={async () => {
                          if (!window.confirm("Créer un projet officiel avec ce prospect ?")) return;
                          // C11 : le RÉSULTAT de la conversion est géré — avant,
                          // un refus de doublon ou un échec réseau marquait quand
                          // même le prospect GAGNE avec une alerte de faux succès.
                          const result = await convertProspectToProject(selectedProspect.id);
                          if (result) {
                            alert("Prospect converti en Projet avec succès !");
                            setSelectedProspect(null);
                          } else {
                            alert("Conversion non aboutie (doublon refusé ou erreur réseau) — le prospect reste à son étape actuelle.");
                          }
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-sm text-sm font-semibold flex justify-center items-center gap-2 transition-colors"
                      >
                        Gagner l'Affaire (Créer Projet) <ArrowRight size={16}/>
                      </button>
                    </div>
                  )}

                  <div className="pt-6 border-t border-slate-100">
                    <button 
                      onClick={async () => {
                        if (window.confirm(`Supprimer le prospect "${selectedProspect.name}" ?`)) {
                          await deleteProspect(selectedProspect.id);
                          setSelectedProspect(null);
                        }
                      }}
                      className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 py-2.5 rounded-sm text-xs font-semibold flex justify-center items-center gap-2 transition-colors"
                    >
                      <X size={14}/> Supprimer définitivement
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'CALLS' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="space-y-2 bg-slate-50 p-4 rounded-sm border border-slate-200">
                    <h3 className="font-semibold text-slate-800 text-sm mb-2">Nouvel Appel / Note</h3>
                    <textarea 
                      placeholder="Résumé de la conversation..."
                      value={newInteractionNote}
                      onChange={(e) => setNewInteractionNote(e.target.value)}
                      className="w-full border border-slate-300 rounded-sm text-sm p-3 min-h-[100px]"
                    />
                    <button 
                      onClick={saveInteraction}
                      disabled={!newInteractionNote.trim()}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-sm text-xs font-semibold flex justify-center items-center gap-2 disabled:opacity-50 transition-colors"
                    >
                      <Save size={14}/> Enregistrer la note
                    </button>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-slate-800 text-sm mb-3">Historique des Appels</h3>
                    {(!selectedProspect.interactions || selectedProspect.interactions.length === 0) ? (
                      <p className="text-xs text-slate-500 italic">Aucune interaction consignée.</p>
                    ) : (
                      [...selectedProspect.interactions].reverse().map(inter => (
                        <div key={inter.id} className="bg-white p-4 rounded-sm border border-slate-200 text-sm shadow-sm">
                          <div className="text-slate-400 text-xs mb-2 font-medium flex items-center gap-2">
                            <Phone size={12}/>
                            {new Date(inter.date).toLocaleString('fr-FR')}
                          </div>
                          <div className="text-slate-800 whitespace-pre-wrap">{inter.notes}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'MEETINGS' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="bg-slate-50 p-4 rounded-sm border border-slate-200 space-y-4">
                    <h3 className="font-semibold text-slate-800 text-sm">Planifier un Rendez-vous</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Date</label>
                        <input type="date" value={newMeetingDate} onChange={(e) => setNewMeetingDate(e.target.value)} className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Heure</label>
                        <input type="time" value={newMeetingTime} onChange={(e) => setNewMeetingTime(e.target.value)} className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Lieu / Lien Visio</label>
                      <input type="text" placeholder="Ex: Google Meet, Bureaux de l'entreprise..." value={newMeetingLocation} onChange={(e) => setNewMeetingLocation(e.target.value)} className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2" />
                    </div>
                    <button 
                      onClick={saveMeeting}
                      disabled={!newMeetingDate || !newMeetingTime}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-sm text-xs font-semibold flex justify-center items-center gap-2 disabled:opacity-50 transition-colors"
                    >
                      <Calendar size={14}/> Booker le RDV
                    </button>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-slate-800 text-sm mb-3">Rendez-vous programmés</h3>
                    {(!selectedProspect.meetings || selectedProspect.meetings.length === 0) ? (
                      <p className="text-xs text-slate-500 italic">Aucun rendez-vous.</p>
                    ) : (
                      [...selectedProspect.meetings].reverse().map(meeting => (
                        <div key={meeting.id} className="bg-white p-4 rounded-sm border border-slate-200 text-sm shadow-sm relative overflow-hidden">
                          <div className={`absolute top-0 left-0 w-1 h-full ${meeting.status === 'SCHEDULED' ? 'bg-blue-500' : meeting.status === 'HELD' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <div className="flex justify-between items-start ml-2">
                            <div>
                              <p className="font-semibold text-slate-800">{new Date(meeting.date).toLocaleDateString('fr-FR')} à {meeting.time}</p>
                              <p className="text-slate-500 text-xs mt-1">📍 {meeting.location}</p>
                            </div>
                            <select 
                              value={meeting.status}
                              onChange={(e) => {
                                const newStatus = e.target.value as any;
                                const updatedMeetings = selectedProspect.meetings.map(m => m.id === meeting.id ? { ...m, status: newStatus } : m);
                                updateProspectField('meetings', updatedMeetings, `Le RDV du ${meeting.date} est passé en statut ${newStatus}`);
                              }}
                              className={`text-xs font-semibold px-2 py-1 rounded border-0 outline-none ${
                                meeting.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700' : 
                                meeting.status === 'HELD' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                              }`}
                            >
                              <option value="SCHEDULED">Prévu</option>
                              <option value="HELD">Effectué</option>
                              <option value="CANCELLED">Annulé</option>
                              <option value="NO_SHOW">Absent</option>
                            </select>
                          </div>
                          
                          {/* Compte Rendu (Si effectué) */}
                          <div className="mt-4 ml-2">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Compte-rendu du RDV</label>
                            <textarea 
                              placeholder="Notes post-meeting..."
                              value={meeting.report || ''}
                              onChange={(e) => {
                                const updatedMeetings = selectedProspect.meetings.map(m => m.id === meeting.id ? { ...m, report: e.target.value } : m);
                                setSelectedProspect({...selectedProspect, meetings: updatedMeetings});
                              }}
                              onBlur={() => updateProspectField('meetings', selectedProspect.meetings)}
                              className="w-full border border-slate-200 rounded-sm text-xs p-2 min-h-[60px] bg-slate-50 focus:bg-white transition-colors"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'AUDIT' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {(!selectedProspect.history || selectedProspect.history.length === 0) ? (
                    <p className="text-xs text-slate-500 italic">Aucun historique.</p>
                  ) : (
                    <div className="relative border-l border-slate-200 ml-3 space-y-6 pb-4">
                      {[...selectedProspect.history].reverse().map((hist, index) => (
                        <div key={hist.id + index} className="relative pl-6">
                          <span className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-slate-200 border-2 border-white" />
                          <p className="text-sm text-slate-800 font-medium">{hist.action}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(hist.date).toLocaleString('fr-FR')} {hist.user ? `par ${hist.user}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
