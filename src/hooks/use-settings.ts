import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings, testLlmConnection } from '@/lib/api';
import { toast } from 'sonner';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Настройки сохранены');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTestLlmConnection() {
  return useMutation({
    mutationFn: testLlmConnection,
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(`Подключение OK: ${result.model} (${result.latencyMs} мс)`);
      } else {
        toast.error(result.error || 'Подключение не удалось');
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}