'use client';

import { useState, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'sonner';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { useAppStore, type TabId } from '@/store/app-store';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { DocumentsPage } from '@/components/documents/documents-page';
import { ProjectsPage } from '@/components/projects/projects-page';
import { ProjectDetailPage } from '@/components/projects/project-detail-page';
import { TemplatesPage } from '@/components/templates/templates-page';
import { TemplateDetail } from '@/components/templates/template-detail';
import { ProfilesPage } from '@/components/profiles/profiles-page';
import { SettingsPage } from '@/components/settings/settings-page';
import { WorkflowHub } from '@/components/workflows/workflow-hub';
import { WorkflowProcess } from '@/components/workflows/workflow-process';
import { BusinessRulesPage } from '@/components/rules/business-rules-page';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSettings } from '@/hooks/use-settings';

const TAB_MODULE_KEYS: Partial<Record<TabId, string>> = {
  workflows: 'ui_module_workflows',
  templates: 'ui_module_templates',
  profiles: 'ui_module_profiles',
  rules: 'ui_module_rules',
};

function PageRouter() {
  const { activeTab, selectedWorkflowId, selectedProjectId, selectedTemplateId, setActiveTab } = useAppStore();
  const { data: settingsData } = useSettings();

  // Safety net: if activeTab points at a module that got disabled, fall back to Документы.
  const moduleKey = TAB_MODULE_KEYS[activeTab];
  const moduleDisabled =
    !!moduleKey && !!settingsData && settingsData.settings.find((s) => s.key === moduleKey)?.value !== 'true';

  useEffect(() => {
    if (moduleDisabled) setActiveTab('documents');
  }, [moduleDisabled, setActiveTab]);

  if (moduleDisabled) return <DocumentsPage />;

  // Detail pages
  if (activeTab === 'workflows' && selectedWorkflowId) return <WorkflowProcess />;
  if (activeTab === 'projects' && selectedProjectId) return <ProjectDetailPage />;
  if (activeTab === 'templates' && selectedTemplateId) return <TemplateDetail />;

  // List pages
  switch (activeTab) {
    case 'workflows': return <WorkflowHub />;
    case 'projects': return <ProjectsPage />;
    case 'documents': return <DocumentsPage />;
    case 'templates': return <TemplatesPage />;
    case 'profiles': return <ProfilesPage />;
    case 'rules': return <BusinessRulesPage />;
    case 'settings': return <SettingsPage />;
    default: return <DocumentsPage />;
  }
}

function AppContent() {
  const isMobile = useIsMobile();
  const { activeTab, selectedWorkflowId, selectedProjectId, selectedTemplateId } = useAppStore();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex min-h-screen flex-col">
          {/* Mobile header with trigger */}
          {isMobile && (
            <header className="flex h-14 items-center border-b px-4 gap-2">
              <AppSidebar />
              <span className="text-sm font-medium pl-6">AI DocProc</span>
            </header>
          )}

          {/* Desktop header */}
          {!isMobile && (
            <header className="flex h-14 items-center gap-4 border-b px-6">
              <SidebarTrigger className="-ml-2" />
            </header>
          )}

          {/* Main content */}
          <main className="flex-1 p-4 sm:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeTab}-${selectedProjectId}-${selectedTemplateId}-${selectedWorkflowId}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <PageRouter />
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Sticky footer */}
          <footer className="mt-auto border-t py-3 px-6">
            <p className="text-center text-xs text-muted-foreground">
              © {new Date().getFullYear()} AI DocProc — Платформа обработки документов на базе ИИ
            </p>
          </footer>
        </div>
      </SidebarInset>
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  );
}

export default function Home() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    // Fire-and-forget seed
    fetch('/api/seed', { method: 'POST' }).catch(() => {});
    fetch('/api/seed-v2', { method: 'POST' }).catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
