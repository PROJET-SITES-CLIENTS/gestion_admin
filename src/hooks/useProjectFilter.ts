import { useState, useMemo } from 'react';
import { Project } from '../types';

export type FilterPeriod = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'SEMESTER' | 'YEAR';
export type FilterProgress = 'ALL' | 'NOUVEAU' | 'EN_COURS' | 'TERMINE' | 'PAYE' | 'ANNULE';
export type FilterPayment = 'ALL' | 'PAID' | 'PARTIAL' | 'PENDING';

export interface ProjectFiltersState {
  searchQuery: string;
  period: FilterPeriod;
  progress: FilterProgress;
  payment: FilterPayment;
}

export function useProjectFilter(projects: Project[]) {
  const [filters, setFilters] = useState<ProjectFiltersState>({
    searchQuery: '',
    period: 'ALL',
    progress: 'ALL',
    payment: 'ALL',
  });

  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // 1. Text Search — mineur V2 : la recherche porte aussi sur le client
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.clientName || '').toLowerCase().includes(q)
      );
    }

    // 2. Period Filter
    if (filters.period !== 'ALL') {
      const now = new Date();
      result = result.filter(p => {
        const createdAt = new Date(p.createdAt);
        
        switch (filters.period) {
          case 'TODAY':
            return createdAt.toDateString() === now.toDateString();
          case 'WEEK': {
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return createdAt >= oneWeekAgo;
          }
          case 'MONTH':
            return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
          case 'QUARTER': {
            const currentQuarter = Math.floor(now.getMonth() / 3);
            const projectQuarter = Math.floor(createdAt.getMonth() / 3);
            return projectQuarter === currentQuarter && createdAt.getFullYear() === now.getFullYear();
          }
          case 'SEMESTER': {
            const currentSemester = Math.floor(now.getMonth() / 6);
            const projectSemester = Math.floor(createdAt.getMonth() / 6);
            return projectSemester === currentSemester && createdAt.getFullYear() === now.getFullYear();
          }
          case 'YEAR':
            return createdAt.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    // 3. Progress / Evolution Filter — C2 : couvre désormais TOUS les statuts
    if (filters.progress !== 'ALL') {
      result = result.filter(p => p.status === filters.progress);
    }

    // 4. Payment Filter
    if (filters.payment !== 'ALL') {
      result = result.filter(p => {
        if (filters.payment === 'PAID') return p.paymentStatus === 'PAID';
        if (filters.payment === 'PARTIAL') return p.paymentStatus === 'PARTIAL';
        if (filters.payment === 'PENDING') return p.paymentStatus === 'PENDING';
        return true;
      });
    }

    // Default sorting: newest first
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [projects, filters]);

  return {
    filters,
    setFilters,
    filteredProjects,
  };
}
