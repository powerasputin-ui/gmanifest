'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Check,
  Loader2,
  X,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  CircleCheckBig,
  Upload,
  Database,
  Cpu,
  ClipboardCheck,
  FileOutput,
  Eye,
  Download,
  Target,
  ListChecks,
} from 'lucide-react';
import {
  useWorkflowDetail,
  useAdvanceWorkflow,
  useCancelWorkflow,
  useWorkflowDependencies,
  useWorkflowCompleteness,
} from '@/hooks/use-workflows';
import { useAppStore } from '@/store/app-store';
import type { WorkflowStepDetail, DependencyReport } from '@/lib/api';

// ── Step type labels & icons ────────────────────────────

const STEP_TYPE_LABELS: Record<string, string> = {
  define_goal: 'Определение цели',
  identify_data: 'Идентификация данных',
  find_documents: 'Поиск документов',
  extract: 'Извлечение данных',
  check_completeness: 'Проверка полноты',
  fill_template: 'Заполнение шаблона',
  user_review: 'Пользовательская проверка',
  export: 'Экспорт',
};

const STEP_TYPE_ICONS: Record<string, React.ElementType> = {
  define_goal: Target,
  identify_data: ListChecks,
  find_documents: Upload,
  extract: Cpu,
  check_completeness: ClipboardCheck,
  fill_template: FileOutput,
  user_review: Eye,
  export: Download,
};

// ── Status helpers ──────────────────────────────────────

function StepStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Check className="h-4 w-4 text-emerald-500" />;
    case 'in_progress':
      return <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" />;
    case 'blocked':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'skipped':
      return <X className="h-4 w-4 text-muted-foreground" />;
    default:
      return <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/30" />;
  }
}

// ── Left Panel: Vertical Stepper ─────────────────────────

