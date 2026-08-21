'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWorkflowTemplates,
  getWorkflows,
  createWorkflow,
  getWorkflowDetail,
  advanceWorkflow,
  cancelWorkflow,
  getWorkflowDependencies,
  getWorkflowCompleteness,
} from '@/lib/api';
import { toast } from 'sonner';

export function useWorkflowTemplates() {
  return useQuery({
    queryKey: ['workflow-templates'],
    queryFn: async () => {
      const res = await getWorkflowTemplates();
      return res?.data || [];
    },
  });
}

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const res = await getWorkflows();
      return res?.data || [];
    },
  });
}

export function useWorkflowDetail(id: string) {
  return useQuery({
    queryKey: ['workflow-detail', id],
    queryFn: () => getWorkflowDetail(id),
    enabled: !!id,
  });
}

export function useCreateWorkflowFromTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createWorkflow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows'] });
      qc.invalidateQueries({ queryKey: ['workflow-templates'] });
      toast.success('Бизнес-процесс создан');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAdvanceWorkflow(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => advanceWorkflow(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflow-detail', id] });
      qc.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Шаг выполнен');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCancelWorkflow(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cancelWorkflow(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflow-detail', id] });
      qc.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Процесс отменён');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useWorkflowDependencies(id: string) {
  return useQuery({
    queryKey: ['workflow-dependencies', id],
    queryFn: () => getWorkflowDependencies(id),
    enabled: !!id,
  });
}

export function useWorkflowCompleteness(id: string) {
  return useQuery({
    queryKey: ['workflow-completeness', id],
    queryFn: () => getWorkflowCompleteness(id),
    enabled: !!id,
  });
}
