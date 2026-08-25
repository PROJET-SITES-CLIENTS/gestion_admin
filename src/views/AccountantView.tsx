import React, { useState } from 'react';
import { Activity, Wallet, Receipt, FileText, Target } from 'lucide-react';
import { AccountantDashboard } from './accountant/AccountantDashboard';
import { AccountantTreasury } from './accountant/AccountantTreasury';
import AccountantSales from './accountant/AccountantSales';
import { AccountantExpenses } from './accountant/AccountantExpenses';
import { AccountantTaxes } from './accountant/AccountantTaxes';

export default function AccountantView() {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'TREASURY' | 'SALES' | 'EXPENSES' | 'TAXES'>('DASHBOARD');

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="bg-white px-8 py-4 border-b border-slate-200 sticky top-0 z-20 print:hidden">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Activity className="text-indigo-600" />
          Espace Comptabilité & Finances
        </h1>
        <p className="text-sm text-slate-500 mt-1">Gérez la trésorerie, la facturation, les dépenses et la rentabilité.</p>
        
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-sm w-fit mt-6">
          <button
            onClick={() => setActiveTab('DASHBOARD')}
            className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'DASHBOARD' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Target size={16} /> Bilan & P&L
          </button>
          <button
            onClick={() => setActiveTab('TREASURY')}
            className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'TREASURY' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Wallet size={16} /> Trésorerie
          </button>
          <button
            onClick={() => setActiveTab('SALES')}
            className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'SALES' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileText size={16} /> Ventes & Encaissements
          </button>
          <button
            onClick={() => setActiveTab('EXPENSES')}
            className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'EXPENSES' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Receipt size={16} /> Achats & Dépenses
          </button>
          <button
            onClick={() => setActiveTab('TAXES')}
            className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'TAXES' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Activity size={16} /> Fiscalité & TVA
          </button>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'DASHBOARD' && <AccountantDashboard />}
        {activeTab === 'TREASURY' && <AccountantTreasury />}
        {activeTab === 'SALES' && <AccountantSales />}
        {activeTab === 'EXPENSES' && <AccountantExpenses />}
        {activeTab === 'TAXES' && <AccountantTaxes />}
      </div>
    </div>
  );
}
