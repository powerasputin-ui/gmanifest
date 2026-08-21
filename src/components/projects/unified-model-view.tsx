'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CheckCircle, Pencil, Plus, X, Save } from 'lucide-react';
import { useProjectModel, useUpdateProjectEntity } from '@/hooks/use-projects';
import type { ModelTree, ProjectEntity } from '@/lib/api';

const ENTITY_LABELS: Record<string, string> = {
  Company: 'Компания',
  Vessel: 'Судно',
  Personnel: 'Персонал',
  Well: 'Скважина',
  Operation: 'Операция',
  FinancialData: 'Финансы',
};

const ENTITY_COLORS: Record<string, string> = {
  Company: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  Vessel: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  Personnel: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  Well: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  Operation: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  FinancialData: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
};

function confidenceBadge(confidence: number | null) {
  if (confidence === null || confidence === undefined) return null;
  const pct = Math.round(confidence * 100);
  const cls =
    pct >= 80
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
      : pct >= 50
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  return (
    <Badge variant="outline" className={`text-xs ${cls}`}>
      {pct}%
    </Badge>
  );
}

function EntityFieldRow({
  entity,
  projectId,
}: {
  entity: ProjectEntity;
  projectId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(entity.value || '');
  const updateMut = useUpdateProjectEntity(projectId);

  const handleSave = () => {
    updateMut.mutate(
      {
        entityType: entity.entityType,
        instanceId: entity.instanceId,
        fieldName: entity.fieldName,
        value: editValue,
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  return (
    <div className="flex items-center gap-2 py-1.5 group">
      <span className="text-sm text-muted-foreground w-40 shrink-0 truncate" title={entity.fieldName}>
        {entity.fieldName}
      </span>
      {editing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-7 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave}>
            <Save className="h-3.5 w-3.5 text-emerald-600" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium truncate">{entity.value || '—'}</span>
          {confidenceBadge(entity.confidence)}
          {entity.isVerified && <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={() => {
              setEditValue(entity.value || '');
              setEditing(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

interface UnifiedModelViewProps {
  projectId: string;
}

export function UnifiedModelView({ projectId }: UnifiedModelViewProps) {
  const { data, isLoading } = useProjectModel(projectId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4"><Skeleton className="h-8 w-40" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data || !data.model) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <p className="text-muted-foreground">Модель данных пуста</p>
          <p className="text-xs text-muted-foreground">Загрузите и обработайте документы для заполнения модели</p>
        </CardContent>
      </Card>
    );
  }

  const model = data.model as ModelTree;
  const entityTypes = Object.keys(model);

  if (entityTypes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <p className="text-muted-foreground">Модель данных пуста</p>
          <p className="text-xs text-muted-foreground">Загрузите и обработайте документы для заполнения модели</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Accordion type="multiple" className="space-y-3">
      {entityTypes.map((entityType) => {
        const instances = Object.keys(model[entityType]);
        const totalFields = instances.reduce(
          (acc, inst) => acc + Object.keys(model[entityType][inst]).length,
          0,
        );
        return (
          <AccordionItem key={entityType} value={entityType} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={ENTITY_COLORS[entityType] || ''}>
                  {ENTITY_LABELS[entityType] || entityType}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {instances.length} экз., {totalFields} полей
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-1">
                {instances.map((instanceId) => {
                  const fields = model[entityType][instanceId];
                  const fieldEntries = Object.entries(fields);
                  return (
                    <Card key={instanceId} className="bg-muted/30">
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-sm font-medium">{instanceId}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        {fieldEntries.map(([fieldName, entity]) => (
                          <EntityFieldRow
                            key={entity.id}
                            entity={entity}
                            projectId={projectId}
                          />
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
