// src/App.tsx
import React from 'react';
import { AppProvider, useApp } from './store';
import { Layout } from './components/Layout';
import ManagerView from './views/ManagerView';
import CommercialView from './views/CommercialView';
import AccountantView from './views/AccountantView';
import RhView from './views/RhView';
import AssistantView from './views/AssistantView';
import AuthView from './views/AuthView';
import { ErrorBoundary } from 'react-error-boundary';
import { motion } from 'motion/react';
import { SkeletonPage } from './components/ui';
import { RotateCcw } from 'lucide-react';

function GlobalErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="card max-w-xl w-full p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-xl bg-rose-50 border border-rose-200/70 text-rose-500 flex items-center justify-center">
          <span className="text-2xl font-serif italic">!</span>
        </div>
        <h2 className="text-lg font-bold text-slate-900">Une erreur inattendue est survenue</h2>
        <p className="text-[13px] text-slate-500 mt-1.5 mb-5">
          L'ERP a détecté un crash de rendu. Voici les détails techniques :
        </p>
        <pre className="text-left bg-slate-950 text-stone-300 p-4 rounded-lg text-[11px] font-mono overflow-x-auto max-h-56 mb-6 leading-relaxed">
          {error.stack || error.message}
        </pre>
        <button
          onClick={() => {
            resetErrorBoundary();
            window.location.reload();
          }}
          className="btn btn-dark mx-auto group"
        >
          <RotateCcw size={14} className="transition-transform group-hover:-rotate-180 duration-500" />
          Recharger l'application
        </button>
      </div>
    </div>
  );
}

import InternalMessenger from './components/InternalMessenger';
import TaskBoard from './components/TaskBoard';
import { BtpDashboardView } from './views/btp/BtpDashboardView';
import { BtpOffresView } from './views/btp/BtpOffresView';
import { BtpChantiersView } from './views/btp/BtpChantiersView';
import { BtpEnginsView } from './views/btp/BtpEnginsView';
import { BtpQhseView } from './views/btp/BtpQhseView';
import { BtpMagasinView } from './views/btp/BtpMagasinView';
import { AgroApproView } from './views/agro/AgroApproView';
import { AgroProductionView } from './views/agro/AgroProductionView';
import { AgroTracabiliteView } from './views/agro/AgroTracabiliteView';

const MAIN_VIEWS: Record<string, React.ComponentType> = {
  GERANT: ManagerView,
  COMMERCIAL: CommercialView,
  COMPTABLE: AccountantView,
  RH: RhView,
  ASSISTANTE: AssistantView,
};

const BTP_ROLES = ['ETUDES', 'COND_TRAVAUX', 'CHEF_CHANTIER', 'QHSE_BTP', 'RESP_MATERIEL', 'MAGASINIER_BTP'];
const AGRO_ROLES = ['RESP_PRODUCTION', 'RESP_QUALITE', 'RESP_AGRO', 'RESP_STOCKAGE', 'RESP_TRACABILITE'];

function ModulePlaceholder({ title, hint, agro = false }: { title: string; hint: string; agro?: boolean }) {
  return (
    <div className="card flex flex-col items-center justify-center py-20 text-center">
      <div className={`h-12 w-12 mb-4 rounded-xl flex items-center justify-center border ${agro ? 'bg-amber-50 border-amber-200/70 text-amber-600' : 'bg-indigo-50 border-indigo-200/70 text-indigo-600'}`}>
        <span className="font-serif italic text-xl">{agro ? 'A' : 'B'}</span>
      </div>
      <h2 className="text-base font-bold text-slate-800">{title}</h2>
      <p className="text-[13px] text-slate-500 mt-1.5 max-w-sm">{hint}</p>
      <div className="hairline-gold w-24 mt-5" />
      <p className="mt-4 text-[11px] text-slate-400 flex items-center gap-1.5">
        Astuce : appuyez sur <kbd className="kbd">⌘K</kbd> pour naviguer rapidement
      </p>
    </div>
  );
}

function AppContent() {
  const { currentRole, currentUser, activeMenu, isReady } = useApp();

  if (!currentUser) {
    return <AuthView />;
  }

  const MainView = MAIN_VIEWS[currentRole || ''];
  const transitionKey = `${currentRole}-${activeMenu}`;

  const renderContent = () => {
    // Squelette global pendant le premier chargement des données
    // (fini les empty-states qui clignotent avant l'arrivée des données).
    if (!isReady) return <SkeletonPage />;
    switch (activeMenu) {
      case 'MESSAGERIE': return <InternalMessenger />;
      case 'TASKS': return <TaskBoard />;
      case 'BTP_DASHBOARD': return <BtpDashboardView />;
      case 'BTP_MAGASIN': return <BtpMagasinView />;
      case 'BTP_OFFRES': return <BtpOffresView />;
      case 'BTP_CHANTIERS': return <BtpChantiersView />;
      case 'BTP_ENGINS': return <BtpEnginsView />;
      case 'BTP_QHSE': return <BtpQhseView />;
      case 'AGRO_APPRO': return <AgroApproView />;
      case 'AGRO_PROD': return <AgroProductionView />;
      case 'AGRO_TRACABILITE': return <AgroTracabiliteView />;
      default:
        if (MainView) return <MainView />;
        if (BTP_ROLES.includes(currentRole || '')) {
          return (
            <ModulePlaceholder
              title="Espace BTP"
              hint='Veuillez sélectionner un module dans le menu « Opérations BTP » à gauche.'
            />
          );
        }
        if (AGRO_ROLES.includes(currentRole || '')) {
          return (
            <ModulePlaceholder
              agro
              title="Espace Filière Agro"
              hint='Veuillez sélectionner un module dans le menu « Filière Agro » à gauche.'
            />
          );
        }
        return (
          <ModulePlaceholder
            title={`Espace ${currentRole}`}
            hint="Ce rôle n'a pas encore d'espace dédié. Utilisez la messagerie et les tâches via le menu de gauche."
          />
        );
    }
  };

  return (
    <Layout>
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        {renderContent()}
      </motion.div>
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ErrorBoundary FallbackComponent={GlobalErrorFallback}>
        <AppContent />
      </ErrorBoundary>
    </AppProvider>
  );
}
