'use client';

import { useMemo, useState } from 'react';
import { useDocuments, useDeleteDocument, useBulkDeleteDocuments } from '@/hooks/use-documents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Upload, Search, Play, Trash2, FileText, FileSpreadsheet, Loader2, MoreVertical, AlertTriangle, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { UploadDialog } from './upload-dialog';
import { ProcessDialog } from './process-dialog';
import { useAppStore } from '@/store/app-store';
import { useSettings } from '@/hooks/use-settings';
import { processingStageMessage, formatElapsed } from '@/lib/processing-status';

// Below this, OCR results are shown with a warning badge instead of being
// silently trusted — low-confidence recognitions are common on real scans
// (poor scan quality, handwriting, damaged pages) and should prompt a human
// glance rather than flow straight into a Word/Excel export unquestioned.
const OCR_CONFIDENCE_WARNING_THRESHOLD = 0.85;

interface OcrQualityWarning {
  avgConfidence: number | null;
  lowConfidenceLines: number;
}

function getOcrQualityWarning(metadata: string | null): OcrQualityWarning | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata);
    const quality = parsed?.ocrQuality;
    if (!quality) return null;
    const { avgConfidence, lowConfidenceLines } = quality;
    const hasWarning =
      (typeof avgConfidence === 'number' && avgConfidence < OCR_CONFIDENCE_WARNING_THRESHOLD) ||
      (typeof lowConfidenceLines === 'number' && lowConfidenceLines > 0);
    return hasWarning ? { avgConfidence: avgConfidence ?? null, lowConfidenceLines: lowConfidenceLines ?? 0 } : null;
  } catch {
    return null;
  }
}

// Lines recovered via the vision-API supplement (Фаза 21) are a less-
// verified source than the local OCR pipeline — flagged separately from
// the regular low-confidence warning so the user knows specifically which
// content came from a vision model's best-effort read, not PaddleOCR.
function getVisionSupplementCount(metadata: string | null): number | null {
  if (!metadata) return null;
  try {
    const count = JSON.parse(metadata)?.visionSupplementedLines;
    return typeof count === 'number' && count > 0 ? count : null;
  } catch {
    return null;
  }
}

// Excel reconstruction (export-xlsx-reconstruction) is only wired up for
// OCR'd scans right now — matches the server-side gate in that route.
function isOcrScannedDocument(metadata: string | null): boolean {
  if (!metadata) return false;
  try {
    return JSON.parse(metadata)?.engine === 'paddleocr';
  } catch {
    return false;
  }
}

