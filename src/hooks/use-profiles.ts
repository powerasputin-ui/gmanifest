import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProfiles, getProfile, createProfile, updateProfile, deleteProfile } from '@/lib/api';
import { toast } from 'sonner';

export function useProfiles(entityType?: string) {
  return useQuery({
    queryKey: ['profiles', entityType],
    queryFn: () => getProfiles(entityType),
  });
}

export function useProfile(id: string) {
  return useQuery({
    queryKey: ['profile', id],
    queryFn: () => getProfile(id),
    enabled: !!id,
  });
}

export function useCreateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Профиль создан');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateProfile>[1] }) =>
      updateProfile(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Профиль обновлён');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Профиль удалён');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}