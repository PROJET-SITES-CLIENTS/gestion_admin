import React, { useState } from 'react';
import { Briefcase, Calendar as CalendarIcon, Inbox, FileText, CheckSquare, MessageSquarePlus } from 'lucide-react';
import AssistantDashboard from './assistant/AssistantDashboard';
import AssistantAgenda from './assistant/AssistantAgenda';
import AssistantMessages from './assistant/AssistantMessages';
import AssistantDocuments from './assistant/AssistantDocuments';
import AssistantTasks from './assistant/AssistantTasks';
import AssistantAria from './assistant/AssistantAria';

export default function AssistantView() {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'AGENDA' | 'MESSAGES' | 'DOCUMENTS' | 'TASKS' | 'AGENT_ARIA'>('DASHBOARD');

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-2 shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 flex items-center gap-3">
            <Briefcase className="text-purple-600" size={32} />
            Direction Administrative & Assistanat
          </h1>
          <p className="text-slate-500 mt-1">
            Hub de pilotage transversal : Agenda du dirigeant, requêtes, priorités, et gestion documentaire.
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
          <CalendarIcon size={16} /> Agenda & Déplacements
        </button>
        <button
          onClick={() => setActiveTab('MESSAGES')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'MESSAGES' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Inbox size={16} /> Communications & VIP
        </button>
        <button
          onClick={() => setActiveTab('TASKS')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'TASKS' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckSquare size={16} /> Priorités (Eisenhower)
        </button>
        <button
          onClick={() => setActiveTab('DOCUMENTS')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'DOCUMENTS' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText size={16} /> Documents & GED
        </button>
        <button
          onClick={() => setActiveTab('AGENT_ARIA')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'AGENT_ARIA' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquarePlus size={16} /> Agent ARIA <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">IA</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto pt-4">
        {activeTab === 'DASHBOARD' && <AssistantDashboard setTab={setActiveTab} />}
        {activeTab === 'AGENDA' && <AssistantAgenda />}
        {activeTab === 'MESSAGES' && <AssistantMessages />}
        {activeTab === 'TASKS' && <AssistantTasks />}
        {activeTab === 'DOCUMENTS' && <AssistantDocuments />}
        {activeTab === 'AGENT_ARIA' && <AssistantAria />}
      </div>
    </div>
  );
}
