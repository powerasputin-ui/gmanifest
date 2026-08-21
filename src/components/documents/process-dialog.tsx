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
import { Badge } from '@/components/ui/badge';
import { useProfiles } from '@/hooks/use-profiles';
import { useProcessDocument } from '@/hooks/use-documents';
import { useQueryClient } from '@tanstack/react-query';
import { Layers, CheckCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documentId: string;
  documentEntityType?: string | null;
}

export function ProcessDialog({ open, onOpenChange, documentId, documentEntityType }: Props) {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const { data: profiles } = useProfiles();
  const process = useProcessDocument();
  const qc = useQueryClient();

  const handleProcess = async () => {
    if (!selectedProfileId) return;
    await process.mutateAsync({ id: documentId, profileId: selectedProfileId });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    setSelectedProfileId(null);
    onOpenChange(false);
  };

  // Show all active profiles; profiles matching the document type (if any) go first
  const filtered = (profiles?.filter((p) => p.isActive) || []).sort((a, b) => {
    const aMatch = documentEntityType && a.entityType === documentEntityType ? 0 : 1;
    const bMatch = documentEntityType && b.entityType === documentEntityType ? 0 : 1;
    return aMatch - bMatch;
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setSelectedProfileId(null); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Запустить обработку</DialogTitle>
          <DialogDescription>Выберите профиль извлечения данных</DialogDescription>
        </DialogHeader>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Нет активных профилей. Создайте профиль в разделе «Профили».
          </p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProfileId(p.id)}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                  selectedProfileId === p.id
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                    : ''
                }`}
              >
                <Layers className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{p.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {p.entityType}
                    </Badge>
                    {selectedProfileId === p.id && (
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    )}
                  </div>
                  {p.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button
            onClick={handleProcess}
            disabled={!selectedProfileId || process.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {process.isPending ? 'Обработка...' : 'Обработать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
