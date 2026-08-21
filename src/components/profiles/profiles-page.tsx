'use client';

import { useState } from 'react';
import { useProfiles, useDeleteProfile } from '@/hooks/use-profiles';
import { useEntityTypes } from '@/hooks/use-generation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Plus, Pencil, Trash2, Layers } from 'lucide-react';
import { ProfileEditorDialog } from './profile-editor-dialog';
import type { ExtractionProfile } from '@/lib/api';

function countSchemaFields(schema: string): number {
  try {
    const parsed = JSON.parse(schema);
    return Object.keys(parsed.properties || {}).length;
  } catch {
    return 0;
  }
}

export function ProfilesPage() {
  const { data: profiles, isLoading, isError } = useProfiles();
  const { data: entityTypes } = useEntityTypes();
  const deleteProfile = useDeleteProfile();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<ExtractionProfile | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const entityLabel = (name: string) =>
    entityTypes?.find((t) => t.name === name)?.label || name;

  const handleCreate = () => {
    setEditProfile(null);
    setEditorOpen(true);
  };

  const handleEdit = (p: ExtractionProfile) => {
    setEditProfile(p);
    setEditorOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteProfile.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Профили извлечения</h1>
          <p className="text-muted-foreground">Шаблоны для извлечения данных из документов</p>
        </div>
        <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="mr-2 h-4 w-4" />
          Создать профиль
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : isError || !profiles ? (
        <p className="text-destructive">Ошибка загрузки профилей</p>
      ) : profiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <Layers className="h-10 w-10" />
            <p>Профили не созданы</p>
            <Button variant="outline" size="sm" onClick={handleCreate}>
              Создать первый профиль
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => {
            const fields = countSchemaFields(p.jsonSchema);
            return (
              <Card
                key={p.id}
                className="group transition-shadow hover:shadow-md cursor-pointer"
                onClick={() => handleEdit(p)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); handleEdit(p); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {p.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                      {entityLabel(p.entityType)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {fields} {fields === 1 ? 'поле' : fields < 5 ? 'поля' : 'полей'}
                    </Badge>
                    {p._count && p._count.extractionRuns > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {p._count.extractionRuns} запусков
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ProfileEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        profile={editProfile}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить профиль?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие необратимо. Связанные запуски извлечения не будут удалены, но потеряют привязку к профилю.
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
    </div>
  );
}
