import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDocuments,
  getDocument,
  deleteDocument,
  bulkDeleteDocuments,
  processDocument,
  uploadDocument,
} from '@/lib/api';
import { toast } from 'sonner';

export function useDocuments(
  page = 1,
  limit = 20,
  status?: string,
  search?: string,
) {
  return useQuery({
    queryKey: ['documents', page, limit, status, search],
    queryFn: () => getDocuments({ page, limit, status, search }),
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => getDocument(id),
    enabled: !!id,
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Документ удалён');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useBulkDeleteDocuments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteDocuments(ids),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`Удалено документов: ${result.count}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useProcessDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, profileId }: { id: string; profileId: string }) =>
      processDocument(id, profileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Документ отправлен на обработку');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadDocument(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Документ загружен');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}