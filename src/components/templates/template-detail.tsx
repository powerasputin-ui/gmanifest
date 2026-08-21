'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  CheckCircle,
  Pencil,
  Sparkles,
  X,
  Save,
  Link2,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import {
  useTemplate,
  useTemplateMappings,
  useCreateMapping,
  useConfirmMapping,
  useAiMapTemplate,
} from '@/hooks/use-templates';
import { useEntityTypes } from '@/hooks/use-generation';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

export function TemplateDetail() {
  const { selectedTemplateId, setSelectedTemplateId } = useAppStore();
  const { data: template, isLoading: tLoading } = useTemplate(selectedTemplateId || '');
  const { data: mappings, isLoading: mLoading } = useTemplateMappings(selectedTemplateId || '');
  const { data: entityTypes } = useEntityTypes();
  const createMut = useCreateMapping(selectedTemplateId || '');
  const confirmMut = useConfirmMapping(selectedTemplateId || '');
  const aiMapMut = useAiMapTemplate(selectedTemplateId || '');

  const [editingVar, setEditingVar] = useState<string | null>(null);
  const [editPath, setEditPath] = useState('');

  if (!selectedTemplateId) return null;
  if (tLoading || mLoading) return <TemplateDetailSkeleton />;
  if (!template) return <p className="text-destructive">Шаблон не найден</p>;

  const variables = template.variables || [];
  const mappingList = mappings || template.mappings || [];
  const mappedCount = mappingList.length;
  const totalCount = variables.length;
  const progressPct = totalCount > 0 ? Math.round((mappedCount / totalCount) * 100) : 0;

  const handleCreateMapping = (variable: string, path: string) => {
    if (!path.trim()) return;
    createMut.mutate(
      { templateVariable: variable, modelPath: path },
      {
        onSuccess: () => {
          setEditingVar(null);
          setEditPath('');
        },
      },
    );
  };

  const getMappingForVar = (varName: string) =>
    mappingList.find((m) => m.templateVariable === varName);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setSelectedTemplateId(null)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{template.name}</h1>
          <p className="text-muted-foreground text-sm">
            {template.fileType} • {totalCount} переменных
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => aiMapMut.mutate()}
          disabled={aiMapMut.isPending}
          className="border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {aiMapMut.isPending ? 'AI обработка...' : 'AI Автомаппинг'}
        </Button>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Маппинг переменных</span>
            <span className="font-medium">{mappedCount} из {totalCount}</span>
          </div>
          <Progress value={progressPct} className="h-2" />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-emerald-500" />
              {mappingList.filter((m) => m.confirmed).length} подтверждено
            </span>
            <span className="flex items-center gap-1">
              <Link2 className="h-3 w-3 text-amber-500" />
              {mappingList.filter((m) => m.autoDetected && !m.confirmed).length} авто-определено
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Variables list */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Переменные</h2>
        {variables.length > 0 ? (
          variables.map((variable) => {
            const mapping = getMappingForVar(variable);
            const isEditing = editingVar === variable;
            return (
              <Card key={variable}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{`{{${variable}}}`}</code>
                        {mapping?.autoDetected && !mapping?.confirmed && (
                          <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                            Авто
                          </Badge>
                        )}
                        {mapping?.confirmed && (
                          <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                            <CheckCircle className="h-3 w-3 mr-1" />Подтверждено
                          </Badge>
                        )}
                      </div>
                      {mapping?.modelPath ? (
                        <p className="text-sm text-muted-foreground">→ {mapping.modelPath}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Не привязана к модели</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isEditing ? (
                        <>
                          <Input
                            value={editPath}
                            onChange={(e) => setEditPath(e.target.value)}
                            placeholder="Company.company_1.name"
                            className="h-8 text-sm w-56"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateMapping(variable, editPath)}
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleCreateMapping(variable, editPath)}
                          >
                            <Save className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => { setEditingVar(null); setEditPath(''); }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => { setEditingVar(variable); setEditPath(mapping?.modelPath || ''); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {mapping && !mapping.confirmed && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-emerald-600"
                              onClick={() => confirmMut.mutate({ id: mapping.id, confirmed: true })}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center py-8 gap-2">
              <p className="text-muted-foreground">Переменные не найдены</p>
              <p className="text-xs text-muted-foreground">Используйте {`{{переменная}}`} в шаблоне</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function TemplateDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <Card><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
        ))}
      </div>
    </div>
  );
}
