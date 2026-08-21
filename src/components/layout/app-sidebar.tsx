'use client';

import { FileText } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  Route,
  FolderKanban,
  FileText as FileTextIcon,
  FileCode,
  Layers,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { useAppStore, type TabId } from '@/store/app-store';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSettings } from '@/hooks/use-settings';

const NAV_ITEMS: { id: TabId; label: string; icon: React.ElementType; moduleKey?: string }[] = [
  { id: 'documents', label: 'Документы', icon: FileTextIcon },
  { id: 'projects', label: 'Проекты', icon: FolderKanban },
  { id: 'workflows', label: 'Бизнес-процессы', icon: Route, moduleKey: 'ui_module_workflows' },
  { id: 'templates', label: 'Шаблоны', icon: FileCode, moduleKey: 'ui_module_templates' },
  { id: 'profiles', label: 'Профили', icon: Layers, moduleKey: 'ui_module_profiles' },
  { id: 'rules', label: 'Правила', icon: ShieldCheck, moduleKey: 'ui_module_rules' },
  { id: 'settings', label: 'Настройки', icon: Settings },
];

/** Core nav (Документы/Проекты/Настройки) is always visible; optional
 * modules only show once enabled in Настройки → Модули интерфейса. */
function useVisibleNavItems() {
  const { data } = useSettings();
  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of data?.settings || []) map[s.key] = s.value;
    return map;
  }, [data]);
  return useMemo(
    () => NAV_ITEMS.filter((item) => !item.moduleKey || settingsMap[item.moduleKey] === 'true'),
    [settingsMap]
  );
}

function SidebarNav() {
  const { activeTab, setActiveTab } = useAppStore();
  const navItems = useVisibleNavItems();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <FileText className="h-4 w-4" />
          </div>
          <span className="text-base font-bold group-data-[collapsible=icon]:hidden">
            AI DocProc
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    onClick={() => setActiveTab(item.id)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          AI DocProc v3.0
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function AppSidebar() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed top-3 left-3 z-50 md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <MobileNav onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return <SidebarNav />;
}

function MobileNav({ onClose }: { onClose: () => void }) {
  const { activeTab, setActiveTab } = useAppStore();
  const navItems = useVisibleNavItems();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <FileText className="h-4 w-4" />
        </div>
        <span className="text-base font-bold">AI DocProc</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              onClose();
            }}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${
              activeTab === item.id
                ? 'bg-emerald-100 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                : 'text-muted-foreground'
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground">
        AI DocProc v3.0
      </div>
    </div>
  );
}
