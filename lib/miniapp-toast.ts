'use client'

import { toast } from '@/hooks/use-toast'

export const miniAppToast = {
  info(message: string, description?: string) {
    return toast({
      variant: 'info' as any,
      title: message,
      description,
    })
  },

  success(message: string, description?: string) {
    return toast({
      variant: 'success' as any,
      title: message,
      description,
    })
  },

  error(message: string, description?: string) {
    return toast({
      variant: 'destructive',
      title: message,
      description,
    })
  },
}
