import React, { useState } from 'react';
import { useApp } from '../store';
import {
  Calendar as CalendarIcon, Inbox, Archive, MessageSquarePlus, PenTool, ClipboardList, Briefcase,
  ChevronLeft, ChevronRight, Plus, Clock, MapPin, CheckCircle2, Circle, AlertCircle, FileText, ArrowRight, Trash2,
  Wand2, Send, Save, Download, Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic, List
} from 'lucide-react';
import { CalendarEvent, ServiceCatalogItem } from '../types';

// Catalogue de services (référentiel produits — modifiable à terme via /api/crud)
const defaultCatalog: ServiceCatalogItem[] = [
  { id: 'cat1', category: 'Développement Web', name: 'Site Vitrine Standard', description: 'Création d\'un site vitrine 5 pages', basePrice: 1500 },
  { id: 'cat2', category: 'Développement Web', name: 'Boutique E-commerce', description: 'Site de vente en ligne complet', basePrice: 3500 },
  { id: 'cat3', category: 'Marketing', name: 'Campagne SEO Mensuelle', description: 'Optimisation SEO et netlinking', basePrice: 500 },
  { id: 'cat4', category: 'Design', name: 'Charte Graphique Pro', description: 'Logo, couleurs, typographie', basePrice: 800 },
];

