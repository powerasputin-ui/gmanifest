'use client';

import { useQuery } from '@tanstack/react-query';
import { getBusinessRules } from '@/lib/api';

export function useBusinessRules(workflowTemplateId?: string) {
  return useQuery({
    queryKey: ['business-rules', workflowTemplateId],
    queryFn: async () => {
      const res = await getBusinessRules(workflowTemplateId);
      return res?.data || [];
    },
  });
}
