import React, { useState, useEffect } from 'react';
import { useApp } from '../store';
import { Plus, CheckCircle, Target, Eye, X } from 'lucide-react';
import { Project } from '../types';
import { ProjectDetails } from '../components/ProjectDetails';
import { useProjectFilter } from '../hooks/useProjectFilter';
import { ProjectFilterBar } from '../components/ProjectFilterBar';
import { ProspectionCRM } from '../components/ProspectionCRM';

export const CommercialProjectCard: React.FC<{ project: Project, onViewDetails: (p: Project) => void }> = ({ project: p, onViewDetails }) => {
  return (
    <div className="bg-white rounded-sm shadow-none border border-slate-200 flex flex-col h-full hover:border-slate-300 transition-all group relative">
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-base font-semibold text-slate-900 line-clamp-1 mb-1" title={p.name}>{p.name}</h3>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-sm font-medium uppercase tracking-wider">
            {(p.status || '').replace(/_/g, ' ')}
          </span>
          <span>{new Date(p.createdAt).toLocaleDateString('fr-FR')}</span>
        </div>

        <div className="flex-1 space-y-2">
          {/* Commercial & Financial Info */}
          <div className="flex flex-col gap-1 text-sm bg-slate-50 p-3 rounded-sm border border-slate-100">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Budget</span>
              <span className="font-semibold text-slate-900">
                {p.budget ? `${p.budget.toLocaleString('fr-FR')} GNF` : 'En attente'}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-xs mt-1 pt-1 border-t border-slate-200">
              <span className="text-slate-500">Paiement</span>
              <span className="font-semibold text-slate-900 flex items-center gap-1">
                {p.accountantPaymentConfirm ? (
                  <span className="text-emerald-600 flex items-center gap-1"><CheckCircle size={12}/> Validé (Compta)</span>
                ) : p.commercialPaymentConfirm ? (
                  <span className="text-amber-600">Attesté (En vérif.)</span>
                ) : p.paymentStatus || 'En attente'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/50 p-3">
        <button 
          onClick={() => onViewDetails(p)}
          className="w-full bg-slate-900 text-white hover:bg-slate-800 py-2 rounded-sm text-xs font-medium transition-colors flex items-center justify-center gap-2 shadow-none"
        >
          Ouvrir le dossier <Eye size={14} />
        </button>
      </div>
    </div>
  );
}

export default function CommercialView() {
  const { projects, addProject, cancelProject } = useApp();
  const { filters, setFilters, filteredProjects } = useProjectFilter(projects);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    if (selectedProject) {
      const updated = projects.find(p => p.id === selectedProject.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedProject)) {
        setSelectedProject(updated);
      }
    }
  }, [projects]);

  const [activeTab, setActiveTab] = useState<'CRM' | 'PROJETS'>('CRM');

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    addProject(newProjectName);
    setNewProjectName('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Espace Commercial</h1>
          <p className="text-slate-500 mt-1">Gérez vos prospects, vos projets, et suivez les paiements.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-sm">
          <button 
            onClick={() => setActiveTab('CRM')}
            className={`px-4 py-2 text-sm font-medium rounded-sm transition-all ${activeTab === 'CRM' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Prospection CRM
          </button>
          <button 
            onClick={() => setActiveTab('PROJETS')}
            className={`px-4 py-2 text-sm font-medium rounded-sm transition-all ${activeTab === 'PROJETS' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Projets Actifs
          </button>
        </div>
      </div>

      {activeTab === 'CRM' ? (
        <ProspectionCRM />
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-sm shadow-none border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Plus className="text-slate-400" size={18} />
              Nouveau Projet (Manuel)
            </h2>
            <form onSubmit={handleAddProject} className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                placeholder="Nom du projet ou du client..." 
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="flex-1 rounded-sm border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-all"
              />
              <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-sm text-sm font-medium transition-colors whitespace-nowrap shadow-none">
                Créer Projet
              </button>
            </form>
          </div>

          <ProjectFilterBar filters={filters} setFilters={setFilters} totalResults={filteredProjects.length} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
            {filteredProjects.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-sm border border-slate-200 border-dashed">
                Aucun projet trouvé.
              </div>
            ) : (
              filteredProjects.map(p => <CommercialProjectCard key={p.id} project={p} onViewDetails={setSelectedProject} />)
            )}
          </div>
        </div>
      )}

      {/* Slide-over Drawer for Project Details */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedProject(null)} 
          />
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Dossier: {selectedProject.name}</h2>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-medium mt-1 inline-block">
                  {(selectedProject.status || '').replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedProject.status !== 'ANNULE' && (
                  <button 
                    onClick={() => {
                      if (window.confirm('Voulez-vous vraiment annuler ce projet ? La comptabilité sera notifiée pour gérer les remboursements.')) {
                        cancelProject(selectedProject.id);
                        setSelectedProject({ ...selectedProject, status: 'ANNULE' });
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-sm text-xs transition-colors"
                  >
                    Annuler le projet
                  </button>
                )}
                <button 
                  onClick={() => setSelectedProject(null)} 
                  className="p-2 hover:bg-slate-200 text-slate-500 hover:text-slate-900 rounded-full transition-colors"
                >
                  <X size={20}/>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-white space-y-6">
              <div className="border border-slate-200 rounded-sm p-4 bg-slate-50/50">
                <ProjectDetails project={selectedProject} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
