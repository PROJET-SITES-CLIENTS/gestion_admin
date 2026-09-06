import React, { useState } from 'react';
import { Activity, Wallet, Receipt, FileText, Target, BookOpen, Layers, Building } from 'lucide-react';
import { AccountantDashboard } from './accountant/AccountantDashboard';
import { AccountantTreasury } from './accountant/AccountantTreasury';
import AccountantSales from './accountant/AccountantSales';
import { AccountantExpenses } from './accountant/AccountantExpenses';
import { AccountantTaxes } from './accountant/AccountantTaxes';
import { AccountantChart } from './accountant/AccountantChart';
import { AccountantLedger } from './accountant/AccountantLedger';
import { AccountantAssets } from './accountant/AccountantAssets';

export default function AccountantView() {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'TREASURY' | 'SALES' | 'EXPENSES' | 'TAXES' | 'CHART' | 'LEDGER' | 'ASSETS'>('DASHBOARD');

  return (
    <div className="flex flex-col h-full bg-slate-50/50 -mx-4 md:-mx-7 -mt-4 md:-mt-7 px-4 md:px-7">
      <div className="bg-white/90 glass px-4 md:px-7 py-4 border-b border-slate-200/80 sticky top-0 z-20 print:hidden">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <span className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200/70 flex items-center justify-center">
            <BookOpen className="text-indigo-600" size={17} />
          </span>
          <span><span className="font-serif italic font-normal text-indigo-600">La</span> comptabilité OHADA</span>
        </h1>
        <p className="text-[13px] text-slate-500 mt-1.5">Gestion financière, comptabilité à partie double, fiscalité et amortissements.</p>

        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-sm w-fit mt-6">
          <button
            onClick={() => setActiveTab('DASHBOARD')}
            className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'DASHBOARD' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Target size={16} /> Bilan & P&L
          </button>
          
          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'LEDGER' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Layers size={16} /> Journaux & Écritures
          </button>

          <button
            onClick={() => setActiveTab('CHART')}
            className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'CHART' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <BookOpen size={16} /> Plan Comptable
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
            <FileText size={16} /> Ventes
          </button>
          <button
            onClick={() => setActiveTab('EXPENSES')}
            className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'EXPENSES' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Receipt size={16} /> Dépenses
          </button>
          <button
            onClick={() => setActiveTab('ASSETS')}
            className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'ASSETS' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Building size={16} /> Immobilisations
          </button>
          <button
            onClick={() => setActiveTab('TAXES')}
            className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'TAXES' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Activity size={16} /> TVA
          </button>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'DASHBOARD' && <AccountantDashboard />}
        {activeTab === 'LEDGER' && <AccountantLedger />}
        {activeTab === 'CHART' && <AccountantChart />}
        {activeTab === 'TREASURY' && <AccountantTreasury />}
        {activeTab === 'SALES' && <AccountantSales />}
        {activeTab === 'EXPENSES' && <AccountantExpenses />}
        {activeTab === 'ASSETS' && <AccountantAssets />}
        {activeTab === 'TAXES' && <AccountantTaxes />}
      </div>
    </div>
  );
}
