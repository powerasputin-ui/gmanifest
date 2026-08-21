'use client';

import { create } from 'zustand';

export type TabId = 'workflows' | 'projects' | 'documents' | 'templates' | 'profiles' | 'rules' | 'settings';

interface AppState {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  selectedWorkflowId: string | null;
  setSelectedWorkflowId: (id: string | null) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  selectedTemplateId: string | null;
  setSelectedTemplateId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'documents',
  setActiveTab: (tab) => set({ activeTab: tab }),
  selectedWorkflowId: null,
  setSelectedWorkflowId: (id) => set({ selectedWorkflowId: id }),
  selectedProjectId: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  selectedTemplateId: null,
  setSelectedTemplateId: (id) => set({ selectedTemplateId: id }),
}));
