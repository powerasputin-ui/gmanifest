'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  FileText,
  Upload,
  Cpu,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useProject, useConflicts, useResolveConflict, useBatchProcess } from '@/hooks/use-projects';
import { useTemplates } from '@/hooks/use-templates';
import { useGenerateDocument } from '@/hooks/use-generation';
import { useProfiles } from '@/hooks/use-profiles';
import { useDocuments } from '@/hooks/use-documents';
import { UnifiedModelView } from './unified-model-view';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const DOC_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  uploaded: { label: 'Загружен', cls: 'bg-secondary text-secondary-foreground' },
  processing: { label: 'Обработка', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  completed: { label: 'Готов', cls: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  review: { label: 'Проверка', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  error: { label: 'Ошибка', cls: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

export function ProjectDetailPage() {
  const { selectedProjectId, setSelectedProjectId } = useAppStore();
  const { data: project, isLoading } = useProject(selectedProjectId || '');
  const { data: conflicts } = useConflicts(selectedProjectId || '');
  const { data: profiles } = useProfiles();
  const { data: docsData } = useDocuments();
  const { data: templates } = useTemplates();
  const resolveMut = useResolveConflict(selectedProjectId || '');
  const batchMut = useBatchProcess(selectedProjectId || '');
  const generateMut = useGenerateDocument();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});

  if (!selectedProjectId) return null;
  if (isLoading) return <ProjectDetailSkeleton />;
  if (!project) return <p className="text-destructive">Проект не найден</p>;

  const projectDocs = project.documents || [];
  const allDocs = docsData?.data || [];
  const unlinkedDocs = allDocs.filter((d) => !projectDocs.some((pd) => pd.id === d.id));

  const handleBatchProcess = () => {
    const docIds = projectDocs.map((d) => d.id);
    if (docIds.length === 0) {
      toast.error('Нет документов в проекте');
      return;
    }
    batchMut.mutate({ documentIds: docIds, profileIds: profileMap });
    setProcessDialogOpen(false);
  };

  const handleGenerate = () => {
    if (!selectedTemplate) {
      toast.error('Выберите шаблон');
      return;
    }
    generateMut.mutate(
      { projectId: selectedProjectId, templateId: selectedTemplate },
      {
        onSuccess: (gen) => {
          toast.success('Документ сгенерирован');
          const link = document.createElement('a');
          link.href = `/api/generate/${gen.id}/download`;
          link.download = gen.template?.name || 'document.docx';
          link.click();
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedProjectId(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground">{project.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div className="flex flex-wrap gap-3 text-sm">
        {project.clientName && (
          <Badge variant="outline">Заказчик: {project.clientName}</Badge>
        )}
        {project.contractorName && (
          <Badge variant="outline">Подрядчик: {project.contractorName}</Badge>
        )}
        {project.stage && (
          <Badge variant="outline" className="bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
            {project.stage}
          </Badge>
        )}
        <Badge variant="secondary">
          <FileText className="h-3 w-3 mr-1" />
          {projectDocs.length} документов
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="documents">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="documents">Документы</TabsTrigger>
          <TabsTrigger value="model">Модель данных</TabsTrigger>
          <TabsTrigger value="conflicts">Конфликты</TabsTrigger>
          <TabsTrigger value="generation">Генерация</TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4 mt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {projectDocs.length} документов в проекте
            </p>
            <div className="flex gap-2">
              <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
                <Button
                  variant="outline"
                  onClick={() => setProcessDialogOpen(true)}
                  disabled={projectDocs.length === 0}
                >
                  <Cpu className="h-4 w-4 mr-2" />
                  Обработать все
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Массовая обработка</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Назначьте профиль для каждого документа (опционально)
                    </p>
                    {projectDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3">
                        <span className="text-sm truncate flex-1 min-w-0">{doc.fileName}</span>
                        <Select
                          value={profileMap[doc.id] || ''}
                          onValueChange={(v) =>
                            setProfileMap((prev) => ({ ...prev, [doc.id]: v }))
                          }
                        >
                          <SelectTrigger className="w-48"><SelectValue placeholder="Профиль" /></SelectTrigger>
                          <SelectContent>
                            {profiles?.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setProcessDialogOpen(false)}>Отмена</Button>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={handleBatchProcess}
                        disabled={batchMut.isPending}
                      >
                        {batchMut.isPending ? 'Обработка...' : 'Запустить'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {projectDocs.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Файл</TableHead>
                    <TableHead className="hidden sm:table-cell">Тип</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="hidden md:table-cell">Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectDocs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium truncate max-w-[200px]">{doc.fileName}</TableCell>
                      <TableCell className="hidden sm:table-cell">{doc.fileType}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={DOC_STATUS_MAP[doc.status]?.cls || ''}>
                          {DOC_STATUS_MAP[doc.status]?.label || doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {format(new Date(doc.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12 gap-3">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">Нет документов в проекте</p>
                <p className="text-xs text-muted-foreground">Загрузите документы через раздел «Документы» и привяжите к проекту</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Model Tab */}
        <TabsContent value="model" className="mt-4">
          <UnifiedModelView projectId={selectedProjectId} />
        </TabsContent>

        {/* Conflicts Tab */}
        <TabsContent value="conflicts" className="space-y-4 mt-4">
          {conflicts && conflicts.length > 0 ? (
            <div className="space-y-3">
              {conflicts.map((conflict) => (
                <Card key={conflict.entityId}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="font-medium text-sm">{conflict.entityType} / {conflict.instanceId}</span>
                      <span className="text-sm text-muted-foreground">— {conflict.fieldName}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {conflict.values.map((v, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() =>
                            resolveMut.mutate({
                              entityId: conflict.entityId,
                              fieldName: conflict.fieldName,
                              preferredValue: v.value,
                            })
                          }
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{v.value || '—'}</p>
                            <p className="text-xs text-muted-foreground">
                              {v.documentName || `Док. ${v.sourceDocumentId?.slice(0, 8)}`}
                            </p>
                          </div>
                          {v.confidence !== null && v.confidence !== undefined && (
                            <Badge
                              variant="outline"
                              className={`text-xs shrink-0 ${
                                v.confidence >= 0.8
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {Math.round(v.confidence * 100)}%
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12 gap-3">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
                <p className="text-muted-foreground">Конфликтов не обнаружено</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Generation Tab */}
        <TabsContent value="generation" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Сгенерировать документ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Выберите шаблон</p>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger><SelectValue placeholder="Выберите шаблон" /></SelectTrigger>
                  <SelectContent>
                    {templates?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleGenerate}
                disabled={!selectedTemplate || generateMut.isPending}
              >
                {generateMut.isPending ? 'Генерация...' : 'Сгенерировать'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProjectDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Card><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>
      </div>
    </div>
  );
}
