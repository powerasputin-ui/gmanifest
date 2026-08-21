'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateProfile, useUpdateProfile } from '@/hooks/use-profiles';
import { useEntityTypes } from '@/hooks/use-generation';
import type { ExtractionProfile } from '@/lib/api';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile?: ExtractionProfile | null;
}

function ProfileForm({
  profile,
  onSave,
  onCancel,
  isPending,
}: {
  profile?: ExtractionProfile | null;
  onSave: (data: {
    name: string;
    description?: string;
    entityType: string;
    jsonSchema: string;
    promptTemplate: string;
    validationRules?: string;
  }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const isEdit = !!profile;
  const { data: entityTypes } = useEntityTypes();
  const [name, setName] = useState(profile?.name || '');
  const [description, setDescription] = useState(profile?.description || '');
  const [entityType, setEntityType] = useState(profile?.entityType || '');
  const [jsonSchema, setJsonSchema] = useState(profile?.jsonSchema || '');
  const [promptTemplate, setPromptTemplate] = useState(profile?.promptTemplate || '');
  const [validationRules, setValidationRules] = useState(profile?.validationRules || '');

  const isValid = name && entityType && jsonSchema && promptTemplate;

  const handleSave = () => {
    onSave({
      name,
      description: description || undefined,
      entityType,
      jsonSchema,
      promptTemplate,
      validationRules: validationRules || undefined,
    });
  };

  return (
    <>
      <div className="grid gap-4 py-2">
        <div className="grid gap-2">
          <Label htmlFor="name">Название *</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Счёт на оплату" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="desc">Описание</Label>
          <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Краткое описание профиля" rows={2} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="dtype">Тип сущности *</Label>
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger><SelectValue placeholder="Выберите тип сущности" /></SelectTrigger>
            <SelectContent>
              {(entityTypes || []).map((t) => (
                <SelectItem key={t.name} value={t.name}>{t.label || t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="schema">JSON Schema *</Label>
          <Textarea
            id="schema"
            value={jsonSchema}
            onChange={(e) => setJsonSchema(e.target.value)}
            placeholder='{"type":"object","properties":{...}}'
            rows={8}
            className="font-mono text-xs"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="prompt">Шаблон промпта *</Label>
          <Textarea
            id="prompt"
            value={promptTemplate}
            onChange={(e) => setPromptTemplate(e.target.value)}
            placeholder="Извлеки данные из этого документа..."
            rows={4}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="rules">Правила валидации (JSON)</Label>
          <Textarea
            id="rules"
            value={validationRules}
            onChange={(e) => setValidationRules(e.target.value)}
            placeholder='{"field_name":["inn","required"]}'
            rows={4}
            className="font-mono text-xs"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Отмена</Button>
        <Button
          onClick={handleSave}
          disabled={!isValid || isPending}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isPending ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
        </Button>
      </DialogFooter>
    </>
  );
}

export function ProfileEditorDialog({ open, onOpenChange, profile }: Props) {
  const createProfile = useCreateProfile();
  const updateProfile = useUpdateProfile();
  const isPending = createProfile.isPending || updateProfile.isPending;

  const handleSave = async (data: Parameters<typeof createProfile.mutateAsync>[0]) => {
    try {
      if (profile) {
        await updateProfile.mutateAsync({ id: profile.id, data });
      } else {
        await createProfile.mutateAsync(data);
      }
      onOpenChange(false);
    } catch {
      // error handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{profile ? 'Редактировать профиль' : 'Создать профиль'}</DialogTitle>
          <DialogDescription>
            {profile ? 'Измените настройки профиля извлечения' : 'Настройте новый профиль для извлечения данных из документов'}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ProfileForm
            key={profile?.id || '__new__'}
            profile={profile}
            onSave={handleSave}
            onCancel={() => onOpenChange(false)}
            isPending={isPending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
