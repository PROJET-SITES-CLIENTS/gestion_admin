import React from 'react';
import { useApp } from '../store';
import { Check, X, Shield } from 'lucide-react';

const BTP_ROLES = ['GERANT', 'COND_TRAVAUX', 'CHEF_CHANTIER', 'COMPTABLE', 'ETUDES', 'QHSE_BTP', 'MAGASINIER_BTP', 'RESP_MATERIEL'];
const ROLE_LABELS: Record<string, string> = {
  GERANT: 'Gérant', COND_TRAVAUX: 'Conducteur', CHEF_CHANTIER: 'Chef chant.',
  COMPTABLE: 'Comptable', ETUDES: 'Études', QHSE_BTP: 'QHSE',
  MAGASINIER_BTP: 'Magasinier', RESP_MATERIEL: 'Resp. mat.',
};

const ACTIONS = [
  'creer_affaire', 'envoyer_devis', 'creer_chantier', 'modifier_budget',
  'affecter_salairie', 'creer_commande', 'valider_facture', 'saisir_rapport',
  'modifier_avancement', 'valider_situation', 'cloturer_chantier',
];
const ACTION_LABELS: Record<string, string> = {
  creer_affaire: 'Créer affaire', envoyer_devis: 'Envoyer devis',
  creer_chantier: 'Créer chantier', modifier_budget: 'Modifier budget',
  affecter_salairie: 'Affecter salarié', creer_commande: 'Créer commande',
  valider_facture: 'Valider facture', saisir_rapport: 'Saisir rapport',
  modifier_avancement: 'Modif. avancement', valider_situation: 'Valider situation',
  cloturer_chantier: 'Clôturer chantier',
};

// Defaults conforme au CDC §3.3
const DEFAULTS: Record<string, Record<string, boolean>> = {
  creer_affaire: { GERANT: true, COND_TRAVAUX: true, CHEF_CHANTIER: false, COMPTABLE: false, ETUDES: false, QHSE_BTP: false, MAGASINIER_BTP: false, RESP_MATERIEL: false },
  envoyer_devis: { GERANT: true, COND_TRAVAUX: true, CHEF_CHANTIER: false, COMPTABLE: false, ETUDES: true, QHSE_BTP: false, MAGASINIER_BTP: false, RESP_MATERIEL: false },
  creer_chantier: { GERANT: true, COND_TRAVAUX: true, CHEF_CHANTIER: false, COMPTABLE: false, ETUDES: false, QHSE_BTP: false, MAGASINIER_BTP: false, RESP_MATERIEL: false },
  modifier_budget: { GERANT: true, COND_TRAVAUX: false, CHEF_CHANTIER: false, COMPTABLE: false, ETUDES: false, QHSE_BTP: false, MAGASINIER_BTP: false, RESP_MATERIEL: false },
  affecter_salairie: { GERANT: true, COND_TRAVAUX: false, CHEF_CHANTIER: false, COMPTABLE: false, ETUDES: false, QHSE_BTP: false, MAGASINIER_BTP: false, RESP_MATERIEL: false },
  creer_commande: { GERANT: true, COND_TRAVAUX: true, CHEF_CHANTIER: false, COMPTABLE: false, ETUDES: false, QHSE_BTP: false, MAGASINIER_BTP: true, RESP_MATERIEL: true },
  valider_facture: { GERANT: true, COND_TRAVAUX: false, CHEF_CHANTIER: false, COMPTABLE: true, ETUDES: false, QHSE_BTP: false, MAGASINIER_BTP: false, RESP_MATERIEL: false },
  saisir_rapport: { GERANT: true, COND_TRAVAUX: true, CHEF_CHANTIER: true, COMPTABLE: false, ETUDES: false, QHSE_BTP: false, MAGASINIER_BTP: false, RESP_MATERIEL: false },
  modifier_avancement: { GERANT: true, COND_TRAVAUX: true, CHEF_CHANTIER: false, COMPTABLE: false, ETUDES: false, QHSE_BTP: false, MAGASINIER_BTP: false, RESP_MATERIEL: false },
  valider_situation: { GERANT: true, COND_TRAVAUX: true, CHEF_CHANTIER: false, COMPTABLE: true, ETUDES: false, QHSE_BTP: false, MAGASINIER_BTP: false, RESP_MATERIEL: false },
  cloturer_chantier: { GERANT: true, COND_TRAVAUX: false, CHEF_CHANTIER: false, COMPTABLE: true, ETUDES: false, QHSE_BTP: false, MAGASINIER_BTP: false, RESP_MATERIEL: false },
};

export const BtpPermissionsMatrix: React.FC = () => {
  const { companyConfig, updateCompanyConfig, pushToast } = useApp();
  const perms = companyConfig?.btpPermissions || DEFAULTS;

  const toggle = (action: string, role: string) => {
    const current = { ...perms };
    if (!current[action]) current[action] = { ...DEFAULTS[action] };
    current[action][role] = !current[action][role];
    updateCompanyConfig({ ...companyConfig, btpPermissions: current });
    pushToast(`Permission ${ACTION_LABELS[action]} ${current[action][role] ? 'accordée' : 'retirée'} à ${ROLE_LABELS[role]}.`, 'INFO');
  };

  const resetDefaults = () => {
    updateCompanyConfig({ ...companyConfig, btpPermissions: DEFAULTS });
    pushToast('Matrice de permissions réinitialisée aux valeurs par défaut du CDC.', 'INFO');
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-[12px] text-slate-500">Contrôle fin des actions par rôle (CDC §3.3). Un ✅ = autorisé. <strong className="text-slate-600">Appliquée côté serveur</strong> : créer un chantier/commande, affecter, valider une situation ou clôturer devient impossible pour un rôle décoché, même par appel API direct.</p>
        <button onClick={resetDefaults} className="btn btn-ghost !py-1 !px-2.5 !text-[10.5px]">Réinitialiser</button>
      </div>
      <div className="overflow-x-auto">
        <table className="table-premium w-full min-w-[600px]">
          <thead>
            <tr>
              <th>Action</th>
              {BTP_ROLES.map(r => <th key={r} className="text-center">{ROLE_LABELS[r]}</th>)}
            </tr>
          </thead>
          <tbody>
            {ACTIONS.map(action => (
              <tr key={action}>
                <td className="font-semibold text-slate-700">{ACTION_LABELS[action]}</td>
                {BTP_ROLES.map(role => {
                  const allowed = perms[action]?.[role] ?? DEFAULTS[action]?.[role] ?? false;
                  return (
                    <td key={role} className="text-center">
                      <button
                        onClick={() => toggle(action, role)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                          allowed ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                        }`}
                        title={`${allowed ? 'Retirer' : 'Accorder'} ${ACTION_LABELS[action]} à ${ROLE_LABELS[role]}`}
                      >
                        {allowed ? <Check size={13} /> : <X size={13} />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
