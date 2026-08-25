// src/App.tsx
import { AppProvider, useApp } from './store';
import { Layout } from './components/Layout';
import ManagerView from './views/ManagerView';
import CommercialView from './views/CommercialView';
import AccountantView from './views/AccountantView';
import RhView from './views/RhView';
import AssistantView from './views/AssistantView';
import AuthView from './views/AuthView';
import { ErrorBoundary } from 'react-error-boundary';

function GlobalErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-4 rounded-sm shadow-none max-w-xl w-full border border-slate-200 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-650 flex items-center justify-center rounded-sm mx-auto mb-4">
          <span className="text-xl font-semibold">⚠️</span>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Une erreur inattendue est survenue</h2>
        <p className="text-xs text-slate-500 mb-4">L'ERP a détecté un crash de rendu. Voici les détails techniques :</p>
        <pre className="text-left bg-slate-100 p-4 rounded-sm text-xs font-mono text-slate-700 overflow-x-auto max-h-60 mb-6 border border-slate-200">
          {error.stack || error.message}
        </pre>
        <button 
          onClick={() => {
            resetErrorBoundary();
            window.location.reload();
          }} 
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-sm text-sm font-semibold transition cursor-pointer"
        >
          Recharger l'application
        </button>
      </div>
    </div>
  );
}

import InternalMessenger from './components/InternalMessenger';
import TaskBoard from './components/TaskBoard';
import { BtpOffresView } from './views/btp/BtpOffresView';
import { BtpChantiersView } from './views/btp/BtpChantiersView';
import { BtpEnginsView } from './views/btp/BtpEnginsView';
import { BtpQhseView } from './views/btp/BtpQhseView';
import { AgroApproView } from './views/agro/AgroApproView';
import { AgroProductionView } from './views/agro/AgroProductionView';
import { AgroTracabiliteView } from './views/agro/AgroTracabiliteView';

function AppContent() {
  const { currentRole, currentUser, activeMenu } = useApp();

  if (!currentUser) {
    return <AuthView />;
  }

  return (
    <Layout>
      {activeMenu === 'MESSAGERIE' ? (
        <InternalMessenger />
      ) : activeMenu === 'TASKS' ? (
        <TaskBoard />
      ) : activeMenu === 'BTP_OFFRES' ? (
        <BtpOffresView />
      ) : activeMenu === 'BTP_CHANTIERS' ? (
        <BtpChantiersView />
      ) : activeMenu === 'BTP_ENGINS' ? (
        <BtpEnginsView />
      ) : activeMenu === 'BTP_QHSE' ? (
        <BtpQhseView />
      ) : activeMenu === 'AGRO_APPRO' ? (
        <AgroApproView />
      ) : activeMenu === 'AGRO_PROD' ? (
        <AgroProductionView />
      ) : activeMenu === 'AGRO_TRACABILITE' ? (
        <AgroTracabiliteView />
      ) : (
        <>
          {currentRole === 'GERANT' && <ManagerView />}
          {currentRole === 'COMMERCIAL' && <CommercialView />}
          {currentRole === 'COMPTABLE' && <AccountantView />}
          {currentRole === 'RH' && <RhView />}
          {currentRole === 'ASSISTANTE' && <AssistantView />}
          {['ETUDES', 'COND_TRAVAUX', 'CHEF_CHANTIER', 'QHSE_BTP', 'RESP_MATERIEL', 'MAGASINIER_BTP'].includes(currentRole || '') && (
            <div className="flex flex-col items-center justify-center h-64 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-500">
               <h2 className="text-xl font-bold mb-2">Espace BTP</h2>
               <p>Veuillez sélectionner un module dans le menu "Opérations BTP" à gauche.</p>
            </div>
          )}
          {['RESP_PRODUCTION', 'RESP_QUALITE', 'RESP_AGRO', 'RESP_STOCKAGE', 'RESP_TRACABILITE'].includes(currentRole || '') && (
            <div className="flex flex-col items-center justify-center h-64 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-500 mt-4">
               <h2 className="text-xl font-bold mb-2 text-orange-600">Espace Filière Agro</h2>
               <p>Veuillez sélectionner un module dans le menu "Filière Agro" à gauche.</p>
            </div>
          )}
          {!['GERANT', 'COMMERCIAL', 'COMPTABLE', 'RH', 'ASSISTANTE', 'ETUDES', 'COND_TRAVAUX', 'CHEF_CHANTIER', 'QHSE_BTP', 'RESP_MATERIEL', 'MAGASINIER_BTP', 'RESP_PRODUCTION', 'RESP_QUALITE', 'RESP_AGRO', 'RESP_STOCKAGE', 'RESP_TRACABILITE'].includes(currentRole || '') && (
            <div className="flex flex-col items-center justify-center h-64 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-500 mt-4">
               <h2 className="text-xl font-bold mb-2">Espace {currentRole}</h2>
               <p>Ce rôle n'a pas encore d'espace de travail dédié. Utilisez la messagerie et les tâches via le menu de gauche.</p>
            </div>
          )}
        </>
      )}
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
