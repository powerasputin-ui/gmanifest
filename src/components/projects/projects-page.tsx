'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FolderKanban, Plus, Users, FileText, Building2, Trash2 } from 'lucide-react';
import { useProjects, useCreateProject, useDeleteProject, useBulkDeleteProjects } from '@/hooks/use-projects';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active: { label: 'Активный', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  completed: { label: 'Завершён', cls: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  archived: { label: 'Архив', cls: 'bg-secondary text-secondary-foreground' },
};

const STAGES = ['Подготовка', 'Сбор данных', 'Обработка', 'Проверка', 'Генерация', 'Завершён'];

export function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const createMut = useCreateProject();
  const deleteMut = useDeleteProject();
  const bulkDeleteMut = useBulkDeleteProjects();
  const { setSelectedProjectId, setActiveTab } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', clientName: '', contractorName: '', stage: '' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const handleCreate = () => {
    if (!form.name.trim()) {
      toast.error('Укажите название проекта');
      return;
    }
    createMut.mutate(form, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ name: '', description: '', clientName: '', contractorName: '', stage: '' });
      },
    });
  };

  const handleCardClick = (id: string) => {
    setSelectedProjectId(id);
    setActiveTab('projects');
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMut.mutateAsync(deleteId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(deleteId);
      return next;
    });
    setDeleteId(null);
  };

  const handleBulkDelete = async () => {
    await bulkDeleteMut.mutateAsync([...selectedIds]);
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
  };

  if (isLoading) return <ProjectsSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Проекты</h1>
          <p className="text-muted-foreground">Управление проектами и унифицированной моделью данных</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Создать проект
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый проект</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Название *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Название проекта"
                />
              </div>
              <div className="space-y-2">
                <Label>Описание</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Описание проекта"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Заказчик</Label>
                  <Input
                    value={form.clientName}
                    onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                    placeholder="Название компании"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Подрядчик</Label>
                  <Input
                    value={form.contractorName}
                    onChange={(e) => setForm({ ...form, contractorName: e.target.value })}
                    placeholder="Название компании"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Этап</Label>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                  <SelectTrigger><SelectValue placeholder="Выберите этап" /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleCreate}
                  disabled={createMut.isPending}
                >
                  {createMut.isPending ? 'Создание...' : 'Создать'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-2">
          <p className="text-sm">Выбрано проектов: {selectedIds.size}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
              Снять выделение
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить ({selectedIds.size})
            </Button>
          </div>
        </div>
      )}

      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer transition-all hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700"
              onClick={() => handleCardClick(project.id)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedIds.has(project.id)}
                      onCheckedChange={(v) => toggleSelect(project.id, !!v)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Выбрать ${project.name}`}
                    />
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                      <FolderKanban className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold truncate">{project.name}</h3>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {project.status && (
                      <Badge variant="outline" className={STATUS_MAP[project.status]?.cls || ''}>
                        {STATUS_MAP[project.status]?.label || project.status}
                      </Badge>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(project.id); }}
                      title="Удалить проект"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {project.clientName && (
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{project.clientName}</span>
                  )}
                  {project.contractorName && (
                    <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{project.contractorName}</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {project.documentCount ?? 0} док.
                  </span>
                  {project.stage && <Badge variant="secondary" className="text-xs">{project.stage}</Badge>}
                  <span>{format(new Date(project.createdAt), 'd MMM', { locale: ru })}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950">
              <FolderKanban className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="font-medium">Нет проектов</p>
              <p className="text-sm text-muted-foreground">Создайте первый проект для начала работы</p>
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Создать проект
            </Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить проект?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие необратимо. Все данные проекта (модель данных, генерации, процессы) будут удалены.
              Загруженные документы останутся, но потеряют привязку к проекту.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить {selectedIds.size} проектов?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие необратимо. Все данные этих проектов будут удалены. Загруженные документы
              останутся, но потеряют привязку к проекту.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProjectsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
