'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Route, FileText, ChevronRight } from 'lucide-react';
import { useWorkflowTemplates, useWorkflows, useCreateWorkflowFromTemplate } from '@/hooks/use-workflows';
import { useProjects } from '@/hooks/use-projects';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { WorkflowTemplate, Workflow } from '@/lib/api';

// ── Category Labels ────────────────────────────────────

const CATEGORY_MAP: Record<string, { label: string; cls: string }> = {
  commercial: { label: 'Коммерческие', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  operational: { label: 'Операционные', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  hse: { label: 'Охрана труда', cls: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  mobilization: { label: 'Мобилизация', cls: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200' },
  reporting: { label: 'Отчётность', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200' },
  contracting: { label: 'Договорная работа', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Черновик', cls: 'bg-secondary text-secondary-foreground' },
  planning: { label: 'Планирование', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  in_progress: { label: 'В работе', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  review: { label: 'Проверка', cls: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200' },
  completed: { label: 'Завершён', cls: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  cancelled: { label: 'Отменён', cls: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

// ── Color utility ───────────────────────────────────────

function getAccentColor(color: string | null): string {
  if (!color) return 'emerald';
  return color;
}

function getAccentBg(color: string | null): string {
  const c = getAccentColor(color);
  const map: Record<string, string> = {
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-600',
    red: 'bg-red-600',
    violet: 'bg-violet-600',
    sky: 'bg-sky-600',
    orange: 'bg-orange-600',
    teal: 'bg-teal-600',
    green: 'bg-green-600',
  };
  return map[c] || map.emerald;
}

function getAccentBgLight(color: string | null): string {
  const c = getAccentColor(color);
  const map: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  };
  return map[c] || map.emerald;
}

// ── Template Card ──────────────────────────────────────

function TemplateCard({ template, onLaunch }: { template: WorkflowTemplate; onLaunch: () => void }) {
  const cat = CATEGORY_MAP[template.category] || { label: template.category, cls: 'bg-secondary text-secondary-foreground' };

  return (
    <Card className="transition-all hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getAccentBgLight(template.color)}`}>
              <Route className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{template.name}</CardTitle>
              <Badge variant="outline" className={`mt-1 text-xs ${cat.cls}`}>
                {cat.label}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {template.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
        )}

        {/* Required entities */}
        {template.requiredEntityTypes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.requiredEntityTypes.slice(0, 4).map((e) => (
              <Badge key={e} variant="secondary" className="text-xs">
                {e}
              </Badge>
            ))}
            {template.requiredEntityTypes.length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{template.requiredEntityTypes.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {template._count?.workflows ?? 0} процессов
          </span>
          <Button size="sm" className={`h-7 text-xs text-white ${getAccentBg(template.color)} hover:opacity-90`} onClick={onLaunch}>
            Запустить
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Workflow Row ────────────────────────────────────────

function WorkflowRow({ workflow, onClick }: { workflow: Workflow; onClick: () => void }) {
  const totalSteps = workflow.steps?.length ?? (workflow._count?.steps ?? 0);
  const currentStep = workflow.currentStep ?? 0;
  const completeness = workflow.dataCompleteness ?? 0;
  const statusInfo = STATUS_MAP[workflow.status] || { label: workflow.status, cls: 'bg-secondary text-secondary-foreground' };

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{workflow.name}</h3>
              <Badge variant="outline" className={`text-xs ${statusInfo.cls}`}>
                {statusInfo.label}
              </Badge>
              {workflow.template && (
                <Badge variant="secondary" className="text-xs">
                  {workflow.template.category}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {workflow.project && <span>Проект: {workflow.project.name}</span>}
              {totalSteps > 0 && <span>Шаг {currentStep}/{totalSteps}</span>}
              <span>{format(new Date(workflow.createdAt), 'd MMM yyyy', { locale: ru })}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-24">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Готовность</span>
                <span className="font-medium">{Math.round(completeness)}%</span>
              </div>
              <Progress value={completeness} className="h-2" />
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Launch Dialog ───────────────────────────────────────

function LaunchDialog({
  template,
  open,
  onOpenChange,
}: {
  template: WorkflowTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: projects } = useProjects();
  const createMut = useCreateWorkflowFromTemplate();
  const { setSelectedWorkflowId } = useAppStore();
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');

  const handleLaunch = () => {
    if (!projectId) {
      toast.error('Выберите проект');
      return;
    }
    createMut.mutate(
      {
        templateId: template.id,
        projectId,
        name: name.trim() || undefined,
      },
      {
        onSuccess: (wf) => {
          onOpenChange(false);
          setProjectId('');
          setName('');
          setSelectedWorkflowId(wf.id);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Запуск: {template.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Название процесса (необязательно)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Новый ${template.name.toLowerCase()}`}
            />
          </div>
          <div className="space-y-2">
            <Label>Проект *</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите проект" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium">Что потребуется:</p>
            {template.requiredEntityTypes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {template.requiredEntityTypes.map((e) => (
                  <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
                ))}
              </div>
            )}
            {template.requiredDocumentTypes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {template.requiredDocumentTypes.map((d) => (
                  <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleLaunch}
              disabled={createMut.isPending || !projectId}
            >
              {createMut.isPending ? 'Запуск...' : 'Запустить'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ──────────────────────────────────────

export function WorkflowHub() {
  const { data: templates, isLoading: templatesLoading } = useWorkflowTemplates();
  const { data: workflows, isLoading: workflowsLoading } = useWorkflows();
  const { setSelectedWorkflowId } = useAppStore();
  const [launchTemplate, setLaunchTemplate] = useState<WorkflowTemplate | null>(null);

  const activeWorkflows = workflows?.filter(
    (w) => w.status !== 'completed' && w.status !== 'cancelled',
  ) ?? [];

  const handleWorkflowClick = (id: string) => {
    setSelectedWorkflowId(id);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Бизнес-процессы</h1>
          <p className="text-muted-foreground">Запустите процесс из шаблона или продолжите работу</p>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => setLaunchTemplate(templates?.[0] ?? null)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Новый процесс
        </Button>
      </div>

      {/* Template Cards Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Шаблоны процессов</h2>
        {templatesLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onLaunch={() => setLaunchTemplate(t)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950">
                <Route className="h-8 w-8" />
              </div>
              <div className="text-center">
                <p className="font-medium">Нет шаблонов процессов</p>
                <p className="text-sm text-muted-foreground">Шаблоны появятся после инициализации данных</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Launch dialog */}
        {launchTemplate && (
          <LaunchDialog
            template={launchTemplate}
            open={!!launchTemplate}
            onOpenChange={(open) => {
              if (!open) setLaunchTemplate(null);
            }}
          />
        )}
      </section>

      {/* Active Workflows Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          Активные процессы
          {activeWorkflows.length > 0 && (
            <Badge variant="secondary" className="ml-2">{activeWorkflows.length}</Badge>
          )}
        </h2>
        {workflowsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : activeWorkflows.length > 0 ? (
          <div className="space-y-3">
            {activeWorkflows.map((w) => (
              <WorkflowRow
                key={w.id}
                workflow={w}
                onClick={() => handleWorkflowClick(w.id)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Route className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Нет активных процессов</p>
                <p className="text-xs text-muted-foreground">Запустите процесс из шаблона выше</p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
