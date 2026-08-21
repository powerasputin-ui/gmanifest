'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTemplates,
  uploadTemplate,
  getTemplate,
  deleteTemplate,
  getTemplateMappings,
  createMapping,
  confirmMapping,
  aiMapTemplate,
} from '@/lib/api';
import { toast } from 'sonner';

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await getTemplates();
      return res?.data || [];
    },
  });
}

export function useUploadTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: uploadTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Шаблон загружен');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ['template', id],
    queryFn: () => getTemplate(id),
    enabled: !!id,
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Шаблон удалён');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTemplateMappings(templateId: string) {
  return useQuery({
    queryKey: ['template-mappings', templateId],
    queryFn: () => getTemplateMappings(templateId),
    enabled: !!templateId,
  });
}

export function useCreateMapping(templateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { templateVariable: string; modelPath: string }) =>
      createMapping(templateId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['template-mappings', templateId] });
      qc.invalidateQueries({ queryKey: ['template', templateId] });
      toast.success('Маппинг создан');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useConfirmMapping(templateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; confirmed: boolean }) =>
      confirmMapping(templateId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['template-mappings', templateId] });
      qc.invalidateQueries({ queryKey: ['template', templateId] });
      toast.success('Маппинг подтверждён');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAiMapTemplate(templateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => aiMapTemplate(templateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['template-mappings', templateId] });
      qc.invalidateQueries({ queryKey: ['template', templateId] });
      toast.success('AI автомаппинг выполнен');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}