// The backend generates these files as one blocking request (OCR/table
// recognition/LLM extraction can take minutes) with no incremental progress
// to report — a toast that just says "loading" reads as frozen past ~20-30s.
// This keeps a single toast alive, updating its text every second with a
// staged status message and the elapsed time, so waiting has visible signs
// of life even though it isn't a real percentage.
function startProgressToast(id: string, prefix: string) {
  let elapsed = 0;
  toast.loading(`${prefix} ${processingStageMessage(elapsed)}`, { id });
  const interval = setInterval(() => {
    elapsed += 1;
    toast.loading(`${prefix} ${processingStageMessage(elapsed)} (${formatElapsed(elapsed)})`, { id });
  }, 1000);
  return () => clearInterval(interval);
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  uploaded: { label: 'Загружен', cls: 'bg-secondary text-secondary-foreground' },
  processing: { label: 'Обработка', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  completed: { label: 'Готов', cls: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  review: { label: 'Проверка', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  error: { label: 'Ошибка', cls: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

const STATUS_FILTERS = [
  { value: '', label: 'Все' },
  { value: 'uploaded', label: 'Загружен' },
  { value: 'processing', label: 'Обработка' },
  { value: 'completed', label: 'Готов' },
  { value: 'review', label: 'Проверка' },
  { value: 'error', label: 'Ошибка' },
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function DocumentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [processDocId, setProcessDocId] = useState<string | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [processDocType, setProcessDocType] = useState<string | null>(null);
  const [sgtLoadingId, setSgtLoadingId] = useState<string | null>(null);
  const [docxLoadingId, setDocxLoadingId] = useState<string | null>(null);
  const [xlsxReconstructionLoadingId, setXlsxReconstructionLoadingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const { data, isLoading, isError } = useDocuments(page, 20, status || undefined, search || undefined);
  const deleteDoc = useDeleteDocument();
  const bulkDeleteDocs = useBulkDeleteDocuments();
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setSelectedProjectId = useAppStore((s) => s.setSelectedProjectId);
  const { data: settingsData } = useSettings();
  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of settingsData?.settings || []) map[s.key] = s.value;
    return map;
  }, [settingsData]);
  const advancedProcessingEnabled =
    settingsMap.ui_module_profiles === 'true' || settingsMap.ui_module_workflows === 'true';

  const handleExportSgt = async (docId: string, language: 'ru' | 'en') => {
    setSgtLoadingId(docId);
    const toastId = `export-sgt-${docId}`;
    const stopProgress = startProgressToast(toastId, 'Заполняем СГТ —');
    let warningCount = 0;
    try {
      const res = await fetch(`/api/documents/${docId}/export-sgt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Ошибка ${res.status}`);
      }
      warningCount = Number(res.headers.get('X-SGT-Warning-Count') || '0');
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/);
      const fileName = match ? decodeURIComponent(match[1]) : 'СГТ.xlsx';
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      stopProgress();
      toast.success('СГТ заполнен и скачан', { id: toastId });
      // Deterministic checks (IMO checksum, plausible ranges, swapped
      // columns) run server-side on every extraction — surfaced here so a
      // flagged row gets a human glance instead of being trusted silently.
      if (warningCount > 0) {
        toast.warning(`Проверка нашла ${warningCount} сомнительных значений в заполненной таблице — рекомендуем сверить с оригиналом.`);
      }
    } catch (error) {
      stopProgress();
      toast.error(error instanceof Error ? error.message : 'Не удалось заполнить СГТ', { id: toastId });
    } finally {
      setSgtLoadingId(null);
    }
  };

  const handleExportDocx = async (docId: string, fileName: string) => {
    setDocxLoadingId(docId);
    const toastId = `export-docx-${docId}`;
    const stopProgress = startProgressToast(toastId, 'Готовим Word —');
    try {
      const res = await fetch(`/api/documents/${docId}/export-docx`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Ошибка ${res.status}`);
      }
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/);
      const downloadName = match ? decodeURIComponent(match[1]) : fileName.replace(/\.[^.]+$/, '.docx');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      a.click();
      URL.revokeObjectURL(url);
      stopProgress();
      toast.success('Word-документ готов и скачан', { id: toastId });
    } catch (error) {
      stopProgress();
      toast.error(error instanceof Error ? error.message : 'Не удалось сформировать Word-документ', { id: toastId });
    } finally {
      setDocxLoadingId(null);
    }
  };

  const handleExportXlsxReconstruction = async (docId: string, fileName: string) => {
    setXlsxReconstructionLoadingId(docId);
    const toastId = `export-xlsx-reconstruction-${docId}`;
    const stopProgress = startProgressToast(toastId, 'Готовим Excel-копию —');
    try {
      const res = await fetch(`/api/documents/${docId}/export-xlsx-reconstruction`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Ошибка ${res.status}`);
      }
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/);
      const downloadName = match ? decodeURIComponent(match[1]) : fileName.replace(/\.[^.]+$/, '.xlsx');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      a.click();
      URL.revokeObjectURL(url);
      stopProgress();
      toast.success('Excel-копия готова и скачана', { id: toastId });
    } catch (error) {
      stopProgress();
      toast.error(error instanceof Error ? error.message : 'Не удалось сформировать Excel-копию', { id: toastId });
    } finally {
      setXlsxReconstructionLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteDocId) return;
    await deleteDoc.mutateAsync(deleteDocId);
    setDeleteDocId(null);
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const pageIds = data?.data.map((d) => d.id) || [];
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  const toggleSelectAllOnPage = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    await bulkDeleteDocs.mutateAsync([...selectedIds]);
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Документы</h1>
          <p className="text-muted-foreground">Управление загруженными документами</p>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Upload className="mr-2 h-4 w-4" />
          Загрузить
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <Button
              key={s.value}
              variant={status === s.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setStatus(s.value); setPage(1); }}
              className={status === s.value ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-2">
          <p className="text-sm">Выбрано документов: {selectedIds.size}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
              Снять выделение
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить ({selectedIds.size})
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError || !data ? (
          <p className="p-8 text-center text-destructive">Ошибка загрузки документов</p>
        ) : data.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <Search className="h-10 w-10" />
            <p>Документы не найдены</p>
            <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
              Загрузить первый документ
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
                        onCheckedChange={(v) => toggleSelectAllOnPage(!!v)}
                        aria-label="Выбрать все на странице"
                      />
                    </TableHead>
                    <TableHead>Файл</TableHead>
                    <TableHead className="hidden sm:table-cell">Тип</TableHead>
                    <TableHead className="hidden md:table-cell">Размер</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="hidden lg:table-cell">Классификация</TableHead>
                    <TableHead className="hidden md:table-cell">Дата</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((doc) => (
                    <TableRow key={doc.id} data-state={selectedIds.has(doc.id) ? 'selected' : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(doc.id)}
                          onCheckedChange={(v) => toggleSelect(doc.id, !!v)}
                          aria-label={`Выбрать ${doc.fileName}`}
                        />
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium">{doc.fileName}</span>
                          {(() => {
                            const warning = getOcrQualityWarning(doc.metadata);
                            if (!warning) return null;
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    Низкая уверенность распознавания
                                    {warning.avgConfidence !== null && ` (~${Math.round(warning.avgConfidence * 100)}%)`}
                                    {warning.lowConfidenceLines > 0 && ` — ${warning.lowConfidenceLines} строк под вопросом`}
                                    . Рекомендуем сверить с оригиналом.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })()}
                          {(() => {
                            const count = getVisionSupplementCount(doc.metadata);
                            if (!count) return null;
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {count} {count === 1 ? 'строка добавлена' : 'строк(и) добавлено'} через
                                    распознавание изображением (AI vision) — локальный OCR эти места не нашёл вообще.
                                    Менее проверенный источник, чем основной текст — рекомендуем сверить с оригиналом.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })()}
                        </div>
                        {doc.projectName && (
                          <button
                            className="mt-0.5 text-xs text-emerald-700 hover:underline dark:text-emerald-400"
                            onClick={() => {
                              setSelectedProjectId(doc.projectId!);
                              setActiveTab('projects');
                            }}
                          >
                            Проект: {doc.projectName}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell uppercase text-xs">{doc.fileType}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {formatFileSize(doc.fileSize)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_MAP[doc.status]?.cls || ''}>
                          {STATUS_MAP[doc.status]?.label || doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {doc.classificationType ? (
                          <Badge variant="secondary" className="text-xs">
                            {doc.classificationType}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {format(new Date(doc.createdAt), 'd MMM yyyy', { locale: ru })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={sgtLoadingId === doc.id || docxLoadingId === doc.id || xlsxReconstructionLoadingId === doc.id}
                            >
                              {sgtLoadingId === doc.id || docxLoadingId === doc.id || xlsxReconstructionLoadingId === doc.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  Действия
                                  <MoreVertical className="ml-1 h-4 w-4" />
                                </>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {advancedProcessingEnabled &&
                              (doc.status === 'uploaded' || doc.status === 'completed' || doc.status === 'error') && (
                                <DropdownMenuItem
                                  onClick={() => { setProcessDocId(doc.id); setProcessDocType(doc.classificationType); }}
                                >
                                  <Play className="mr-2 h-4 w-4" />
                                  Обработать (извлечь поля)
                                </DropdownMenuItem>
                              )}
                            {doc.markdown && (
                              <DropdownMenuItem onClick={() => handleExportDocx(doc.id, doc.fileName)}>
                                <FileText className="mr-2 h-4 w-4" />
                                Скачать как Word (.docx)
                              </DropdownMenuItem>
                            )}
                            {doc.markdown && isOcrScannedDocument(doc.metadata) && (
                              <DropdownMenuItem onClick={() => handleExportXlsxReconstruction(doc.id, doc.fileName)}>
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                Скачать как Excel (копия документа)
                              </DropdownMenuItem>
                            )}
                            {doc.markdown && (
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                                  Заполнить СГТ (типовой бланк)
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  <DropdownMenuItem onClick={() => handleExportSgt(doc.id, 'ru')}>
                                    На русском
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleExportSgt(doc.id, 'en')}>
                                    In English
                                  </DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteDocId(doc.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Страница {data.pagination.page} из {data.pagination.totalPages} ({data.pagination.total} всего)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Назад
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Далее
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />

      <ProcessDialog
        open={!!processDocId}
        onOpenChange={(v) => { if (!v) setProcessDocId(null); }}
        documentId={processDocId || ''}
        documentEntityType={processDocType}
      />

      <AlertDialog open={!!deleteDocId} onOpenChange={(v) => { if (!v) setDeleteDocId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить документ?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие необратимо. Все связанные данные извлечения будут удалены.
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
            <AlertDialogTitle>Удалить {selectedIds.size} документов?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие необратимо. Все связанные данные извлечения будут удалены.
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
