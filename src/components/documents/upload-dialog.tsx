'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileText, ImageIcon } from 'lucide-react';
import { useUploadDocument } from '@/hooks/use-documents';
import { useQueryClient } from '@tanstack/react-query';
import { fakeProgressPercent, processingStageMessage, formatElapsed } from '@/lib/processing-status';

const ACCEPTED = '.pdf,.docx,.png,.jpg,.jpeg,.xlsx,.xls';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function UploadDialog({ open, onOpenChange }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadDocument();
  const qc = useQueryClient();

  // Scanned documents go through OCR, which can take a minute or more —
  // without a running counter, a stalled-looking spinner reads as broken and
  // invites people to close the dialog and retry, which just piles up
  // duplicate uploads while the original keeps processing in the background.
  useEffect(() => {
    if (!uploading) {
      setElapsedSec(0);
      return;
    }
    const interval = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [uploading]);

  const addFiles = useCallback((list: FileList | File[]) => {
    const arr = Array.from(list);
    setFiles((prev) => [...prev, ...arr]);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        await upload.mutateAsync(file);
      }
      setFiles([]);
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    } finally {
      setUploading(false);
    }
  };

  // Block closing (X, outside click, Escape) while an upload is in flight —
  // closing doesn't cancel the request, it just hides the only feedback the
  // user has that it's still working.
  const handleOpenChange = (v: boolean) => {
    if (!v && uploading) return;
    onOpenChange(v);
  };

  const FileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg'].includes(ext || '')) return <ImageIcon className="h-4 w-4 text-amber-500" />;
    return <FileText className="h-4 w-4 text-emerald-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Загрузка документов</DialogTitle>
          <DialogDescription>
            Перетащите файлы или выберите на диске. Допустимые форматы: PDF, DOCX, PNG, JPG.
          </DialogDescription>
        </DialogHeader>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragOver
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Нажмите или перетащите файлы сюда</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {files.map((f, i) => (
              <div
                key={`${f.name}-${i}`}
                className="flex items-center gap-3 rounded-md border p-2 text-sm"
              >
                {FileIcon(f.name)}
                <span className="flex-1 truncate">{f.name}</span>
                <span className="text-muted-foreground text-xs">{formatSize(f.size)}</span>
                {!uploading && (
                  <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Backend processes each file as one blocking request with no
            incremental progress to report — this bar is an honest
            approximation (grows continuously, never claims 100% until
            actually done) so waiting doesn't look identical to frozen. */}
        {uploading && (
          <div className="space-y-1.5">
            <Progress value={fakeProgressPercent(elapsedSec)} />
            <p className="text-muted-foreground text-xs">
              {processingStageMessage(elapsedSec)} ({formatElapsed(elapsedSec)})
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {uploading ? `Загрузка… ${formatElapsed(elapsedSec)}` : `Загрузить (${files.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
