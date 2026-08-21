'use client';

import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FileCode, Plus, Upload, Eye, Trash2, FileText } from 'lucide-react';
import { useTemplates, useUploadTemplate, useDeleteTemplate } from '@/hooks/use-templates';
import { useAppStore } from '@/store/app-store';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';

export function TemplatesPage() {
  const { selectedTemplateId, setSelectedTemplateId } = useAppStore();
  const { data: templates, isLoading } = useTemplates();
  const uploadMut = useUploadTemplate();
  const deleteMut = useDeleteTemplate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (selectedTemplateId) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.docx')) {
      toast.error('Поддерживаются только .docx файлы');
      return;
    }
    uploadMut.mutate(file, {
      onSuccess: () => {
        setDialogOpen(false);
        if (fileRef.current) fileRef.current.value = '';
      },
    });
  };

  const handleDelete = (id: string, name: string) => {
    deleteMut.mutate(id);
    toast.success(`Шаблон «${name}» удалён`);
  };

  if (isLoading) return <TemplatesSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Шаблоны</h1>
          <p className="text-muted-foreground">Управление шаблонами документов и маппингом переменных</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Загрузить шаблон
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Загрузка шаблона</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Нажмите для выбора файла</p>
                <p className="text-xs text-muted-foreground">Поддерживаются .docx файлы</p>
              </div>
              <input ref={fileRef} type="file" accept=".docx" className="hidden" onChange={handleFileChange} />
              {uploadMut.isPending && (
                <p className="text-sm text-center text-muted-foreground">Загрузка...</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const mappedCount = template._count?.mappings ?? template.mappings?.length ?? 0;
            const totalVars = template.variables?.length ?? 0;
            const allMapped = totalVars > 0 && mappedCount >= totalVars;
            return (
              <Card
                key={template.id}
                className="transition-all hover:shadow-md hover:border-teal-300 dark:hover:border-teal-700"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                        <FileCode className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold truncate">{template.name}</h3>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        allMapped
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                      }
                    >
                      {allMapped ? 'Полный' : 'Частичный'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />{template.fileType}
                    </span>
                    <span>{totalVars} переменных</span>
                    <span>{mappedCount} маппингов</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(template.createdAt), 'd MMM yyyy', { locale: ru })}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setSelectedTemplateId(template.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(template.id, template.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-teal-600 dark:bg-teal-950">
              <FileCode className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="font-medium">Нет шаблонов</p>
              <p className="text-sm text-muted-foreground">Загрузите первый DOCX шаблон</p>
            </div>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Загрузить шаблон
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TemplatesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-5 w-28" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
