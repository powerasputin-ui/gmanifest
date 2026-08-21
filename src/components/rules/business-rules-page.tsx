'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Zap, Database, FileText, Cpu } from 'lucide-react';
import { useBusinessRules } from '@/hooks/use-business-rules';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { BusinessRule } from '@/lib/api';

const TRIGGER_MAP: Record<string, { label: string; cls: string }> = {
  document_type: { label: 'Тип документа', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  entity_present: { label: 'Наличие сущности', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  workflow_step: { label: 'Шаг процесса', cls: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200' },
  always: { label: 'Всегда', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200' },
};

function RuleCard({ rule }: { rule: BusinessRule }) {
  const trigger = TRIGGER_MAP[rule.triggerType] || { label: rule.triggerType, cls: 'bg-secondary text-secondary-foreground' };

  return (
    <Card className="transition-all hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{rule.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`text-xs ${trigger.cls}`}>
                  <Zap className="h-3 w-3 mr-1" />
                  {trigger.label}
                </Badge>
                <span className="text-xs text-muted-foreground">Приоритет: {rule.priority}</span>
              </div>
            </div>
          </div>
          <Switch
            checked={rule.isActive}
            onCheckedChange={() => toast.info('Управление правилами скоро будет доступно')}
            aria-label="Активность правила"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rule.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{rule.description}</p>
        )}

        {/* Required entities */}
        {rule.requiredEntities.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Database className="h-3 w-3" /> Требуемые сущности
            </p>
            <div className="flex flex-wrap gap-1">
              {rule.requiredEntities.map((e) => (
                <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Required documents */}
        {rule.requiredDocuments.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Требуемые документы
            </p>
            <div className="flex flex-wrap gap-1">
              {rule.requiredDocuments.map((d) => (
                <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Auto-extract entities */}
        {rule.autoExtractEntities.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Cpu className="h-3 w-3" /> Автоизвлечение
            </p>
            <div className="flex flex-wrap gap-1">
              {rule.autoExtractEntities.map((e) => (
                <Badge key={e} variant="secondary" className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">{e}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RulesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-5 w-10" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-1">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function BusinessRulesPage() {
  const { data: rules, isLoading } = useBusinessRules();

  if (isLoading) return <RulesSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Правила</h1>
          <p className="text-muted-foreground">Бизнес-правила и условия для автоматической обработки</p>
        </div>
      </div>

      {rules && rules.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map((rule) => (
            <RuleCard key={rule.id} rule={rule} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="font-medium">Нет бизнес-правил</p>
              <p className="text-sm text-muted-foreground">Правила появятся после инициализации данных</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
