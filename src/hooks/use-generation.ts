'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateDocument, getGeneration, downloadGeneration, getEntityTypes } from '@/lib/api';
import { toast } from 'sonner';

export function useGenerateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: generateDocument,
    onSuccess: () => {
      toast.success('Документ сгенерирован');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useGeneration(id: string) {
  return useQuery({
    queryKey: ['generation', id],
    queryFn: () => getGeneration(id),
    enabled: !!id,
  });
}

export function useEntityTypes() {
  return useQuery({
    queryKey: ['entity-types'],
    queryFn: getEntityTypes,
  });
}
