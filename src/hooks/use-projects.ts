import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProjects,
  createProject,
  getProject,
  deleteProject,
  bulkDeleteProjects,
  getProjectModel,
  updateProjectEntity,
  getConflicts,
  resolveConflict,
  batchProcess,
} from '@/lib/api';
import { toast } from 'sonner';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await getProjects();
      return res?.data || [];
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Проект создан');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Проект удалён');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useBulkDeleteProjects() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteProjects(ids),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`Удалено проектов: ${result.count}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useProjectModel(id: string) {
  return useQuery({
    queryKey: ['project-model', id],
    queryFn: () => getProjectModel(id),
    enabled: !!id,
  });
}

export function useUpdateProjectEntity(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { entityType: string; instanceId: string; fieldName: string; value: string }) =>
      updateProjectEntity(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-model', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Значение обновлено');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useConflicts(id: string) {
  return useQuery({
    queryKey: ['conflicts', id],
    queryFn: () => getConflicts(id),
    enabled: !!id,
  });
}

export function useResolveConflict(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { entityId: string; fieldName: string; preferredValue: string }) =>
      resolveConflict(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conflicts', projectId] });
      qc.invalidateQueries({ queryKey: ['project-model', projectId] });
      toast.success('Конфликт разрешён');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useBatchProcess(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { documentIds: string[]; profileIds: Record<string, string> }) =>
      batchProcess(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      qc.invalidateQueries({ queryKey: ['project-model', projectId] });
      toast.success('Документы отправлены на обработку');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}