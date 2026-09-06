import React, { useState } from 'react';
import { useApp } from '../store';
import { Users, Search, Plus, UserCircle, Briefcase, Phone, Mail, MapPin, X, Check, Save } from 'lucide-react';

export const RhEmployees: React.FC = () => {
  const { employees, addEmployee, currentRole } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(employees.length === 1 ? employees[0].id : null);
  const [showAddForm, setShowAddForm] = useState(false);

  const filtered = employees.filter(e => 
    (e.firstName + ' ' + e.lastName).toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    addEmployee({
      firstName: fd.get('firstName') as string,
      lastName: fd.get('lastName') as string,
      email: fd.get('email') as string,
      phone: fd.get('phone') as string,
      position: fd.get('position') as string,
      department: fd.get('department') as string,
      baseSalary: Number(fd.get('baseSalary')),
      hireDate: fd.get('hireDate') as string,
      isActive: true
    } as any);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6 flex gap-6 h-[calc(100vh-140px)]">
      {/* Liste des employés (Gauche) */}
      <div className={`bg-white border border-slate-200 rounded-sm flex flex-col ${selectedEmployeeId ? 'w-1/3' : 'w-full'}`}>
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Rechercher un employé..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-sm text-sm focus:border-indigo-500 outline-none"
            />
          </div>
          {(currentRole === 'GERANT' || currentRole === 'RH') && (
            <button 
              onClick={() => setShowAddForm(true)}
              className="ml-4 bg-indigo-600 text-white px-3 py-2 rounded-sm text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus size={16} /> Nouvel Employé
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.map(emp => (
            <div 
              key={emp.id} 
              onClick={() => setSelectedEmployeeId(emp.id)}
              className={`flex items-center gap-3 p-3 rounded-sm cursor-pointer border-l-4 transition-all ${selectedEmployeeId === emp.id ? 'bg-indigo-50 border-indigo-600' : 'hover:bg-slate-50 border-transparent'}`}
            >
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 truncate">{emp.firstName} {emp.lastName}</div>
                <div className="text-xs text-slate-500 truncate">{emp.position} • {emp.department}</div>
              </div>
              {!emp.isActive && (
                <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 rounded-sm font-semibold uppercase">Inactif</span>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-sm">Aucun employé trouvé.</div>
          )}
        </div>
      </div>

      {/* Dossier Employé Détaillé (Droite) */}
      {selectedEmployee && (
        <div className="w-2/3 bg-white border border-slate-200 rounded-sm flex flex-col animate-in slide-in-from-right-4 duration-300">
          <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-2xl shadow-sm">
                {selectedEmployee.firstName.charAt(0)}{selectedEmployee.lastName.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedEmployee.firstName} {selectedEmployee.lastName}</h2>
                <p className="text-slate-500 font-medium flex items-center gap-2 mt-1">
                  <Briefcase size={16}/> {selectedEmployee.position} ({selectedEmployee.department})
                </p>
              </div>
            </div>
            <button onClick={() => setSelectedEmployeeId(null)} className="text-slate-400 hover:text-slate-700"><X size={20}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Section Infos Personnelles */}
            <section>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Informations Personnelles & Contact</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-600"><Mail size={16}/> <span className="font-medium text-slate-900">{selectedEmployee.email}</span></div>
                <div className="flex items-center gap-2 text-slate-600"><Phone size={16}/> <span className="font-medium text-slate-900">{selectedEmployee.phone}</span></div>
                <div className="flex items-center gap-2 text-slate-600"><MapPin size={16}/> <span className="font-medium text-slate-900">{selectedEmployee.address || 'Non renseignée'}</span></div>
                <div className="flex items-center gap-2 text-slate-600">N° CNSS: <span className="font-medium text-slate-900">{selectedEmployee.cnssNumber || 'Non renseigné'}</span></div>
                <div className="flex items-center gap-2 text-slate-600">Urgence: <span className="font-medium text-rose-600">{selectedEmployee.emergencyContact || 'Non renseigné'}</span></div>
                <div className="flex items-center gap-2 text-slate-600">Statut Marital: <span className="font-medium text-slate-900">{selectedEmployee.maritalStatus || 'Non renseigné'}</span></div>
              </div>
            </section>

            {/* Section Contrat & Paie */}
            <section>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Contrat & Rémunération</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-50 p-3 rounded-sm border border-slate-200">
                  <div className="text-slate-500 text-xs uppercase mb-1">Date d'embauche</div>
                  <div className="font-semibold text-slate-900">{new Date(selectedEmployee.hireDate).toLocaleDateString('fr-FR')}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-sm border border-slate-200">
                  <div className="text-slate-500 text-xs uppercase mb-1">Salaire de Base (Mensuel)</div>
                  <div className="font-semibold text-slate-900 font-mono">{selectedEmployee.baseSalary.toLocaleString()} GNF</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-sm border border-slate-200 col-span-2">
                  <div className="text-slate-500 text-xs uppercase mb-1">Coordonnées Bancaires (RIB)</div>
                  <div className="font-mono text-slate-900 text-xs">{selectedEmployee.bankDetails || 'Aucun RIB renseigné.'}</div>
                </div>
              </div>
            </section>

            {/* Section Onboarding */}
            <section>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Checklist d'Onboarding</h3>
              <div className="space-y-2">
                {[
                  { id: 1, text: 'Création compte email pro', done: true },
                  { id: 2, text: 'Remise du matériel informatique (PC)', done: true },
                  { id: 3, text: 'Signature du contrat et règlement intérieur', done: true },
                  { id: 4, text: 'Formation sécurité (Obligatoire)', done: false },
                  { id: 5, text: 'Entretien de fin de période d\'essai', done: false },
                ].map(task => (
                  <div key={task.id} className="flex items-center gap-3 text-sm">
                    <button className={`w-5 h-5 rounded-sm border flex items-center justify-center ${task.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-slate-50'}`}>
                      {task.done && <Check size={14} />}
                    </button>
                    <span className={task.done ? 'text-slate-500 line-through' : 'text-slate-800 font-medium'}>{task.text}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Modal Ajout Employé */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div className="relative bg-white rounded-sm shadow-xl w-full max-w-2xl">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">Nouvel Employé</h2>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-700"><X size={20}/></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Prénom *</label>
                  <input name="firstName" required className="w-full border p-2 rounded-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nom *</label>
                  <input name="lastName" required className="w-full border p-2 rounded-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
                  <input name="email" type="email" required className="w-full border p-2 rounded-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Téléphone *</label>
                  <input name="phone" required className="w-full border p-2 rounded-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Poste *</label>
                  <input name="position" required className="w-full border p-2 rounded-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Département *</label>
                  <select name="department" className="w-full border p-2 rounded-sm">
                    <option>Direction</option>
                    <option>Commercial</option>
                    <option>Comptabilité</option>
                    <option>Ressources Humaines</option>
                    <option>Technique</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Salaire de Base (GNF) *</label>
                  <input name="baseSalary" type="number" required className="w-full border p-2 rounded-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date d'embauche *</label>
                  <input name="hireDate" type="date" required className="w-full border p-2 rounded-sm" />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-sm">Annuler</button>
                <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-sm font-semibold flex items-center gap-2 hover:bg-indigo-700">
                  <Save size={16}/> Créer l'employé
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
