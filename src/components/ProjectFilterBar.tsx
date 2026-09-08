import React from 'react';
import { Search, Filter } from 'lucide-react';
import { ProjectFiltersState, FilterPeriod, FilterProgress, FilterPayment } from '../hooks/useProjectFilter';

interface Props {
  filters: ProjectFiltersState;
  setFilters: React.Dispatch<React.SetStateAction<ProjectFiltersState>>;
  totalResults: number;
}

export function ProjectFilterBar({ filters, setFilters, totalResults }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-none p-3 mb-6 flex flex-col md:flex-row gap-4 items-center animate-in fade-in slide-in-from-top-2 duration-500">
      
      {/* Search Input */}
      <div className="relative flex-1 w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={16} className="text-slate-400" />
        </div>
        <input
          type="text"
          value={filters.searchQuery}
          onChange={e => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
          className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-sm pl-9 pr-3 py-2.5 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors placeholder-slate-400"
          placeholder="Rechercher un projet, un client..."
        />
      </div>

      {/* Filters Group */}
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        <div className="flex items-center gap-1.5 px-2 text-slate-400 border-r border-slate-100 hidden sm:flex">
          <Filter size={16} />
          <span className="text-xs font-semibold uppercase tracking-wider">Filtres</span>
        </div>

        {/* Period */}
        <select
          value={filters.period}
          onChange={e => setFilters(prev => ({ ...prev, period: e.target.value as FilterPeriod }))}
          className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-sm px-3 py-2.5 focus:outline-none focus:border-slate-400 cursor-pointer"
        >
          <option value="ALL">Toute la période</option>
          <option value="TODAY">Aujourd'hui</option>
          <option value="WEEK">Cette Semaine</option>
          <option value="MONTH">Ce Mois</option>
          <option value="QUARTER">Ce Trimestre</option>
          <option value="SEMESTER">Ce Semestre</option>
          <option value="YEAR">Cette Année</option>
        </select>

        {/* Progress — C2 : valeurs alignées sur les statuts réels du modèle
            (le select émettait STARTING/IN_PROGRESS/COMPLETED que le hook
            ne testait jamais : le filtre ne faisait RIEN). */}
        <select
          value={filters.progress}
          onChange={e => setFilters(prev => ({ ...prev, progress: e.target.value as FilterProgress }))}
          className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-sm px-3 py-2.5 focus:outline-none focus:border-slate-400 cursor-pointer"
        >
          <option value="ALL">Tout avancement</option>
          <option value="NOUVEAU">Démarrage / Attente</option>
          <option value="EN_COURS">En développement</option>
          <option value="TERMINE">Terminés</option>
          <option value="PAYE">Payés / Clôturés</option>
          <option value="ANNULE">Annulés</option>
        </select>

        {/* Payment */}
        <select
          value={filters.payment}
          onChange={e => setFilters(prev => ({ ...prev, payment: e.target.value as FilterPayment }))}
          className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-sm px-3 py-2.5 focus:outline-none focus:border-slate-400 cursor-pointer"
        >
          <option value="ALL">Tous les paiements</option>
          <option value="PAID">Payés (Totalité)</option>
          <option value="PARTIAL">Acompte payé / Partiel</option>
          <option value="PENDING">En attente / Rien payé</option>
        </select>

        {/* Results count indicator */}
        <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-sm ml-auto sm:ml-0">
          <span className="text-xs font-semibold text-slate-500">
            {totalResults} {totalResults > 1 ? 'résultats' : 'résultat'}
          </span>
        </div>
      </div>
    </div>
  );
}

