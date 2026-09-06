import React from 'react';
import { 
  Info, 
  Coins,
  FileText,
  Clock,
  ShieldCheck,
  Building2,
  Calendar,
  CreditCard,
  Target
} from 'lucide-react';
import { Project } from '../types';

export const Field = ({ label, value, fullWidth = false }: { label: string, value?: string | number, fullWidth?: boolean }) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className={`py-3 border-b border-slate-100 last:border-0 ${fullWidth ? 'flex flex-col gap-1.5' : 'flex flex-col sm:flex-row sm:gap-4 justify-between items-start print:flex-row'}`}>
      <span className={`text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0 ${fullWidth ? '' : 'sm:w-1/3 print:w-1/3'}`}>
        {label}
      </span>
      <div className={`text-sm text-slate-900 font-medium whitespace-pre-wrap ${fullWidth ? '' : 'sm:w-2/3 print:w-2/3'}`}>
        {value}
      </div>
    </div>
  );
};

export const SectionCard = ({ title, icon: Icon, children }: any) => {
  const hasContent = React.Children.toArray(children).some(child => !!child);
  if (!hasContent) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-sm overflow-hidden shadow-xs flex flex-col h-full print:border-slate-300 print:shadow-none print:break-inside-avoid">
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center gap-3 print:bg-white print:border-slate-300">
        <Icon size={16} className="text-indigo-600 shrink-0" />
        <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="px-5 py-3 flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
};

export const ProjectDetails = ({ project }: { project: Project }) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
        {/* Informations Générales */}
        <div className="lg:col-span-1 print:col-span-1">
          <SectionCard title="1. Informations Générales" icon={Building2}>
            <Field label="Nom du Projet" value={project.name} />
            <Field label="Client" value={project.clientName} />
            <Field label="Contact Client" value={project.clientContact} />
            <Field label="Description" value={project.description || 'Aucune description fournie.'} fullWidth />
            <Field label="Date de création" value={new Date(project.createdAt).toLocaleDateString('fr-FR')} />
            <Field label="Statut" value={project.status.replace(/_/g, ' ')} />
          </SectionCard>
        </div>

        {/* Détails Financiers */}
        <div className="lg:col-span-1 print:col-span-1">
          <SectionCard title="2. Suivi Financier" icon={Coins}>
            <Field label="Budget Alloué" value={project.budget ? `${project.budget.toLocaleString('fr-FR')} GNF` : 'Non défini'} />
            <Field label="Statut du paiement" value={
              project.paymentStatus === 'PAID' ? 'Totalement Payé' :
              project.paymentStatus === 'PARTIAL' ? 'Partiellement Payé' : 'En Attente'
            } />
            {project.commercialPaymentConfirm && <Field label="Validation Commerciale" value="Attesté par le commercial" />}
            {project.accountantPaymentConfirm && <Field label="Validation Comptable" value="Confirmé par la comptabilité" />}
          </SectionCard>
        </div>

        {/* Plan de paiement détaillé */}
        {project.paymentPlan && project.paymentPlan.installments && project.paymentPlan.installments.length > 0 && (
          <div className="lg:col-span-2 print:col-span-2">
            <SectionCard title="3. Plan de Financement (Échéancier)" icon={CreditCard}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-y border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Tranche</th>
                      <th className="px-4 py-3 font-semibold">Montant</th>
                      <th className="px-4 py-3 font-semibold">Date prévue</th>
                      <th className="px-4 py-3 font-semibold">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {project.paymentPlan.installments.map(inst => (
                      <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{inst.name} ({inst.percentage}%)</td>
                        <td className="px-4 py-3 font-semibold">{inst.amount.toLocaleString('fr-FR')} GNF</td>
                        <td className="px-4 py-3">{new Date(inst.expectedDate).toLocaleDateString('fr-FR')}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase ${inst.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {inst.status === 'PAID' ? 'Payé' : 'En Attente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        )}

      </div>
    </div>
  );
};