function StepTimeline({ steps, currentStep }: { steps: WorkflowStepDetail[]; currentStep: number }) {
  return (
    <div className="space-y-1">
      {steps.map((step, i) => {
        const isCurrent = i === currentStep;
        const isCompleted = step.status === 'completed';
        const isBlocked = step.status === 'blocked';
        const Icon = STEP_TYPE_ICONS[step.stepType] || Target;

        return (
          <div
            key={step.id}
            className={`relative flex gap-3 p-3 rounded-lg transition-colors ${
              isCurrent
                ? 'bg-emerald-50 border border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800'
                : isBlocked
                  ? 'bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800'
                  : isCompleted
                    ? 'opacity-60'
                    : ''
            }`}
          >
            {/* Timeline line */}
            {i < steps.length - 1 && (
              <div
                className={`absolute left-[22px] top-12 w-0.5 h-6 ${
                  isCompleted ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-border'
                }`}
              />
            )}

            {/* Step number / icon */}
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 ${
                isCurrent
                  ? 'border-emerald-500 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                  : isBlocked
                    ? 'border-red-500 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    : isCompleted
                      ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950'
                      : 'border-border bg-background'
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>

            {/* Step info */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium truncate ${isCurrent ? 'text-emerald-800 dark:text-emerald-200' : ''}`}>
                  {step.name}
                </span>
                <StepStatusIcon status={step.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {STEP_TYPE_LABELS[step.stepType] || step.stepType}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Step Content Renderers ─────────────────────────────

function DefineGoalContent({ workflow }: { workflow: import('@/lib/api').WorkflowDetail }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Информация о процессе</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <span className="text-sm text-muted-foreground">Шаблон:</span>
            <span className="ml-2 font-medium">{workflow.template?.name || '—'}</span>
          </div>
          {workflow.template?.description && (
            <p className="text-sm text-muted-foreground">{workflow.template.description}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Необходимые типы данных</CardTitle>
          <CardDescription>Данные, которые потребуются для выполнения процесса</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {workflow.template?.requiredEntityTypes && workflow.template.requiredEntityTypes.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Сущности:</p>
                <div className="flex flex-wrap gap-1.5">
                  {workflow.template.requiredEntityTypes.map((e) => (
                    <Badge key={e} variant="secondary">{e}</Badge>
                  ))}
                </div>
              </div>
            )}
            {workflow.template?.requiredDocumentTypes && workflow.template.requiredDocumentTypes.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Документы:</p>
                <div className="flex flex-wrap gap-1.5">
                  {workflow.template.requiredDocumentTypes.map((d) => (
                    <Badge key={d} variant="outline">{d}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IdentifyDataContent({ workflowId }: { workflowId: string }) {
  const { data: completeness } = useWorkflowCompleteness(workflowId);

  if (!completeness) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-8 w-32 mt-3" />
          <div className="space-y-2 mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const breakdown = completeness.breakdown as Array<{
    entity: string;
    required: boolean;
    found: boolean;
    completeness: number;
    missingFields: string[];
    sources: string[];
  }>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Общая полнота данных</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <Progress value={completeness.completenessPercent} className="flex-1 h-3" />
            <span className="text-sm font-bold">{Math.round(completeness.completenessPercent)}%</span>
          </div>
        </CardContent>
      </Card>

      {breakdown && breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Разбивка по сущностям</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {breakdown.map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.entity}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{Math.round(item.completeness)}%</span>
                    <Badge
                      variant="outline"
                      className={
                        item.completeness >= 100
                          ? 'text-emerald-600 border-emerald-300'
                          : item.completeness > 0
                            ? 'text-amber-600 border-amber-300'
                            : 'text-red-600 border-red-300'
                      }
                    >
                      {item.completeness >= 100 ? 'Полностью' : item.completeness > 0 ? 'Частично' : 'Отсутствует'}
                    </Badge>
                  </div>
                </div>
                <Progress
                  value={item.completeness}
                  className={`h-1.5 ${
                    item.completeness >= 100
                      ? '[&>div]:bg-emerald-500'
                      : item.completeness > 0
                        ? '[&>div]:bg-amber-500'
                        : '[&>div]:bg-red-500'
                  }`}
                />
                {item.missingFields && item.missingFields.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Отсутствуют: {item.missingFields.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FindDocumentsContent({ workflow }: { workflow: import('@/lib/api').WorkflowDetail }) {
  const requiredDocs = workflow.template?.requiredDocumentTypes ?? [];
  const projectDocs = workflow.project?.documents ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Требуемые документы</CardTitle>
          <CardDescription>Загрузите необходимые документы для процесса</CardDescription>
        </CardHeader>
        <CardContent>
          {requiredDocs.length > 0 ? (
            <div className="space-y-2">
              {requiredDocs.map((docType) => (
                <div key={docType} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{docType}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Ожидает загрузки
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Документы не требуются для этого процесса</p>
          )}
        </CardContent>
      </Card>

      {projectDocs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Документы проекта</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {projectDocs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <FileOutput className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm truncate">{doc.fileName}</span>
                  <Badge variant="secondary" className="text-xs ml-auto">{doc.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ExtractContent({ workflow }: { workflow: import('@/lib/api').WorkflowDetail }) {
  const entities = workflow.template?.requiredEntityTypes ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Извлечение данных</CardTitle>
          <CardDescription>Сущности, которые будут извлечены из документов</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {entities.map((entity) => (
              <div key={entity} className="flex items-center gap-2 p-2 rounded-lg border">
                <Cpu className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium">{entity}</span>
                <Badge variant="outline" className="text-xs ml-auto">Ожидает</Badge>
              </div>
            ))}
            {entities.length === 0 && (
              <p className="text-sm text-muted-foreground">Нет сущностей для извлечения</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CheckCompletenessContent({ workflowId }: { workflowId: string }) {
  const { data: depReport, isLoading } = useWorkflowDependencies(workflowId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-5 w-48" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions list — the KEY section */}
      {depReport && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Что нужно сделать
            </CardTitle>
          </CardHeader>
          <CardContent>
            {depReport.actions.length > 0 ? (
              <div className="space-y-2">
                {depReport.actions
                  .sort((a, b) => {
                    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
                    return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
                  })
                  .map((action, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                      <div
                        className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                          action.priority === 'high'
                            ? 'bg-red-500'
                            : action.priority === 'medium'
                              ? 'bg-amber-500'
                              : 'bg-green-500'
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm">{action.description}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {action.type === 'upload_document'
                            ? 'Загрузить документ'
                            : action.type === 'extract_entity'
                              ? 'Извлечь сущность'
                              : action.type === 'fill_manually'
                                ? 'Заполнить вручную'
                                : 'Разрешить конфликт'}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-emerald-600">Все данные готовы для продолжения</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Entities completeness */}
      {depReport && depReport.entities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Сущности</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {depReport.entities.map((ent, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{ent.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {ent.foundFields}/{ent.totalFields} полей
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      ent.status === 'complete'
                        ? 'text-emerald-600 border-emerald-300'
                        : ent.status === 'partial'
                          ? 'text-amber-600 border-amber-300'
                          : 'text-red-600 border-red-300'
                    }
                  >
                    {ent.status === 'complete' ? 'Готово' : ent.status === 'partial' ? 'Частично' : 'Отсутствует'}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Documents status */}
      {depReport && depReport.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Документы</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {depReport.documents.map((doc, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg border">
                <div className="flex items-center gap-2">
                  <FileOutput className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{doc.type}</span>
                </div>
                <Badge
                  variant="outline"
                  className={
                    doc.status === 'present'
                      ? 'text-emerald-600 border-emerald-300'
                      : 'text-red-600 border-red-300'
                  }
                >
                  {doc.status === 'present' ? 'Есть' : 'Отсутствует'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GenericStepContent({ step }: { step: WorkflowStepDetail }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{step.name}</CardTitle>
          {step.description && <CardDescription>{step.description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {step.requiredEntities.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Требуемые сущности:</p>
                <div className="flex flex-wrap gap-1.5">
                  {step.requiredEntities.map((e) => (
                    <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
                  ))}
                </div>
              </div>
            )}
            {step.requiredDocuments.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Требуемые документы:</p>
                <div className="flex flex-wrap gap-1.5">
                  {step.requiredDocuments.map((d) => (
                    <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
                  ))}
                </div>
              </div>
            )}
            {step.requiredTemplates.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Требуемые шаблоны:</p>
                <div className="flex flex-wrap gap-1.5">
                  {step.requiredTemplates.map((t) => (
                    <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
            {step.requiredEntities.length === 0 && step.requiredDocuments.length === 0 && (
              <p className="text-sm text-muted-foreground">Нет особых требований для этого шага</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StepContent({
  step,
  workflow,
  workflowId,
}: {
  step: WorkflowStepDetail;
  workflow: import('@/lib/api').WorkflowDetail;
  workflowId: string;
}) {
  switch (step.stepType) {
    case 'define_goal':
      return <DefineGoalContent workflow={workflow} />;
    case 'identify_data':
      return <IdentifyDataContent workflowId={workflowId} />;
    case 'find_documents':
      return <FindDocumentsContent workflow={workflow} />;
    case 'extract':
      return <ExtractContent workflow={workflow} />;
    case 'check_completeness':
      return <CheckCompletenessContent workflowId={workflowId} />;
    case 'fill_template':
      return <GenericStepContent step={step} />;
    case 'user_review':
      return <GenericStepContent step={step} />;
    case 'export':
      return <GenericStepContent step={step} />;
    default:
      return <GenericStepContent step={step} />;
  }
}

// ── Loading skeleton ────────────────────────────────────

function WorkflowProcessSkeleton() {
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="lg:w-1/3">
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
      <div className="lg:w-2/3 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────

export function WorkflowProcess() {
  const { selectedWorkflowId, setSelectedWorkflowId } = useAppStore();
  const { data, isLoading } = useWorkflowDetail(selectedWorkflowId ?? '');
  const advanceMut = useAdvanceWorkflow(selectedWorkflowId ?? '');
  const cancelMut = useCancelWorkflow(selectedWorkflowId ?? '');

  if (!selectedWorkflowId) return null;

  if (isLoading) return <WorkflowProcessSkeleton />;

  if (!data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Процесс не найден</p>
          <Button variant="outline" onClick={() => setSelectedWorkflowId(null)}>
            Вернуться
          </Button>
        </CardContent>
      </Card>
    );
  }

  const workflow = data.workflow;
  const steps = workflow.steps;
  const currentStepIdx = Math.max(0, workflow.currentStep);
  const currentStep = steps[currentStepIdx];
  const isCompleted = workflow.status === 'completed';
  const isBlocked = currentStep?.status === 'blocked';
  const isFirstStep = currentStepIdx === 0;

  const handleBack = () => {
    setSelectedWorkflowId(null);
  };

  const handleAdvance = () => {
    advanceMut.mutate();
  };

  const handleCancel = () => {
    cancelMut.mutate(undefined, {
      onSuccess: () => setSelectedWorkflowId(null),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{workflow.name}</h1>
          <p className="text-sm text-muted-foreground">
            {workflow.template?.name && `Шаблон: ${workflow.template.name}`}
            {workflow.project?.name && ` • Проект: ${workflow.project.name}`}
          </p>
        </div>
        {workflow.dataCompleteness != null && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Готовность</span>
            <Progress value={workflow.dataCompleteness} className="w-20 h-2" />
            <span className="text-xs font-medium">{Math.round(workflow.dataCompleteness)}%</span>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left panel: stepper */}
        <div className="lg:w-1/3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Шаги процесса</CardTitle>
            </CardHeader>
            <CardContent>
              <StepTimeline steps={steps} currentStep={currentStepIdx} />
            </CardContent>
          </Card>
        </div>

        {/* Right panel: step content */}
        <div className="lg:w-2/3">
          {isCompleted ? (
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950">
                  <CircleCheckBig className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">Процесс завершён</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Все шаги выполнены успешно
                  </p>
                </div>
                <Button variant="outline" onClick={handleBack}>
                  Вернуться к процессам
                </Button>
              </CardContent>
            </Card>
          ) : currentStep ? (
            <div className="space-y-4">
              {/* Current step header */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Шаг {currentStepIdx + 1} из {steps.length}
                </span>
                <Separator className="flex-1" />
                <Badge
                  variant="outline"
                  className={
                    currentStep.status === 'in_progress'
                      ? 'text-emerald-600 border-emerald-300'
                      : currentStep.status === 'blocked'
                        ? 'text-red-600 border-red-300'
                        : ''
                  }
                >
                  {currentStep.status === 'in_progress'
                    ? 'В работе'
                    : currentStep.status === 'blocked'
                      ? 'Заблокирован'
                      : currentStep.status}
                </Badge>
              </div>

              {/* Step content */}
              <StepContent
                step={currentStep}
                workflow={workflow}
                workflowId={workflow.id}
              />

              {/* Bottom action bar */}
              <Card>
                <CardContent className="p-4">
                  {isBlocked && currentStep.missingItems && currentStep.missingItems.length > 0 && (
                    <Alert variant="destructive" className="mb-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Шаг заблокирован</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc ml-4 mt-1 space-y-0.5 text-xs">
                          {currentStep.missingItems.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {advanceMut.isError && (
                    <Alert variant="destructive" className="mb-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Не удалось перейти</AlertTitle>
                      <AlertDescription>{advanceMut.error?.message}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex items-center justify-between">
                    <Button variant="outline" onClick={handleBack}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Назад
                    </Button>
                    <div className="flex gap-2">
                      {!isCompleted && workflow.status !== 'cancelled' && (
                        <Button variant="outline" className="text-red-600" onClick={handleCancel}>
                          Отменить
                        </Button>
                      )}
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={handleAdvance}
                        disabled={advanceMut.isPending || isBlocked}
                      >
                        {advanceMut.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ArrowRight className="h-4 w-4 mr-2" />
                        )}
                        Далее
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                <p className="text-muted-foreground">Нет активного шага</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