const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export default function AssistantView() {
  const { companyConfig, agendaEvents, addAgendaEvent, deleteAgendaEvent, tasks, updateTaskStatus, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'AGENDA' | 'INBOX' | 'AGENT_ARIA' | 'BUILDER' | 'ARCHIVES'>('DASHBOARD');

  // Agenda State — PERSISTÉ via /api/crud/agendaEvents (plus de mocks)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', time: '09:00', description: '', type: 'MEETING' as CalendarEvent['type'] });

  // Inbox — tâches RÉELLES adressées à l'assistante (plus de mocks)
  const myTasks = tasks.filter(t => t.receiverRole === 'ASSISTANTE' && t.status !== 'DONE');

  // Agent Aria State
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatedDoc, setGeneratedDoc] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Builder State
  const [catalog] = useState<ServiceCatalogItem[]>(defaultCatalog);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [clientName, setClientName] = useState('');
  // Référence stable du devis (audit : Math.random à chaque re-render)
  const [devisRef] = useState(() => `DEV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`);

  const events = agendaEvents;
  const getEventsForDate = (date: string) => events.filter(e => e.date === date).sort((a, b) => a.time.localeCompare(b.time));

  const handleAddEvent = async () => {
    if (!newEvent.title.trim()) return;
    await addAgendaEvent({ ...newEvent, date: selectedDate });
    setNewEvent({ title: '', time: '09:00', description: '', type: 'MEETING' });
    setShowEventForm(false);
  };

  // Grille du calendrier : vraies semaines du mois affiché (lundi → dimanche)
  const calendarCells = (() => {
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
    // getDay(): 0=dimanche ; décalage pour commencer lundi
    const offset = (first.getDay() + 6) % 7;
    const cells: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  })();

  const handleGenerateDocument = () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    // Génération SIMULÉE (modèle local) — brancher une vraie IA nécessite une clé API sécurisée côté serveur.
    setTimeout(() => {
      setGeneratedDoc(`[EN-TÊTE DE L'ENTREPRISE]\n\nObjet : ${aiPrompt}\n\nMadame, Monsieur,\n\nSuite à votre demande concernant "${aiPrompt}", nous vous prions de bien vouloir trouver ci-joint les documents nécessaires.\n\nNous restons à votre entière disposition pour tout complément d'information.\n\nCordialement,\nLa Direction.`);
      setIsGenerating(false);
      setAiPrompt('');
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-2 shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 flex items-center gap-3">
            <Briefcase className="text-purple-600" size={32} />
            Direction Administrative
          </h1>
          <p className="text-slate-500 mt-1">
            Hub central : Gestion d'agenda, rédaction assistée par IA, et suivi des documents officiels.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab('DASHBOARD')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'DASHBOARD' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase size={16} /> Vue Globale
        </button>
        <button
          onClick={() => setActiveTab('AGENDA')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'AGENDA' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarIcon size={16} /> Agenda Direction
        </button>
        <button
          onClick={() => setActiveTab('INBOX')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'INBOX' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Inbox size={16} /> Requêtes
        </button>
        <button
          onClick={() => setActiveTab('AGENT_ARIA')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'AGENT_ARIA' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquarePlus size={16} /> Agent ARIA <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">DÉMO</span>
        </button>
        <button
          onClick={() => setActiveTab('BUILDER')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'BUILDER' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList size={16} /> Créateur de Devis
        </button>
        <button
          onClick={() => setActiveTab('ARCHIVES')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'ARCHIVES' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Archive size={16} /> GED & Archives
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        
        {/* TAB: DASHBOARD */}
        {activeTab === 'DASHBOARD' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 border border-slate-200 rounded-sm shadow-none flex flex-col items-center text-center gap-4 cursor-not-allowed opacity-60">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-sm flex items-center justify-center">
                <MessageSquarePlus size={28} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Agent ARIA (IA)</h3>
                <p className="text-xs text-slate-500 mt-1">Rédacteur de documents intelligent</p>
              </div>
              <span className="text-[10px] uppercase font-bold text-purple-500 tracking-widest mt-2">Bientôt (Phase 3)</span>
            </div>

            <div className="bg-white p-6 border border-slate-200 rounded-sm shadow-none flex flex-col items-center text-center gap-4 cursor-not-allowed opacity-60">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-sm flex items-center justify-center">
                <ClipboardList size={28} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Créateur de Devis</h3>
                <p className="text-xs text-slate-500 mt-1">Assemblage sur-mesure</p>
              </div>
              <span className="text-[10px] uppercase font-bold text-blue-500 tracking-widest mt-2">Bientôt (Phase 4)</span>
            </div>

            <div onClick={() => setActiveTab('INBOX')} className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm flex flex-col items-center text-center gap-4 cursor-pointer hover:border-purple-300 transition-colors group">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                <Inbox size={28} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Inbox ({myTasks.length})</h3>
                <p className="text-xs text-slate-500 mt-1">Requêtes internes à traiter</p>
              </div>
            </div>

            <div onClick={() => setActiveTab('AGENDA')} className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm flex flex-col items-center text-center gap-4 cursor-pointer hover:border-purple-300 transition-colors group">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                <CalendarIcon size={28} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Agenda</h3>
                <p className="text-xs text-slate-500 mt-1">{getEventsForDate(new Date().toISOString().split('T')[0]).length} événement(s) aujourd'hui</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB: AGENDA */}
        {activeTab === 'AGENDA' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Calendar Mini-View (Left) — dynamique, mois réels */}
            <div className="bg-white border border-slate-200 rounded-sm p-5 h-fit">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">{MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400 mb-2">
                <div>Lu</div><div>Ma</div><div>Me</div><div>Je</div><div>Ve</div><div>Sa</div><div>Di</div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-sm">
                {calendarCells.map((dateStr, i) => {
                  if (!dateStr) return <div key={`e${i}`} />;
                  const day = parseInt(dateStr.split('-')[2], 10);
                  const isSelected = selectedDate === dateStr;
                  const hasEvents = events.some(e => e.date === dateStr);
                  const isToday = dateStr === new Date().toISOString().split('T')[0];

                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`h-8 w-8 rounded-full flex items-center justify-center mx-auto relative ${
                        isSelected ? 'bg-purple-600 text-white font-bold' :
                        isToday ? 'bg-purple-50 text-purple-700 font-bold' :
                        'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {day}
                      {hasEvents && !isSelected && <span className="absolute bottom-1 w-1 h-1 bg-emerald-500 rounded-full"></span>}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setShowEventForm(!showEventForm)}
                className="w-full mt-6 py-2 bg-slate-900 text-white rounded-sm text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
              >
                <Plus size={16} /> Ajouter un événement
              </button>

              {showEventForm && (
                <div className="mt-4 space-y-2 border border-slate-200 rounded-sm p-3 bg-slate-50">
                  <input
                    type="text"
                    placeholder="Titre de l'événement"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full border border-slate-200 rounded-sm p-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                      className="flex-1 border border-slate-200 rounded-sm p-2 text-sm"
                    />
                    <select
                      value={newEvent.type}
                      onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as CalendarEvent['type'] })}
                      className="flex-1 border border-slate-200 rounded-sm p-2 text-sm"
                    >
                      <option value="MEETING">Réunion</option>
                      <option value="DEADLINE">Échéance</option>
                      <option value="REMINDER">Rappel</option>
                    </select>
                  </div>
                  <textarea
                    placeholder="Description (optionnel)"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full border border-slate-200 rounded-sm p-2 text-sm resize-none h-16"
                  />
                  <p className="text-[11px] text-slate-400">Ajouté au {new Date(selectedDate).toLocaleDateString('fr-FR')}</p>
                  <button
                    onClick={handleAddEvent}
                    disabled={!newEvent.title.trim()}
                    className="w-full py-2 bg-purple-600 text-white rounded-sm text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
                  >
                    Enregistrer
                  </button>
                </div>
              )}
            </div>

            {/* Daily Events (Right) */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-white border border-slate-200 rounded-sm p-5">
                <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2 mb-4">
                  <Clock className="text-purple-500" size={20} />
                  Planning du {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>

                <div className="space-y-3">
                  {getEventsForDate(selectedDate).length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      Aucun événement prévu pour cette date.
                    </div>
                  ) : (
                    getEventsForDate(selectedDate).map(event => (
                      <div key={event.id} className="flex gap-4 p-4 border border-slate-100 rounded-sm bg-slate-50/50 hover:bg-white transition-colors group">
                        <div className="w-16 shrink-0 text-center">
                          <div className="text-sm font-bold text-slate-800">{event.time}</div>
                          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-1">{event.type}</div>
                        </div>
                        <div className="w-1 shrink-0 rounded-full bg-purple-200 group-hover:bg-purple-500 transition-colors"></div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900">{event.title}</h4>
                          {event.description && <p className="text-sm text-slate-500 mt-1">{event.description}</p>}
                        </div>
                        <button
                          onClick={() => deleteAgendaEvent(event.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-all p-1 shrink-0"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: INBOX — tâches réelles adressées à l'assistante */}
        {activeTab === 'INBOX' && (
          <div className="bg-white border border-slate-200 rounded-sm p-6">
            <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2 mb-4">
              <Inbox className="text-purple-500" size={20} /> Requêtes internes ({myTasks.length} en cours)
            </h3>
            {myTasks.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                Aucune requête en attente. Les tâches adressées au rôle « Assistante » apparaissent ici.
              </div>
            ) : (
              <div className="space-y-3">
                {myTasks.map(t => (
                  <div key={t.id} className="flex gap-4 p-4 border border-slate-100 rounded-sm bg-slate-50/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900">{t.title}</h4>
                        {t.priority === 'HIGH' && <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">URGENT</span>}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{t.content}</p>
                      <p className="text-[11px] text-slate-400 mt-2">De : {t.senderName} · {new Date(t.createdAt).toLocaleString('fr-FR')}</p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {t.status === 'TODO' && (
                        <button onClick={() => updateTaskStatus(t.id, 'IN_PROGRESS')} className="px-3 py-1.5 bg-amber-500 text-white rounded text-xs font-semibold hover:bg-amber-600">
                          Démarrer
                        </button>
                      )}
                      <button onClick={() => updateTaskStatus(t.id, 'DONE')} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700">
                        Terminer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}        {/* TAB: AGENT ARIA */}
        {activeTab === 'AGENT_ARIA' && (
          <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Left: Chat AI */}
            <div className="w-full lg:w-1/3 bg-white border border-slate-200 rounded-sm flex flex-col h-[600px] lg:h-full">
              <div className="p-4 border-b border-slate-200 bg-purple-50/50 flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-sm flex items-center justify-center text-purple-600">
                  <Wand2 size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Agent ARIA</h3>
                  <p className="text-xs text-slate-500">Assistant de rédaction</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-sm flex items-center justify-center shrink-0">
                    <Wand2 size={16} className="text-purple-600" />
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-sm rounded-tl-none text-sm text-slate-700">
                    Bonjour ! Je suis ARIA. Quel document souhaitez-vous rédiger aujourd'hui ? (ex: lettre de mise en demeure, note de service, convocation...)
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <div className="relative">
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Décrivez le document à générer..."
                    className="w-full border-slate-200 border rounded-sm p-3 pr-12 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none h-20"
                  />
                  <button
                    onClick={handleGenerateDocument}
                    disabled={isGenerating || !aiPrompt.trim()}
                    className="absolute bottom-3 right-3 p-2 bg-purple-600 text-white rounded-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    {isGenerating ? <Clock size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Rich Text Editor / WYSIWYG */}
            <div className="flex-1 bg-white border border-slate-200 rounded-sm flex flex-col h-[600px] lg:h-full">
              <div className="p-2 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-sm transition-colors" title="Gras"><Bold size={16} /></button>
                  <button className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-sm transition-colors" title="Italique"><Italic size={16} /></button>
                  <div className="w-px h-4 bg-slate-300 mx-1"></div>
                  <button className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-sm transition-colors" title="Aligner à gauche"><AlignLeft size={16} /></button>
                  <button className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-sm transition-colors" title="Centrer"><AlignCenter size={16} /></button>
                  <button className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-sm transition-colors" title="Aligner à droite"><AlignRight size={16} /></button>
                  <div className="w-px h-4 bg-slate-300 mx-1"></div>
                  <button className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-sm transition-colors" title="Liste à puces"><List size={16} /></button>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-sm hover:bg-slate-200 transition-colors flex items-center gap-1">
                    <Save size={14} /> Sauvegarder
                  </button>
                  <button className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-sm hover:bg-slate-800 transition-colors flex items-center gap-1">
                    <Download size={14} /> Exporter PDF
                  </button>
                </div>
              </div>

              <div className="flex-1 p-8 overflow-y-auto bg-slate-100 flex justify-center">
                <div className="bg-white shadow-sm border border-slate-200 w-full max-w-[21cm] min-h-[29.7cm] p-12 text-slate-800 focus:outline-none">
                  {generatedDoc ? (
                    <div className="whitespace-pre-wrap font-serif leading-relaxed" contentEditable suppressContentEditableWarning>
                      {generatedDoc}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                      <FileText size={48} className="opacity-20" />
                      <p>Le document généré s'affichera ici.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: BUILDER */}
        {activeTab === 'BUILDER' && (
          <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Left: Service Selection */}
            <div className="w-full lg:w-1/3 bg-white border border-slate-200 rounded-sm flex flex-col h-[600px] lg:h-full">
              <div className="p-4 border-b border-slate-200 bg-blue-50/50 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-sm flex items-center justify-center text-blue-600">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Catalogue de Services</h3>
                  <p className="text-xs text-slate-500">Sélectionnez les prestations</p>
                </div>
              </div>
              
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nom du Client / Projet</label>
                <input 
                  type="text" 
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Entreprise XYZ" 
                  className="w-full border-slate-200 border rounded-sm p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                />
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {catalog.map(item => (
                  <label key={item.id} className={`flex items-start gap-3 p-3 border rounded-sm cursor-pointer transition-colors ${selectedServices.includes(item.id) ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 hover:border-blue-300'}`}>
                    <input 
                      type="checkbox" 
                      className="mt-1"
                      checked={selectedServices.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedServices([...selectedServices, item.id]);
                        else setSelectedServices(selectedServices.filter(id => id !== item.id));
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-semibold text-slate-900 text-sm">{item.name}</h4>
                        <span className="font-bold text-blue-600 text-sm whitespace-nowrap">{item.basePrice.toLocaleString('fr-FR')} GNF</span>
                      </div>
                      <p className="text-xs text-slate-500">{item.description}</p>
                      <span className="inline-block mt-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-slate-100 px-1.5 py-0.5 rounded-sm">{item.category}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Right: Proposal Preview */}
            <div className="flex-1 bg-white border border-slate-200 rounded-sm flex flex-col h-[600px] lg:h-full">
              <div className="p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800">Aperçu de la Proposition</h3>
                <div className="flex items-center gap-2">
                  <button disabled={selectedServices.length === 0} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-sm hover:bg-slate-200 disabled:opacity-50 transition-colors flex items-center gap-1">
                    <Save size={14} /> Brouillon
                  </button>
                  <button disabled={selectedServices.length === 0} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1">
                    <Download size={14} /> Générer le Devis
                  </button>
                </div>
              </div>
              
              <div className="flex-1 p-8 overflow-y-auto bg-slate-100 flex justify-center">
                <div className="bg-white shadow-sm border border-slate-200 w-full max-w-[21cm] min-h-[29.7cm] p-12 text-slate-800">
                  <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight text-slate-900">DEVIS</h1>
                      <p className="text-slate-500 mt-1">Réf : {devisRef}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{companyConfig?.companyName || 'Nom de l\'entreprise'}</p>
                      <p className="text-sm text-slate-600">{companyConfig?.companyAddress || 'Adresse'}</p>
                      <p className="text-sm text-slate-600">{companyConfig?.companyEmail || 'email@entreprise.com'}</p>
                    </div>
                  </div>

                  <div className="mb-10 p-4 bg-slate-50 border border-slate-200 rounded-sm">
                    <p className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-1">Pour :</p>
                    <p className="font-semibold text-lg">{clientName || 'Nom du client à définir'}</p>
                    <p className="text-sm text-slate-500 mt-1">Date : {new Date().toLocaleDateString('fr-FR')}</p>
                  </div>

                  <table className="w-full text-left mb-8">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-3 font-semibold text-slate-700">Prestation</th>
                        <th className="py-3 font-semibold text-slate-700 text-right w-32">Montant HT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedServices.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="py-8 text-center text-slate-400 italic">Aucune prestation sélectionnée</td>
                        </tr>
                      ) : (
                        selectedServices.map(id => {
                          const item = catalog.find(c => c.id === id);
                          if (!item) return null;
                          return (
                            <tr key={item.id}>
                              <td className="py-4">
                                <div className="font-semibold">{item.name}</div>
                                <div className="text-sm text-slate-500">{item.description}</div>
                              </td>
                              <td className="py-4 text-right font-medium">{item.basePrice.toLocaleString('fr-FR')} GNF</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  <div className="flex justify-end">
                    <div className="w-64 border border-slate-200 rounded-sm overflow-hidden">
                      <div className="flex justify-between p-3 border-b border-slate-100">
                        <span className="text-slate-600">Total HT</span>
                        <span className="font-semibold">
                          {selectedServices.reduce((sum, id) => sum + (catalog.find(c => c.id === id)?.basePrice || 0), 0).toLocaleString('fr-FR')} GNF
                        </span>
                      </div>
                      <div className="flex justify-between p-3 bg-slate-900 text-white font-bold">
                        <span>Total TTC (TVA 18%)</span>
                        <span>
                          {(selectedServices.reduce((sum, id) => sum + (catalog.find(c => c.id === id)?.basePrice || 0), 0) * 1.2).toLocaleString('fr-FR')} GNF
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: ARCHIVES (GED) */}
        {activeTab === 'ARCHIVES' && (
          <div className="bg-white border border-slate-200 rounded-sm overflow-hidden flex flex-col h-[600px] lg:h-full">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center shrink-0">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Archive size={18} className="text-purple-600" /> Gestion Électronique des Documents
              </h3>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                  <Plus size={14} /> Nouveau Dossier
                </button>
                <button className="px-3 py-1.5 text-xs font-semibold bg-purple-600 border border-purple-600 rounded text-white hover:bg-purple-700 flex items-center gap-2">
                  <Download size={14} className="rotate-180" /> Uploader un fichier
                </button>
              </div>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
              {/* Sidebar Dossiers */}
              <div className="w-48 lg:w-64 border-r border-slate-200 bg-slate-50 p-4 overflow-y-auto shrink-0 hidden md:block">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Dossiers</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center justify-between p-2 rounded-sm bg-purple-100 text-purple-700 font-semibold cursor-pointer">
                    <span className="flex items-center gap-2"><Briefcase size={16} /> Contrats Clients</span>
                    <span className="text-[10px] bg-white px-1.5 rounded-sm">12</span>
                  </li>
                  <li className="flex items-center justify-between p-2 rounded-sm text-slate-600 hover:bg-slate-200 cursor-pointer transition-colors">
                    <span className="flex items-center gap-2"><Archive size={16} /> Factures Fournisseurs</span>
                    <span className="text-[10px] bg-slate-300 px-1.5 rounded-sm">45</span>
                  </li>
                  <li className="flex items-center justify-between p-2 rounded-sm text-slate-600 hover:bg-slate-200 cursor-pointer transition-colors">
                    <span className="flex items-center gap-2"><Archive size={16} /> Documents Légaux</span>
                    <span className="text-[10px] bg-slate-300 px-1.5 rounded-sm">3</span>
                  </li>
                </ul>

                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-8 mb-3">Tags (Catégories)</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-rose-100 text-rose-700 text-xs rounded-sm cursor-pointer hover:bg-rose-200 transition-colors">#Urgent</span>
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-sm cursor-pointer hover:bg-amber-200 transition-colors">#À Signer</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-sm cursor-pointer hover:bg-blue-200 transition-colors">#Comptabilité</span>
                </div>
              </div>

              {/* Contenu Fichiers */}
              <div className="flex-1 bg-white p-6 overflow-y-auto relative">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  
                  {/* Fichier 1 */}
                  <div className="border border-slate-200 rounded-sm p-4 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer group text-center flex flex-col items-center">
                    <div className="w-12 h-12 bg-red-50 text-red-500 rounded-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <FileText size={24} />
                    </div>
                    <h5 className="text-sm font-semibold text-slate-800 w-full truncate" title="Contrat_Prestation_Client_XYZ.pdf">Contrat_Prestation_XYZ.pdf</h5>
                    <p className="text-xs text-slate-400 mt-1">2.4 MB • Il y a 2 jours</p>
                    <div className="mt-3 flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded">Aperçu</button>
                    </div>
                  </div>

                  {/* Fichier 2 */}
                  <div className="border border-slate-200 rounded-sm p-4 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer group text-center flex flex-col items-center">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <FileText size={24} />
                    </div>
                    <h5 className="text-sm font-semibold text-slate-800 w-full truncate" title="Tableau_Bord_Trimestre_3.xlsx">Tableau_Bord_T3.xlsx</h5>
                    <p className="text-xs text-slate-400 mt-1">1.1 MB • Hier</p>
                    <div className="mt-3 flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded">Aperçu</button>
                    </div>
                  </div>

                  {/* Empty state zone pour glisser-déposer */}
                  <div className="col-span-2 md:col-span-3 lg:col-span-4 p-12 border-2 border-dashed border-slate-200 rounded-sm flex flex-col items-center justify-center text-slate-400 mt-4">
                    <Download size={48} className="mb-4 text-slate-300 rotate-180" />
                    <p className="text-lg font-medium text-slate-600">Glissez vos documents ici</p>
                    <p className="text-sm mt-1">ou cliquez sur "Uploader un fichier" (PDF, DOCX, XLSX)</p>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
