import React, { useState } from 'react';
import { useApp } from '../store';
import { Users, FileText, Calendar, Calculator, Settings, Building, FileSignature, Clock, Target, Scale, MessageSquare, HardHat, CheckCircle } from 'lucide-react';
import { Badge, statusTone } from '../components/ui';
import { RhDashboard } from '../components/RhDashboard';
import { RhEmployees } from '../components/RhEmployees';
import { RhTimeAttendance } from '../components/RhTimeAttendance';
import { RhPayroll } from '../components/RhPayroll';
import { RhTalent } from '../components/RhTalent';
import { RhAdmin } from '../components/RhAdmin';

/** Onglet Validation Chantiers — le RH valide les équipes avant démarrage */
function RhChantiers() {
  const { btpChantiers, btpAffectations, employees, validerRhChantier, companyConfig } = useApp();
  const enAttente = btpChantiers.filter(c => !c.rh_validation && c.statut === 'planification');
  const valides = btpChantiers.filter(c => c.rh_validation);

  if (!companyConfig.activeModules?.includes('BTP')) {
    return (
      <div className="card p-12 text-center">
        <HardHat size={36} className="mx-auto text-slate-300 mb-3" />
        <p className="text-sm text-slate-400">Le module BTP n'est pas activé.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate-700 mb-1">
          Validation RH des chantiers — {enAttente.length} en attente
        </h3>
        <p className="text-[12px] text-slate-500">Vérifiez les équipes affectées puis validez : votre accord débloque le démarrage du chantier.</p>
      </div>

      {enAttente.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle size={36} className="mx-auto text-emerald-400 mb-3" />
          <p className="text-sm font-semibold text-slate-500">Tous les chantiers ont reçu la validation RH.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {enAttente.map(c => {
            const affs = btpAffectations.filter(a => a.chantier_id === c.id);
            const coutJour = affs.filter(a => a.statut === 'active').reduce((acc, a) => acc + (a.taux_journalier || 0), 0);
            return (
              <div key={c.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900">{c.nom}</h4>
                      <Badge tone={statusTone(c.statut)}>{c.statut.replace(/_/g, ' ')}</Badge>
                    </div>
                    <p className="text-[12px] text-slate-500 mt-0.5">{c.client} · démarrage prévu le {new Date(c.date_debut_prevue).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <button onClick={() => validerRhChantier(c.id)} className="btn btn-primary">
                    <CheckCircle size={14} /> Valider le démarrage
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[12.5px]">
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                    <p className="label !mb-1">Employés affectés</p>
                    <p className="font-mono font-bold text-[15px]">{affs.filter(a => a.statut === 'active').length}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                    <p className="label !mb-1">Coût MO journalier</p>
                    <p className="font-mono font-bold text-[15px]">{coutJour.toLocaleString('fr-FR')} <span className="text-[10px] font-sans text-slate-400">GNF/j</span></p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                    <p className="label !mb-1">Validation Matériel</p>
                    <p className={`font-bold text-[13px] ${c.materiel_validation ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {c.materiel_validation ? '✓ accordée' : '✗ en attente'}
                    </p>
                  </div>
                </div>
                {affs.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {affs.map(a => {
                      const emp = employees.find(e => e.id === a.employee_id);
                      return (
                        <Badge key={a.id} tone={a.statut === 'active' ? 'blue' : 'neutral'}>
                          {emp ? `${emp.firstName} ${emp.lastName}` : a.employee_id} · {a.role_chantier || '—'}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {valides.length > 0 && (
        <div className="card p-5">
          <p className="label">Chantiers validés ({valides.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {valides.map(c => <Badge key={c.id} tone="emerald">{c.nom}</Badge>)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RhView() {
  const { currentRole, companyConfig } = useApp();

  const isHR = currentRole === 'GERANT' || currentRole === 'RH';
  const [activeTab, setActiveTab] = useState(isHR ? 'DASHBOARD' : 'EMPLOYEES');

  const tabs = isHR ? [
    { id: 'DASHBOARD', label: 'Tableau de Bord', icon: Building },
    { id: 'EMPLOYEES', label: 'Dossiers Employés', icon: Users },
    { id: 'TIME', label: 'Temps & Absences', icon: Clock },
    { id: 'PAYROLL', label: 'Paie & Frais', icon: Calculator },
    { id: 'TALENT', label: 'Talents & Formations', icon: Target },
    { id: 'ADMIN', label: 'Légal & Disciplinaire', icon: Scale },
    ...(companyConfig.activeModules?.includes('BTP') ? [{ id: 'CHANTIERS', label: 'Validation Chantiers', icon: HardHat }] : []),
    { id: 'COMMS', label: 'Portail Interne', icon: MessageSquare },
  ] : [
    { id: 'EMPLOYEES', label: 'Mon Dossier', icon: Users },
    { id: 'TIME', label: 'Mes Absences & Temps', icon: Clock },
    { id: 'PAYROLL', label: 'Mes Bulletins & Frais', icon: Calculator },
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            <span className="font-serif italic font-normal text-indigo-600 mr-1.5">Le capital</span>
            humain
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">Gestion complète des ressources humaines, paie et talents.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1 rounded-sm shadow-inner border border-slate-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-sm transition-colors ${activeTab === tab.id ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <tab.icon size={16} />
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'DASHBOARD' && <RhDashboard />}
        {activeTab === 'EMPLOYEES' && <RhEmployees />}
        {activeTab === 'TIME' && <RhTimeAttendance />}
        {activeTab === 'PAYROLL' && <RhPayroll />}
        {activeTab === 'TALENT' && <RhTalent />}
        {activeTab === 'ADMIN' && <RhAdmin />}
        {activeTab === 'CHANTIERS' && <RhChantiers />}
        {activeTab === 'COMMS' && (
          <div className="bg-white border border-slate-200 rounded-sm p-16 text-center">
            <MessageSquare size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-800">Portail Interne & Communication</h3>
            <p className="text-slate-500 max-w-md mx-auto mt-2">
              Annuaire d'entreprise, annonces internes, sondages de satisfaction (eNPS) et partage de documents légaux.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
